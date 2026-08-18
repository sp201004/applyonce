(function initializeGeminiModelConfig(root) {
  const GEMINI_API_ORIGIN = 'https://generativelanguage.googleapis.com';
  const GEMINI_API_VERSION = 'v1beta';
  const VERIFIED_GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash';
  const GEMINI_MODEL_FALLBACKS = Object.freeze([
    'gemini-flash-latest',
    'gemini-2.5-flash'
  ]);
  const GEMINI_MODEL_CANDIDATES = Object.freeze([
    VERIFIED_GEMINI_DEFAULT_MODEL,
    ...GEMINI_MODEL_FALLBACKS
  ]);
  const GEMINI_TRANSIENT_RETRY_LIMIT = 1;
  const GEMINI_RETRY_BACKOFF_MS = 300;
  const GEMINI_LOG_EVENTS = Object.freeze({
    ATTEMPT: '[resume-parser] Gemini attempt',
    SUCCESS: '[resume-parser] Gemini success',
    FALLBACK: '[resume-parser] Gemini fallback',
    HTTP_FAILURE: '[resume-parser] Gemini HTTP failure',
    FINAL_FAILURE: '[resume-parser] final failure',
    KEY_TEST: '[resume-parser] Gemini key test'
  });

  function normalizeGeminiModelId(model) {
    if (typeof model !== 'string') throw new TypeError('Gemini model must be a string');
    let normalized = model.trim().replace(/^\/+|\/+$/g, '');
    while (normalized.startsWith('models/')) normalized = normalized.slice('models/'.length);
    if (!normalized || !/^[a-zA-Z0-9._-]+$/.test(normalized)) {
      throw new TypeError('Gemini model must be a bare model ID');
    }
    return normalized;
  }

  function getGeminiKeyFingerprint(key) {
    const normalizedKey = typeof key === 'string' ? key.trim() : '';
    const length = normalizedKey.length;
    if (length === 0) return Object.freeze({ fingerprint: '[empty]', length });
    if (length < 8) return Object.freeze({ fingerprint: '[masked]', length });
    return Object.freeze({
      fingerprint: `${normalizedKey.slice(0, 4)}…${normalizedKey.slice(-3)}`,
      length
    });
  }

  function buildGeminiEndpoint(model, key) {
    const normalizedModel = normalizeGeminiModelId(model);
    const normalizedKey = typeof key === 'string' ? key.trim() : '';
    if (!normalizedKey) throw new TypeError('Gemini API key is required');

    const url = new URL(`${GEMINI_API_ORIGIN}/${GEMINI_API_VERSION}/models/${encodeURIComponent(normalizedModel)}:generateContent`);
    url.searchParams.set('key', normalizedKey);
    return Object.freeze({
      model: normalizedModel,
      url: url.toString(),
      redactedUrl: `${url.origin}${url.pathname}?key=[REDACTED]`,
      keyFingerprint: getGeminiKeyFingerprint(normalizedKey)
    });
  }

  function getGeminiRetryAction(status, retriesUsed) {
    if (status === 404) return 'next';
    if (status === 429 || status === 503) {
      return retriesUsed < GEMINI_TRANSIENT_RETRY_LIMIT ? 'retry' : 'next';
    }
    return 'fail';
  }

  function getGeminiFailureKind(status) {
    if (status === 404) return 'model_unavailable';
    if (status === 429) return 'rate_limit';
    if (status === 503) return 'temporary';
    return 'request';
  }

  function humanizeGeminiFailure(status) {
    if (status === 401 || status === 403) {
      return 'Gemini rejected the request. Check your API key and try again.';
    }
    if (status === 400 || status === 413) {
      return 'Gemini could not process this request. Please review the input and try again.';
    }
    return 'Gemini could not complete the request. Please try again.';
  }

  function humanizeExhaustedGeminiFailures(kinds) {
    if (kinds.includes('rate_limit') && !kinds.includes('temporary')) {
      return 'AI rate limit reached. Please wait a moment and try again.';
    }
    if (kinds.includes('temporary')) {
      return 'AI models are temporarily unavailable. Please try again shortly.';
    }
    return 'The configured AI models are unavailable. Please try again later.';
  }

  function getGeminiErrorCode(status) {
    if (status === 404) return 'MODEL_UNAVAILABLE';
    if (status === 429) return 'RATE_LIMIT';
    if (status === 503) return 'TEMPORARY_UNAVAILABLE';
    return 'REQUEST_FAILED';
  }

  function getExhaustedGeminiErrorCode(kinds, finalStatus) {
    // Exhaustion details describe the last attempted candidate, so the public
    // error code must classify that same HTTP response.
    if (Number.isInteger(finalStatus)) return getGeminiErrorCode(finalStatus);
    if (kinds.includes('temporary')) return 'TEMPORARY_UNAVAILABLE';
    if (kinds.includes('rate_limit')) return 'RATE_LIMIT';
    return 'MODEL_UNAVAILABLE';
  }

  function getGeminiAttemptDiagnostic(model, redactedUrl, attempt, keyFingerprint) {
    return Object.freeze({
      provider: 'gemini',
      model,
      attempt,
      url: redactedUrl,
      action: 'request',
      keyFingerprint
    });
  }

  function getGeminiStatusReason(status) {
    if (status === 400 || status === 413) return 'request body or configuration';
    if (status === 401 || status === 403) return 'key or restrictions';
    if (status === 404) return 'URL, model, or access';
    if (status === 429) return 'rate limited';
    if (status === 503) return 'temporarily unavailable';
    return 'request rejected';
  }

  function getGeminiDiagnostic(model, status, action, retriesUsed, redactedUrl) {
    return Object.freeze({
      provider: 'gemini',
      model,
      status,
      action: action === 'next' ? 'fallback' : action,
      attempt: retriesUsed + 1,
      url: redactedUrl,
      reason: getGeminiStatusReason(status)
    });
  }

  function getGeminiNetworkDiagnostic(model, redactedUrl, attempt) {
    return Object.freeze({
      provider: 'gemini',
      model,
      status: null,
      action: 'fail',
      attempt,
      url: redactedUrl,
      reason: 'network error'
    });
  }

  function getGeminiSuccessDiagnostic(model, status, attempt, redactedUrl) {
    return Object.freeze({
      provider: 'gemini',
      model,
      status,
      action: 'success',
      attempt,
      url: redactedUrl
    });
  }

  function getGeminiKeyTestDiagnostic(model, status, action, redactedUrl, keyFingerprint) {
    return Object.freeze({
      provider: 'gemini',
      model,
      status,
      action,
      url: redactedUrl,
      keyFingerprint
    });
  }

  const api = {
    GEMINI_API_ORIGIN,
    GEMINI_API_VERSION,
    VERIFIED_GEMINI_DEFAULT_MODEL,
    GEMINI_MODEL_FALLBACKS,
    GEMINI_MODEL_CANDIDATES,
    GEMINI_TRANSIENT_RETRY_LIMIT,
    GEMINI_RETRY_BACKOFF_MS,
    GEMINI_LOG_EVENTS,
    normalizeGeminiModelId,
    getGeminiKeyFingerprint,
    buildGeminiEndpoint,
    getGeminiRetryAction,
    getGeminiFailureKind,
    humanizeGeminiFailure,
    humanizeExhaustedGeminiFailures,
    getGeminiErrorCode,
    getExhaustedGeminiErrorCode,
    getGeminiAttemptDiagnostic,
    getGeminiStatusReason,
    getGeminiDiagnostic,
    getGeminiNetworkDiagnostic,
    getGeminiSuccessDiagnostic,
    getGeminiKeyTestDiagnostic
  };

  root.GEMINI_MODEL_CONFIG = Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);