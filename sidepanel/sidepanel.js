const CONFIG = self.JOB_AUTOFILL_CONFIG;

document.addEventListener('DOMContentLoaded', () => {
  checkState();
  checkActiveTabForm();
  
  document.getElementById('btn-signin').addEventListener('click', () => {
    window.open(`${CONFIG.WEB_APP_URL}/connect`);
  });
  
  // Dashboard links (both guest and user)
  const dashboardLinks = [document.getElementById('link-dashboard'), document.getElementById('link-dashboard-guest')];
  dashboardLinks.forEach(link => {
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(`${CONFIG.WEB_APP_URL}/dashboard`);
      });
    }
  });


  const signoutLinks = [document.getElementById('link-signout'), document.getElementById('link-signout-guest')];
  signoutLinks.forEach(link => {
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => {
          checkState();
        });
      });
    }
  });
  document.getElementById('btn-sync').addEventListener('click', () => {
    const status = document.getElementById('status-msg');
    status.innerText = 'Syncing profile...';
    status.style.color = '#2563eb';
    chrome.runtime.sendMessage({ type: 'REFRESH_PROFILE' }, (res) => {
      if (res && res.error) {
        status.innerText = 'Error: ' + res.error;
        status.style.color = '#dc2626';
      } else {
        status.innerText = 'Profile synced successfully!';
      }
      setTimeout(() => status.innerText = '', 3000);
    });
  });
  
  document.getElementById('btn-parse-jd').addEventListener('click', async () => {
    const status = document.getElementById('status-msg');
    status.innerText = 'Parsing...';
    status.style.color = '#2563eb';
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.runtime.sendMessage({ type: 'PARSE_JD_TAB', tabId: tab.id }, (res) => {
      if (res && res.error) {
        status.innerText = 'Error: ' + res.error;
        status.style.color = '#dc2626';
      } else {
        status.innerText = 'JD Parsed!';
      }
      setTimeout(() => status.innerText = '', 3000);
    });
  });
  
  document.getElementById('btn-autofill').addEventListener('click', async () => {
    const status = document.getElementById('status-msg');
    status.innerText = '';
    
    const container = document.getElementById('progress-container');
    const bar = document.getElementById('progress-bar');
    const txt = document.getElementById('progress-text');
    if (container && bar && txt) {
      container.style.display = 'block';
      txt.style.display = 'block';
      bar.style.backgroundColor = '';
      txt.style.color = '';
      bar.style.width = '5%';
      txt.innerText = 'Starting autofill...';
    }
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      if (txt) { txt.innerText = 'Error: No active tab found'; txt.style.color = '#dc2626'; }
      return;
    }

    const autofillTimeout = setTimeout(() => {
      if (txt && txt.innerText === 'Starting autofill...') {
        txt.innerText = 'Error: Timeout starting autofill. Please reload tab.';
        txt.style.color = '#dc2626';
        if (bar) bar.style.backgroundColor = '#dc2626';
      }
    }, 12000);

    chrome.runtime.sendMessage({ type: 'START_AUTOFILL_TAB', tabId: tab.id }, (res) => {
      if (res && res.error) {
        clearTimeout(autofillTimeout);
        if (txt) {
          txt.innerText = 'Error: ' + res.error;
          txt.style.color = '#dc2626';
        }
        if (bar) bar.style.backgroundColor = '#dc2626';
        setTimeout(() => {
          if (container) container.style.display = 'none';
          if (txt) {
            txt.style.display = 'none';
            txt.style.color = '';
          }
        }, 5000);
      }
    });
  });

  // Settings Panel Toggle
  const toggleBtn = document.getElementById('btn-settings');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const panel = document.getElementById('api-key-panel');
      if (panel) {
        panel.classList.toggle('hidden');
      }
    });
  }

  // Dropdown changes
  const provSelect = document.getElementById('provider-select');
  if (provSelect) {
    provSelect.addEventListener('change', (e) => {
      toggleGroupVisibility(e.target.value, '');
    });
  }
  
  const provSelectNokey = document.getElementById('provider-select-nokey');
  if (provSelectNokey) {
    provSelectNokey.addEventListener('change', (e) => {
      toggleGroupVisibility(e.target.value, '-nokey');
    });
  }

  // Save Buttons
  const saveBtn = document.getElementById('btn-save-keys');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const provider = document.getElementById('provider-select').value;
      const geminiKey = document.getElementById('gemini-key-input').value.trim();
      const groqKey = document.getElementById('groq-key-input').value.trim();
      
      chrome.storage.local.set({ provider, geminiKey, groqKey }, () => {
        const status = document.getElementById('status-msg');
        if (status) {
          status.innerText = 'Key settings saved!';
          status.style.color = '#2563eb';
          setTimeout(() => status.innerText = '', 3000);
        }
        // Collapse panel
        const panel = document.getElementById('api-key-panel');
        const chevron = document.getElementById('chevron-settings');
        if (panel) panel.classList.add('hidden');
        if (chevron) chevron.style.transform = '';
        checkState();
      });
    });
  }

  const saveBtnNokey = document.getElementById('btn-save-keys-nokey');
  if (saveBtnNokey) {
    saveBtnNokey.addEventListener('click', () => {
      const provider = document.getElementById('provider-select-nokey').value;
      const geminiKey = document.getElementById('gemini-key-input-nokey').value.trim();
      const groqKey = document.getElementById('groq-key-input-nokey').value.trim();
      
      chrome.storage.local.set({ provider, geminiKey, groqKey }, () => {
        const status = document.getElementById('status-msg');
        if (status) {
          status.innerText = 'API Key saved successfully!';
          status.style.color = '#2563eb';
          setTimeout(() => status.innerText = '', 3000);
        }
        checkState();
      });
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'AUTOFILL_PROGRESS') {
    const container = document.getElementById('progress-container');
    const bar = document.getElementById('progress-bar');
    const txt = document.getElementById('progress-text');
    
    if (container && bar && txt) {
      container.style.display = 'block';
      txt.style.display = 'block';
      bar.style.backgroundColor = msg.isError ? '#dc2626' : ''; // Red if error
      bar.style.width = `${msg.percent}%`;
      txt.innerText = msg.text;
      if (msg.isError) txt.style.color = '#dc2626';
      else txt.style.color = '';
      
      if (msg.percent >= 100 && !msg.isError) {
        setTimeout(() => {
          container.style.display = 'none';
          txt.style.display = 'none';
          bar.style.width = '0%';
          txt.style.color = '';
        }, 3000);
      }
    }
  }
});

function getInitials(email) {
  if (!email) return 'AP';
  return email.substring(0, 2).toUpperCase();
}

async function loadSettings() {
  const data = await self.APPLYONCE_PROVIDER_SETTINGS.getEffectiveProviderSettings(chrome.storage.local);
  const provider = data.provider;
  const geminiKey = data.geminiKey || '';
  const groqKey = data.groqKey || '';
  
  // Set ready panel values
  const providerSelect = document.getElementById('provider-select');
  const geminiInput = document.getElementById('gemini-key-input');
  const groqInput = document.getElementById('groq-key-input');
  
  if (providerSelect) providerSelect.value = provider;
  if (geminiInput) geminiInput.value = geminiKey;
  if (groqInput) groqInput.value = groqKey;
  
  // Set no-key panel values
  const providerSelectNokey = document.getElementById('provider-select-nokey');
  const geminiInputNokey = document.getElementById('gemini-key-input-nokey');
  const groqInputNokey = document.getElementById('groq-key-input-nokey');
  
  if (providerSelectNokey) providerSelectNokey.value = provider;
  if (geminiInputNokey) geminiInputNokey.value = geminiKey;
  if (groqInputNokey) groqInputNokey.value = groqKey;
  
  toggleGroupVisibility(provider, '');
  toggleGroupVisibility(provider, '-nokey');
}

function toggleGroupVisibility(provider, suffix) {
  const geminiGroup = document.getElementById(`gemini-key-group${suffix}`);
  const groqGroup = document.getElementById(`groq-key-group${suffix}`);
  
  if (provider === 'gemini') {
    if (geminiGroup) geminiGroup.classList.remove('hidden');
    if (groqGroup) groqGroup.classList.add('hidden');
  } else {
    if (geminiGroup) geminiGroup.classList.add('hidden');
    if (groqGroup) groqGroup.classList.remove('hidden');
  }
}

function checkState() {
  chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' }, (state) => {
    document.getElementById('state-signed-out').classList.add('hidden');
    document.getElementById('state-no-key').classList.add('hidden');
    document.getElementById('state-ready').classList.add('hidden');
    document.getElementById('user-footer').classList.add('hidden');
    document.getElementById('guest-links').classList.add('hidden');
    
    if (!state || !state.signedIn) {
      document.getElementById('state-signed-out').classList.remove('hidden');
      document.getElementById('guest-links').classList.remove('hidden');
      document.getElementById('detective-img').style.display = 'none';
    } else if (!state.hasKey) {
      document.getElementById('state-no-key').classList.remove('hidden');
      document.getElementById('user-footer').classList.remove('hidden');
      document.getElementById('user-email').innerText = state.email;
      document.getElementById('user-initials').innerText = getInitials(state.email);
      document.getElementById('detective-img').style.display = 'block';
    } else {
      document.getElementById('state-ready').classList.remove('hidden');
      document.getElementById('user-footer').classList.remove('hidden');
      document.getElementById('user-email').innerText = state.email;
      document.getElementById('user-initials').innerText = getInitials(state.email);
      document.getElementById('detective-img').style.display = 'block';
    }
    
    // Always sync panel fields with newest state
    loadSettings();
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes.session || changes.provider || changes.geminiKey || changes.groqKey)) {
    checkState();
  }
});

async function checkActiveTabForm() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      hideFormBadge();
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { type: 'CHECK_APPLICATION_FORM' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        hideFormBadge();
        return;
      }
      if (res.hasForm) {
        showFormBadge(res.siteName, res.fieldCount);
      } else {
        hideFormBadge();
      }
    });
  } catch (e) {
    hideFormBadge();
  }
}

function showFormBadge(siteName, fieldCount) {
  const badge = document.getElementById('detection-badge');
  const title = document.getElementById('badge-title');
  const sub = document.getElementById('badge-sub');
  if (badge && title && sub) {
    title.innerText = `${siteName} Form Detected`;
    sub.innerText = `Detected ${fieldCount} application fields ready to autofill`;
    badge.classList.remove('hidden');
  }
}

function hideFormBadge() {
  const badge = document.getElementById('detection-badge');
  if (badge) {
    badge.classList.add('hidden');
  }
}

try {
  chrome.tabs.onActivated.addListener(() => checkActiveTabForm());
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') checkActiveTabForm();
  });
} catch (e) {}
