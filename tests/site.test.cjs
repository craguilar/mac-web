const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const pub = path.join(root, 'public');
const read = p => fs.readFileSync(path.join(pub, p), 'utf8');
const html = read('index.html');
const app = read('assets/app.js');
const css = read('assets/styles.css');
const context = {window: {}};
vm.runInNewContext(read('assets/content.js'), context);
const content = context.window.consultingContent;
test('both languages retain brand, service structure and approved About copy', () => {
  for (const lang of ['es', 'en']) {
    assert.equal(content[lang].company, 'MAC Tecnología');
    assert.equal(content[lang].st.length, 3);
    assert.equal(content[lang].aboutParagraphs.length, 3);
    assert.equal(context.window.consultingExtra[lang].deliverables.length, 3);
  }
  assert.equal(content.es.aboutParagraphs.join(' '), 'Somos una pequeña empresa 100% chiapaneca apasionada por crear tecnología útil. Nos gusta conocer de cerca a las personas y los negocios con los que trabajamos, entender sus retos y encontrar soluciones que realmente les sirvan. Combinamos nuestra experiencia en proyectos de distintas escalas y con equipos internacionales con una forma de trabajar cercana, clara y práctica.');
  assert.match(app, /Buenas ideas\./);
  assert.match(app, /Tecnología que las hace realidad\./);
});
test('HTML and CSS resource links are local, portable and present', () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => [pub, m[1]]);
  refs.push(...[...css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(m => [path.join(pub, 'assets'), m[1]]));
  for (const [base, ref] of refs) {
    if (ref.startsWith('data:')) continue;
    assert.ok(ref.startsWith('./'), ref);
    assert.ok(fs.existsSync(path.resolve(base, ref)), ref);
  }
});
test('form remains a local preview without network calls or persistent storage', () => {
  assert.match(app, /e\.preventDefault\(\)/);
  assert.match(app, /dd\.textContent=/);
  assert.match(app, /dialog\.showModal\(\)/);
  assert.doesNotMatch(app, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b/);
  assert.doesNotMatch(app, /https?:\/\//);
});
test('export has no gallery links, private site IDs or unrelated variants', () => {
  for (const value of [html, app, css, read('assets/content.js')]) {
    assert.doesNotMatch(value, /appgprj_|appgver_|libfile_|\/workspace\/|chatgpt\.site|chatgpt-team|structure-variations|monolito-refined|pavilion|blueprint/i);
  }
});
test('licensed font bytes match the audited asset checksums', () => {
  const hashes = {
    'open-sans.woff':'45df0c5c59a1c16d6ff95c84769aab509dfb34de9d483650d3fc89faef05e4d8',
    'nimbus-sans.woff':'3eb26779af55b2612335ab057f01ad263ebb011e92068f3b860097548365a825',
    'nimbus-mono.woff':'a4e0a5882fae884fae6f946c94e1e2ce3b4e7ba8d741fbc42d69c7ac8ea8d2b6'
  };
  for (const [name, expected] of Object.entries(hashes)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(pub, 'assets/fonts', name))).digest('hex');
    assert.equal(actual, expected);
  }
  for (const name of ['Apache-2.0.txt', 'LICENSE.OFL']) assert.ok(fs.existsSync(path.join(root, 'licenses', name)));
});
