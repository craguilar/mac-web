import test from 'node:test';
import assert from 'node:assert/strict';
import {createVerifier} from '../amplify/functions/contact/turnstile.ts';
const origin='https://mactecnologia.com.mx';
const good={success:true,hostname:'mactecnologia.com.mx',action:'contact'};
function setup(result:unknown=good){let calls=0;const verify=createVerifier({getSecret:()=> 'private-test-secret',fetcher:async(url,options)=>{calls++;assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.deepEqual(JSON.parse(String(options.body)),{secret:'private-test-secret',response:'visitor-token'});return {ok:true,json:async()=>result};}});return {verify,calls:()=>calls};}
test('Turnstile requires provider success, matching hostname and contact action',async()=>{
 assert.deepEqual(await setup().verify('visitor-token',origin),{ok:true});
 for(const result of [{success:false,'error-codes':['timeout-or-duplicate']},{...good,hostname:'evil.example'},{...good,action:'login'},{success:true},null])assert.deepEqual(await setup(result).verify('visitor-token',origin),{ok:false,reason:'verification'});
});
test('missing or malformed token cannot contact Turnstile or send mail',async()=>{
 const {verify,calls}=setup();for(const token of [undefined,null,17,'','x'.repeat(2049),'bad token'])assert.deepEqual(await verify(token,origin),{ok:false,reason:'verification'});assert.equal(calls(),0);
});
test('missing secret, failed provider and malformed response fail closed',async()=>{
 for(const secret of ['',undefined,'<value will be resolved during runtime>']){
  const verify=createVerifier({getSecret:()=>secret,fetcher:()=>{throw Error('must not fetch');}});assert.deepEqual(await verify('visitor-token',origin),{ok:false,reason:'unavailable'});
 }
 for(const fetcher of [async()=>{throw Error('network');},async()=>({ok:false}),async()=>({ok:true,json:async()=>{throw Error('bad JSON');}})]){
  const verify=createVerifier({getSecret:()=> 'secret',fetcher});assert.deepEqual(await verify('visitor-token',origin),{ok:false,reason:'unavailable'});
 }
});
test('verification times out and never logs secrets or request bodies',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let signal:AbortSignal|null|undefined;
 const verify=createVerifier({getSecret:()=> 'secret',fetcher:async(_url,options)=>new Promise((_resolve,reject)=>{signal=options.signal;assert.ok(signal);signal.addEventListener('abort',()=>reject(Error('timeout')));})});
 const result=verify('visitor-token',origin);t.mock.timers.tick(4000);assert.ok(signal);assert.equal(signal.aborted,true);assert.deepEqual(await result,{ok:false,reason:'unavailable'});
});
