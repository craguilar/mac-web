const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
test('build includes font notices without altering source or deploying', () => {
  const root = path.resolve(__dirname, '..');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-build-'));
  try {
    for (const folder of ['public', 'licenses', 'scripts']) fs.cpSync(path.join(root, folder), path.join(tmp, folder), {recursive: true});
    fs.copyFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), path.join(tmp, 'THIRD_PARTY_NOTICES.md'));
    cp.execFileSync(process.execPath, [path.join(tmp, 'scripts/build.cjs')]);
    assert.ok(fs.existsSync(path.join(tmp, 'dist/index.html')));
    for (const file of ['LICENSE.OFL', 'Apache-2.0.txt']) assert.equal(fs.readFileSync(path.join(tmp, 'dist/licenses', file), 'utf8'), fs.readFileSync(path.join(root, 'licenses', file), 'utf8'));
    assert.equal(fs.readFileSync(path.join(tmp, 'dist/THIRD_PARTY_NOTICES.md'), 'utf8'), fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8'));
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
});
