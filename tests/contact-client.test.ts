import test from 'node:test';
import assert from 'node:assert/strict';
import {sendContact} from '../src/contact-client.ts';
const endpoint='https://test123.execute-api.us-east-2.amazonaws.com/contact';
test('client posts once without credentials and requires explicit server acceptance',async()=>{
 let count=0;const payload={message:'test'};
 assert.deepEqual(await sendContact(endpoint,payload,async(url,options)=>{count++;assert.equal(url,endpoint);assert.equal(options.credentials,'omit');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(String(options.body)),payload);return {ok:true,status:200,json:async()=>({ok:true})};}),{ok:true});
 assert.equal(count,1);
 assert.equal((await sendContact(endpoint,payload,async()=>({ok:true,status:200,json:async()=>({ok:false})}))).ok,false);
});
test('client distinguishes configuration, validation and throttling without retries',async()=>{
 for(const value of [null,'http://test123.execute-api.us-east-2.amazonaws.com/contact','https://evil.example/contact'])assert.deepEqual(await sendContact(value,{},()=>{throw Error('must not call');}),{ok:false,reason:'unavailable'});
 for(const [status,reason] of [[400,'invalid'],[403,'verification'],[429,'busy'],[503,'failed']] as const)assert.deepEqual(await sendContact(endpoint,{},async()=>({ok:false,status})),{ok:false,reason});
 let calls=0;assert.deepEqual(await sendContact(endpoint,{},async()=>{calls++;throw Error('network');}),{ok:false,reason:'failed'});assert.equal(calls,1);
 assert.equal((await sendContact(endpoint,{},async()=>({ok:true,json:async()=>{throw Error('malformed');}}))).ok,false);
});
test('client aborts a stalled request after 15 seconds',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let signal:AbortSignal|null|undefined;
 const result=sendContact(endpoint,{},(_url,options)=>new Promise((_resolve,reject)=>{signal=options.signal;assert.ok(signal);signal.addEventListener('abort',()=>reject(Error('timeout')));}));
 t.mock.timers.tick(15000);assert.ok(signal);assert.equal(signal.aborted,true);assert.deepEqual(await result,{ok:false,reason:'failed'});
});
