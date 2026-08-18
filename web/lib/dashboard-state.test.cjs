const test = require('node:test')
const assert = require('node:assert/strict')
const {
  getResumeParseWarning,
  getSavedResumeParseWarning,
  hasUnsavedDashboardChanges,
} = require('./dashboard-state.ts')

test('a pending resume exposes Save Changes even when the profile is unchanged', () => {
  const profile = { firstName: 'Ada', skills: ['TypeScript'] }

  assert.equal(hasUnsavedDashboardChanges(profile, profile, true), true)
})

test('clearing the pending resume restores the saved state', () => {
  const profile = { firstName: 'Ada', skills: ['TypeScript'] }

  assert.equal(hasUnsavedDashboardChanges(profile, profile, false), false)
  assert.equal(hasUnsavedDashboardChanges({ ...profile, firstName: 'Grace' }, profile, false), true)
})

test('pending resumes always count as unsaved across generated profiles', () => {
  for (let index = 0; index < 250; index += 1) {
    const profile = {
      firstName: Math.random().toString(36).slice(2),
      skills: Array.from({ length: index % 5 }, () => Math.random().toString(36).slice(2)),
      expectedSalary: index,
    }

    assert.equal(hasUnsavedDashboardChanges(profile, structuredClone(profile), true), true)
  }
})

test('resume parse warnings are non-blocking and do not expose provider details', () => {
  const extensionWarning = getResumeParseWarning(null, 'extension')
  const temporaryWarning = getResumeParseWarning(new Error('Gemini API error: 503 raw provider body'))
  const rateWarning = getResumeParseWarning(new Error('429 rate limit exceeded'))

  assert.match(extensionWarning, /still ready to save/i)
  assert.match(temporaryWarning, /temporarily unavailable/i)
  assert.match(rateWarning, /rate-limited/i)
  assert.doesNotMatch(temporaryWarning, /Gemini|503|raw provider body/i)
})

test('structured resume parser codes produce specific safe warnings', () => {
  const expectedPatterns = new Map([
    ['RATE_LIMIT', /rate-limited/i],
    ['TEMPORARY_UNAVAILABLE', /temporarily unavailable/i],
    ['MODEL_UNAVAILABLE', /no configured model/i],
    ['NETWORK_ERROR', /check your connection/i],
    ['EMPTY_RESPONSE', /no profile data/i],
    ['INVALID_RESPONSE', /unreadable format/i],
    ['INVALID_JSON', /unreadable format/i],
    ['AI_OUTPUT', /unreadable format/i],
  ])

  for (const [errorCode, pattern] of expectedPatterns) {
    const warning = getResumeParseWarning({
      errorCode,
      error: 'raw secret provider response',
      provider: 'gemini',
      status: 503,
      model: 'test-model',
    })
    assert.match(warning, pattern)
    assert.match(warning, /ready to save/i)
    assert.doesNotMatch(warning, /raw secret|gemini|503|test-model/i)
  }
})

test('no-key warnings distinguish a selectable Gemini key from no configured key', () => {
  assert.equal(
    getResumeParseWarning({ errorCode: 'NO_API_KEY', provider: 'groq', hasGeminiKey: false, hasGroqKey: false }),
    'Add a Gemini API key in extension settings (or Groq key on dashboard) to enable autofill.',
  )
  assert.match(
    getResumeParseWarning({ errorCode: 'NO_API_KEY', provider: 'groq', hasGeminiKey: true, hasGroqKey: false }),
    /Select Gemini.*or add a Groq API key/i,
  )
})

test('saved resume warnings replace pending copy while preserving safe failure context', () => {
  const pendingWarning = getResumeParseWarning(new Error('parse failed'))
  const savedWarnings = [
    getSavedResumeParseWarning(pendingWarning),
    getSavedResumeParseWarning(getResumeParseWarning(new Error('429 rate limit exceeded'))),
    getSavedResumeParseWarning(getResumeParseWarning(new Error('503 temporary provider failure'))),
  ]

  assert.match(pendingWarning, /ready to save/i)
  assert.equal(
    savedWarnings[0],
    'Resume saved, but AI autofill failed. Profile fields were not auto-filled.',
  )
  assert.match(savedWarnings[1], /rate-limited/i)
  assert.match(savedWarnings[2], /temporarily unavailable/i)

  for (const warning of savedWarnings) {
    assert.match(warning, /^Resume saved,/)
    assert.match(warning, /Profile fields were not auto-filled\./)
    assert.doesNotMatch(warning, /ready to save|provider|429|503/i)
  }
})
