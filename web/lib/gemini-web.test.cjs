const test = require('node:test')
const assert = require('node:assert/strict')
const {
  GEMINI_API_ORIGIN,
  GEMINI_API_VERSION,
  GEMINI_DEFAULT_MODEL,
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL_ORDER,
  GEMINI_API_KEY_STORAGE_PREFIX,
  GeminiWebError,
  geminiApiKeyStorageKey,
  buildGeminiEndpoint,
  buildGeminiRequestBody,
  requestGeminiJson,
  parseResumeWithGemini,
} = require('./gemini-web.ts')

const SECRET_KEY = 'AQ.super-secret.key/value+123'
const PROMPT = 'resume text with sensitive PII like john@example.com'

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => payload,
  }
}

function geminiTextPayload(text) {
  return { candidates: [{ content: { parts: [{ text }] } }] }
}

// A fetch that returns a status for each model in call order.
function fetchWithStatuses(statuses, finalPayload) {
  let call = 0
  const urls = []
  const impl = async (url) => {
    urls.push(url)
    const status = statuses[call] ?? statuses[statuses.length - 1]
    call += 1
    if (status === 200) {
      return jsonResponse(finalPayload ?? geminiTextPayload('{"firstName":"Ada"}'))
    }
    return jsonResponse({ error: { message: 'raw provider body ' + SECRET_KEY } }, { ok: false, status })
  }
  impl.urls = urls
  return impl
}

test('model order is frozen and Gemini-first', () => {
  assert.deepEqual([...GEMINI_MODEL_ORDER], [
    GEMINI_DEFAULT_MODEL,
    GEMINI_FALLBACK_MODEL,
    'gemini-2.5-flash',
  ])
  assert.equal(GEMINI_DEFAULT_MODEL, 'gemini-3.5-flash')
  assert.equal(GEMINI_FALLBACK_MODEL, 'gemini-flash-latest')
  assert.equal(Object.isFrozen(GEMINI_MODEL_ORDER), true)
})

test('endpoint building encodes model and key (reserved chars survive)', () => {
  const url = buildGeminiEndpoint(GEMINI_DEFAULT_MODEL, SECRET_KEY)
  assert.ok(url.startsWith(`${GEMINI_API_ORIGIN}/${GEMINI_API_VERSION}/models/`))
  assert.ok(url.includes('gemini-3.5-flash:generateContent'))
  // Reserved chars in the key must be percent-encoded, not raw.
  assert.equal(url.includes('key=' + encodeURIComponent(SECRET_KEY)), true)
  assert.equal(url.includes('/value+123'), false)
  // dots survive round-trip
  const decoded = decodeURIComponent(url.split('key=')[1])
  assert.equal(decoded, SECRET_KEY)
})

test('request body matches extension JSON-mode shape', () => {
  const body = buildGeminiRequestBody(PROMPT)
  assert.deepEqual(body, {
    contents: [{ parts: [{ text: PROMPT }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  })
})

test('per-user storage key is namespaced by userId', () => {
  assert.equal(geminiApiKeyStorageKey('user-42'), `${GEMINI_API_KEY_STORAGE_PREFIX}:user-42`)
  assert.notEqual(geminiApiKeyStorageKey('a'), geminiApiKeyStorageKey('b'))
})

test('404 on the default model falls back to the next model', async () => {
  const impl = fetchWithStatuses([404, 200])
  const text = await requestGeminiJson(PROMPT, SECRET_KEY, impl)
  assert.equal(text, '{"firstName":"Ada"}')
  assert.equal(impl.urls.length, 2)
  assert.ok(impl.urls[0].includes('gemini-3.5-flash'))
  assert.ok(impl.urls[1].includes('gemini-flash-latest'))
})

test('all models 404 -> MODEL_UNAVAILABLE', async () => {
  const impl = fetchWithStatuses([404, 404, 404])
  await assert.rejects(
    () => requestGeminiJson(PROMPT, SECRET_KEY, impl),
    (err) => err instanceof GeminiWebError && err.code === 'MODEL_UNAVAILABLE',
  )
  assert.equal(impl.urls.length, GEMINI_MODEL_ORDER.length)
})

test('429 maps to RATE_LIMIT with quota message', async () => {
  await assert.rejects(
    () => requestGeminiJson(PROMPT, SECRET_KEY, fetchWithStatuses([429])),
    (err) => err instanceof GeminiWebError
      && err.code === 'RATE_LIMIT'
      && /quota exceeded/i.test(err.message),
  )
})

test('401 and 403 map to INVALID_API_KEY', async () => {
  for (const status of [401, 403]) {
    await assert.rejects(
      () => requestGeminiJson(PROMPT, SECRET_KEY, fetchWithStatuses([status])),
      (err) => err instanceof GeminiWebError && err.code === 'INVALID_API_KEY',
    )
  }
})

test('503 maps to TEMPORARY_UNAVAILABLE', async () => {
  await assert.rejects(
    () => requestGeminiJson(PROMPT, SECRET_KEY, fetchWithStatuses([503])),
    (err) => err instanceof GeminiWebError && err.code === 'TEMPORARY_UNAVAILABLE',
  )
})

test('missing key short-circuits to NO_API_KEY without calling fetch', async () => {
  let called = false
  const impl = async () => { called = true; return jsonResponse({}) }
  await assert.rejects(
    () => requestGeminiJson(PROMPT, '   ', impl),
    (err) => err instanceof GeminiWebError && err.code === 'NO_API_KEY',
  )
  assert.equal(called, false)
})

test('network/transport failure maps to NETWORK_ERROR', async () => {
  const impl = async () => { throw new Error('ECONNRESET ' + SECRET_KEY) }
  await assert.rejects(
    () => requestGeminiJson(PROMPT, SECRET_KEY, impl),
    (err) => err instanceof GeminiWebError
      && err.code === 'NETWORK_ERROR'
      && !err.message.includes(SECRET_KEY),
  )
})

test('empty candidate text maps to EMPTY_RESPONSE', async () => {
  const impl = fetchWithStatuses([200], geminiTextPayload('   '))
  await assert.rejects(
    () => requestGeminiJson(PROMPT, SECRET_KEY, impl),
    (err) => err instanceof GeminiWebError && err.code === 'EMPTY_RESPONSE',
  )
})

test('error messages never leak the key, prompt, or raw body', async () => {
  const statuses = [404, 429, 401, 503]
  for (const status of statuses) {
    try {
      await requestGeminiJson(PROMPT, SECRET_KEY, fetchWithStatuses([status]))
      assert.fail('expected rejection for status ' + status)
    } catch (err) {
      assert.ok(err instanceof GeminiWebError)
      assert.doesNotMatch(err.message, /AQ\.super-secret|value\+123|raw provider body/)
      assert.equal(err.message.includes(PROMPT), false)
    }
  }
})

test('parseResumeWithGemini strips code fences and returns an object', async () => {
  const impl = fetchWithStatuses([200], geminiTextPayload('```json\n{"firstName":"Grace","skills":["Go"]}\n```'))
  const profile = await parseResumeWithGemini('some resume', SECRET_KEY, impl)
  assert.equal(profile.firstName, 'Grace')
  assert.deepEqual(profile.skills, ['Go'])
})

test('parseResumeWithGemini rejects unreadable JSON as INVALID_JSON', async () => {
  const impl = fetchWithStatuses([200], geminiTextPayload('not json at all'))
  await assert.rejects(
    () => parseResumeWithGemini('some resume', SECRET_KEY, impl),
    (err) => err instanceof GeminiWebError && err.code === 'INVALID_JSON',
  )
})
