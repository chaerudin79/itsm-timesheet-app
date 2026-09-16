const fs = require('fs');
let c = fs.readFileSync('.env', 'utf8');
let m = c.match(/GOOGLE_PRIVATE_KEY="([\s\S]*?)"/);
if (m) {
  let raw = m[1];
  let key = raw.replace(/\\n/g, '').replace(/[\r\n]/g, '').replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '');
  let formatted = '-----BEGIN PRIVATE KEY-----\n' + key.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n';
  c = c.replace(m[0], 'GOOGLE_PRIVATE_KEY="' + formatted.replace(/\n/g, '\\n') + '"');
  fs.writeFileSync('.env', c);
  console.log('Fixed Google Private Key format in .env');
} else {
  console.log('No GOOGLE_PRIVATE_KEY found with quotes');
}