import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parse} from 'yaml';
import {parseHTML} from 'linkedom';

const config=parse(fs.readFileSync(new URL('../customHttp.yml',import.meta.url),'utf8')) as {customHeaders:Array<{pattern:string;headers:Array<{key:string;value:string}>}>};
const global=config.customHeaders.find(rule=>rule.pattern==='**/*')!;
const headers=new Map(global.headers.map(({key,value})=>[key.toLowerCase(),value]));
const policy=new Map(headers.get('content-security-policy')!.split(';').map(part=>{
 const [name,...sources]=part.trim().split(/\s+/);return [name,sources];
}));

test('hosting restricts executable content while permitting contact verification and consented analytics',()=>{
 assert.deepEqual(policy.get('default-src'),["'self'"]);
 assert.deepEqual(policy.get('object-src'),["'none'"]);
 assert.deepEqual(policy.get('base-uri'),["'none'"]);
 assert.deepEqual(policy.get('frame-ancestors'),["'self'"]);
 assert.deepEqual(policy.get('script-src'),["'self'",'https://challenges.cloudflare.com','https://www.googletagmanager.com']);
 assert.deepEqual(policy.get('frame-src'),["'self'",'https://challenges.cloudflare.com']);
 assert.deepEqual(policy.get('style-src'),["'self'"]);
 assert.ok(policy.get('connect-src')?.includes('https://mvxp0vhfuh.execute-api.us-east-2.amazonaws.com/contact'));
 assert.ok(policy.get('connect-src')?.includes('https://*.google-analytics.com'));
 assert.ok(policy.get('connect-src')?.includes('https://*.google.com'));
 assert.ok(policy.has('upgrade-insecure-requests'));
 assert.equal(headers.get('x-content-type-options'),'nosniff');
 assert.equal(headers.get('x-frame-options'),'SAMEORIGIN');
 assert.equal(headers.get('referrer-policy'),'strict-origin-when-cross-origin');
 assert.equal(headers.get('strict-transport-security'),'max-age=31536000');
 assert.doesNotMatch(headers.get('content-security-policy')!,/unsafe-inline|unsafe-eval|https:\/\/\*\s/);
});

test('every built HTML document works without inline executable code or inline styles',()=>{
 for(const file of ['index.html','en/index.html','analytics.html','404.html']){
  const {document}=parseHTML(fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'));
  for(const element of document.querySelectorAll('*')){
   for(const attribute of element.attributes)assert.ok(!/^on/i.test(attribute.name)&&attribute.name!=='style',`${file}: CSP blocks ${attribute.name}`);
  }
  for(const script of document.querySelectorAll('script')){
   assert.equal(script.textContent?.trim(),'');
   assert.equal(new URL(script.getAttribute('src')!,`https://mactecnologia.com.mx/${file}`).origin,'https://mactecnologia.com.mx');
  }
  for(const link of document.querySelectorAll('link[rel="stylesheet"]'))assert.equal(new URL(link.getAttribute('href')!,`https://mactecnologia.com.mx/${file}`).origin,'https://mactecnologia.com.mx');
 }
});

test('security headers preserve uncached language entries and normal asset caching',()=>{
 assert.equal(headers.has('cache-control'),false);
 for(const path of ['/','/index.html','/en/','/en/index.html']){
  const rule=config.customHeaders.find(rule=>rule.pattern===path);
  assert.equal(rule?.headers.find(header=>header.key==='Cache-Control')?.value,'no-store',path);
 }
});
