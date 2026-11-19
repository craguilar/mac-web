import test from 'node:test';
import assert from 'node:assert/strict';
import type {ChallengeOptions,ChallengeState,TurnstileApi,TurnstileOptions} from '../src/contact-challenge.ts';
import {createChallenge} from '../src/contact-challenge.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(loadOverride?:ChallengeOptions['load']){
 const states:ChallengeState[]=[],calls:Array<[string,HTMLElement|string]>=[];let callbacks:TurnstileOptions|undefined;
 const api:TurnstileApi={render(container,options){callbacks=options;calls.push(['render',container]);return 'widget';},reset(id){calls.push(['reset',id]);},remove(id){calls.push(['remove',id]);}};
 const challenge=createChallenge({container:'container',siteKey:'0x4AAAAAAAAAAAExamplePublicKey',language:'es',onState:s=>states.push(s),load:loadOverride||(()=>Promise.resolve(api))});
 return {challenge,api,states,calls,options:()=>{assert.ok(callbacks);return callbacks;}};
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
 let release:((api:TurnstileApi)=>void)|undefined;const f=fixture(()=>new Promise<TurnstileApi>(done=>{release=done;}));f.challenge.destroy();assert.ok(release);release(f.api);await tick();
 assert.equal(f.calls.length,0);assert.equal(f.challenge.getToken(),'');
});
test('blocked script can be retried and missing configuration never loads Cloudflare',async()=>{
 let attempts=0;const f=fixture(()=>{attempts++;return Promise.reject(Error('blocked'));});await tick();
 assert.equal(f.states.at(-1),'verificationUnavailable');f.challenge.reset();await tick();assert.equal(attempts,2);
 for(const siteKey of [undefined,'','1x00000000000000000000AA']){
  let loaded=false,state:ChallengeState|undefined;
  const c=createChallenge({container:'container',language:'es',siteKey,load:async()=>{loaded=true;throw Error('must not load');},onState:value=>state=value});await tick();
  assert.equal(loaded,false);assert.equal(state,'verificationUnavailable');assert.equal(c.getToken(),'');c.destroy();
 }
});
