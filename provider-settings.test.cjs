const test = require('node:test')
const assert = require('node:assert/strict')
const { getEffectiveProviderSettings } = require('./provider-settings.js')

function makeStorage(seed = {}) {
  const data = { ...seed }
  const writes = []
  return {
    data,
    writes,
    async get(keys) {
      return Object.fromEntries(keys.filter((key) => key in data).map((key) => [key, data[key]]))
    },
    async set(values) {
      writes.push({ ...values })
      Object.assign(data, values)
    },
  }
}

test('missing provider defaults to and persists Gemini', async () => {
  const storage = makeStorage({ geminiKey: 'test-gemini-key' })
  const result = await getEffectiveProviderSettings(storage)
  assert.equal(result.provider, 'gemini')
  assert.equal(storage.data.provider, 'gemini')
})

test('stored Groq without a key migrates to Gemini', async () => {
  const storage = makeStorage({ provider: 'groq' })
  assert.equal((await getEffectiveProviderSettings(storage)).provider, 'gemini')
  assert.equal(storage.data.provider, 'gemini')
})

test('stored Groq with a blank key migrates to Gemini', async () => {
  const storage = makeStorage({ provider: 'groq', groqKey: '  \n ' })
  assert.equal((await getEffectiveProviderSettings(storage)).provider, 'gemini')
  assert.equal(storage.data.provider, 'gemini')
})

test('stored Groq with a non-empty key remains Groq', async () => {
  const storage = makeStorage({ provider: 'groq', groqKey: 'test-groq-key' })
  assert.equal((await getEffectiveProviderSettings(storage)).provider, 'groq')
  assert.equal(storage.data.provider, 'groq')
  assert.deepEqual(storage.writes, [])
})

test('migration is idempotent and retains Gemini key state', async () => {
  const storage = makeStorage({ geminiKey: 'test-gemini-key' })
  assert.equal((await getEffectiveProviderSettings(storage)).geminiKey, 'test-gemini-key')
  await getEffectiveProviderSettings(storage)
  assert.deepEqual(storage.writes, [{ provider: 'gemini' }])
})


test('a Groq key added during migration prevents the Groq selection from being overwritten', async () => {
  const states = [
    { provider: 'groq', groqKey: '' },
    { provider: 'groq', groqKey: 'new-test-groq-key' },
  ]
  const writes = []
  const storage = {
    async get() { return states.shift() || states[0] },
    async set(values) { writes.push(values) },
  }

  assert.equal((await getEffectiveProviderSettings(storage)).provider, 'groq')
  assert.deepEqual(writes, [])
})

test('effective settings preserve an AQ-dot Gemini key byte-for-byte', async () => {
  const key = 'AQ.placeholder.qBg'
  const storage = makeStorage({ provider: 'gemini', geminiKey: key })

  const result = await getEffectiveProviderSettings(storage)
  assert.equal(result.geminiKey, key)
  assert.deepEqual(storage.writes, [])
})