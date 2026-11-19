const test=require('node:test');
const assert=require('node:assert/strict');
const {createChallenge}=require('../public/assets/contact-challenge.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(loadOverride){
 const states=[],calls=[];let callbacks;
 const api={render(container,options){callbacks=options;calls.push(['render',container]);return 'widget';},reset(id){calls.push(['reset',id]);},remove(id){calls.push(['remove',id]);}};
 const challenge=createChallenge({container:'container',siteKey:'0x4AAAAAAAAAAAExamplePublicKey',language:'es',onState:s=>states.push(s),load:loadOverride||(()=>Promise.resolve(api))});
 return {challenge,api,states,calls,options:()=>callbacks};
}
test('widget passes action and language, clears expired tokens and resets after attempts',async()=>{
 const f=fixture();await tick();const options=f.options();
 assert.equal(options.action,'contact');assert.equal(options.language,'es');assert.equal(options['response-field'],false);assert.equal(options.size,'compact','Widget must fit the narrow mobile form');
 assert.equal(f.challenge.getToken(),'');options.callback('single-use-token');assert.equal(f.challenge.getToken(),'single-use-token');
 options['expired-callback']();assert.equal(f.challenge.getToken(),'');
 options.callback('replacement');f.challenge.reset();assert.equal(f.challenge.getToken(),'');assert.deepEqual(f.calls.at(-1),['reset','widget']);
 options['error-callback']();assert.equal(f.states.at(-1),'verificationUnavailable');
 f.challenge.destroy();options.callback('stale');assert.equal(f.challenge.getToken(),'');assert.deepEqual(f.calls.at(-1),['remove','widget']);
});
test('language rerender removes old widget and ignores a late loader',async()=>{
 let resolve;const f=fixture(()=>new Promise(done=>resolve=done));f.challenge.destroy();resolve(f.api);await tick();
 assert.equal(f.calls.length,0);assert.equal(f.challenge.getToken(),'');
});
test('blocked script can be retried and missing configuration never loads Cloudflare',async()=>{
 let attempts=0;const f=fixture(()=>{attempts++;return Promise.reject(Error('blocked'));});await tick();
 assert.equal(f.states.at(-1),'verificationUnavailable');f.challenge.reset();await tick();assert.equal(attempts,2);
 for(const siteKey of [undefined,'','1x00000000000000000000AA']){
  let loaded=false,state;
  const c=createChallenge({siteKey,load:()=>{loaded=true;},onState:value=>state=value});await tick();
  assert.equal(loaded,false);assert.equal(state,'verificationUnavailable');assert.equal(c.getToken(),'');c.destroy();
 }
});
