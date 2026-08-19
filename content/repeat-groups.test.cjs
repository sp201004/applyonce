const test = require('node:test');
const assert = require('node:assert/strict');
const RG = require('./repeat-groups.js');

// ---------------------------------------------------------------------------
// parseNumberedName
// ---------------------------------------------------------------------------
test('parseNumberedName handles bracket, underscore and dash forms', () => {
  assert.deepEqual(RG.parseNumberedName('experience[0][company]'), { base: 'experience', index: 0 });
  assert.deepEqual(RG.parseNumberedName('experience_1_company'), { base: 'experience', index: 1 });
  assert.deepEqual(RG.parseNumberedName('work-2-title'), { base: 'work', index: 2 });
  assert.deepEqual(RG.parseNumberedName('education[1].degree'), { base: 'education', index: 1 });
  assert.equal(RG.parseNumberedName('email'), null);
  assert.equal(RG.parseNumberedName(''), null);
});

test('detectSectionIndex reads trailing numbers as 0-based', () => {
  assert.equal(RG.detectSectionIndex('Experience 1'), 0);
  assert.equal(RG.detectSectionIndex('Work Experience #2'), 1);
  assert.equal(RG.detectSectionIndex('Education'), null);
});

test('applyGroupIndex rewrites only the matching profile array key', () => {
  assert.equal(RG.applyGroupIndex('workExperience.0.company', 'experience', 2), 'workExperience.2.company');
  assert.equal(RG.applyGroupIndex('education.0.degree', 'education', 1), 'education.1.degree');
  // group type does not match the path's array -> unchanged
  assert.equal(RG.applyGroupIndex('workExperience.0.company', 'education', 3), 'workExperience.0.company');
  // non-array path unchanged
  assert.equal(RG.applyGroupIndex('email', 'experience', 1), 'email');
});

// ---------------------------------------------------------------------------
// (a) two identical experience fieldsets (no numbering) -> distinct containers
// ---------------------------------------------------------------------------
test('two identical experience fieldsets map to entry 0 and entry 1 (no duplication)', () => {
  const fields = [
    { id: 'c1', name: 'company', label: 'Company', headingText: 'Work Experience', containerKey: 'A', domOrder: 0 },
    { id: 't1', name: 'title', label: 'Job Title', headingText: 'Work Experience', containerKey: 'A', domOrder: 1 },
    { id: 'c2', name: 'company', label: 'Company', headingText: 'Work Experience', containerKey: 'B', domOrder: 2 },
    { id: 't2', name: 'title', label: 'Job Title', headingText: 'Work Experience', containerKey: 'B', domOrder: 3 }
  ];
  const res = RG.assignGroupIndices(fields);
  assert.deepEqual(res.c1, { type: 'experience', index: 0 });
  assert.deepEqual(res.t1, { type: 'experience', index: 0 });
  assert.deepEqual(res.c2, { type: 'experience', index: 1 });
  assert.deepEqual(res.t2, { type: 'experience', index: 1 });
  // entry 0 and entry 1 are NOT the same index
  assert.notEqual(res.c1.index, res.c2.index);
});

// ---------------------------------------------------------------------------
// (b) numbered name attributes
// ---------------------------------------------------------------------------
test('numbered name attributes cluster by explicit index, DOM order -> 0,1', () => {
  const fields = [
    { id: 'a', name: 'experience[0][company]', label: 'Company', headingText: '', containerKey: '', domOrder: 0 },
    { id: 'b', name: 'experience[0][title]', label: 'Title', headingText: '', containerKey: '', domOrder: 1 },
    { id: 'c', name: 'experience[1][company]', label: 'Company', headingText: '', containerKey: '', domOrder: 2 },
    { id: 'd', name: 'experience_1_title', label: 'Title', headingText: '', containerKey: '', domOrder: 3 }
  ];
  const res = RG.assignGroupIndices(fields);
  assert.deepEqual(res.a, { type: 'experience', index: 0 });
  assert.deepEqual(res.b, { type: 'experience', index: 0 });
  assert.deepEqual(res.c, { type: 'experience', index: 1 });
  assert.deepEqual(res.d, { type: 'experience', index: 1 });
});

// ---------------------------------------------------------------------------
// (c) mixed single (global) + repeated fields, plus education alongside
// ---------------------------------------------------------------------------
test('mixed single global fields are left ungrouped while repeated sections are indexed', () => {
  const fields = [
    { id: 'name', name: 'full_name', label: 'Full Name', headingText: '', containerKey: '', domOrder: 0 },
    { id: 'email', name: 'email', label: 'Email', headingText: '', containerKey: '', domOrder: 1 },
    { id: 'exp0', name: 'company', label: 'Company', headingText: 'Experience 1', containerKey: 'E1', domOrder: 2 },
    { id: 'exp1', name: 'company', label: 'Company', headingText: 'Experience 2', containerKey: 'E2', domOrder: 3 },
    { id: 'edu0', name: 'college', label: 'College', headingText: 'Education 1', containerKey: 'D1', domOrder: 4 },
    { id: 'edu1', name: 'college', label: 'College', headingText: 'Education 2', containerKey: 'D2', domOrder: 5 }
  ];
  const res = RG.assignGroupIndices(fields);
  // global fields untouched
  assert.equal(res.name, undefined);
  assert.equal(res.email, undefined);
  // experience indexed independently
  assert.deepEqual(res.exp0, { type: 'experience', index: 0 });
  assert.deepEqual(res.exp1, { type: 'experience', index: 1 });
  // education indexed independently from experience
  assert.deepEqual(res.edu0, { type: 'education', index: 0 });
  assert.deepEqual(res.edu1, { type: 'education', index: 1 });
});

// ---------------------------------------------------------------------------
// index mapping guards: more sections than entries handled by caller (index just increments)
// ---------------------------------------------------------------------------
test('three experience sections produce indices 0,1,2 in DOM order', () => {
  const fields = [
    { id: 's3', name: 'company', label: 'Company', headingText: 'Experience', containerKey: 'Z3', domOrder: 4 },
    { id: 's1', name: 'company', label: 'Company', headingText: 'Experience', containerKey: 'Z1', domOrder: 0 },
    { id: 's2', name: 'company', label: 'Company', headingText: 'Experience', containerKey: 'Z2', domOrder: 2 }
  ];
  const res = RG.assignGroupIndices(fields);
  assert.deepEqual(res.s1, { type: 'experience', index: 0 });
  assert.deepEqual(res.s2, { type: 'experience', index: 1 });
  assert.deepEqual(res.s3, { type: 'experience', index: 2 });
});

// ---------------------------------------------------------------------------
// (d) NEW: repeated label set, NO fieldset / NO numbered names / NO numbered
//     headings / NO keyword container -> plain divs with identical labels x2.
//     This is the real-form case that used to duplicate experience[0].
// ---------------------------------------------------------------------------
test('two plain-div experience blocks (repeated labels only) map to entry 0 and 1', () => {
  const fields = [
    { id: 'c1', name: 'company', label: 'Company', headingText: '', containerKey: '', domOrder: 0 },
    { id: 't1', name: 'job_title', label: 'Job Title', headingText: '', containerKey: '', domOrder: 1 },
    { id: 's1', name: 'summary', label: 'Summary', headingText: '', containerKey: '', domOrder: 2 },
    { id: 'c2', name: 'company', label: 'Company', headingText: '', containerKey: '', domOrder: 3 },
    { id: 't2', name: 'job_title', label: 'Job Title', headingText: '', containerKey: '', domOrder: 4 },
    { id: 's2', name: 'summary', label: 'Summary', headingText: '', containerKey: '', domOrder: 5 }
  ];
  const res = RG.assignGroupIndices(fields);
  // entry 0
  assert.deepEqual(res.c1, { type: 'experience', index: 0 });
  assert.deepEqual(res.t1, { type: 'experience', index: 0 });
  assert.deepEqual(res.s1, { type: 'experience', index: 0 });
  // entry 1 (NOT duplicated into 0)
  assert.deepEqual(res.c2, { type: 'experience', index: 1 });
  assert.deepEqual(res.t2, { type: 'experience', index: 1 });
  assert.deepEqual(res.s2, { type: 'experience', index: 1 });
  // entry 0 fields != entry 1 fields
  assert.notEqual(res.c1.index, res.c2.index);
});

// ---------------------------------------------------------------------------
// (e) NEW: mixed global fields (name/email) + two plain-div education blocks.
//     Globals must stay ungrouped; education blocks index 0 and 1.
// ---------------------------------------------------------------------------
test('globals stay ungrouped while plain-div education blocks index 0 and 1', () => {
  const fields = [
    { id: 'name', name: 'full_name', label: 'Full Name', headingText: '', containerKey: '', domOrder: 0 },
    { id: 'email', name: 'email', label: 'Email', headingText: '', containerKey: '', domOrder: 1 },
    { id: 'col1', name: 'college', label: 'College', headingText: '', containerKey: '', domOrder: 2 },
    { id: 'deg1', name: 'degree', label: 'Degree', headingText: '', containerKey: '', domOrder: 3 },
    { id: 'col2', name: 'college', label: 'College', headingText: '', containerKey: '', domOrder: 4 },
    { id: 'deg2', name: 'degree', label: 'Degree', headingText: '', containerKey: '', domOrder: 5 }
  ];
  const res = RG.assignGroupIndices(fields);
  // globals untouched -> global matching preserved
  assert.equal(res.name, undefined);
  assert.equal(res.email, undefined);
  // education blocks indexed
  assert.deepEqual(res.col1, { type: 'education', index: 0 });
  assert.deepEqual(res.deg1, { type: 'education', index: 0 });
  assert.deepEqual(res.col2, { type: 'education', index: 1 });
  assert.deepEqual(res.deg2, { type: 'education', index: 1 });
});

// ---------------------------------------------------------------------------
// (f) NEW: three plain-div experience blocks -> indices 0,1,2.
// ---------------------------------------------------------------------------
test('three plain-div experience blocks (repeated labels) produce indices 0,1,2', () => {
  const fields = [
    { id: 'c0', name: 'company', label: 'Company', headingText: '', containerKey: '', domOrder: 0 },
    { id: 'r0', name: 'role', label: 'Role', headingText: '', containerKey: '', domOrder: 1 },
    { id: 'c1', name: 'company', label: 'Company', headingText: '', containerKey: '', domOrder: 2 },
    { id: 'r1', name: 'role', label: 'Role', headingText: '', containerKey: '', domOrder: 3 },
    { id: 'c2', name: 'company', label: 'Company', headingText: '', containerKey: '', domOrder: 4 },
    { id: 'r2', name: 'role', label: 'Role', headingText: '', containerKey: '', domOrder: 5 }
  ];
  const res = RG.assignGroupIndices(fields);
  assert.deepEqual(res.c0, { type: 'experience', index: 0 });
  assert.deepEqual(res.c1, { type: 'experience', index: 1 });
  assert.deepEqual(res.c2, { type: 'experience', index: 2 });
});

// ---------------------------------------------------------------------------
// (g) NEW: proximityKey splits blocks even if a field label differs, without
//     over-splitting a single section (empty proximityKey = no split).
// ---------------------------------------------------------------------------
test('proximityKey marks block boundaries for repeated multi-field blocks', () => {
  const fields = [
    { id: 'c1', name: 'company', label: 'Company', headingText: '', containerKey: '', proximityKey: 'blk1', domOrder: 0 },
    { id: 't1', name: 'title', label: 'Job Title', headingText: '', containerKey: '', proximityKey: 'blk1', domOrder: 1 },
    { id: 'c2', name: 'company', label: 'Company', headingText: '', containerKey: '', proximityKey: 'blk2', domOrder: 2 },
    { id: 't2', name: 'title', label: 'Job Title', headingText: '', containerKey: '', proximityKey: 'blk2', domOrder: 3 }
  ];
  const res = RG.assignGroupIndices(fields);
  assert.deepEqual(res.c1, { type: 'experience', index: 0 });
  assert.deepEqual(res.t1, { type: 'experience', index: 0 });
  assert.deepEqual(res.c2, { type: 'experience', index: 1 });
  assert.deepEqual(res.t2, { type: 'experience', index: 1 });
});

// ---------------------------------------------------------------------------
// (h) BUG GUARD: a SINGLE experience block that contains a duplicate-ish subfield
//     key (Role -> jobTitle, Responsibilities/Job Summary -> summary) must keep
//     EVERY field, including the long-text description/summary, at index 0.
//     Previously the summary field crossed into index 1 because clustering split
//     on any repeated subfield key.
// ---------------------------------------------------------------------------
test('single experience block with duplicate-ish keys keeps description at index 0', () => {
  const fields = [
    { id: 'c1', name: 'company', label: 'Company', headingText: 'Work Experience', containerKey: 'X', domOrder: 0 },
    { id: 't1', name: 'title', label: 'Job Title', headingText: 'Work Experience', containerKey: 'X', domOrder: 1 },
    { id: 'r1', name: 'role', label: 'Role', headingText: 'Work Experience', containerKey: 'X', domOrder: 2 }, // dup -> jobTitle
    { id: 'l1', name: 'loc', label: 'Job Location', headingText: 'Work Experience', containerKey: 'X', domOrder: 3 },
    { id: 'resp', name: 'resp', label: 'Responsibilities', headingText: 'Work Experience', containerKey: 'X', domOrder: 4 }, // -> summary
    { id: 'desc', name: 'summary', label: 'Job Summary', headingText: 'Work Experience', containerKey: 'X', domOrder: 5 } // dup -> summary (was landing on index 1)
  ];
  const res = RG.assignGroupIndices(fields);
  assert.deepEqual(res.c1, { type: 'experience', index: 0 });
  assert.deepEqual(res.t1, { type: 'experience', index: 0 });
  assert.deepEqual(res.r1, { type: 'experience', index: 0 });
  assert.deepEqual(res.l1, { type: 'experience', index: 0 });
  assert.deepEqual(res.resp, { type: 'experience', index: 0 });
  // the crux: description/summary must NOT cross into the next entry
  assert.deepEqual(res.desc, { type: 'experience', index: 0 });
  assert.notEqual(res.desc.index, 1);
});

// ---------------------------------------------------------------------------
// (i) two experience blocks each [Company, Job Title, Description] sharing a
//     distinct block key -> block1 all index 0, block2 all index 1 (description
//     included in the correct block).
// ---------------------------------------------------------------------------
test('two experience blocks split by block key keep each description in its own entry', () => {
  const fields = [
    { id: 'c1', name: 'company', label: 'Company', headingText: '', containerKey: '', proximityKey: 'blk1', domOrder: 0 },
    { id: 't1', name: 'title', label: 'Job Title', headingText: '', containerKey: '', proximityKey: 'blk1', domOrder: 1 },
    { id: 'd1', name: 'summary', label: 'Responsibilities', headingText: '', containerKey: '', proximityKey: 'blk1', domOrder: 2 },
    { id: 'c2', name: 'company', label: 'Company', headingText: '', containerKey: '', proximityKey: 'blk2', domOrder: 3 },
    { id: 't2', name: 'title', label: 'Job Title', headingText: '', containerKey: '', proximityKey: 'blk2', domOrder: 4 },
    { id: 'd2', name: 'summary', label: 'Responsibilities', headingText: '', containerKey: '', proximityKey: 'blk2', domOrder: 5 }
  ];
  const res = RG.assignGroupIndices(fields);
  assert.deepEqual(res.c1, { type: 'experience', index: 0 });
  assert.deepEqual(res.t1, { type: 'experience', index: 0 });
  assert.deepEqual(res.d1, { type: 'experience', index: 0 });
  assert.deepEqual(res.c2, { type: 'experience', index: 1 });
  assert.deepEqual(res.t2, { type: 'experience', index: 1 });
  assert.deepEqual(res.d2, { type: 'experience', index: 1 });
});

// ---------------------------------------------------------------------------
// (j) descriptions rendered OUT of DOM order relative to their anchors (e.g. both
//     rich-text areas appended after the two anchor blocks). Each description must
//     still map to its own block index via the block key, not to the last block.
// ---------------------------------------------------------------------------
test('out-of-order descriptions map to their own block index', () => {
  const fields = [
    { id: 'c1', name: 'company', label: 'Company', headingText: '', containerKey: '', proximityKey: 'blk1', domOrder: 0 },
    { id: 't1', name: 'title', label: 'Job Title', headingText: '', containerKey: '', proximityKey: 'blk1', domOrder: 1 },
    { id: 'c2', name: 'company', label: 'Company', headingText: '', containerKey: '', proximityKey: 'blk2', domOrder: 2 },
    { id: 't2', name: 'title', label: 'Job Title', headingText: '', containerKey: '', proximityKey: 'blk2', domOrder: 3 },
    // descriptions appear last, out of order, but carry their block key
    { id: 'd1', name: 'summary', label: 'Job Summary', headingText: '', containerKey: '', proximityKey: 'blk1', domOrder: 4 },
    { id: 'd2', name: 'summary', label: 'Job Summary', headingText: '', containerKey: '', proximityKey: 'blk2', domOrder: 5 }
  ];
  const res = RG.assignGroupIndices(fields);
  assert.deepEqual(res.c1, { type: 'experience', index: 0 });
  assert.deepEqual(res.c2, { type: 'experience', index: 1 });
  assert.deepEqual(res.d1, { type: 'experience', index: 0 }); // belongs to blk1
  assert.deepEqual(res.d2, { type: 'experience', index: 1 }); // belongs to blk2
  assert.notEqual(res.d1.index, res.d2.index);
});

test('detectSubfield maps per-entry labels to their section type', () => {
  assert.deepEqual(RG.detectSubfield('Company'), { type: 'experience', key: 'company' });
  assert.deepEqual(RG.detectSubfield('Job Title'), { type: 'experience', key: 'jobTitle' });
  assert.deepEqual(RG.detectSubfield('University'), { type: 'education', key: 'collegeName' });
  assert.deepEqual(RG.detectSubfield('Project Name'), { type: 'projects', key: 'name' });
  assert.equal(RG.detectSubfield('Email'), null);
  assert.equal(RG.detectSubfield('Full Name'), null);
});

// ---------------------------------------------------------------------------
// single-textarea join (edge case)
// ---------------------------------------------------------------------------
test('joinMultiEntry joins entry summaries with a blank line', () => {
  const entries = [
    { company: 'Acme', summary: 'Built X' },
    { company: 'Globex', summary: 'Led Y' }
  ];
  assert.equal(RG.joinMultiEntry(entries, ['summary']), 'Built X\n\nLed Y');
  assert.equal(RG.joinMultiEntry([], ['summary']), '');
  assert.equal(RG.joinMultiEntry('nope'), '');
});
