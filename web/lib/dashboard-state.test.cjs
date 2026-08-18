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

test('an invalid Gemini key produces a safe, non-blocking warning', () => {
  const warning = getResumeParseWarning({
    errorCode: 'INVALID_API_KEY',
    error: 'raw secret provider response AQ.secret/key',
    provider: 'gemini',
    status: 401,
    model: 'gemini-3.5-flash',
  })

  assert.match(warning, /invalid or restricted/i)
  assert.match(warning, /ready to save/i)
  assert.doesNotMatch(warning, /raw secret|AQ\.secret|401|generativelanguage/i)
})

test('a missing key points the user to add a Gemini key without leaking internals', () => {
  const warning = getResumeParseWarning({ errorCode: 'NO_API_KEY', provider: 'gemini' })

  assert.match(warning, /Add a Gemini API key/i)
  assert.match(warning, /ready to save/i)
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
