importScripts('../config.js', '../provider-settings.js', './gemini-model.js');
const CONFIG = self.JOB_AUTOFILL_CONFIG;
const { getEffectiveProviderSettings } = self.APPLYONCE_PROVIDER_SETTINGS;
const providerMigrationReady = getEffectiveProviderSettings(chrome.storage.local);

async function getCurrentProviderSettings(additionalKeys = []) {
  await providerMigrationReady;
  return getEffectiveProviderSettings(chrome.storage.local, additionalKeys);
}

const {
  VERIFIED_GEMINI_DEFAULT_MODEL,
  GEMINI_MODEL_CANDIDATES,
  GEMINI_RETRY_BACKOFF_MS,
  GEMINI_LOG_EVENTS,
  buildGeminiEndpoint,
  getGeminiRetryAction,
  getGeminiFailureKind,
  getGeminiErrorCode,
  getExhaustedGeminiErrorCode,
  getGeminiAttemptDiagnostic,
  getGeminiDiagnostic,
  getGeminiNetworkDiagnostic,
  getGeminiSuccessDiagnostic,
  getGeminiKeyTestDiagnostic
} = self.GEMINI_MODEL_CONFIG;

console.log(`[applyonce] background v${CONFIG.BACKGROUND_BUILD_VERSION} loaded`, {
  geminiDefault: VERIFIED_GEMINI_DEFAULT_MODEL
});
self.testGeminiKey = testGeminiKey;
 
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
}

// Gemini has no model selector. Remove any obsolete override so the verified chain always wins.
chrome.storage.local.remove('geminiModel');

const PROVIDERS = {
  groq: {
    keyField: 'groqKey',
    modelField: 'groqModel',
    label: 'Groq',
    models: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768']
  }
};

let cloudProfile = null; // { profile, resumeText, fetchedAt }

// Rule-based matching for standard fields
const RULES = [
  // Specific nested fields first (highest priority)
  { regex: /\b(college|university|school|institute)\b/i, field: 'education.0.collegeName' },
  { regex: /\b(degree|accreditation)\b/i, field: 'education.0.degree' },
  { regex: /\b(branch|specialization|major)\b/i, field: 'education.0.branch' },
  { regex: /\bgpa\b/i, field: 'education.0.gpa' },
  { regex: /\b(company|employer)\b/i, field: 'workExperience.0.company' },
  { regex: /\b(role description|job description|work summary|experience summary|job summary|past job description)\b/i, field: 'workExperience.0.summary' },
  { regex: /\b(job title|role)\b/i, field: 'workExperience.0.jobTitle' },
  { regex: /\b(job location|work location|previous job location|past job location|employer location|company location)\b/i, field: 'workExperience.0.location' },
  { regex: /\b(graduation|grad.*date|grad.*year|end.*date)\b/i, field: 'education.0.endDate' },

  // Links
  { regex: /\blinkedin\b/i, field: 'linkedin' },
  { regex: /\bgithub\b/i, field: 'github' },
  { regex: /\b(x|twitter)\b/i, field: 'x' },
  { regex: /\bmedium\b/i, field: 'medium' },
  { regex: /\bleetcode\b/i, field: 'leetcode' },
  { regex: /\b(gfg|geeksforgeeks)\b/i, field: 'gfg' },
  { regex: /\b(website|portfolio)\b/i, field: 'website' },
  { regex: /\b(skills|skill|skill_tags)\b/i, field: 'skills' },

  // Personal Info
  { regex: /\bfirst.*name\b/i, field: 'firstName' },
  { regex: /\blast.*name\b/i, field: 'lastName' },
  { regex: /^(name|full name)$/i, field: 'firstName' }, // fallback
  { regex: /\bemail\b/i, field: 'email' },
  { regex: /\b(country.*code|phone.*code|dialing.*code|dial.*code|^code$)\b/i, field: 'countryCode' },
  { regex: /\b(phone|mobile)\b/i, field: 'phone' },
  { regex: /\b(dob|birth|date of birth)\b/i, field: 'dateOfBirth' },

  // Other specific
  { regex: /\b(achievements|awards|honors)\b/i, field: 'achievements' },
  { regex: /\btitle\b/i, field: 'currentTitle' },

  // Address (Generic, put last so they don't override specific ones like "Company City")
  { regex: /\baddress\b/i, field: 'address' },
  { regex: /\b(city|town|hometown)\b/i, field: 'city' },
  { regex: /\bstate\b/i, field: 'state' },
  { regex: /\b(zip|postal|pincode)\b/i, field: 'zip' },
  { regex: /\bcountry\b/i, field: 'country' },
  { regex: /\b(nationality|citizenship)\b/i, field: 'nationality' },
  
  // EEO / Demographic Info
  { regex: /\bdisability\b/i, field: 'disability' },
  { regex: /\b(veteran|military)\b/i, field: 'veteran' },
  { regex: /\bgender\b/i, field: 'gender' },
  { regex: /\b(hispanic|latino)\b/i, field: 'hispanicLatino' },
  { regex: /\brace\b/i, field: 'race' },
  { regex: /\borientation\b/i, field: 'sexualOrientation' },
  
  // Work Auth
  { regex: /\b(authorized.*india|work.*india|right to work.*india)\b/i, field: 'workAuthIndia' },
  { regex: /\b(sponsor|sponsorship)\b/i, field: 'requireSponsorship' }
];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_AUTH_STATE') {
    getCurrentProviderSettings(['session']).then((data) => {
      const provider = data.provider;
      const hasKey = provider === 'groq'
        ? self.APPLYONCE_PROVIDER_SETTINGS.hasNonEmptyKey(data.groqKey)
        : self.APPLYONCE_PROVIDER_SETTINGS.hasNonEmptyKey(data.geminiKey);
      sendResponse({
        signedIn: !!data.session,
        email: data.session?.email,
        hasKey,
        provider
      });
    });
    return true;
  }
  if (msg.type === 'GET_PROFILE') {
    getProfileData().then(data => sendResponse({ profile: data.profile })).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'SIGN_OUT') {
    chrome.storage.local.remove(['session']);
    cloudProfile = null;
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'REFRESH_PROFILE') {
    fetchProfile().then(() => sendResponse({ ok: true })).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'START_AUTOFILL_TAB') {
    startAutofill(msg.tabId).then(res => sendResponse(res)).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'PARSE_JD_TAB') {
    parseJdTab(msg.tabId).then(res => sendResponse(res)).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'PARSE_JD_CURRENT') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId) {
      parseJdTab(tabId).then(res => sendResponse(res)).catch(e => sendResponse({ error: e.message }));
    } else {
      sendResponse({ error: 'No active tab found' });
    }
    return true;
  }
  if (msg.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: `${CONFIG.WEB_APP_URL}/dashboard` });
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'MATCH_FIELDS') {
    handleMatchFields(msg.fields).then(res => sendResponse(res)).catch(e => sendResponse({ error: e.message }));
    return true;
  }
});

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SESSION' && msg.session) {
    const toSave = { session: msg.session };
    if (msg.session.groqKey) {
      toSave.groqKey = msg.session.groqKey;
    }
    chrome.storage.local.set(toSave, () => {
      fetchProfile().catch(console.error);
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'SAVE_GROQ_KEY' && msg.groqKey) {
    chrome.storage.local.set({ groqKey: msg.groqKey }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'SIGN_OUT') {
    chrome.storage.local.remove(['session']);
    cloudProfile = null;
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'GET_LOCAL_JD') {
    chrome.storage.local.get(['parsedJD'], (data) => {
      sendResponse({ parsedJD: data.parsedJD || '' });
    });
    return true;
  }
  if (msg.type === 'PARSE_RESUME_TO_PROFILE' && msg.text) {
    parseResumeToProfile(msg.text)
      .then(profile => sendResponse({ ok: true, profile }))
      .catch(error => {
        const safeError = normalizeLlmError(error);
        console.error('[resume-parser] final failure', getSafeErrorLog(safeError));
        sendResponse(getSafeErrorResponse(safeError));
      });
    return true;
  }
});

async function getValidAccessToken() {
  const data = await chrome.storage.local.get('session');
  if (!data.session) throw new Error('Not signed in');
  let { accessToken, refreshToken, expiresAt, email } = data.session;
  
  if (Date.now() > expiresAt - 60000) {
    const res = await fetch(`${CONFIG.WEB_APP_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    if (!res.ok) {
      await chrome.storage.local.remove('session');
      cloudProfile = null;
      throw new Error('Session expired');
    }
    const json = await res.json();
    accessToken = json.access_token;
    refreshToken = json.refresh_token;
    expiresAt = Date.now() + (json.expires_in * 1000);
    await chrome.storage.local.set({ session: { accessToken, refreshToken, expiresAt, email } });
  }
  return accessToken;
}

async function fetchProfile() {
  const token = await getValidAccessToken();
  const res = await fetch(`${CONFIG.WEB_APP_URL}/api/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error('Session expired. Please reconnect extension on dashboard.');
    }
    throw new Error(errData.error || `Failed to fetch profile (HTTP ${res.status})`);
  }
  const row = await res.json();
  if (!row || Object.keys(row).length === 0) {
    throw new Error('Profile is empty. Please complete and save your profile on the dashboard first.');
  }
  const profile = {
    firstName: row.first_name || '',
    middleName: row.middle_name || '',
    lastName: row.last_name || '',
    preferredFirstName: row.preferred_first_name || '',
    preferredMiddleName: row.preferred_middle_name || '',
    preferredLastName: row.preferred_last_name || '',
    email: row.email || '',
    phoneType: row.phone_type || '',
    countryCode: row.country_code || '',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    nationality: row.nationality || '',
    state: row.state || '',
    zip: row.zip || '',
    country: row.country || '',
    linkedin: row.linkedin || '',
    github: row.github || '',
    website: row.website || '',
    x: row.x || '',
    medium: row.medium || '',
    leetcode: row.leetcode || '',
    gfg: row.gfg || '',
    education: row.education || [],
    workExperience: row.work_experience || [],
    skills: row.skills || [],
    languages: row.languages || [],
    certificates: row.certificates || [],
    workAuthIndia: row.work_auth_india || '',
    requireSponsorship: row.require_sponsorship || '',
    disability: row.disability || '',
    veteran: row.veteran || '',
    gender: row.gender || '',
    lgbtq: row.lgbtq || '',
    hispanicLatino: row.hispanic_latino || '',
    race: row.race || '',
    sexualOrientation: row.sexual_orientation || '',
    pronouns: row.pronouns || '',
    expectedSalary: row.expected_salary || '',
    availableStartDate: row.available_start_date || '',
    dateOfBirth: row.date_of_birth || '',
    additionalInfo: row.additional_info || '',
    achievements: row.achievements || ''
  };
  
  cloudProfile = {
    profile,
    resumeText: row.resume_text || '',
    fetchedAt: Date.now()
  };
}

async function getProfileData() {
  if (!cloudProfile) {
    try {
      await fetchProfile();
    } catch (e) {
      if (!cloudProfile) throw e; // fallback to stale if network error
    }
  }
  return cloudProfile;
}

async function ensureContentScriptInjected(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch (e) {
    // 1. Inject into main top-level frame first (cannot fail due to subframe cross-origin restrictions)
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      });
    } catch (errMain) {
      console.error('Failed to inject into main frame:', errMain);
    }
    // 2. Best-effort injection into subframes
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ['content/content.js']
      });
    } catch (errFrames) {
      // Ignore subframe permission errors
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function startAutofill(tabId) {
  await ensureContentScriptInjected(tabId);
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    for (const frame of frames) {
      chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_FIELDS' }, { frameId: frame.frameId }).catch(() => {});
    }
  } catch (e) {
    chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_FIELDS' }).catch(() => {});
  }
  return { ok: true };
}

async function parseJdTab(tabId) {
  await ensureContentScriptInjected(tabId);
  let fullText = '';
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    for (const frame of frames) {
      try {
        const res = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_TEXT' }, { frameId: frame.frameId });
        if (res && res.text) fullText += res.text + '\n';
      } catch (e) {}
    }
  } catch (e) {
    try {
      const res = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_TEXT' });
      if (res && res.text) fullText = res.text;
    } catch (err) {}
  }
  
  if (!fullText.trim()) throw new Error('No readable text found on page');
  
  const prompt = `Summarize this job description. Extract the job title, company, key requirements, and responsibilities.
Return ONLY a plain text summary.

JD:
${fullText.substring(0, 15000)}`;
  const summary = await callLLM(prompt, false);
  await chrome.storage.local.set({ parsedJD: summary });
  return { summary };
}

async function handleMatchFields(fields) {
  const { profile, resumeText } = await getProfileData();
  const storageData = await chrome.storage.local.get(['parsedJD']);
  const parsedJD = storageData.parsedJD || '';
  const matched = {};
  const toLLM = [];
  
  chrome.runtime.sendMessage({ type: 'AUTOFILL_PROGRESS', percent: 30, text: 'Resolving rule-based fields...' }).catch(() => {});
  
  for (const f of fields) {
    let ruleMatched = false;
    const textToMatch = `${f.label} ${f.name} ${f.placeholder}`.toLowerCase();
    
    if (f.type !== 'checkbox' && f.type !== 'radio') {
      for (const rule of RULES) {
        if (rule.regex.test(textToMatch)) {
          // Resolve dot notation for nested fields (e.g. education.0.schoolName)
          const keys = rule.field.split('.');
          let val = profile;
          for (const k of keys) {
            if (val !== undefined && val !== null) {
              val = val[k];
            } else {
              val = undefined;
              break;
            }
          }
          if (val) {
            matched[f.id] = val;
            ruleMatched = true;
            break;
          }
        }
      }
    }
    
    if (!ruleMatched) {
      toLLM.push(f);
    }
  }
  
  if (toLLM.length > 0) {
    chrome.runtime.sendMessage({ type: 'AUTOFILL_PROGRESS', percent: 45, text: 'Connecting with AI model...' }).catch(() => {});
    // Chunk to max 60 fields
    const chunks = [];
    for (let i = 0; i < toLLM.length; i += 60) {
      chunks.push(toLLM.slice(i, i + 60));
    }
    
    let lastError = null;
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const progressPercent = 45 + Math.round((idx / chunks.length) * 30);
      chrome.runtime.sendMessage({ type: 'AUTOFILL_PROGRESS', percent: progressPercent, text: `AI matching fields (chunk ${idx + 1}/${chunks.length})...` }).catch(() => {});
      const prompt = `You are an AI assistant helping to autofill a job application.
Map the following form fields to the correct values based on the user's profile, resume, and the job description details.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object.
2. The JSON keys MUST be the exact "id" of the fields provided.
3. The JSON values MUST be an object containing "label" (the field label) and "value" (the string value to fill).
4. If you do not know the answer or it is not in the profile/resume/job description, DO NOT include that field's id in the JSON.
5. Do not guess. Do not shift values.
6. For EEO questions (race, gender, veteran, disability), answer "Prefer not to answer" unless explicitly stated.
7. NEVER put a URL (like a website or portfolio link) into a field unless the field explicitly asks for a URL, website, or link.
8. Pay strict attention to the field label. If it asks for a College/University, provide the name of the educational institution, NEVER a country, city, or date.
9. Prioritize the "label" over the "name" attribute when determining what a field is asking for.
10. If the field asks for "hometown", "city", "town", or "location", ONLY use the city or address from the profile.
11. If the field asks for "college", "university", "institute", or "school", ONLY use the collegeName from the education section.
12. Use the Job Description details (if provided) to write tailored answers for custom questions like "Why do you want to join [Company]?" or "Describe your experience...".
13. If a custom question (like "Why do you want to join..." or "Describe your experience...") is asked, and the user's profile lacks detailed information, draft a professional response highlighting the candidate's general software engineering capabilities, interest in the role requirements, and alignment with the job description. Do not leave custom textareas blank if they are required or ask for reasons.
14. For checkbox (type: "checkbox") and radio button (type: "radio") fields: if the candidate's profile or resume details match the specific checkbox/radio option label, return "true" or "yes" for that field ID. If the candidate's profile or resume does not match the option, return "false" or omit the field ID.

Example Output:
{
  "field_abc123": {
    "label": "Full Name",
    "value": "John Doe"
  },
  "field_xyz789": {
    "label": "Email Address",
    "value": "john.doe@example.com"
  }
}

Job Description:
${parsedJD || "No job description details parsed."}

User Profile:
${JSON.stringify(profile, null, 2)}

Resume Text:
${resumeText.substring(0, 10000)}

Fields to fill:
${JSON.stringify(chunk.map(f => ({ id: f.id, label: f.label, name: f.name, placeholder: f.placeholder, type: f.type, options: f.options })), null, 2)}
`;
      
      try {
        const aiResult = await callLLM(prompt, true);
        const parsed = parseAnswerJson(aiResult);
        for (const [id, data] of Object.entries(parsed)) {
          if (data && data.value !== undefined) {
            matched[id] = data.value;
          } else if (typeof data === 'string') {
            matched[id] = data; // fallback just in case the LLM ignores instructions
          }
        }
      } catch (e) {
        console.error('LLM chunk failed', e);
        lastError = e;
        chrome.runtime.sendMessage({ type: 'AUTOFILL_PROGRESS', percent: 100, text: `Error: ${e.message}`, isError: true }).catch(() => {});
        break; // stop processing further chunks
      }
    }
    if (Object.keys(matched).length === 0 && lastError) {
      throw lastError;
    }
  }
  
  return { matched, profile };
}

const SAFE_LLM_MESSAGES = Object.freeze({
  NO_API_KEY: 'The selected AI provider does not have an API key configured.',
  MODEL_UNAVAILABLE: 'The configured AI models are unavailable.',
  TEMPORARY_UNAVAILABLE: 'The AI provider is temporarily unavailable.',
  RATE_LIMIT: 'The AI provider rate limit was reached.',
  NETWORK_ERROR: 'The AI provider could not be reached.',
  INVALID_RESPONSE: 'The AI provider returned an invalid response.',
  EMPTY_RESPONSE: 'The AI provider returned an empty response.',
  INVALID_JSON: 'The AI output was not valid JSON.',
  AI_OUTPUT: 'The AI output did not contain a valid profile object.',
  REQUEST_FAILED: 'The AI provider rejected the request.'
});

class SafeLlmError extends Error {
  constructor(errorCode, details = {}) {
    super(SAFE_LLM_MESSAGES[errorCode] || SAFE_LLM_MESSAGES.REQUEST_FAILED);
    this.name = 'SafeLlmError';
    this.errorCode = errorCode;
    Object.assign(this, details);
  }
}

function normalizeLlmError(error) {
  return error instanceof SafeLlmError ? error : new SafeLlmError('REQUEST_FAILED');
}

const GEMINI_API_ERROR_MAX_LENGTH = 120;
const GEMINI_ENDPOINT_SAMPLE = buildGeminiEndpoint(
  VERIFIED_GEMINI_DEFAULT_MODEL,
  'diagnostic-placeholder'
).redactedUrl;

function sanitizeGeminiApiError(message, key = '') {
  let safeMessage = typeof message === 'string' ? message.replace(/\s+/g, ' ').trim() : '';
  if (!safeMessage) return 'No provider error message';

  const normalizedKey = typeof key === 'string' ? key.trim().replace(/\s+/g, ' ') : '';
  if (normalizedKey) safeMessage = safeMessage.split(normalizedKey).join('[REDACTED]');
  safeMessage = safeMessage
    .replace(/([?&]key=)[^&\s"'<>]+/gi, '$1[REDACTED]')
    .replace(/\bAuthorization\s*[:=]?\s*(?:Bearer\s+)?[^\s,;"']+/gi, 'Authorization [REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/\bAIza[0-9A-Za-z_-]{8,}\b/g, '[REDACTED]')
    .replace(/\bAQ\.[0-9A-Za-z._~-]{6,}\b/g, '[REDACTED]');
  return safeMessage.slice(0, GEMINI_API_ERROR_MAX_LENGTH);
}

async function readGeminiApiError(response, key) {
  try {
    const body = await response.json();
    return sanitizeGeminiApiError(body?.error?.message, key);
  } catch (error) {
    return 'Unreadable provider error response';
  }
}

function getGeminiKeyInfo(key) {
  const normalizedKey = typeof key === 'string' ? key.trim() : '';
  return Object.freeze({
    present: normalizedKey.length > 0,
    length: normalizedKey.length,
    prefix: normalizedKey.slice(0, 4)
  });
}

function getGeminiFailureDetails(key, attempts, details = {}) {
  return {
    provider: 'gemini',
    ...details,
    attempts: attempts.map(({ model, status, apiError }) => Object.freeze({ model, status, apiError })),
    keyInfo: getGeminiKeyInfo(key),
    endpointSample: GEMINI_ENDPOINT_SAMPLE,
    buildVersion: CONFIG.BACKGROUND_BUILD_VERSION
  };
}

function getSafeErrorLog(error) {
  const details = { errorCode: error.errorCode, reason: error.message };
  if (error.provider) details.provider = error.provider;
  if (Number.isInteger(error.status)) details.status = error.status;
  if (error.model) details.model = error.model;
  if (error.provider === 'gemini') {
    details.attempts = Array.isArray(error.attempts)
      ? error.attempts.map(attempt => ({
          model: attempt.model,
          status: Number.isInteger(attempt.status) ? attempt.status : null,
          apiError: sanitizeGeminiApiError(attempt.apiError)
        }))
      : [];
    details.keyInfo = error.keyInfo || { present: false, length: 0, prefix: '' };
    details.endpointSample = GEMINI_ENDPOINT_SAMPLE;
    details.buildVersion = CONFIG.BACKGROUND_BUILD_VERSION;
  }
  return details;
}

function getSafeErrorResponse(error) {
  const response = { errorCode: error.errorCode, error: error.message };
  if (error.provider) response.provider = error.provider;
  if (Number.isInteger(error.status)) response.status = error.status;
  if (error.model) response.model = error.model;
  if (typeof error.hasGeminiKey === 'boolean') response.hasGeminiKey = error.hasGeminiKey;
  if (typeof error.hasGroqKey === 'boolean') response.hasGroqKey = error.hasGroqKey;
  return response;
}

function getHttpErrorCode(status) {
  if (status === 404) return 'MODEL_UNAVAILABLE';
  if (status === 429) return 'RATE_LIMIT';
  if (status === 503) return 'TEMPORARY_UNAVAILABLE';
  return 'REQUEST_FAILED';
}

async function callLLM(prompt, jsonMode) {
  const data = await getCurrentProviderSettings(['groqModel']);
  const provider = data.provider;
  const keyState = {
    provider,
    hasGeminiKey: self.APPLYONCE_PROVIDER_SETTINGS.hasNonEmptyKey(data.geminiKey),
    hasGroqKey: self.APPLYONCE_PROVIDER_SETTINGS.hasNonEmptyKey(data.groqKey)
  };
  
  if (provider === 'gemini') {
    if (!keyState.hasGeminiKey) throw new SafeLlmError('NO_API_KEY', keyState);
    return await callGemini(prompt, data.geminiKey, jsonMode);
  }

  if (!keyState.hasGroqKey) throw new SafeLlmError('NO_API_KEY', keyState);
  return await callGroq(prompt, data.groqKey.trim(), data.groqModel, jsonMode);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(prompt, key, jsonMode) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1 }
  };
  if (jsonMode) {
    body.generationConfig.responseMimeType = "application/json";
  }

  const attempts = [];
  const failureKinds = [];
  let lastFailure = {};
  for (let modelIndex = 0; modelIndex < GEMINI_MODEL_CANDIDATES.length; modelIndex += 1) {
    const endpoint = buildGeminiEndpoint(GEMINI_MODEL_CANDIDATES[modelIndex], key);
    const model = endpoint.model;
    let retriesUsed = 0;
    while (true) {
      const attempt = retriesUsed + 1;
      console.info(
        GEMINI_LOG_EVENTS.ATTEMPT,
        getGeminiAttemptDiagnostic(model, endpoint.redactedUrl, attempt, endpoint.keyFingerprint)
      );

      let res;
      try {
        res = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } catch (error) {
        attempts.push(Object.freeze({ model, status: null, apiError: 'Network request failed' }));
        console.warn(
          GEMINI_LOG_EVENTS.HTTP_FAILURE,
          getGeminiNetworkDiagnostic(model, endpoint.redactedUrl, attempt)
        );
        throw new SafeLlmError(
          'NETWORK_ERROR',
          getGeminiFailureDetails(key, attempts, { model })
        );
      }

      if (!res.ok) {
        const apiError = await readGeminiApiError(res, key);
        attempts.push(Object.freeze({ model, status: res.status, apiError }));
        const action = getGeminiRetryAction(res.status, retriesUsed);
        const hasNextCandidate = modelIndex < GEMINI_MODEL_CANDIDATES.length - 1;
        const isFallback = action === 'next' && hasNextCandidate;
        const diagnosticAction = action === 'next' && !hasNextCandidate ? 'exhaust' : action;
        console.warn(
          isFallback ? GEMINI_LOG_EVENTS.FALLBACK : GEMINI_LOG_EVENTS.HTTP_FAILURE,
          getGeminiDiagnostic(model, res.status, diagnosticAction, retriesUsed, endpoint.redactedUrl)
        );
        lastFailure = { model, status: res.status };
        if (action === 'fail') {
          throw new SafeLlmError(
            getGeminiErrorCode(res.status),
            getGeminiFailureDetails(key, attempts, lastFailure)
          );
        }

        failureKinds.push(getGeminiFailureKind(res.status));
        if (action === 'retry') {
          retriesUsed += 1;
          await wait(GEMINI_RETRY_BACKOFF_MS * retriesUsed);
          continue;
        }
        break;
      }

      let json;
      try {
        json = await res.json();
      } catch (error) {
        attempts.push(Object.freeze({ model, status: res.status, apiError: 'Invalid JSON response' }));
        throw new SafeLlmError(
          'INVALID_RESPONSE',
          getGeminiFailureDetails(key, attempts, { model, status: res.status })
        );
      }
      const text = json?.candidates?.[0]?.content?.parts?.find(part => typeof part?.text === 'string')?.text;
      if (typeof text !== 'string' || !text.trim()) {
        attempts.push(Object.freeze({ model, status: res.status, apiError: 'Empty provider response' }));
        throw new SafeLlmError(
          'EMPTY_RESPONSE',
          getGeminiFailureDetails(key, attempts, { model, status: res.status })
        );
      }
      console.info(
        GEMINI_LOG_EVENTS.SUCCESS,
        getGeminiSuccessDiagnostic(model, res.status, attempt, endpoint.redactedUrl)
      );
      return text;
    }
  }

  throw new SafeLlmError(
    getExhaustedGeminiErrorCode(failureKinds, lastFailure.status),
    getGeminiFailureDetails(key, attempts, lastFailure)
  );
}

async function testGeminiKey() {
  const provider = 'gemini';
  const model = VERIFIED_GEMINI_DEFAULT_MODEL;
  const data = await getCurrentProviderSettings();
  if (!self.APPLYONCE_PROVIDER_SETTINGS.hasNonEmptyKey(data.geminiKey)) {
    return Object.freeze({ ok: false, status: null, provider, model, errorCode: 'NO_API_KEY' });
  }

  const endpoint = buildGeminiEndpoint(model, data.geminiKey);
  console.info(
    GEMINI_LOG_EVENTS.KEY_TEST,
    getGeminiKeyTestDiagnostic(model, null, 'request', endpoint.redactedUrl, endpoint.keyFingerprint)
  );

  let res;
  try {
    res = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ok' }] }] })
    });
  } catch (error) {
    console.warn(
      GEMINI_LOG_EVENTS.KEY_TEST,
      getGeminiKeyTestDiagnostic(model, null, 'fail', endpoint.redactedUrl, endpoint.keyFingerprint)
    );
    return Object.freeze({ ok: false, status: null, provider, model, errorCode: 'NETWORK_ERROR' });
  }

  const action = res.ok ? 'success' : 'fail';
  const diagnostic = getGeminiKeyTestDiagnostic(
    model,
    res.status,
    action,
    endpoint.redactedUrl,
    endpoint.keyFingerprint
  );
  if (res.ok) console.info(GEMINI_LOG_EVENTS.KEY_TEST, diagnostic);
  else console.warn(GEMINI_LOG_EVENTS.KEY_TEST, diagnostic);

  return Object.freeze({ ok: res.ok, status: res.status, provider, model });
}

async function callGroq(prompt, key, model, jsonMode) {
  const actualModel = model || PROVIDERS.groq.models[0];
  const url = `https://api.groq.com/openai/v1/chat/completions`;
  
  const body = {
    model: actualModel,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new SafeLlmError('NETWORK_ERROR', { provider: 'groq', model: actualModel });
  }
  
  if (!res.ok) {
    throw new SafeLlmError(getHttpErrorCode(res.status), {
      provider: 'groq',
      model: actualModel,
      status: res.status
    });
  }

  let json;
  try {
    json = await res.json();
  } catch (error) {
    throw new SafeLlmError('INVALID_RESPONSE', { provider: 'groq', model: actualModel, status: res.status });
  }
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new SafeLlmError('EMPTY_RESPONSE', { provider: 'groq', model: actualModel, status: res.status });
  }
  return text;
}

function parseAnswerJson(text) {
  if (typeof text !== 'string' || !text.trim()) throw new SafeLlmError('EMPTY_RESPONSE');

  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.substring(7);
    if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
  } else if (clean.startsWith('```')) {
    clean = clean.substring(3);
    if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
  }

  let parsed;
  try {
    parsed = JSON.parse(clean.trim());
  } catch (error) {
    throw new SafeLlmError('INVALID_JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SafeLlmError('AI_OUTPUT');
  }
  return parsed;
}

async function parseResumeToProfile(resumeText) {
  const prompt = `You are an AI assistant that extracts structured profile data from a resume.
Extract the following fields from the resume text and return ONLY a valid JSON object matching this exact structure.
If a field is not found or you are unsure, leave it as an empty string "" or an empty array [].

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object.
2. Do not include markdown formatting or extra text.

JSON Structure:
{
  "firstName": "", "middleName": "", "lastName": "", "email": "", "phone": "",
  "address": "", "city": "", "state": "", "country": "", "zip": "",
  "linkedin": "", "github": "", "website": "", "x": "", "medium": "", "leetcode": "", "gfg": "",
  "education": [
    {
      "collegeName": "", "branch": "", "degree": "", "gpa": "", "startDate": "", "endDate": "", "currentlyStudyHere": false
    }
  ],
  "workExperience": [
    {
      "company": "", "jobTitle": "", "location": "", "startDate": "", "endDate": "", "currentlyWorkHere": false, "summary": "", "bullets": [""]
    }
  ],
  "skills": [""],
  "languages": [""],
  "certificates": [""],
  "achievements": ""
}

Resume Text:
${resumeText.substring(0, 15000)}
`;

  const aiResult = await callLLM(prompt, true);
  return parseAnswerJson(aiResult);
}
