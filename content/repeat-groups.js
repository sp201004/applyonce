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

  // Per-entry subfield patterns. Used by the repeated-label clustering fallback
  // to detect repeated experience/education/project blocks that are plain <div>s
  // with NO fieldset, NO keyword container, NO numbered names, and NO numbered
  // headings — just identical label sets appearing 2+ times in DOM order.
  const SUBFIELD_PATTERNS = [
    // experience
    { type: 'experience', key: 'company', regex: /\b(company|employer)\b/i },
    { type: 'experience', key: 'jobTitle', regex: /\b(job\s*title|position|role)\b/i },
    { type: 'experience', key: 'summary', regex: /\b(summary|role description|job description|work summary|experience summary|job summary|responsibilities)\b/i },
    { type: 'experience', key: 'location', regex: /\b(job location|work location|employer location|company location)\b/i },
    // education
    { type: 'education', key: 'collegeName', regex: /\b(college|university|school|institute)\b/i },
    { type: 'education', key: 'degree', regex: /\b(degree|accreditation)\b/i },
    { type: 'education', key: 'branch', regex: /\b(branch|specialization|major)\b/i },
    { type: 'education', key: 'gpa', regex: /\bgpa\b/i },
    // projects
    { type: 'projects', key: 'name', regex: /\bproject\s*(name|title)\b/i },
    { type: 'projects', key: 'description', regex: /\bproject\s*description\b/i }
  ];

  // The anchor subfield that "opens" a new instance for each section type. A new
  // section instance is only ever started when this key repeats (see the anchor
  // cycle in clusterByRepeatedLabels) — never on an arbitrary duplicate subfield.
  const ANCHOR_KEYS = { experience: 'company', education: 'collegeName', projects: 'name' };

  // Long-text / continuation subfields (description, summary, notes). These must
  // NEVER start a new instance: a rich-text description rendered after the other
  // controls is a continuation of the current entry, not the start of the next.
  const CONTINUATION_KEYS = new Set(['summary', 'description', 'notes']);

  // Detect whether a field's text maps to a known per-entry subfield of a section.
  // Returns { type, key } or null. This is what makes a field "section-defining".
  function detectSubfield(text) {
    if (!text || typeof text !== 'string') return null;
    for (const p of SUBFIELD_PATTERNS) {
      if (p.regex.test(text)) return { type: p.type, key: p.key };
    }
    return null;
  }

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

  // Fallback clustering for the "repeated label set / DOM proximity" case.
  // Walks fields in DOM order and assigns each section-defining field a 0-based
  // instance index. A new instance must be started by a ROBUST boundary — never
  // by "any subfield key seen before" (which wrongly bumped a description/summary
  // control into the next entry). Boundary signals, in priority order:
  //   1. A change in block key (proximityKey/containerKey): fields under a distinct
  //      repeated-block ancestor. This is the strongest boundary. When present we
  //      cluster STRICTLY by block key and never split within the same block. A
  //      field with no block key attaches to the most recently seen block, so a
  //      control rendered out of DOM order still lands in its own block's index.
  //   2. No distinct block key: an ANCHOR-key cycle. Pick the section's anchor
  //      subfield (company / college / project name) and start a new instance only
  //      when that anchor repeats. Non-anchor duplicate keys stay in the current
  //      instance.
  //   3. Long-text continuation subfields (description/summary/notes) never start a
  //      new instance.
  // Returns { result: { [id]: { type, index } }, counts: { [type]: instanceCount } }.
  function clusterByRepeatedLabels(fields) {
    const result = {};
    const counts = {};
    if (!Array.isArray(fields)) return { result, counts };

    const ordered = fields
      .map((f, i) => ({ f, domOrder: typeof f.domOrder === 'number' ? f.domOrder : i }))
      .sort((a, b) => a.domOrder - b.domOrder);

    // Bucket section-defining fields per type, preserving DOM order.
    const perType = {}; // type -> [{ id, key, blockKey }]
    for (const { f } of ordered) {
      if (!f || !f.id) continue;
      const sub = detectSubfield(`${f.label || ''} ${f.name || ''}`);
      if (!sub) continue; // not a section-defining field -> stays global
      const blockKey = f.proximityKey || f.containerKey || '';
      (perType[sub.type] = perType[sub.type] || []).push({ id: f.id, key: sub.key, blockKey });
    }

    Object.keys(perType).forEach(type => {
      const items = perType[type];
      const hasBlockKeys = items.some(it => it.blockKey);

      if (hasBlockKeys) {
        // (1) Strongest boundary: cluster strictly by repeated-block ancestor. Once
        // a field is assigned to a block, its index is that block's index regardless
        // of label repeats inside the block. Fields with no block key attach to the
        // most recently seen block (out-of-order description support).
        const blockIndex = {};
        let nextIndex = 0;
        let currentIndex = 0;
        items.forEach(it => {
          if (it.blockKey) {
            if (!(it.blockKey in blockIndex)) blockIndex[it.blockKey] = nextIndex++;
            currentIndex = blockIndex[it.blockKey];
          }
          result[it.id] = { type, index: currentIndex };
        });
        counts[type] = Math.max(nextIndex, 1);
      } else {
        // (2) No block signal: anchor-key cycle. Start a new instance only when the
        // section's anchor subfield repeats. (3) Never split on a continuation key.
        const anchorKey = items.some(it => it.key === ANCHOR_KEYS[type])
          ? ANCHOR_KEYS[type]
          : items[0].key;
        let index = 0;
        let anchorSeen = false;
        items.forEach(it => {
          if (it.key === anchorKey && !CONTINUATION_KEYS.has(it.key)) {
            if (anchorSeen) index += 1;
            anchorSeen = true;
          }
          result[it.id] = { type, index };
        });
        counts[type] = index + 1;
      }
    });

    return { result, counts };
  }

  // Given a flat list of field descriptors, cluster them into repeating sections and
  // assign each a 0-based index by DOM order. Returns { [fieldId]: { type, index } }.
  //
  // Each field descriptor: { id, name, label, headingText, containerKey, domOrder, proximityKey? }
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
    const structuralCounts = {};
    Object.keys(perType).forEach(type => {
      const instances = perType[type].slice().sort((a, b) => a.minDomOrder - b.minDomOrder);
      structuralCounts[type] = instances.length;
      instances.forEach((inst, idx) => {
        inst.ids.forEach(id => { result[id] = { type, index: idx }; });
      });
    });

    // Fallback: repeated-label / DOM-proximity clustering. Only activated for a
    // type when it infers 2+ instances AND the structural detection above did NOT
    // already split that type into distinct indices (avoid double-handling the
    // already-working fieldset/numbered-name/numbered-heading paths).
    try {
      const { result: clustered, counts } = clusterByRepeatedLabels(fields);
      Object.keys(counts).forEach(type => {
        if (counts[type] >= 2 && (structuralCounts[type] || 0) < 2) {
          // Drop any single-instance structural assignments for this type, then
          // apply the clustered multi-instance indices.
          Object.keys(result).forEach(id => {
            if (result[id] && result[id].type === type) delete result[id];
          });
          Object.keys(clustered).forEach(id => {
            if (clustered[id].type === type) result[id] = clustered[id];
          });
        }
      });
    } catch (e) {
      // Defensive: grouping must never throw and break autofill.
    }

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
    detectSubfield,
    clusterByRepeatedLabels,
    assignGroupIndices,
    profileKeyForType,
    applyGroupIndex,
    joinMultiEntry
  };

  root.APPLYONCE_REPEAT_GROUPS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
