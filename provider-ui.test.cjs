const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const read = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8')

test('options UI defaults to Gemini and loads effective provider settings', () => {
  const html = read('options/options.html')
  const script = read('options/options.js')

  assert.match(html, /<option value="gemini" selected>Google Gemini \(Free, Default\)<\/option>/)
  assert.match(html, /<div id="gemini-settings">/)
  assert.match(html, /<div id="groq-settings" class="hidden">/)
  assert.match(html, /<script src="\.\.\/provider-settings\.js"><\/script>/)
  assert.match(script, /getEffectiveProviderSettings\(chrome\.storage\.local/)
  assert.match(script, /provider: providerSelect\.value/)
  assert.match(script, /geminiKey: geminiKey\.value\.trim\(\)/)
})

test('both sidepanel provider dropdowns default to Gemini', () => {
  const html = read('sidepanel/sidepanel.html')
  const script = read('sidepanel/sidepanel.js')

  assert.equal((html.match(/<option value="gemini" selected>Google Gemini \(Default\)<\/option>/g) || []).length, 2)
  assert.doesNotMatch(html, /value="groq" selected|Groq \(Default\)/)
  assert.match(html, /<script src="\.\.\/provider-settings\.js"><\/script>/)
  assert.match(script, /getEffectiveProviderSettings\(chrome\.storage\.local\)/)
  assert.match(script, /const geminiKey = document\.getElementById\('gemini-key-input'\)\.value\.trim\(\)/)
  assert.match(script, /const geminiKey = document\.getElementById\('gemini-key-input-nokey'\)\.value\.trim\(\)/)
  assert.match(script, /chrome\.storage\.local\.set\(\{ provider, geminiKey, groqKey \}/)
})