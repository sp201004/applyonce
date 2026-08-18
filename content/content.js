if (!window.__applyonce_content_script_injected) {
  window.__applyonce_content_script_injected = true;

  let seenElements = new WeakSet();

function debugLog(msg) {
  console.log('[ApplyOnce Debug]', msg);
  const logOverlay = document.getElementById('applyonce-debug-logs');
  if (logOverlay) {
    const p = document.createElement('p');
    p.style.margin = '3px 0';
    p.style.borderBottom = '1px solid rgba(0,255,0,0.1)';
    p.style.paddingBottom = '3px';
    p.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logOverlay.appendChild(p);
    logOverlay.scrollTop = logOverlay.scrollHeight;
  }
}

if (location.href.includes('sample-form.html')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDebugOverlay);
  } else {
    initDebugOverlay();
  }
}

function initDebugOverlay() {
  if (document.getElementById('applyonce-debug-overlay')) return;
  const logDiv = document.createElement('div');
  logDiv.id = 'applyonce-debug-overlay';
  logDiv.style.cssText = 'position: fixed; bottom: 20px; left: 20px; width: 480px; height: 320px; background: rgba(15,23,42,0.95); color: #22c55e; font-family: monospace; font-size: 11px; padding: 12px; overflow: hidden; z-index: 999999; border-radius: 12px; border: 1.5px solid #22c55e; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4); display: flex; flex-direction: column;';
  
  const header = document.createElement('div');
  header.style.cssText = 'font-weight: 800; border-bottom: 1.5px solid #22c55e; padding-bottom: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: white;';
  header.innerHTML = '<span>⚡ APPLYONCE AUTOFILL DEBUG CONSOLE</span><span style="cursor:pointer;color:#ef4444;font-size:14px;font-weight:bold;" onclick="document.getElementById(\'applyonce-overlay-container\').remove()">✕</span>';
  logDiv.appendChild(header);
  
  const contentArea = document.createElement('div');
  contentArea.id = 'applyonce-debug-logs';
  contentArea.style.cssText = 'flex: 1; overflow-y: auto; padding-right: 4px;';
  logDiv.appendChild(contentArea);
  
  const container = document.createElement('div');
  container.id = 'applyonce-overlay-container';
  container.appendChild(logDiv);
  document.body.appendChild(container);
  
  debugLog("Debug Console initialized.");
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PING') {
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === 'GET_PAGE_TEXT') {
    const pageText = (document.body && document.body.innerText ? document.body.innerText : '') || (document.documentElement ? document.documentElement.innerText : '') || '';
    sendResponse({ text: pageText, title: document.title, url: location.href });
    return;
  }
  if (msg.type === 'CHECK_APPLICATION_FORM') {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea, [contenteditable="true"], [role="radio"], [role="checkbox"], [role="combobox"], [aria-haspopup="listbox"], [data-automation-id*="select"], [data-automation-id*="dropdown"], .select__control'));
    const isFormPresent = inputs.length >= 2;
    const host = location.hostname.toLowerCase();
    let siteName = 'Job Portal';
    if (host.includes('greenhouse')) siteName = 'Greenhouse';
    else if (host.includes('lever')) siteName = 'Lever';
    else if (host.includes('workday') || host.includes('myworkdayjobs')) siteName = 'Workday';
    else if (host.includes('ashby')) siteName = 'Ashby';
    else if (host.includes('linkedin')) siteName = 'LinkedIn';
    else if (host.includes('indeed')) siteName = 'Indeed';
    else if (host.includes('smartrecruiters')) siteName = 'SmartRecruiters';
    else if (host.includes('workable')) siteName = 'Workable';
    else if (host.includes('bamboohr')) siteName = 'BambooHR';
    else if (host.includes('wellfound')) siteName = 'Wellfound';

    sendResponse({ 
      hasForm: isFormPresent, 
      fieldCount: inputs.length,
      siteName: siteName
    });
    return;
  }
  if (msg.type === 'EXTRACT_FIELDS') {
    debugLog("Manual autofill triggered. Resetting element cache.");
    seenElements = new WeakSet();
    extractAndFill();
    sendResponse({ ok: true });
    return;
  }
});

// --- Repeated-group (multi-entry) detection helpers ---
const __repeatContainerKeyMap = new WeakMap();
let __repeatContainerKeySeq = 0;

function getRepeatContainerKey(node) {
  if (!node) return '';
  if (!__repeatContainerKeyMap.has(node)) {
    __repeatContainerKeyMap.set(node, 'c' + (++__repeatContainerKeySeq));
  }
  return __repeatContainerKeyMap.get(node);
}

// Walk up to find the nearest repeating section container for a field.
function findRepeatContainer(el) {
  const typeRe = /(work.?experience|experience|employment|education|academic|project)/i;
  let node = el.parentElement;
  for (let i = 0; i < 8 && node && node !== document.body; i++) {
    if (node.tagName === 'FIELDSET') return node;
    const attrText = [
      node.id || '',
      typeof node.className === 'string' ? node.className : '',
      node.getAttribute ? (node.getAttribute('data-section') || '') : '',
      node.getAttribute ? (node.getAttribute('data-repeat') || '') : '',
      node.getAttribute ? (node.getAttribute('data-automation-id') || '') : ''
    ].join(' ');
    if (typeRe.test(attrText)) return node;
    node = node.parentElement;
  }
  return null;
}

// Best-effort section heading text (used to detect type + explicit index).
function getSectionHeadingText(container, el) {
  if (container) {
    const legend = container.querySelector('legend');
    if (legend && legend.innerText.trim()) return legend.innerText.trim();
    const heading = container.querySelector('h1, h2, h3, h4, h5, h6, .section-title, .form-section-title, [class*="section-title"]');
    if (heading && heading.innerText.trim()) return heading.innerText.trim();
    if (container.getAttribute) {
      const auto = container.getAttribute('data-automation-id') || container.getAttribute('data-section') || '';
      if (auto) return auto;
    }
  }
  return getGroupLabel(el) || '';
}

function getGroupLabel(el) {
  const fieldset = el.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) return legend.innerText.trim();
  }
  
  let parent = el.parentElement;
  for (let i = 0; i < 3; i++) {
    if (!parent || parent === document.body) break;
    const siblingLabel = parent.querySelector('label:not(.field-row)');
    if (siblingLabel && siblingLabel !== el.closest('label')) {
      return siblingLabel.innerText.trim();
    }
    const heading = parent.querySelector('h1, h2, h3, h4, h5, h6, .field-title, .form-section-title');
    if (heading) {
      return heading.innerText.trim();
    }
    parent = parent.parentElement;
  }
  return '';
}

function getLabel(el) {
  let baseLabel = '';
  if (el.getAttribute('aria-label')) {
    baseLabel = el.getAttribute('aria-label');
  } else if (el.getAttribute('aria-labelledby')) {
    const labelIds = el.getAttribute('aria-labelledby').split(/\s+/);
    baseLabel = labelIds.map(id => {
      try {
        const labelEl = document.getElementById(id);
        return labelEl ? labelEl.innerText.trim() : '';
      } catch (e) {
        return '';
      }
    }).filter(Boolean).join(' ');
  } else if (el.id) {
    const labelEl = document.querySelector(`label[for="${el.id}"]`);
    if (labelEl) baseLabel = labelEl.innerText;
  }
  
  if (!baseLabel) {
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true);
      const input = clone.querySelector('input, select, textarea');
      if (input) input.remove();
      baseLabel = clone.innerText.trim();
    }
  }

  // Google Forms fallback
  if (!baseLabel) {
    const listItem = el.closest('[role="listitem"]');
    if (listItem) {
      const heading = listItem.querySelector('[role="heading"]');
      if (heading) {
        baseLabel = heading.innerText.trim();
      } else {
        // Sometimes the title doesn't have role="heading" but is the first text element
        const firstDiv = listItem.querySelector('div');
        if (firstDiv && firstDiv.innerText) {
          // just taking a snippet if it's too long, but usually it's the question title
          baseLabel = firstDiv.innerText.split('\n')[0].trim();
        }
      }
    }
  }
  
  if (!baseLabel) {
    const autoId = el.getAttribute('data-automation-id');
    if (autoId) {
      baseLabel = autoId.split('_').pop();
    }
  }
  
  if (!baseLabel) {
    baseLabel = el.placeholder || el.name || '';
  }
  
  if (el.type === 'radio' || el.type === 'checkbox') {
    const groupLabel = getGroupLabel(el);
    if (groupLabel && groupLabel.toLowerCase() !== baseLabel.toLowerCase()) {
      return `${groupLabel} - ${baseLabel}`;
    }
  }
  
  return baseLabel;
}

function getOptions(el) {
  if (el.tagName === 'SELECT') {
    return Array.from(el.options).map(o => o.text);
  }
  return [];
}

async function extractAndFill(root = document) {
  debugLog("Scanning DOM for input elements...");
  const inputs = Array.from(root.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea, [contenteditable="true"], [role="radio"], [role="checkbox"], [role="combobox"], [aria-haspopup="listbox"], [data-automation-id*="select"], [data-automation-id*="dropdown"], [data-automation-id*="formField"], .select__control'));
  const fields = [];
  const groupInputs = []; // parallel descriptors for repeated-group detection
  
  inputs.forEach((el, i) => {
    if (seenElements.has(el)) return;
    
    // Skip div-based controls if they contain a native input we already match to avoid duplicates, 
    // unless they are Google Forms structure (often only have div-based controls).
    if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && el.tagName !== 'TEXTAREA') {
      const nativeInput = el.querySelector('input:not([type="hidden"]), select, textarea');
      if (nativeInput && inputs.includes(nativeInput)) return;
    }

    const label = getLabel(el);
    const name = el.name || el.getAttribute('name') || '';
    const placeholder = el.placeholder || el.getAttribute('placeholder') || '';
    
    // For div-based radios/checkboxes, extract their specific option text
    let type = el.type || el.tagName.toLowerCase();
    let optionText = '';
    
    if (el.getAttribute('role') === 'radio') {
      type = 'radio';
      optionText = el.getAttribute('aria-label') || el.innerText.trim();
    } else if (el.getAttribute('role') === 'checkbox') {
      type = 'checkbox';
      optionText = el.getAttribute('aria-label') || el.innerText.trim();
    } else if (el.getAttribute('role') === 'combobox') {
      type = 'select-one'; // Custom dropdown
    }

    // Ignore completely anonymous fields to prevent matching hallucinations
    if (!label && !name && !placeholder && !optionText) {
      return;
    }
    
    seenElements.add(el);
    
    // Generate a temporary ID if none exists to map back
    if (!el.dataset.autofillId) {
      el.dataset.autofillId = 'field_' + Math.random().toString(36).substr(2, 9);
    }
    
    // If it's a non-native radio/checkbox, append its option text to label to simulate native behavior
    const finalLabel = (type === 'radio' || type === 'checkbox') && optionText && !label.includes(optionText) 
      ? `${label} - ${optionText}` 
      : label;

    fields.push({
      id: el.dataset.autofillId,
      name: name,
      type: type,
      placeholder: placeholder,
      label: finalLabel,
      options: getOptions(el)
    });

    // Collect signals used to cluster this field into a repeating section.
    const container = findRepeatContainer(el);
    groupInputs.push({
      id: el.dataset.autofillId,
      name: name,
      label: finalLabel,
      headingText: getSectionHeadingText(container, el),
      containerKey: container ? getRepeatContainerKey(container) : '',
      domOrder: i
    });
  });

  // Assign multi-entry group indices so experience[i] -> section i (not all -> [0]).
  try {
    const rg = (typeof self !== 'undefined' && self.APPLYONCE_REPEAT_GROUPS) || null;
    if (rg) {
      const assignments = rg.assignGroupIndices(groupInputs);
      let groupedCount = 0;
      fields.forEach(f => {
        const a = assignments[f.id];
        if (a) {
          f.groupType = a.type;
          f.groupIndex = a.index;
          groupedCount++;
        }
      });
      if (groupedCount > 0) {
        debugLog(`Detected ${groupedCount} fields across repeated sections (multi-entry mapping).`);
      }
    }
  } catch (err) {
    debugLog(`Group detection skipped: ${err.message || err}`);
  }
  
  debugLog(`Found ${fields.length} new inputs to match.`);
  if (fields.length === 0) {
    chrome.runtime.sendMessage({ type: 'AUTOFILL_PROGRESS', percent: 100, isError: true, text: 'No fillable form inputs found on this page.' });
    return;
  }
  
  debugLog("Sending MATCH_FIELDS request to background script...");
  chrome.runtime.sendMessage({ type: 'AUTOFILL_PROGRESS', percent: 15, text: 'Scanning page...' });
  chrome.runtime.sendMessage({ type: 'MATCH_FIELDS', fields }, (response) => {
    if (response && response.error) {
      debugLog(`Error from matcher: ${response.error}`);
      chrome.runtime.sendMessage({ type: 'AUTOFILL_PROGRESS', percent: 100, isError: true, text: response.error });
    } else if (response && response.matched) {
      debugLog(`Received matches: ${JSON.stringify(response.matched)}`);
      fillFields(response.matched, response.profile, root);
    } else {
      debugLog("No response received from matcher.");
      chrome.runtime.sendMessage({ type: 'AUTOFILL_PROGRESS', percent: 100, isError: true, text: 'No response received from field matcher.' });
    }
  });
}

async function fillFields(matched, profile, root) {
  chrome.runtime.sendMessage({ type: 'AUTOFILL_PROGRESS', percent: 80, text: 'Injecting values...' });
  let count = 0;

  // Identify any portfolio/website inputs
  const linkFields = [];
  for (const [id, value] of Object.entries(matched)) {
    if (!value) continue;
    const el = root.querySelector(`[data-autofill-id="${id}"]`);
    if (el) {
      const name = (el.name || '').toLowerCase();
      const label = getLabel(el).toLowerCase();
      if (
        (el.tagName === 'INPUT' && el.type === 'url') ||
        label.includes('portfolio') ||
        label.includes('website') ||
        label.includes('url') ||
        label.includes('link') ||
        name.includes('portfolio') ||
        name.includes('website') ||
        name.includes('url') ||
        name.includes('link')
      ) {
        linkFields.push({ id, el, value });
      }
    }
  }

  if (linkFields.length > 0 && profile) {
    const profileLinks = [
      profile.website,
      profile.linkedin,
      profile.github,
      profile.x,
      profile.leetcode,
      profile.gfg,
      profile.medium
    ].filter(Boolean);

    if (profileLinks.length > 0) {
      let targetLinkField = null;
      let addBtn = null;
      let targetContainer = null;

      for (const lf of linkFields) {
        let container = lf.el.parentElement;
        let btn = null;
        for (let j = 0; j < 6; j++) {
          if (!container || container === document.body) break;
          btn = Array.from(container.querySelectorAll('button, [role="button"]')).find(b => {
            const text = b.innerText.toLowerCase();
            return text.includes('add') || text.includes('+') || text.includes('link') || text.includes('portfolio') || text.includes('another');
          });
          if (btn) break;
          container = container.parentElement;
        }
        
        if (btn) {
          targetLinkField = lf;
          addBtn = btn;
          targetContainer = container;
          break;
        }
      }

      if (addBtn && targetLinkField) {
        debugLog(`Found dynamic links with 'Add' button. Filling all ${profileLinks.length} profile links...`);
        linkFields.forEach(lf => {
          let c = lf.el.parentElement;
          for (let j=0; j<6; j++) {
            if (!c) break;
            if (c === targetContainer) {
              delete matched[lf.id];
              break;
            }
            c = c.parentElement;
          }
        });

        let currentInput = targetLinkField.el;
        for (let i = 0; i < profileLinks.length; i++) {
          const urlVal = profileLinks[i];
          try {
            await injectValue(currentInput, urlVal);
            count++;
            
            if (i < profileLinks.length - 1) {
              addBtn.click();
              
              let foundNew = false;
              for (let j = 0; j < 20; j++) {
                await new Promise(resolve => setTimeout(resolve, 100)); // poll every 100ms
                
                const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
                const emptyLinkInputs = allInputs.filter(inp => {
                  if (inp.value) return false;
                  const l = getLabel(inp).toLowerCase();
                  const n = (inp.name || '').toLowerCase();
                  return (inp.type === 'url' || l.includes('portfolio') || l.includes('website') || l.includes('url') || l.includes('link') || n.includes('portfolio') || n.includes('website') || n.includes('url') || n.includes('link'));
                });
                
                if (emptyLinkInputs.length > 0) {
                  currentInput = emptyLinkInputs[0];
                  foundNew = true;
                  break;
                }
              }
              
              if (!foundNew) {
                debugLog("Add button clicked, but no new empty URL input field was detected.");
                break;
              }
            }
          } catch (err) {
            debugLog(`Error filling dynamic link ${i}: ${err.message}`);
          }
        }
      }
    }
  }

  for (const [id, value] of Object.entries(matched)) {
    if (!value) continue;
    const el = root.querySelector(`[data-autofill-id="${id}"]`);
    if (el) {
      try {
        debugLog(`Filling: [Label: "${getLabel(el)}"] ──> Value: "${value}"`);
        await injectValue(el, value);
        count++;
      } catch (err) {
        debugLog(`Error filling field [Label: "${getLabel(el)}"]: ${err.message || err}`);
        console.error('Failed to fill field', el, err);
      }
    } else {
      debugLog(`Element not found in DOM for ID: ${id}`);
    }
  }
  debugLog(`Filled ${count} fields.`);
  chrome.runtime.sendMessage({ type: 'AUTOFILL_PROGRESS', percent: 100, text: 'Form filled successfully!' });
}

function formatForMonthInput(val) {
  if (!val) return '';
  const str = val.toString().trim();
  if (/^\d{4}-\d{2}$/.test(str)) {
    return str;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str.substring(0, 7);
  }
  
  let year = null;
  let month = '01';
  
  const yearMatch = str.match(/\b\d{4}\b/);
  if (yearMatch) {
    year = yearMatch[0];
  }
  
  const monthsMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
  };
  
  const words = str.toLowerCase().split(/[\s,.\-\/]+/);
  for (const word of words) {
    if (monthsMap[word]) {
      month = monthsMap[word];
      break;
    }
    if (/^\d{1,2}$/.test(word)) {
      const num = parseInt(word, 10);
      if (num >= 1 && num <= 12 && word !== year) {
        month = num.toString().padStart(2, '0');
      }
    }
  }
  
  if (!year) {
    const parts = str.split(/[\s\-\/]+/);
    if (parts.length >= 2) {
      const p0 = parts[0];
      const p1 = parts[1];
      const p2 = parts.length > 2 ? parts[2] : null;
      if (p2 && /^\d{4}$/.test(p2)) {
        year = p2;
        // Try to figure out month from p0 or p1
        if (parseInt(p1, 10) > 12) month = p0.padStart(2, '0');
        else if (parseInt(p0, 10) > 12) month = p1.padStart(2, '0');
        else month = p1.padStart(2, '0'); // Default DD/MM
      } else if (/^\d{4}$/.test(p1)) {
        year = p1;
        month = p0.padStart(2, '0');
      } else if (/^\d{4}$/.test(p0)) {
        year = p0;
        month = p1.padStart(2, '0');
      } else if (/^\d{2}$/.test(p1)) {
        year = '20' + p1;
        month = p0.padStart(2, '0');
      }
    }
  }
  
  if (!year) {
    return '';
  }
  
  return `${year}-${month}`;
}

function formatForDateInput(val) {
  if (!val) return '';
  const str = val.toString().trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  let match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (match) {
    let p1 = parseInt(match[1], 10);
    let p2 = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    let month, day;
    
    if (p1 > 12 && p2 <= 12) {
      day = p1; month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      month = p1; day = p2;
    } else {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      }
      day = p1; month = p2;
    }
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  match = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (match) {
    let year = match[1];
    let month = match[2];
    let day = match[3];
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  if (/^\d{4}-\d{2}$/.test(str)) {
    return `${str}-01`;
  }

  const monthStr = formatForMonthInput(str);
  if (monthStr && monthStr.includes('-')) {
    return `${monthStr}-01`;
  }

  return '';
}

function formatForWeekInput(val) {
  if (!val) return '';
  const str = val.toString().trim();
  if (/^\d{4}-W\d{2}$/i.test(str)) {
    return str.toUpperCase();
  }
  
  let year = new Date().getFullYear();
  let week = 1;
  
  const parsedDate = Date.parse(str);
  if (!isNaN(parsedDate)) {
    const dateObj = new Date(parsedDate);
    year = dateObj.getFullYear();
    dateObj.setHours(0, 0, 0, 0);
    dateObj.setDate(dateObj.getDate() + 4 - (dateObj.getDay() || 7));
    const yearStart = new Date(dateObj.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((dateObj.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    week = weekNo;
  } else {
    const numMatch = str.match(/\b\d{1,2}\b/);
    if (numMatch) {
      week = parseInt(numMatch[0], 10);
      if (week < 1) week = 1;
      if (week > 53) week = 53;
    }
    const yearMatch = str.match(/\b\d{4}\b/);
    if (yearMatch) {
      year = parseInt(yearMatch[0], 10);
    }
  }
  
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function formatForTimeInput(val) {
  if (!val) return '';
  const str = val.toString().trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    return str;
  }
  const timeMatch = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const ampm = timeMatch[3];
    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && hours < 12) hours += 12;
      if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  return str;
}

function findBestSelectOption(options, valStr) {
  const cleanVal = valStr.toLowerCase().trim();
  
  // 1. Exact or include match first
  let target = options.find(o => o.text.toLowerCase().includes(cleanVal) || o.value.toLowerCase() === cleanVal);
  if (target) return target;
  
  // 2. Fuzzy match for common demographic answers
  // Decline to state / Prefer not to say
  if (
    cleanVal.includes('decline') || 
    cleanVal.includes('prefer not') || 
    cleanVal.includes('do not wish') || 
    cleanVal.includes('wish to answer') || 
    cleanVal.includes('prefer')
  ) {
    target = options.find(o => {
      const txt = o.text.toLowerCase();
      return txt.includes('decline') || txt.includes('prefer not') || txt.includes('wish to answer') || txt.includes('do not wish') || txt.includes('disclose') || txt.includes('identify') || txt.includes('no answer');
    });
    if (target) return target;
  }
  
  // Yes / True / Active
  if (cleanVal === 'yes' || cleanVal === 'true' || cleanVal === 'y') {
    target = options.find(o => {
      const txt = o.text.toLowerCase();
      return txt === 'yes' || txt.startsWith('yes') || txt === 'true' || txt === 'y';
    });
    if (target) return target;
  }
  
  // No / False / Inactive
  if (cleanVal === 'no' || cleanVal === 'false' || cleanVal === 'n') {
    target = options.find(o => {
      const txt = o.text.toLowerCase();
      return txt === 'no' || txt.startsWith('no') || txt === 'false' || txt === 'n';
    });
    if (target) return target;
  }

  // Male
  if (cleanVal === 'male' || cleanVal === 'm') {
    target = options.find(o => o.text.toLowerCase() === 'male' || o.text.toLowerCase() === 'man');
    if (target) return target;
  }

  // Female
  if (cleanVal === 'female' || cleanVal === 'f') {
    target = options.find(o => o.text.toLowerCase() === 'female' || o.text.toLowerCase() === 'woman');
    if (target) return target;
  }
  
  return null;
}

function matchOptionText(optTxt, valStr) {
  const txt = optTxt.toLowerCase().trim();
  const val = valStr.toLowerCase().trim();
  
  // Clean text and check exact boundary matches first
  const escapedVal = val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp('\\b' + escapedVal + '\\b', 'i');
  if (regex.test(txt)) return true;
  
  // Fuzzy match for Decline / Prefer not to say
  if (
    val.includes('decline') || 
    val.includes('prefer not') || 
    val.includes('do not wish') || 
    val.includes('wish to answer') || 
    val.includes('prefer')
  ) {
    if (txt.includes('decline') || txt.includes('prefer not') || txt.includes('wish to answer') || txt.includes('do not wish') || txt.includes('don\'t wish') || txt.includes('disclose') || txt.includes('identify') || txt.includes('no answer') || txt.includes('want to answer') || txt.includes('not state') || txt.includes('not disclosure')) {
      return true;
    }
  }
  
  // Fuzzy match for Yes / Active
  if (val === 'yes' || val === 'true' || val === 'y') {
    if (
      txt === 'yes' || 
      txt.startsWith('yes') || 
      txt === 'true' || 
      txt === 'y' ||
      txt.includes('identify as') ||
      txt.includes('protected veteran') ||
      txt.includes('have a disability')
    ) {
      return true;
    }
  }
  
  // Fuzzy match for No / Inactive
  if (val === 'no' || val === 'false' || val === 'n') {
    if (
      txt === 'no' || 
      txt.startsWith('no') || 
      txt.startsWith('i am not') || 
      txt.includes('not a protected veteran') ||
      txt.includes('do not have a disability') ||
      txt === 'false' || 
      txt === 'n'
    ) {
      return true;
    }
  }
  
  return false;
}

async function injectValue(el, value) {
  if (value === undefined || value === null) return;
  const valStr = value.toString();
  const valLower = valStr.toLowerCase().trim();

  if (el.tagName === 'SELECT') {
    const options = Array.from(el.options);
    const target = findBestSelectOption(options, valStr);
    if (target) {
      const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
      if (nativeSelectValueSetter) {
        nativeSelectValueSetter.call(el, target.value);
      } else {
        el.value = target.value;
      }
      el.dispatchEvent(new Event('change', { bubbles: true }));
      debugLog(`[Select] Set to option: "${target.text}"`);
    } else {
      debugLog(`[Select] Could not find option matching: "${valStr}"`);
    }
    return;
  }

  // Check for custom comboboxes or dropdown lists (like Workday, React-Select, Chosen)
  const fieldContainer = el.closest('.field, .form-group, [class*="control"], [class*="wrapper"]') || el.parentElement;
  const isCustomSelect = (
    el.getAttribute('role') === 'combobox' ||
    el.getAttribute('aria-haspopup') === 'listbox' ||
    el.tagName === 'BUTTON' ||
    el.readOnly ||
    el.classList.contains('select') ||
    el.classList.contains('dropdown') ||
    (fieldContainer && (
      fieldContainer.classList.contains('select') ||
      fieldContainer.classList.contains('dropdown') ||
      fieldContainer.querySelector('button[aria-haspopup="listbox"]') ||
      fieldContainer.querySelector('button[role="combobox"]')
    ))
  );

  if (isCustomSelect && el.type !== 'file' && el.type !== 'checkbox' && el.type !== 'radio') {
    debugLog(`[Custom Select] Attempting custom selection simulation for: "${valStr}"`);
    let trigger = el;
    if (el.type === 'hidden' || el.style.opacity === '0' || el.readOnly) {
      trigger = el.closest('button') || el.closest('[role="button"]') || el.parentElement || el;
    }

    try {
      // 1. Click trigger to open listbox menu
      trigger.click();
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      trigger.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      // 2. Poll and Wait for listbox options to render in DOM (Retry up to 8 times every 50ms)
      const optionSelectors = [
        '[data-automation-id*="dropdownOption"]',
        '[data-automation-id*="promptOption"]',
        '[data-automation-id*="selectOption"]',
        '[role="option"]',
        'li',
        '.react-select__option',
        '[class*="option"]',
        '[class*="menu"] div',
        '[class*="listbox"] div',
        'div[id*="option"]'
      ];

      let matchedOption = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        // Search for active visible dropdown overlay menu containers in body
        const menuSelectors = [
          '[role="listbox"]',
          '[role="menu"]',
          '[class*="select2-drop"]',
          '[class*="chosen-drop"]',
          '[class*="dropdown-menu"]',
          '[class*="select-options"]',
          'ul[class*="select"]',
          'ul[class*="dropdown"]',
          'ul[class*="menu"]',
          'ul[class*="results"]',
          '[class*="menu"]',
          '[class*="popup"]',
          '[class*="listbox"]'
        ];
        const possibleMenus = Array.from(document.querySelectorAll(menuSelectors.join(', ')));
        const activeMenus = possibleMenus.filter(m => {
          if (m.offsetParent === null || m.innerText.trim() === '') return false;
          // Must contain option nodes to prevent matching unrelated lists (like header/footer ul)
          return m.querySelector('[role="option"], li, [class*="option"]') !== null;
        });
        const searchRoot = activeMenus.length > 0 ? activeMenus[activeMenus.length - 1] : document;

        for (const selector of optionSelectors) {
          const elements = Array.from(searchRoot.querySelectorAll(selector));
          const visibleOptions = elements.filter(opt => opt.offsetParent !== null || opt.innerText.trim() !== '');

          matchedOption = visibleOptions.find(opt => {
            const txt = opt.innerText.replace(/\s+/g, ' ').toLowerCase().trim();
            if (valLower.startsWith('+')) {
              const code = valLower.substring(1);
              if (txt.includes(valLower) || txt.includes(`(${code})`) || txt.includes(` ${code}`)) {
                return true;
              }
            }
            return matchOptionText(txt, valLower);
          });

          if (matchedOption) break;
        }
        if (matchedOption) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (matchedOption) {
        debugLog(`[Custom Select] Found matching option: "${matchedOption.innerText.trim()}". Clicking it.`);
        
        // Scroll the option into view to make it interactable before clicking
        matchedOption.scrollIntoView({ block: 'center', inline: 'nearest' });
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Target inner-most text node to trigger React handlers bound directly to text nodes
        const innerElement = Array.from(matchedOption.querySelectorAll('*')).find(child => 
          child.childElementCount === 0 && 
          child.innerText && 
          matchOptionText(child.innerText.replace(/\s+/g, ' '), valLower)
        ) || matchedOption;

        innerElement.click();
        innerElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        innerElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        innerElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        if (innerElement !== matchedOption) {
          matchedOption.click();
          matchedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          matchedOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          matchedOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        
        // Add a 150ms delay to let the menu close and animate out before the next field is clicked
        await new Promise(resolve => setTimeout(resolve, 150));
        return;
      } else {
        debugLog(`[Custom Select] Option matching "${valStr}" not found in open dropdown menu. Closing...`);
        document.body.click();
      }
    } catch (err) {
      debugLog(`[Custom Select] Error during selection simulation: ${err.message}`);
    }
  }

  const elRole = el.getAttribute ? el.getAttribute('role') : null;
  const isCheckbox = el.type === 'checkbox' || elRole === 'checkbox';
  const isRadio = el.type === 'radio' || elRole === 'radio';

  if (isCheckbox || isRadio) {
    const valLowerChoice = valStr.toLowerCase();
    const elVal = (el.value || el.getAttribute('aria-label') || '').toLowerCase();
    const baseLabel = getLabel(el).split(' - ').pop().toLowerCase();
    const isChecked = el.checked !== undefined ? el.checked : el.getAttribute('aria-checked') === 'true';
    
    const isMatched = (
      valLowerChoice === 'true' || 
      valLowerChoice === 'yes' || 
      elVal === valLowerChoice ||
      baseLabel.includes(valLowerChoice) ||
      valLowerChoice.includes(baseLabel)
    );
    
    debugLog(`[Choice] Type: ${el.type || elRole}, valLower: "${valLowerChoice}", elVal: "${elVal}", baseLabel: "${baseLabel}", isChecked: ${isChecked}, isMatched: ${isMatched}`);
    
    if (isMatched && !isChecked) {
      el.click();
      debugLog(`[Choice] Clicked to CHECK.`);
    } else if (!isMatched && isChecked && isCheckbox) {
      el.click();
      debugLog(`[Choice] Clicked to UNCHECK.`);
    }
  } else if (el.isContentEditable) {
    el.innerText = valStr;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    debugLog(`[ContentEditable] Filled value.`);
  } else {
    if (el.type === 'file') {
      try {
        const filename = valStr.split(/[\\/]/).pop() || 'resume.pdf';
        const dt = new DataTransfer();
        dt.items.add(new File(["Mock file content for testing autofill"], filename, { type: "application/pdf" }));
        el.files = dt.files;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        debugLog(`[File] Injected mock file: "${filename}"`);
        return;
      } catch (err) {
        debugLog(`[File] Failed to inject mock file: ${err.message}`);
      }
    }

    let finalValue = valStr;
    if (el.type === 'month') {
      finalValue = formatForMonthInput(valStr);
    } else if (el.type === 'date') {
      finalValue = formatForDateInput(valStr);
    } else if (el.type === 'week') {
      finalValue = formatForWeekInput(valStr);
    } else if (el.type === 'time') {
      finalValue = formatForTimeInput(valStr);
    }
    
    if (isCustomSelect) {
      debugLog(`[Custom Select] Option matching "${valStr}" not found. Skipping fallback to prevent input state corruption.`);
      return;
    }

    // React/Vue safe injection
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    
    if (el.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(el, finalValue);
    } else if (el.tagName === 'INPUT' && nativeInputValueSetter) {
      nativeInputValueSetter.call(el, finalValue);
    } else if (el.value !== undefined) {
      el.value = finalValue;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    debugLog(`[Text/Input] Set value: "${finalValue}" (original: "${valStr}").`);
  }
}
}

