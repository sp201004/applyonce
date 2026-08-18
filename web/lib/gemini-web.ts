// Shared web-side Gemini configuration and client.
//
// This is the SINGLE place the web app talks to Gemini for browser-local
// resume parsing (used only when the extension is not connected). Keeping the
// model chain and endpoint construction here means future model changes are a
// single-line edit.
//
// SECURITY NOTE: the caller's API key lives in browser localStorage, which is
// local-only and NOT encrypted. Never log, echo, or embed the key, the prompt,
// or raw provider response bodies in error messages or console output.

export const GEMINI_API_ORIGIN = 'https://generativelanguage.googleapis.com'
export const GEMINI_API_VERSION = 'v1beta'

// Verified model chain (mirrors the extension's Gemini-first ordering).
export const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash'
export const GEMINI_FALLBACK_MODEL = 'gemini-flash-latest'
export const GEMINI_MODEL_ORDER: readonly string[] = Object.freeze([
  GEMINI_DEFAULT_MODEL,
  GEMINI_FALLBACK_MODEL,
  'gemini-2.5-flash',
])

// Per-user browser localStorage key prefix. Local-only, NOT encrypted.
export const GEMINI_API_KEY_STORAGE_PREFIX = 'applyonce_gemini_api_key'

export type GeminiWebErrorCode =
  | 'NO_API_KEY'
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT'
  | 'TEMPORARY_UNAVAILABLE'
  | 'MODEL_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'EMPTY_RESPONSE'
  | 'INVALID_RESPONSE'
  | 'INVALID_JSON'

const SAFE_MESSAGES: Record<GeminiWebErrorCode, string> = {
  NO_API_KEY: 'No Gemini API key provided.',
  INVALID_API_KEY: 'Gemini key is invalid or restricted.',
  RATE_LIMIT: 'Gemini quota exceeded, try again later.',
  TEMPORARY_UNAVAILABLE: 'Gemini is temporarily unavailable, try again shortly.',
  MODEL_UNAVAILABLE: 'No configured Gemini model could complete the request.',
  NETWORK_ERROR: 'Could not reach Gemini. Check your connection and try again.',
  EMPTY_RESPONSE: 'Gemini returned no profile data.',
  INVALID_RESPONSE: 'Gemini returned an unexpected response shape.',
  INVALID_JSON: 'Gemini returned data in an unreadable format.',
}

/**
 * Typed error for all web Gemini failures. Messages are sanitized and NEVER
 * contain the API key, the prompt, or the raw provider body. Exposes both
 * `code` and `errorCode` (the latter for the shared dashboard warning mapper).
 */
export class GeminiWebError extends Error {
  readonly code: GeminiWebErrorCode
  readonly errorCode: GeminiWebErrorCode
  readonly provider = 'gemini' as const
  readonly status?: number

  constructor(code: GeminiWebErrorCode, status?: number) {
    super(SAFE_MESSAGES[code])
    this.name = 'GeminiWebError'
    this.code = code
    this.errorCode = code
    this.status = status
  }
}

/** Per-user localStorage key. Local-only, NOT encrypted. */
export function geminiApiKeyStorageKey(userId: string): string {
  return `${GEMINI_API_KEY_STORAGE_PREFIX}:${userId}`
}

/**
 * Build the generateContent endpoint for a model + key. Both the model and the
 * key are percent-encoded so AQ./dot-style keys survive and reserved chars are
 * escaped.
 */
export function buildGeminiEndpoint(model: string, key: string): string {
  const encodedModel = encodeURIComponent(model)
  const encodedKey = encodeURIComponent(key)
  return `${GEMINI_API_ORIGIN}/${GEMINI_API_VERSION}/models/${encodedModel}:generateContent?key=${encodedKey}`
}

/**
 * Build the Gemini request body in JSON mode. Matches the extension's request
 * shape: single text part + JSON responseMimeType + low temperature.
 */
export function buildGeminiRequestBody(prompt: string) {
  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  }
}

/**
 * Send a JSON-mode prompt to Gemini, walking the model chain. Any 404 advances
 * to the next model; when every model 404s the result is MODEL_UNAVAILABLE.
 * Returns the raw model text (expected to be JSON).
 */
export async function requestGeminiJson(
  prompt: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const key = typeof apiKey === 'string' ? apiKey.trim() : ''
  if (!key) throw new GeminiWebError('NO_API_KEY')

  const body = JSON.stringify(buildGeminiRequestBody(prompt))

  for (const model of GEMINI_MODEL_ORDER) {
    let response: Response
    try {
      response = await fetchImpl(buildGeminiEndpoint(model, key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
    } catch {
      // Network/transport failure. Never surface the underlying detail.
      throw new GeminiWebError('NETWORK_ERROR')
    }

    if (response.ok) {
      let json: any
      try {
        json = await response.json()
      } catch {
        throw new GeminiWebError('INVALID_JSON', response.status)
      }
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
      if (typeof text !== 'string' || !text.trim()) {
        throw new GeminiWebError('EMPTY_RESPONSE', response.status)
      }
      return text
    }

    const status = response.status
    if (status === 404) {
      // Model not available for this key; try the next candidate.
      continue
    }

    if (status === 429) throw new GeminiWebError('RATE_LIMIT', status)
    if (status === 401 || status === 403) throw new GeminiWebError('INVALID_API_KEY', status)
    if (status === 503) throw new GeminiWebError('TEMPORARY_UNAVAILABLE', status)
    // Any other non-OK status: treat as temporarily unavailable without
    // leaking the raw body.
    throw new GeminiWebError('TEMPORARY_UNAVAILABLE', status)
  }

  // Fell through the whole chain — every model returned 404.
  throw new GeminiWebError('MODEL_UNAVAILABLE', 404)
}

const RESUME_EXTRACTION_PROMPT = (resumeText: string) => `You are an AI assistant that extracts structured profile data from a resume.
Extract the following fields from the resume text and return ONLY a valid JSON object matching this exact structure.
If a field is not found or you are unsure, leave it as an empty string "" or an empty array [].

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object.
2. Do not include markdown formatting or extra text.

JSON Structure:
{
  "firstName": "", "middleName": "", "lastName": "", "email": "", "phone": "",
  "address": "", "city": "", "state": "", "country": "", "zip": "", "dateOfBirth": "",
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
${resumeText.substring(0, 15000)}`

/**
 * Parse resume text into a profile object via Gemini. Strips optional markdown
 * code fences before JSON.parse. Throws GeminiWebError on any failure.
 */
export async function parseResumeWithGemini(
  resumeText: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const raw = await requestGeminiJson(RESUME_EXTRACTION_PROMPT(resumeText), apiKey, fetchImpl)

  let text = raw.trim()
  if (text.startsWith('```json')) {
    text = text.slice(7)
    if (text.endsWith('```')) text = text.slice(0, -3)
  } else if (text.startsWith('```')) {
    text = text.slice(3)
    if (text.endsWith('```')) text = text.slice(0, -3)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text.trim())
  } catch {
    throw new GeminiWebError('INVALID_JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new GeminiWebError('INVALID_RESPONSE')
  }
  return parsed as Record<string, unknown>
}
