(function initializeProviderSettings(root) {
  const DEFAULT_AI_PROVIDER = 'gemini';
  const PROVIDER_STORAGE_KEYS = Object.freeze(['provider', 'geminiKey', 'groqKey']);

  function hasNonEmptyKey(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function getEffectiveProvider(settings = {}) {
    if (settings.provider === 'groq' && hasNonEmptyKey(settings.groqKey)) {
      return 'groq';
    }
    return DEFAULT_AI_PROVIDER;
  }

  async function getEffectiveProviderSettings(storage, additionalKeys = []) {
    const keys = [...new Set([...PROVIDER_STORAGE_KEYS, ...additionalKeys])];
    let settings = await storage.get(keys);
    let provider = getEffectiveProvider(settings);

    if (settings.provider !== provider) {
      // Re-read before persisting so a Groq key saved during startup is preserved.
      settings = await storage.get(keys);
      provider = getEffectiveProvider(settings);
      if (settings.provider !== provider) {
        await storage.set({ provider });
      }
    }

    return { ...settings, provider };
  }

  const api = Object.freeze({
    DEFAULT_AI_PROVIDER,
    PROVIDER_STORAGE_KEYS,
    hasNonEmptyKey,
    getEffectiveProvider,
    getEffectiveProviderSettings
  });

  root.APPLYONCE_PROVIDER_SETTINGS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);