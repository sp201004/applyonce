export type DashboardAuthProvider = 'google' | 'email' | null

interface AuthIdentityLike {
  provider?: unknown
}

export interface AuthUserLike {
  app_metadata?: {
    provider?: unknown
    providers?: unknown
  } | null
  identities?: AuthIdentityLike[] | null
}

function addProvider(providers: Set<string>, value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    providers.add(value.trim().toLowerCase())
  }
}

export function getAuthProviderStatus(user: AuthUserLike) {
  const metadataProviders = new Set<string>()
  addProvider(metadataProviders, user.app_metadata?.provider)

  const providersValue = user.app_metadata?.providers
  if (Array.isArray(providersValue)) {
    providersValue.forEach((provider) => addProvider(metadataProviders, provider))
  } else {
    addProvider(metadataProviders, providersValue)
  }

  const identityProviders = new Set<string>()
  user.identities?.forEach((identity) => addProvider(identityProviders, identity.provider))

  const hasGoogle = metadataProviders.has('google') || identityProviders.has('google')
  const hasEmail = metadataProviders.has('email') || identityProviders.has('email')
  const isGoogleOnly = hasGoogle && !hasEmail
  const authProvider: DashboardAuthProvider = isGoogleOnly
    ? 'google'
    : hasEmail
      ? 'email'
      : hasGoogle
        ? 'google'
        : null

  return { hasGoogle, hasEmail, isGoogleOnly, authProvider }
}

export function passwordSetupStorageKey(userId: string) {
  return `applyonce_password_setup:${userId}`
}

export function shouldPromptForPassword(user: AuthUserLike, setupState: string | null) {
  const { isGoogleOnly } = getAuthProviderStatus(user)
  return isGoogleOnly && setupState !== 'skipped' && setupState !== 'completed'
}
