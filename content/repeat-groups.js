// ApplyOnce - repeated-group awareness for multi-entry autofill.
// Pure, DOM-free logic so it can be unit-tested with `node --test` and also
// loaded both in the content script (via manifest/injection) and in the
// background service worker (via importScripts).
(function initRepeatGroups(root) {
  // Maps a logical repeating section to the profile array that backs it.
  const GROUP_TYPE_PATTERNS = [
    {
      type: 'experience',
      profileKey: 'workExperience',
      regex: /\b(work\s*experience|professional\s*experience|experience|employment|work\s*history)\b/i,
      nameKeys: ['workexperience', 'experience', 'employment', 'work', 'job', 'emp']
    },
    {
      type: 'education',
      profileKey: 'education',
      regex: /\b(education|academic|qualification|school|college|university|degree)\b/i,
      nameKeys: ['education', 'academic', 'school', 'college', 'qualification', 'edu']
    },
    {
      type: 'projects',
      profileKey: 'projects',
      regex: /\bprojects?\b/i,
      nameKeys: ['project', 'projects']
    }
  ];

  function patternForType(type) {
    return GROUP_TYPE_PATTERNS.find(p => p.type === type) || null;
  }

  function profileKeyForType(type) {
    const p = patternForType(type);
    return p ? p.profileKey : null;
  }

  // Detect the logical section type from arbitrary text (heading, label, container id/class).
  function detectGroupType(text) {
    if (!text || typeof text !== 'string') return null;
    for (const p of GROUP_TYPE_PATTERNS) {
      if (p.regex.test(text)) return p.type;
    }
    return null;
  }

  // Map a parsed name base (e.g. "experience", "work", "edu") to a section type.
  function baseToType(base) {
    if (!base) return null;
    const b = base.toLowerCase();
    for (const p of GROUP_TYPE_PATTERNS) {
      if (p.nameKeys.some(k => b === k || b.includes(k))) return p.type;
    }
    return null;
  }

  // Parse numbered field names:
  //   experience[0][company]  -> { base: 'experience', index: 0 }
  //   experience_1_company    -> { base: 'experience', index: 1 }
  //   work-2-title            -> { base: 'work',       index: 2 }
  //   education[1].degree     -> { base: 'education',  index: 1 }
  function parseNumberedName(name) {
    if (!name || typeof name !== 'string') return null;
    let m = name.match(/^([a-zA-Z]+)\s*\[\s*(\d+)\s*\]/);
    if (m) return { base: m[1].toLowerCase(), index: parseInt(m[2], 10) };
    m = name.match(/^([a-zA-Z]+)[_-](\d+)(?:[_-]|$)/);
    if (m) return { base: m[1].toLowerCase(), index: parseInt(m[2], 10) };
    return null;
  }

  // Extract a 0-based index from a section heading like "Experience 1" or "Work Experience #2".
  function detectSectionIndex(text) {
    if (!text || typeof text !== 'string') return null;
    const m = text.match(/#?\s*(\d+)\s*$/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return n > 0 ? n - 1 : 0;
  }

  // Given a flat list of field descriptors, cluster them into repeating sections and
  // assign each a 0-based index by DOM order. Returns { [fieldId]: { type, index } }.
  //
  // Each field descriptor: { id, name, label, headingText, containerKey, domOrder }
  // Fields that don't belong to any repeating section are omitted (keep global matching).
  function assignGroupIndices(fields) {
    const result = {};
    if (!Array.isArray(fields)) return result;

    const perType = {};       // type -> [instance]
    const instanceMap = {};   // "type::instanceKey" -> instance

    fields.forEach((f, i) => {
      if (!f || !f.id) return;
      const domOrder = typeof f.domOrder === 'number' ? f.domOrder : i;

      let type = null;
      let explicitIndex = null;

      const parsed = parseNumberedName(f.name);
      if (parsed) {
        const t = baseToType(parsed.base);
        if (t) { type = t; explicitIndex = parsed.index; }
      }
      if (!type) {
        const headType = detectGroupType(f.headingText);
        if (headType) {
          type = headType;
          const secIdx = detectSectionIndex(f.headingText);
          if (secIdx != null) explicitIndex = secIdx;
        }
      }
      if (!type) type = detectGroupType(f.containerKey) || detectGroupType(f.label);
      if (!type) return; // not part of a repeating group

      const instanceKey = explicitIndex != null
        ? `#${explicitIndex}`
        : `@${f.containerKey || 'default'}`;
      const mapKey = `${type}::${instanceKey}`;

      if (!instanceMap[mapKey]) {
        instanceMap[mapKey] = { type, explicitIndex, minDomOrder: domOrder, ids: [] };
        (perType[type] = perType[type] || []).push(instanceMap[mapKey]);
      }
      const inst = instanceMap[mapKey];
      inst.ids.push(f.id);
      if (domOrder < inst.minDomOrder) inst.minDomOrder = domOrder;
      if (explicitIndex != null && inst.explicitIndex == null) inst.explicitIndex = explicitIndex;
    });

    // Sort each type's sections by DOM order, then map section i -> profile[i].
    Object.keys(perType).forEach(type => {
      const instances = perType[type].slice().sort((a, b) => a.minDomOrder - b.minDomOrder);
      instances.forEach((inst, idx) => {
        inst.ids.forEach(id => { result[id] = { type, index: idx }; });
      });
    });

    return result;
  }

  // Rewrite a rule/profile path so it targets the correct entry for a repeated group.
  //   applyGroupIndex('workExperience.0.company', 'experience', 2) -> 'workExperience.2.company'
  // Only rewrites when the path's array key matches the group type's profile key.
  function applyGroupIndex(profileField, type, index) {
    if (typeof profileField !== 'string' || typeof index !== 'number') return profileField;
    const key = profileKeyForType(type);
    if (!key) return profileField;
    const re = new RegExp('^' + key + '\\.(\\d+)\\.');
    if (re.test(profileField)) {
      return profileField.replace(re, `${key}.${index}.`);
    }
    return profileField;
  }

  // Join multiple profile entries into a single text block (blank-line separated).
  // Used when one <textarea> asks for ALL experience/education/projects.
  //   fieldKeys (optional): subfields to pull per entry; defaults to all own keys.
  function joinMultiEntry(entries, fieldKeys) {
    if (!Array.isArray(entries)) return '';
    const blocks = entries.map(entry => {
      if (entry == null) return '';
      if (typeof entry === 'string') return entry.trim();
      const keys = Array.isArray(fieldKeys) && fieldKeys.length ? fieldKeys : Object.keys(entry);
      return keys
        .map(k => entry[k])
        .filter(v => v != null && String(v).trim() !== '')
        .map(v => String(v).trim())
        .join(' — ');
    }).filter(b => b && b.trim() !== '');
    return blocks.join('\n\n');
  }

  const api = {
    GROUP_TYPE_PATTERNS,
    detectGroupType,
    baseToType,
    parseNumberedName,
    detectSectionIndex,
    assignGroupIndices,
    profileKeyForType,
    applyGroupIndex,
    joinMultiEntry
  };

  root.APPLYONCE_REPEAT_GROUPS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
