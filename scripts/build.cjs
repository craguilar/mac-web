const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let contactEndpoint;
if (process.argv.includes('--amplify')) {
  const outputs = JSON.parse(fs.readFileSync(path.join(root, 'amplify_outputs.json'), 'utf8'));
  contactEndpoint = outputs.custom?.contact_endpoint;
  if (typeof contactEndpoint !== 'string' || !/^https:\/\/[a-z0-9]+\.execute-api\.us-east-2\.amazonaws\.com\/contact$/.test(contactEndpoint)) throw new Error('Amplify contact endpoint is missing or invalid.');
}
fs.rmSync(path.join(root, 'dist'), {recursive: true, force: true});
fs.cpSync(path.join(root, 'public'), path.join(root, 'dist'), {recursive: true});
console.log('Built static site in dist/. No deployment performed.');
fs.cpSync(path.join(root, 'licenses'), path.join(root, 'dist', 'licenses'), {recursive: true});
fs.copyFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), path.join(root, 'dist', 'THIRD_PARTY_NOTICES.md'));

if (contactEndpoint) fs.writeFileSync(path.join(root, 'dist/assets/contact-config.js'), `window.macContactConfig=Object.freeze(${JSON.stringify({endpoint:contactEndpoint})});\n`);
