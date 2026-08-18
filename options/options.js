const CONFIG = self.JOB_AUTOFILL_CONFIG;

document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('provider');
  const geminiSettings = document.getElementById('gemini-settings');
  const groqSettings = document.getElementById('groq-settings');
  const geminiKey = document.getElementById('gemini-key');
  const groqKey = document.getElementById('groq-key');
  const groqModel = document.getElementById('groq-model');
  const saveBtn = document.getElementById('save-btn');
  const status = document.getElementById('status');
  
  self.APPLYONCE_PROVIDER_SETTINGS
    .getEffectiveProviderSettings(chrome.storage.local, ['groqModel'])
    .then((data) => {
      providerSelect.value = data.provider;
      if (data.geminiKey) geminiKey.value = data.geminiKey;
      if (data.groqKey) groqKey.value = data.groqKey;
      if (data.groqModel) groqModel.value = data.groqModel;
      updateVisibility();
    });
  
  providerSelect.addEventListener('change', updateVisibility);
  
  function updateVisibility() {
    if (providerSelect.value === 'gemini') {
      geminiSettings.classList.remove('hidden');
      groqSettings.classList.add('hidden');
    } else {
      geminiSettings.classList.add('hidden');
      groqSettings.classList.remove('hidden');
    }
  }
  
  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      provider: providerSelect.value,
      geminiKey: geminiKey.value.trim(),
      groqKey: groqKey.value.trim(),
      groqModel: groqModel.value
    }, () => {
      status.innerText = 'Saved!';
      setTimeout(() => status.innerText = '', 2000);
    });
  });
  
  updateAccount();
});

function updateAccount() {
  chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' }, (state) => {
    const div = document.getElementById('account-info');
    if (state.signedIn) {
      div.innerHTML = `
        <div class="account-status">
          <span style="color: #6b7280;">Signed in as:</span>
          <strong id="user-email-text"></strong>
          <svg style="margin-left: auto; color: #059669;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="account-buttons">
          <button id="btn-dashboard" class="outline-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            Open Dashboard
          </button>
          <button id="btn-signout" class="danger-outline-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      `;
      document.getElementById('user-email-text').textContent = state.email;
      document.getElementById('btn-dashboard').addEventListener('click', () => {
        window.open(`${CONFIG.WEB_APP_URL}/dashboard`);
      });
      document.getElementById('btn-signout').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, updateAccount);
      });
    } else {
      div.innerHTML = `
        <div class="account-status">
          <span style="color: #6b7280;">Not signed in.</span>
        </div>
        <button id="btn-signin" class="primary-btn" style="width: 100%; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Sign in / Sign up
        </button>
      `;
      document.getElementById('btn-signin').addEventListener('click', () => {
        window.open(`${CONFIG.WEB_APP_URL}/connect`);
      });
    }
  });
}
