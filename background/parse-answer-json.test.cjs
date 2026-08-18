const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

// Load background.js in an isolated worker-like context. Top-level function
// declarations (like parseAnswerJson) bind onto the global context object, so we
// can exercise them directly without changing the service-worker runtime.
function loadWorker() {
  const storageData = {}
  const localStorage = {
    get(keys, callback) {
      const requested = Array.isArray(keys) ? keys : [keys]
      const result = Object.fromEntries(requested.filter((key) => key in storageData).map((key) => [key, storageData[key]]))
      if (callback) callback(result)
      return Promise.resolve(result)
    },
    set(values, callback) { Object.assign(storageData, values); if (callback) callback(); return Promise.resolve() },
    remove(keys, callback) { for (const k of Array.isArray(keys) ? keys : [keys]) delete storageData[k]; if (callback) callback(); return Promise.resolve() },
  }
  const context = {
    URL,
    console: { log() {}, info() {}, warn() {}, error() {} },
    setTimeout: (cb) => cb(),
    chrome: {
      sidePanel: { setPanelBehavior: () => Promise.resolve() },
      storage: { local: localStorage },
      runtime: { onMessage: { addListener() {} }, onMessageExternal: { addListener() {} } },
    },
    fetch: async () => { throw new Error('network disabled in unit test') },
  }
  context.self = context
  vm.createContext(context)
  context.importScripts = (...files) => files.forEach((file) => {
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), context)
  })
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'background.js'), 'utf8'), context)
  return context
}

const worker = loadWorker()
const rawParseAnswerJson = worker.parseAnswerJson
// Objects returned from the VM realm carry that realm's prototypes, which trips
// deepStrictEqual's prototype check. Round-trip through JSON to normalize into
// the current realm; this does not alter the parsed structure or values.
const parseAnswerJson = (input) => {
  const result = rawParseAnswerJson(input)
  return result && typeof result === 'object' ? JSON.parse(JSON.stringify(result)) : result
}

test('parseAnswerJson is reachable from the worker context', () => {
  assert.equal(typeof rawParseAnswerJson, 'function')
})

// (a) clean JSON
test('(a) parses clean JSON object', () => {
  assert.deepEqual(parseAnswerJson('{"firstName":"Ada","skills":["js"]}'), { firstName: 'Ada', skills: ['js'] })
})

// (b) ```json fenced
test('(b) parses ```json fenced block', () => {
  const input = '```json\n{"a":1,"b":"two"}\n```'
  assert.deepEqual(parseAnswerJson(input), { a: 1, b: 'two' })
})

// (c) plain ``` fenced
test('(c) parses plain ``` fenced block', () => {
  const input = '```\n{"ok":true}\n```'
  assert.deepEqual(parseAnswerJson(input), { ok: true })
})

// (d) leading prose + JSON
test('(d) parses JSON preceded by prose', () => {
  const input = 'Here is the JSON you asked for:\n{"name":"Grace","age":42}'
  assert.deepEqual(parseAnswerJson(input), { name: 'Grace', age: 42 })
})

// (e) JSON + trailing prose
test('(e) parses JSON followed by trailing commentary', () => {
  const input = '{"status":"done"}\n\nLet me know if you need anything else!'
  assert.deepEqual(parseAnswerJson(input), { status: 'done' })
})

// (f) fenced block embedded in surrounding text
test('(f) parses a fenced block embedded in surrounding text', () => {
  const input = 'Sure, here you go:\n```json\n{"city":"Paris"}\n```\nHope that helps.'
  assert.deepEqual(parseAnswerJson(input), { city: 'Paris' })
})

// (g) braces inside string values must not break balance matching
test('(g) handles braces and brackets inside string values', () => {
  const input = 'Result:\n{"note":"use {curly} and [square] here","expr":"if (x) { y }","nested":{"k":"}}}"}}'
  assert.deepEqual(parseAnswerJson(input), {
    note: 'use {curly} and [square] here',
    expr: 'if (x) { y }',
    nested: { k: '}}}' },
  })
})

test('(g2) handles escaped quotes inside string values', () => {
  const input = 'prose {"quote":"she said \\"hi\\" to {them}","done":true} trailing'
  assert.deepEqual(parseAnswerJson(input), { quote: 'she said "hi" to {them}', done: true })
})

// (h) truly invalid input still throws INVALID_JSON
test('(h) throws INVALID_JSON for input with no parseable JSON value', () => {
  assert.throws(() => parseAnswerJson('this is just prose, no json at all'), (e) => e.errorCode === 'INVALID_JSON')
})

test('(h2) throws INVALID_JSON when a brace exists but content is malformed', () => {
  assert.throws(() => parseAnswerJson('here: {not: valid json,,,}'), (e) => e.errorCode === 'INVALID_JSON')
})

// (i) non-object JSON still throws AI_OUTPUT
test('(i) throws AI_OUTPUT for a bare number', () => {
  assert.throws(() => parseAnswerJson('42'), (e) => e.errorCode === 'AI_OUTPUT')
})

test('(i2) throws AI_OUTPUT for a bare array', () => {
  assert.throws(() => parseAnswerJson('[1, 2, 3]'), (e) => e.errorCode === 'AI_OUTPUT')
})

// empty / non-string guard
test('throws EMPTY_RESPONSE for empty or non-string input', () => {
  assert.throws(() => parseAnswerJson(''), (e) => e.errorCode === 'EMPTY_RESPONSE')
  assert.throws(() => parseAnswerJson('   '), (e) => e.errorCode === 'EMPTY_RESPONSE')
  assert.throws(() => parseAnswerJson(null), (e) => e.errorCode === 'EMPTY_RESPONSE')
})

// BOM / zero-width tolerance
test('tolerates a leading BOM and zero-width characters', () => {
  const input = '\uFEFF\u200B{"clean":true}'
  assert.deepEqual(parseAnswerJson(input), { clean: true })
})

// smart-quote wrapped fenced block with prose (resume-parser realistic case)
test('parses a realistic resume-parser response with fence + prose', () => {
  const input = 'Here is the structured JSON:\n\n```json\n{"firstName":"Sam","education":[{"collegeName":"MIT"}]}\n```\n\nThat should cover it.'
  assert.deepEqual(parseAnswerJson(input), { firstName: 'Sam', education: [{ collegeName: 'MIT' }] })
})
