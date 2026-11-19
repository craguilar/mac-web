import test from 'node:test';
import assert from 'node:assert/strict';
import {checkHostingPlan,hostingRules} from '../scripts/configure-hosting.ts';
test('hosting changes are scoped, idempotent, and refuse to overwrite unexpected rules',()=>{
 const repository='https://github.com/craguilar/mac-web';
 assert.equal(checkHostingPlan(repository,[{source:'/<*>',target:'/index.html',status:'404-200'}]).changed,true);
 assert.equal(checkHostingPlan(repository,hostingRules).changed,false);
 assert.equal(checkHostingPlan(repository,hostingRules.map(rule=>rule.source==='/<*>'?{...rule,status:'404'}:rule)).changed,true);
 assert.throws(()=>checkHostingPlan('https://github.com/other/repo',hostingRules),/Unexpected repository/);
 assert.throws(()=>checkHostingPlan(repository,[{source:'/old',target:'/new',status:'301'}]),/rules changed/);
});
test('redirects use a domain-only source, localized legacy links and a genuine missing-page response',()=>{
 assert.deepEqual(hostingRules[0],{source:'https://www.mactecnologia.com.mx',target:'https://mactecnologia.com.mx',status:'301'});
 assert.deepEqual(hostingRules.find(rule=>rule.source==='/?lang=en'),{source:'/?lang=en',target:'/en/',status:'301'});
 assert.deepEqual(hostingRules.at(-1),{source:'/<*>',target:'/404.html',status:'404-200'});
 assert.equal(hostingRules.some(rule=>rule.target==='/index.html'),false);
});
