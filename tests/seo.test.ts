import test from 'node:test';
import assert from 'node:assert/strict';
import {languageForLocation,languagePath,canonicalUrl} from '../src/seo.ts';
import {renderDocument} from '../src/seo-document.ts';

test('language URLs are stable and legacy language links remain understandable',()=>{
 assert.equal(languageForLocation('/',''),'es');
 assert.equal(languageForLocation('/en/',''),'en');
 assert.equal(languageForLocation('/en',''),'en');
 assert.equal(languageForLocation('/','?lang=en'),'en');
 assert.equal(languageForLocation('/en/','?lang=es'),'es');
 assert.equal(languageForLocation('/','?lang=invalid'),'es');
 assert.equal(languagePath('es'),'/');assert.equal(languagePath('en'),'/en/');
 assert.equal(canonicalUrl('en'),'https://mactecnologia.com.mx/en/');
});

test('both HTML documents contain localized content and reciprocal search metadata before JavaScript',()=>{
 for(const language of ['es','en'] as const){
  const html=renderDocument(language);
  assert.match(html,new RegExp(`<html lang="${language}"`));
  assert.ok(html.includes(`<link rel="canonical" href="${canonicalUrl(language)}">`));
  assert.ok(html.includes('hreflang="es" href="https://mactecnologia.com.mx/"'));
  assert.ok(html.includes('hreflang="en" href="https://mactecnologia.com.mx/en/"'));
  assert.ok(html.includes('hreflang="x-default" href="https://mactecnologia.com.mx/"'));
  assert.match(html,/<h1>/);assert.match(html,/<h3[^>]*id="service-title-0"/);
  assert.ok(html.includes(language==='es'?'Crear o mejorar software':'Build or improve software'));
  assert.ok(html.includes('data-lang="en"'));assert.ok(html.includes('href="/en/"'));
  assert.match(html,/<meta property="og:image" content="https:\/\/mactecnologia.com.mx\/assets\/social-(es|en)\.png"/);
  assert.doesNotMatch(html,/<input(?![^>]*disabled)[^>]*>/,'Unhydrated form inputs must not submit personal details via GET');
  assert.doesNotMatch(html,/<script[^>]*src="https:\/\/(?:www\.)?google/);
 }
});
