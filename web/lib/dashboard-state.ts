export type ResumeParseError = {
  errorCode?: unknown
  error?: unknown
  provider?: unknown
  status?: unknown
  model?: unknown
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'error' in error) {
    return String((error as ResumeParseError).error || '')
  }
  return String(error || '')
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('errorCode' in error)) return ''
  return String((error as ResumeParseError).errorCode || '').toUpperCase()
}

export function hasUnsavedDashboardChanges(
  currentProfile: unknown,
  savedProfile: unknown,
  hasPendingResume: boolean,
) {
  return hasPendingResume || JSON.stringify(currentProfile) !== JSON.stringify(savedProfile)
}

export function getResumeParseWarning(
  error: unknown,
  source: 'extension' | 'ai' = 'ai',
) {
  if (source === 'extension') {
    return "The extension isn't connected, so profile fields were not auto-filled. Your PDF is still ready to save."
  }

  const code = getErrorCode(error)
  if (code === 'NO_API_KEY') {
    return 'Add a Gemini API key on the dashboard (or in extension settings) to enable autofill. Your PDF is still ready to save.'
  }
  if (code === 'INVALID_API_KEY') {
    return 'The Gemini API key looks invalid or restricted. Profile fields were not auto-filled; your PDF is still ready to save. Update the key and try again.'
  }
  if (code === 'RATE_LIMIT') {
    return 'AI resume parsing is rate-limited right now. Profile fields were not auto-filled; your PDF is still ready to save. Please try again later.'
  }
  if (code === 'TEMPORARY_UNAVAILABLE') {
    return 'AI resume parsing is temporarily unavailable. Profile fields were not auto-filled; your PDF is still ready to save. Please try again shortly.'
  }
  if (code === 'MODEL_UNAVAILABLE') {
    return 'AI resume parsing is currently unavailable because no configured model could complete the request. Your PDF is still ready to save.'
  }
  if (code === 'NETWORK_ERROR') {
    return 'AI resume parsing could not reach the selected provider. Check your connection and try again; your PDF is still ready to save.'
  }
  if (code === 'EMPTY_RESPONSE') {
    return 'The AI returned no profile data. Your PDF is still ready to save; please try again or fill in details manually.'
  }
  if (code === 'INVALID_RESPONSE' || code === 'INVALID_JSON' || code === 'AI_OUTPUT') {
    return 'The AI returned profile data in an unreadable format. Your PDF is still ready to save; please try again or fill in details manually.'
  }

  const message = getErrorMessage(error)
  if (/invalid or restricted|invalid api key/i.test(message)) {
    return 'The Gemini API key looks invalid or restricted. Profile fields were not auto-filled; your PDF is still ready to save. Update the key and try again.'
  }
  if (/api key not configured|no api key|no gemini api key/i.test(message)) {
    return 'Add a Gemini API key on the dashboard (or in extension settings) to enable autofill. Your PDF is still ready to save.'
  }
  if (/rate.?limit|\b429\b/i.test(message)) {
    return 'AI resume parsing is rate-limited right now. Profile fields were not auto-filled; your PDF is still ready to save. Please try again later.'
  }
  if (/temporar|\b503\b/i.test(message)) {
    return 'AI resume parsing is temporarily unavailable. Profile fields were not auto-filled; your PDF is still ready to save. Please try again shortly.'
  }
  if (/model.*unavailable|configured AI models are unavailable|\b404\b/i.test(message)) {
    return 'AI resume parsing is currently unavailable. Profile fields were not auto-filled; your PDF is still ready to save.'
  }
  return "We couldn't auto-fill profile fields from this resume. Your PDF is still ready to save; you can fill in details manually."
}

export function getSavedResumeParseWarning(warning: unknown) {
  const message = warning instanceof Error ? warning.message : String(warning || '')

  if (/invalid or restricted|invalid api key/i.test(message)) {
    return 'Resume saved, but AI autofill failed because the Gemini API key is invalid or restricted. Profile fields were not auto-filled.'
  }
  if (/Add a Gemini API key/i.test(message)) {
    return 'Resume saved, but AI autofill needs an API key. Add a Gemini API key and try again.'
  }
  if (/rate.?limit|\b429\b/i.test(message)) {
    return 'Resume saved, but AI autofill was rate-limited. Profile fields were not auto-filled. Please try again later.'
  }
  if (/temporar|\b503\b/i.test(message)) {
    return 'Resume saved, but AI autofill was temporarily unavailable. Profile fields were not auto-filled. Please try again shortly.'
  }
  if (/extension.*(?:isn't|not) connected/i.test(message)) {
    return "Resume saved, but profile autofill failed because the extension isn't connected. Profile fields were not auto-filled."
  }
  if (/currently unavailable|model.*unavailable|configured AI models are unavailable|\b404\b/i.test(message)) {
    return 'Resume saved, but AI autofill was unavailable. Profile fields were not auto-filled.'
  }
  return 'Resume saved, but AI autofill failed. Profile fields were not auto-filled.'
}
