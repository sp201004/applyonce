const test = require('node:test')
const assert = require('node:assert/strict')
const {
  getAuthProviderStatus,
  passwordSetupStorageKey,
  shouldPromptForPassword,
} = require('./auth-provider.ts')

test('detects Google-only users from either metadata shape or identities', () => {
  const users = [
    { app_metadata: { provider: 'google' } },
    { app_metadata: { providers: ['google'] } },
    { identities: [{ provider: 'google' }] },
  ]

  for (const user of users) {
    assert.equal(getAuthProviderStatus(user).isGoogleOnly, true)
    assert.equal(shouldPromptForPassword(user, null), true)
  }
})

test('never prompts email/password or Google users with an email provider', () => {
  const users = [
    { app_metadata: { provider: 'email' }, identities: [{ provider: 'email' }] },
    { app_metadata: { providers: ['google', 'email'] } },
    { identities: [{ provider: 'google' }, { provider: 'email' }] },
  ]

  for (const user of users) {
    assert.equal(shouldPromptForPassword(user, null), false)
    assert.equal(getAuthProviderStatus(user).authProvider, 'email')
  }
})

test('skip and completed states suppress only the keyed user prompt', () => {
  const googleUser = { app_metadata: { providers: ['google'] } }

  assert.equal(shouldPromptForPassword(googleUser, 'skipped'), false)
  assert.equal(shouldPromptForPassword(googleUser, 'completed'), false)
  assert.notEqual(passwordSetupStorageKey('user-a'), passwordSetupStorageKey('user-b'))
  assert.equal(passwordSetupStorageKey('user-a'), 'applyonce_password_setup:user-a')
})
