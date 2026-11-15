const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
fs.rmSync(path.join(root, 'dist'), {recursive: true, force: true});
fs.cpSync(path.join(root, 'public'), path.join(root, 'dist'), {recursive: true});
console.log('Built static site in dist/. No deployment performed.');
fs.cpSync(path.join(root, 'licenses'), path.join(root, 'dist', 'licenses'), {recursive: true});
fs.copyFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), path.join(root, 'dist', 'THIRD_PARTY_NOTICES.md'));
