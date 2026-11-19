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
    fs.mkdirSync(path.join(tmp, 'dist/private'), {recursive: true});
    fs.writeFileSync(path.join(tmp, 'dist/private/stale.txt'), 'Synthetic stale artifact, must be removed');
    cp.execFileSync(process.execPath, [path.join(tmp, 'scripts/build.cjs')]);
    assert.ok(fs.existsSync(path.join(tmp, 'dist/index.html')));
    for (const file of ['LICENSE.OFL', 'Apache-2.0.txt']) assert.equal(fs.readFileSync(path.join(tmp, 'dist/licenses', file), 'utf8'), fs.readFileSync(path.join(root, 'licenses', file), 'utf8'));
    assert.equal(fs.readFileSync(path.join(tmp, 'dist/THIRD_PARTY_NOTICES.md'), 'utf8'), fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8'));
    function filesUnder(base, prefix = '') {
      return fs.readdirSync(path.join(base, prefix), {withFileTypes: true}).flatMap(entry => {
        const relative = path.join(prefix, entry.name);
        assert.ok(!entry.isSymbolicLink(), 'Build inputs must not contain symlinks: ' + relative);
        return entry.isDirectory() ? filesUnder(base, relative) : [relative];
      }).sort();
    }
    const expected = new Map([
      ...filesUnder(path.join(root, 'public')).map(file => [file, path.join(root, 'public', file)]),
      ...filesUnder(path.join(root, 'licenses')).map(file => [path.join('licenses', file), path.join(root, 'licenses', file)]),
      ['THIRD_PARTY_NOTICES.md', path.join(root, 'THIRD_PARTY_NOTICES.md')]
    ]);
    assert.deepEqual(filesUnder(path.join(tmp, 'dist')), [...expected.keys()].sort(), 'Build must contain only intended public files and license notices');
    for (const [file, source] of expected) {
      assert.deepEqual(fs.readFileSync(path.join(tmp, 'dist', file)), fs.readFileSync(source), file);
      const sourceRelative = path.relative(root, source);
      assert.deepEqual(fs.readFileSync(path.join(tmp, sourceRelative)), fs.readFileSync(source), 'Source must be unchanged: ' + sourceRelative);
    }
    let siteKey;
    const build=()=>cp.spawnSync(process.execPath,[path.join(tmp,'scripts/build.cjs'),'--amplify'],{encoding:'utf8',env:{...process.env,TURNSTILE_SITE_KEY:siteKey,TURNSTILE_SECRET_KEY:'DO_NOT_PUBLISH_SECRET'}});
    assert.notEqual(build().status,0,'Production build must require backend outputs');
    const outputFile=path.join(tmp,'amplify_outputs.json');
    fs.writeFileSync(outputFile,JSON.stringify({custom:{contact_endpoint:'https://evil.example/contact'}}));
    assert.notEqual(build().status,0,'Invalid endpoint must fail the build');
    const endpoint='https://example123.execute-api.us-east-2.amazonaws.com/contact';
    fs.writeFileSync(outputFile,JSON.stringify({custom:{contact_endpoint:endpoint,private_value:'DO_NOT_PUBLISH'}}));
    assert.notEqual(build().status,0,'Missing site key must fail the build');
    siteKey='1x00000000000000000000AA';assert.notEqual(build().status,0,'Dummy site key must fail the build');
    siteKey='0x4AAAAAAAAAAAExamplePublicKey';
    const result=build();assert.equal(result.status,0,result.stderr);
    const config=fs.readFileSync(path.join(tmp,'dist/assets/contact-config.js'),'utf8');
    assert.ok(config.includes(endpoint));assert.ok(config.includes(siteKey));assert.ok(!config.includes('DO_NOT_PUBLISH_SECRET'));assert.ok(!config.includes('DO_NOT_PUBLISH'));
    assert.ok(!fs.existsSync(path.join(tmp,'dist/amplify_outputs.json')));
    assert.equal(fs.readFileSync(path.join(tmp,'public/assets/contact-config.js'),'utf8'),fs.readFileSync(path.join(root,'public/assets/contact-config.js'),'utf8'));
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
});
