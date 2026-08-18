const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function loadWorker(responses, initialStorage = {}) {
  const calls = [], logs = [], errors = [], startupLogs = [], importedScripts = [], responseJsonReads = []
  const storageData = { ...initialStorage }
  let messageListener, externalMessageListener
  const localStorage = {
    get(keys, callback) {
      const requested = Array.isArray(keys) ? keys : [keys]
      const result = Object.fromEntries(requested.filter((key) => key in storageData).map((key) => [key, storageData[key]]))
      if (callback) callback(result)
      return Promise.resolve(result)
    },
    set(values, callback) {
      Object.assign(storageData, values)
      if (callback) callback()
      return Promise.resolve()
    },
    remove(keys, callback) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete storageData[key]
      if (callback) callback()
      return Promise.resolve()
    },
  }
  const context = {
    URL,
    console: {
      log: (...args) => startupLogs.push(args),
      info: (...args) => logs.push(args),
      warn: (...args) => logs.push(args),
      error: (...args) => errors.push(args),
    },
    setTimeout: (callback) => callback(),
    chrome: {
      sidePanel: { setPanelBehavior: () => Promise.resolve() },
      storage: { local: localStorage },
      runtime: {
        onMessage: { addListener(listener) { messageListener = listener } },
        onMessageExternal: { addListener(listener) { externalMessageListener = listener } },
      },
    },
    fetch: async (url, options) => {
      const callIndex = calls.length
      calls.push({ url, options })
      const response = responses.shift()
      const json = Object.prototype.hasOwnProperty.call(response, 'body')
        ? response.body
        : url.includes('groq.com')
          ? { choices: [{ message: { content: response.text || '{}' } }] }
          : { candidates: [{ content: { parts: [{ text: response.text || '{}' }] } }] }
      return {
        ok: response.status === 200,
        status: response.status,
        json: async () => {
          responseJsonReads.push({ callIndex, status: response.status })
          if (response.jsonError) throw new SyntaxError('malformed JSON')
          return json
        },
      }
    },
  }
  context.self = context
  vm.createContext(context)
  context.importScripts = (...files) => files.forEach((file) => {
    importedScripts.push(file)
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), context)
  })
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'background.js'), 'utf8'), context)
  return {
    context,
    calls,
    logs,
    errors,
    startupLogs,
    importedScripts,
    responseJsonReads,
    storageData,
    messageListener,
    externalMessageListener,
  }
}

const calledModels = (calls) => calls.map(({ url }) => url.match(/models\/(.+):generateContent/)[1])

test('worker startup imports centralized model config before exact versioned banner without leaking secrets', () => {
  const secret = 'startup-secret-that-must-not-appear'
  const worker = loadWorker([], { geminiKey: secret })

  assert.deepEqual(worker.importedScripts, ['../config.js', '../provider-settings.js', './gemini-model.js'])
  assert.equal(worker.context.JOB_AUTOFILL_CONFIG.BACKGROUND_BUILD_VERSION, 2)
  assert.equal(worker.context.GEMINI_MODEL_CONFIG.VERIFIED_GEMINI_DEFAULT_MODEL, 'gemini-3.5-flash')
  assert.deepEqual(JSON.parse(JSON.stringify(worker.startupLogs)), [[
    '[applyonce] background v2 loaded',
    { geminiDefault: 'gemini-3.5-flash' },
  ]])
  assert.doesNotMatch(JSON.stringify(worker.startupLogs), new RegExp(secret))
})

test('404 falls through in exact order, preserves JSON mode, and reports selected model', async () => {
  const worker = loadWorker([{ status: 404 }, { status: 200, text: '{"ok":true}' }])
  assert.equal(await worker.context.callGemini('private prompt', 'private-key', true), '{"ok":true}')
  assert.deepEqual(calledModels(worker.calls), ['gemini-3.5-flash', 'gemini-flash-latest'])
  assert.equal(JSON.parse(worker.calls[0].options.body).generationConfig.responseMimeType, 'application/json')
  const [successEvent, successDetails] = worker.logs.at(-1)
  assert.equal(successEvent, '[resume-parser] Gemini success')
  assert.equal(successDetails.provider, 'gemini')
  assert.equal(successDetails.model, 'gemini-flash-latest')
})

test('earlier 429 followed by final 404 returns semantically consistent failure', async () => {
  const worker = loadWorker([{ status: 429 }, { status: 429 }, { status: 404 }, { status: 404 }])
  await assert.rejects(worker.context.callGemini('private prompt', 'private-key', true), (error) => error.errorCode === 'MODEL_UNAVAILABLE' && error.status === 404 && error.model === 'gemini-2.5-flash')
  assert.deepEqual(calledModels(worker.calls), ['gemini-3.5-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'])
})

test('all-404 exhaustion attempts every candidate and is never RATE_LIMIT', async () => {
  const worker = loadWorker([{ status: 404 }, { status: 404 }, { status: 404 }])
  await assert.rejects(worker.context.callGemini('private prompt', 'private-key', false), (error) => error.errorCode === 'MODEL_UNAVAILABLE' && error.status === 404)
  assert.deepEqual(calledModels(worker.calls), ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'])
})


test('callLLM uses Gemini for a missing provider and persists the effective default', async () => {
  const worker = loadWorker([{ status: 200, text: 'ok' }], { geminiKey: 'test-gemini-key' })
  assert.equal(await worker.context.callLLM('private prompt', false), 'ok')
  assert.equal(worker.storageData.provider, 'gemini')
  assert.match(worker.calls[0].url, /generativelanguage\.googleapis\.com/)
  const successDetails = worker.logs.at(-1)
  assert.equal(successDetails[0], '[resume-parser] Gemini success')
  assert.equal(successDetails[1].provider, 'gemini')
  assert.equal(successDetails[1].model, 'gemini-3.5-flash')
})

test('callLLM missing-key error and auth state consistently report Gemini', async () => {
  const worker = loadWorker([], { provider: 'groq', groqKey: '  ', session: { email: 'user@example.test' } })
  await assert.rejects(
    worker.context.callLLM('private prompt', false),
    (error) => error.errorCode === 'NO_API_KEY' && error.provider === 'gemini',
  )
  const state = await new Promise((resolve) => {
    assert.equal(worker.messageListener({ type: 'GET_AUTH_STATE' }, {}, resolve), true)
  })
  assert.equal(state.provider, 'gemini')
  assert.equal(state.hasKey, false)
  assert.equal(worker.storageData.provider, 'gemini')
})

test('callLLM preserves an explicit Groq provider when a key exists', async () => {
  const worker = loadWorker([{ status: 200, text: 'groq-ok' }], {
    provider: 'groq',
    groqKey: 'test-groq-key',
  })
  assert.equal(await worker.context.callLLM('private prompt', false), 'groq-ok')
  assert.equal(worker.storageData.provider, 'groq')
  assert.match(worker.calls[0].url, /api\.groq\.com/)
})

test('Gemini fetch preserves an AQ-dot key in the exact endpoint while all logs redact secrets', async () => {
  const key = 'AQ.placeholder.qBg'
  const prompt = 'prompt-that-must-never-be-logged'
  const worker = loadWorker([{ status: 200, text: '{"ok":true}' }])

  assert.equal(await worker.context.callGemini(prompt, `  ${key}\n`, true), '{"ok":true}')
  assert.equal(
    worker.calls[0].url,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`,
  )
  assert.equal(worker.calls[0].options.headers.Authorization, undefined)
  assert.deepEqual(JSON.parse(worker.calls[0].options.body), {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  })

  const serializedLogs = JSON.stringify(worker.logs)
  assert.equal(serializedLogs.includes(key), false)
  assert.equal(serializedLogs.includes(prompt), false)
  assert.match(serializedLogs, /https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.5-flash:generateContent\?key=\[REDACTED\]/)

  const attempt = JSON.parse(JSON.stringify(worker.logs[0]))
  assert.deepEqual(attempt, [
    '[resume-parser] Gemini attempt',
    {
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      attempt: 1,
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=[REDACTED]',
      action: 'request',
      keyFingerprint: { fingerprint: 'AQ.p…qBg', length: 18 },
    },
  ])
  const success = JSON.parse(JSON.stringify(worker.logs.at(-1)))
  assert.deepEqual(success, [
    '[resume-parser] Gemini success',
    {
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      status: 200,
      action: 'success',
      attempt: 1,
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=[REDACTED]',
    },
  ])
})

test('fallback and retry logs retain per-attempt status and action', async () => {
  const worker = loadWorker([{ status: 429 }, { status: 429 }, { status: 404 }, { status: 200, text: 'ok' }])
  assert.equal(await worker.context.callGemini('private prompt', 'placeholder-test-key', false), 'ok')

  const entries = worker.logs.map((entry) => JSON.parse(JSON.stringify(entry)))
  assert.deepEqual(
    entries.filter(([event]) => event === '[resume-parser] Gemini attempt').map(([, details]) => [details.model, details.attempt]),
    [
      ['gemini-3.5-flash', 1],
      ['gemini-3.5-flash', 2],
      ['gemini-flash-latest', 1],
      ['gemini-2.5-flash', 1],
    ],
  )
  assert.deepEqual(
    entries.filter(([event]) => event !== '[resume-parser] Gemini attempt' && event !== '[resume-parser] Gemini success')
      .map(([event, details]) => [event, details.status, details.action]),
    [
      ['[resume-parser] Gemini HTTP failure', 429, 'retry'],
      ['[resume-parser] Gemini fallback', 429, 'fallback'],
      ['[resume-parser] Gemini fallback', 404, 'fallback'],
    ],
  )
})

test('self.testGeminiKey makes one minimal default-model request and returns only safe status', async () => {
  const key = 'AQ.console-safe.qBg'
  const worker = loadWorker([{ status: 200, text: 'ignored-provider-body' }], {
    provider: 'gemini',
    geminiKey: `  ${key}\n`,
  })

  const result = JSON.parse(JSON.stringify(await worker.context.self.testGeminiKey()))
  assert.deepEqual(result, {
    ok: true,
    status: 200,
    provider: 'gemini',
    model: 'gemini-3.5-flash',
  })
  assert.equal(worker.calls.length, 1)
  assert.equal(
    worker.calls[0].url,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`,
  )
  assert.deepEqual(JSON.parse(JSON.stringify(worker.calls[0].options.headers)), { 'Content-Type': 'application/json' })
  assert.deepEqual(JSON.parse(worker.calls[0].options.body), {
    contents: [{ parts: [{ text: 'ok' }] }],
  })
  assert.equal('generationConfig' in JSON.parse(worker.calls[0].options.body), false)
  assert.equal(worker.calls[0].options.headers.Authorization, undefined)

  const serializedLogs = JSON.stringify(worker.logs)
  assert.equal(serializedLogs.includes(key), false)
  assert.equal(serializedLogs.includes('contents'), false)
  assert.equal(serializedLogs.includes('ignored-provider-body'), false)
  assert.equal(worker.logs.length, 2)
  for (const [event, details] of worker.logs) {
    assert.equal(event, '[resume-parser] Gemini key test')
    assert.equal(details.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=[REDACTED]')
    assert.deepEqual(JSON.parse(JSON.stringify(details.keyFingerprint)), {
      fingerprint: 'AQ.c…qBg',
      length: 19,
    })
  }
})

test('self.testGeminiKey reports one rejected request without fallback or response parsing', async () => {
  const key = 'AQ.rejected-safe.qBg'
  const worker = loadWorker([{ status: 403, text: 'raw-body-must-not-appear' }], {
    provider: 'gemini',
    geminiKey: key,
  })

  const result = JSON.parse(JSON.stringify(await worker.context.self.testGeminiKey()))
  assert.deepEqual(result, {
    ok: false,
    status: 403,
    provider: 'gemini',
    model: 'gemini-3.5-flash',
  })
  assert.equal(worker.calls.length, 1)
  assert.equal(JSON.stringify(worker.logs).includes(key), false)
  assert.equal(JSON.stringify(worker.logs).includes('raw-body-must-not-appear'), false)
  assert.equal(worker.logs.at(-1)[1].action, 'fail')
  assert.equal(worker.logs.at(-1)[1].status, 403)
})

test('self.testGeminiKey requires a stored Gemini key and does not fetch', async () => {
  const worker = loadWorker([], { provider: 'gemini', geminiKey: '  ' })
  const result = JSON.parse(JSON.stringify(await worker.context.self.testGeminiKey()))

  assert.deepEqual(result, {
    ok: false,
    status: null,
    provider: 'gemini',
    model: 'gemini-3.5-flash',
    errorCode: 'NO_API_KEY',
  })
  assert.equal(worker.calls.length, 0)
})

test('self.testGeminiKey catches network failures without leaking the key', async () => {
  const key = 'AQ.network-safe.qBg'
  const worker = loadWorker([], { provider: 'gemini', geminiKey: key })
  worker.context.fetch = async (url, options) => {
    worker.calls.push({ url, options })
    throw new Error('sensitive network details')
  }

  const result = JSON.parse(JSON.stringify(await worker.context.self.testGeminiKey()))
  assert.deepEqual(result, {
    ok: false,
    status: null,
    provider: 'gemini',
    model: 'gemini-3.5-flash',
    errorCode: 'NETWORK_ERROR',
  })
  assert.equal(worker.calls.length, 1)
  const serializedLogs = JSON.stringify(worker.logs)
  assert.equal(serializedLogs.includes(key), false)
  assert.equal(serializedLogs.includes('sensitive network details'), false)
})

test('all-404 errors carry exact chronological provider-message trace', async () => {
  const worker = loadWorker([
    { status: 404, body: { error: { message: 'Model alpha missing' } } },
    { status: 404, body: { error: { message: 'Model beta missing' } } },
    { status: 404, body: { error: { message: 'Model gamma missing' } } },
  ])

  const error = await worker.context.callGemini('private prompt', 'placeholder-test-key', true)
    .then(() => null, (failure) => failure)

  assert.equal(error.errorCode, 'MODEL_UNAVAILABLE')
  assert.deepEqual(JSON.parse(JSON.stringify(error.attempts)), [
    { model: 'gemini-3.5-flash', status: 404, apiError: 'Model alpha missing' },
    { model: 'gemini-flash-latest', status: 404, apiError: 'Model beta missing' },
    { model: 'gemini-2.5-flash', status: 404, apiError: 'Model gamma missing' },
  ])
})

test('transient retry trace repeats the attempted model in request order', async () => {
  const worker = loadWorker([
    { status: 429, body: { error: { message: 'Quota window one' } } },
    { status: 429, body: { error: { message: 'Quota window two' } } },
    { status: 400, body: { error: { message: 'Stop after fallback' } } },
  ])

  const error = await worker.context.callGemini('private prompt', 'placeholder-test-key', false)
    .then(() => null, (failure) => failure)

  assert.deepEqual(JSON.parse(JSON.stringify(error.attempts)), [
    { model: 'gemini-3.5-flash', status: 429, apiError: 'Quota window one' },
    { model: 'gemini-3.5-flash', status: 429, apiError: 'Quota window two' },
    { model: 'gemini-flash-latest', status: 400, apiError: 'Stop after fallback' },
  ])
})

test('final resume-parser console error is self-contained and redacts malicious provider secrets', async () => {
  const key = 'AQ.full-placeholder-secret.qBg'
  const maliciousMessage = `  Provider echoed ${key}\nhttps://example.test/fail?key=${key}&x=1 Authorization: Bearer bearer-token-value AIzaGooglePattern123456 AQ.otherGooglePattern123456 ${'x'.repeat(180)}`
  const worker = loadWorker([
    { status: 404, body: { error: { message: maliciousMessage } } },
    { status: 404, body: { error: { message: maliciousMessage } } },
    { status: 404, body: { error: { message: maliciousMessage } } },
  ], { provider: 'gemini', geminiKey: key })

  const response = await new Promise((resolve) => {
    assert.equal(worker.externalMessageListener({ type: 'PARSE_RESUME_TO_PROFILE', text: 'private resume' }, {}, resolve), true)
  })
  assert.equal(response.errorCode, 'MODEL_UNAVAILABLE')
  assert.equal(worker.errors.length, 1)

  const [event, details] = JSON.parse(JSON.stringify(worker.errors[0]))
  assert.equal(event, '[resume-parser] final failure')
  assert.equal(details.errorCode, 'MODEL_UNAVAILABLE')
  assert.equal(details.reason, 'The configured AI models are unavailable.')
  assert.equal(details.provider, 'gemini')
  assert.deepEqual(details.keyInfo, { present: true, length: key.length, prefix: 'AQ.f' })
  assert.equal(details.endpointSample, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=[REDACTED]')
  assert.equal(details.buildVersion, 2)
  assert.equal(details.attempts.length, 3)
  assert.ok(details.attempts.every(({ apiError }) => apiError.length <= 120))

  const serialized = JSON.stringify(worker.errors)
  assert.equal(serialized.includes(key), false)
  assert.equal(serialized.includes(`?key=${key}`), false)
  assert.equal(serialized.includes('bearer-token-value'), false)
  assert.equal(serialized.includes('AIzaGooglePattern123456'), false)
  assert.equal(serialized.includes('AQ.otherGooglePattern123456'), false)
  assert.equal(serialized.includes('private resume'), false)
  assert.equal(serialized.includes('qBg'), false)
})

test('failure JSON is read once per failed response and success JSON remains independently parseable', async () => {
  const worker = loadWorker([
    { status: 404, body: { error: { message: 'Default unavailable' } } },
    { status: 200, text: 'success-body' },
  ])

  assert.equal(await worker.context.callGemini('private prompt', 'placeholder-test-key', false), 'success-body')
  assert.deepEqual(worker.responseJsonReads, [
    { callIndex: 0, status: 404 },
    { callIndex: 1, status: 200 },
  ])
})

test('malformed and missing provider errors use short safe fallbacks', async () => {
  const worker = loadWorker([
    { status: 404, jsonError: true },
    { status: 404, body: { error: {} } },
    { status: 400, body: {} },
  ])

  const error = await worker.context.callGemini('private prompt', 'placeholder-test-key', false)
    .then(() => null, (failure) => failure)

  assert.deepEqual(
    JSON.parse(JSON.stringify(error.attempts)).map(({ apiError }) => apiError),
    ['Unreadable provider error response', 'No provider error message', 'No provider error message'],
  )
})