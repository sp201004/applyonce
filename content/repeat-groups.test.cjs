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
