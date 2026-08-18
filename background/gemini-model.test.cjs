const test = require('node:test')
const assert = require('node:assert/strict')
const modelConfig = require('./gemini-model.js')

test('endpoint construction normalizes models and trims/encodes AQ-style keys exactly once', () => {
  const expectedUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=AQ.placeholder.qBg'
  const expectedRedacted = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=[REDACTED]'

  for (const model of ['gemini-3.5-flash', 'models/gemini-3.5-flash', 'models/models/gemini-3.5-flash']) {
    const endpoint = modelConfig.buildGeminiEndpoint(model, '  AQ.placeholder.qBg\n')
    assert.equal(endpoint.model, 'gemini-3.5-flash')
    assert.equal(endpoint.url, expectedUrl)
    assert.equal(endpoint.redactedUrl, expectedRedacted)
    assert.deepEqual(endpoint.keyFingerprint, { fingerprint: 'AQ.p…qBg', length: 18 })
    assert.doesNotMatch(endpoint.url, /models\/models\//)
  }

  const encoded = modelConfig.buildGeminiEndpoint('gemini-3.5-flash', 'AQ.dot+slash/value?qBg')
  assert.equal(encoded.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=AQ.dot%2Bslash%2Fvalue%3FqBg')
  assert.equal(decodeURIComponent(new URL(encoded.url).searchParams.get('key')), 'AQ.dot+slash/value?qBg')
  assert.throws(() => modelConfig.buildGeminiEndpoint('models/team/model', 'AQ.placeholder.qBg'), /bare model ID/)
})

test('Gemini candidates start with the verified default and contain ordered unique fallbacks', () => {
  const { VERIFIED_GEMINI_DEFAULT_MODEL, GEMINI_MODEL_FALLBACKS, GEMINI_MODEL_CANDIDATES } = modelConfig
  assert.deepEqual(GEMINI_MODEL_CANDIDATES, [VERIFIED_GEMINI_DEFAULT_MODEL, ...GEMINI_MODEL_FALLBACKS])
  assert.equal(new Set(GEMINI_MODEL_CANDIDATES).size, GEMINI_MODEL_CANDIDATES.length)
})

test('transient responses retry once, unavailable models advance, and client errors stop', () => {
  const { getGeminiRetryAction } = modelConfig
  assert.equal(getGeminiRetryAction(429, 0), 'retry')
  assert.equal(getGeminiRetryAction(503, 0), 'retry')
  assert.equal(getGeminiRetryAction(429, 1), 'next')
  assert.equal(getGeminiRetryAction(503, 1), 'next')
  assert.equal(getGeminiRetryAction(404, 0), 'next')
  assert.equal(getGeminiRetryAction(400, 0), 'fail')
  assert.equal(getGeminiRetryAction(401, 0), 'fail')
})

test('only transient statuses can ever produce a retry across bounded attempts', () => {
  for (const status of [400, 401, 403, 404, 408, 413, 429, 500, 502, 503]) {
    for (let retriesUsed = 0; retriesUsed < 5; retriesUsed += 1) {
      const action = modelConfig.getGeminiRetryAction(status, retriesUsed)
      if (action === 'retry') {
        assert.ok(status === 429 || status === 503)
        assert.ok(retriesUsed < modelConfig.GEMINI_TRANSIENT_RETRY_LIMIT)
      }
    }
  }
})

test('user-facing failure messages contain no raw response details', () => {
  assert.match(modelConfig.humanizeExhaustedGeminiFailures(['rate_limit']), /rate limit/i)
  assert.match(modelConfig.humanizeExhaustedGeminiFailures(['temporary']), /temporarily unavailable/i)
  assert.match(modelConfig.humanizeExhaustedGeminiFailures(['model_unavailable']), /models are unavailable/i)
  assert.doesNotMatch(modelConfig.humanizeGeminiFailure(403), /403|response body|api error/i)
})

test('Gemini retry diagnostics expose only safe fields plus the exact redacted URL', () => {
  const redactedUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-safe-model:generateContent?key=[REDACTED]'
  const diagnostic = modelConfig.getGeminiDiagnostic('gemini-safe-model', 503, 'retry', 0, redactedUrl)

  assert.deepEqual(diagnostic, {
    provider: 'gemini',
    model: 'gemini-safe-model',
    status: 503,
    action: 'retry',
    attempt: 1,
    url: redactedUrl,
    reason: 'temporarily unavailable',
  })
  assert.deepEqual(Object.keys(diagnostic), ['provider', 'model', 'status', 'action', 'attempt', 'url', 'reason'])
  assert.doesNotMatch(JSON.stringify(diagnostic), /placeholder-test-key|prompt|resume|authorization|response body/i)
})

test('Gemini diagnostics classify fallback and exhausted failures consistently', () => {
  assert.deepEqual(modelConfig.GEMINI_MODEL_CANDIDATES, [
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
  ])
  assert.equal(modelConfig.getGeminiDiagnostic('missing-model', 404, 'next', 0).action, 'fallback')
  assert.equal(modelConfig.getGeminiErrorCode(404), 'MODEL_UNAVAILABLE')
  assert.equal(modelConfig.getGeminiErrorCode(429), 'RATE_LIMIT')
  assert.equal(modelConfig.getGeminiErrorCode(503), 'TEMPORARY_UNAVAILABLE')
  assert.equal(modelConfig.getExhaustedGeminiErrorCode(['model_unavailable'], 404), 'MODEL_UNAVAILABLE')
  assert.equal(modelConfig.getExhaustedGeminiErrorCode(['rate_limit'], 429), 'RATE_LIMIT')
  assert.equal(modelConfig.getExhaustedGeminiErrorCode(['rate_limit', 'temporary'], 503), 'TEMPORARY_UNAVAILABLE')
})

test('final 404 remains MODEL_UNAVAILABLE after an earlier rate limit', () => {
  const failureKinds = [
    modelConfig.getGeminiFailureKind(429),
    modelConfig.getGeminiFailureKind(404),
  ]

  assert.equal(modelConfig.getExhaustedGeminiErrorCode(failureKinds, 404), 'MODEL_UNAVAILABLE')
  assert.notEqual(modelConfig.getExhaustedGeminiErrorCode(failureKinds, 404), 'RATE_LIMIT')
})

test('all-404 candidate exhaustion is MODEL_UNAVAILABLE', () => {
  const statuses = modelConfig.GEMINI_MODEL_CANDIDATES.map(() => 404)
  const failureKinds = statuses.map(modelConfig.getGeminiFailureKind)

  assert.ok(statuses.every((status, index) => modelConfig.getGeminiRetryAction(status, 0) === 'next' && index < statuses.length))
  assert.equal(modelConfig.getExhaustedGeminiErrorCode(failureKinds, statuses.at(-1)), 'MODEL_UNAVAILABLE')
})

test('safe console event labels and success diagnostic are allowlisted', () => {
  const redactedUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=[REDACTED]'
  assert.deepEqual(modelConfig.GEMINI_LOG_EVENTS, {
    ATTEMPT: '[resume-parser] Gemini attempt',
    SUCCESS: '[resume-parser] Gemini success',
    FALLBACK: '[resume-parser] Gemini fallback',
    HTTP_FAILURE: '[resume-parser] Gemini HTTP failure',
    FINAL_FAILURE: '[resume-parser] final failure',
    KEY_TEST: '[resume-parser] Gemini key test',
  })
  assert.deepEqual(modelConfig.getGeminiSuccessDiagnostic('gemini-3.5-flash', 200, 1, redactedUrl), {
    provider: 'gemini',
    model: 'gemini-3.5-flash',
    status: 200,
    action: 'success',
    attempt: 1,
    url: redactedUrl,
  })
  assert.doesNotMatch(
    JSON.stringify(modelConfig.getGeminiSuccessDiagnostic('gemini-3.5-flash', 200, 1, redactedUrl)),
    /placeholder-test-key|prompt|resume|profile|authorization|response body/i,
  )
})

test('safe key fingerprints expose only first four and last three characters', () => {
  assert.deepEqual(modelConfig.getGeminiKeyFingerprint('  AQ.placeholder.qBg\n'), {
    fingerprint: 'AQ.p…qBg',
    length: 18,
  })
  assert.deepEqual(modelConfig.getGeminiKeyFingerprint(''), { fingerprint: '[empty]', length: 0 })
  assert.deepEqual(modelConfig.getGeminiKeyFingerprint('short'), { fingerprint: '[masked]', length: 5 })
  assert.deepEqual(modelConfig.getGeminiKeyFingerprint(null), { fingerprint: '[empty]', length: 0 })
  assert.equal(JSON.stringify(modelConfig.getGeminiKeyFingerprint('short')).includes('short'), false)
})

test('status diagnostics distinguish body, key, and URL/model/access failures', () => {
  assert.equal(modelConfig.getGeminiStatusReason(400), 'request body or configuration')
  assert.equal(modelConfig.getGeminiStatusReason(401), 'key or restrictions')
  assert.equal(modelConfig.getGeminiStatusReason(403), 'key or restrictions')
  assert.equal(modelConfig.getGeminiStatusReason(404), 'URL, model, or access')
})

test('key-test diagnostic contains only safe allowlisted fields', () => {
  const redactedUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=[REDACTED]'
  const keyFingerprint = modelConfig.getGeminiKeyFingerprint('AQ.placeholder.qBg')
  const diagnostic = modelConfig.getGeminiKeyTestDiagnostic('gemini-3.5-flash', 403, 'fail', redactedUrl, keyFingerprint)

  assert.deepEqual(diagnostic, {
    provider: 'gemini',
    model: 'gemini-3.5-flash',
    status: 403,
    action: 'fail',
    url: redactedUrl,
    keyFingerprint: { fingerprint: 'AQ.p…qBg', length: 18 },
  })
  assert.equal(JSON.stringify(diagnostic).includes('AQ.placeholder.qBg'), false)
})