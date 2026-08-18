const crypto = require('crypto');
const { generateKeyPairSync } = crypto;

const { publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'der' }
});

const keyBase64 = publicKey.toString('base64');
const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
const extId = hash.slice(0, 32).split('').map(c => {
  const val = parseInt(c, 16);
  return String.fromCharCode(val + 97); // 0-f -> a-p
}).join('');

console.log('Manifest Key:\n' + keyBase64);
console.log('\nExtension ID:\n' + extId);
