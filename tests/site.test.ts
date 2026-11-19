import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {consultingContent as content,consultingExtra} from '../src/content.ts';
import crypto from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const pub = path.join(root, 'public');
const read = (p:string) => fs.readFileSync(path.join(pub, p), 'utf8');
const dist = path.join(root,'dist');
const html = fs.readFileSync(path.join(dist,'index.html'),'utf8');
const app = fs.readFileSync(path.join(root,'src/app.ts'),'utf8')+fs.readFileSync(path.join(root,'src/render-site.ts'),'utf8');
const css = read('assets/styles.css');
test('both languages retain brand, service structure and approved About copy', () => {
  for (const lang of ['es', 'en'] as const) {
    assert.equal(content[lang].company, 'MAC Tecnología');
    assert.equal(content[lang].st.length, 3);
    assert.equal(content[lang].aboutParagraphs.length, 3);
    assert.equal(consultingExtra[lang].deliverables.length, 3);
  }
  assert.equal(content.es.aboutParagraphs.join(' '), 'Somos una pequeña empresa 100% chiapaneca apasionada por crear tecnología útil. Nos gusta conocer de cerca a las personas y los negocios con los que trabajamos, entender sus retos y encontrar soluciones que realmente les sirvan. Combinamos nuestra experiencia en proyectos de distintas escalas y con equipos internacionales con una forma de trabajar cercana, clara y práctica.');
  assert.match(app, /Buenas ideas\./);
  assert.match(app, /Tecnología que las hace realidad\./);
});
test('HTML and CSS resource links are local, portable and present', () => {
  const refs = ['index.html','en/index.html'].flatMap(file=>[...fs.readFileSync(path.join(dist,file),'utf8').matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"#]+)"/g)].filter(m=>!m[1].startsWith('https:')).map(m=>[path.dirname(path.join(dist,file)),m[1]]));
  refs.push(...[...css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(m => [path.join(dist, 'assets'), m[1]]));
  for (const [base, ref] of refs) {
    if (ref.startsWith('data:')) continue;
    assert.match(ref,/^\.{1,2}\//);
    assert.ok(fs.existsSync(path.resolve(base, ref)), ref);
  }
});
test('contact loads shared validation and delivery without persistent browser storage', () => {
  assert.match(html, /assets\/app\.js/);
  assert.match(app, /await sendContact\(/);
  const bundle=fs.readFileSync(path.join(dist,'assets/app.js'),'utf8');
  assert.match(bundle, /function validateContact\(/);
  assert.match(bundle, /function sendContact\(/);
  assert.doesNotMatch(app, /\b(?:localStorage|sessionStorage|indexedDB)\b/);
});

test('export has no gallery links, private site IDs or unrelated variants', () => {
  for (const value of [html, app, css, JSON.stringify(content)]) {
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

test('streamlined design has visible services and optional contact details', () => {
  assert.doesNotMatch(app, /layerStudy|data-layer-button/);
  assert.match(app, /class="optional-details full"/);
  assert.match(css, /max-width:155px/);
  assert.equal(content.es.st[0], 'Crear o mejorar software');
  assert.equal(content.en.st[2], 'Improve testing and releases');
  assert.equal(consultingExtra.es.scope, 'Posibles alcances');
});

test('contact has accessible status and reversible clearing', () => {
  assert.match(app, /class="send-feedback full" role="status"/);
  assert.match(app, /clearSnapshot=values/);
  assert.match(app, /undo\.addEventListener\('click'/);
  assert.match(app, /maxlength="3000"/);
  assert.equal(content.es.submit, 'Enviar mensaje');
  assert.equal(content.en.submit, 'Send message');
});

test('contact body, input and placeholder colors have at least 4.5:1 contrast', () => {
  function luminance(hex:string) {
    const rgb = (hex.match(/../g) ?? []).map(v => parseInt(v, 16) / 255)
      .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  }
  for (const [fg, bg] of [['fff3e8', '9e482f'], ['253b30', 'f5f1e8'], ['596b5d', 'f5f1e8']]) {
    const a = luminance(fg), b = luminance(bg);
    assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5);
    assert.ok(css.includes('#' + fg) && css.includes('#' + bg));
  }
});
