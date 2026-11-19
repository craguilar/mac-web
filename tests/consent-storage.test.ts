import test from 'node:test';
import assert from 'node:assert/strict';
import {readConsent,saveConsent,consentKey} from '../src/consent-storage.ts';
import {createAnalyticsAdapter,type AnalyticsChannelHost} from '../src/analytics-adapter.ts';
import type {AnalyticsEvent} from '../src/analytics-policy.ts';
test('consent survives reload, expires, and fails closed for invalid/unavailable storage',()=>{
 const saved=new Map<string,string>();const storage={getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);}};
 assert.equal(readConsent(storage,1000),null);
 for(const choice of ['granted','denied'] as const){saveConsent(storage,choice,1000);assert.equal(readConsent(storage,2000),choice);}
 assert.equal(readConsent(storage,1000+181*24*60*60*1000),null);
 assert.equal(readConsent(storage,999),null);
 for(const value of ['bad','null','{"version":2,"choice":"granted","savedAt":1000}']){saved.set(consentKey,value);assert.equal(readConsent(storage,2000),null);}
 const broken={getItem(){throw Error();},setItem(){throw Error();}};
 assert.equal(readConsent(broken),null);assert.equal(saveConsent(broken,'granted'),false);
});
test('withdrawal destroys the vendor context, deletes owned cookies, and drops pending events and late callbacks',()=>{
 const ready:Array<()=>void>=[],sent:AnalyticsEvent[]=[],closed:number[]=[];let cookies=0;
 const host:AnalyticsChannelHost={open(callback){const id=ready.length;ready.push(callback);return {send(event){sent.push(event);},destroy(){closed.push(id);}};},clearCookies(){cookies++;}};
 const adapter=createAnalyticsAdapter(host),event={name:'page_view',parameters:{language:'es' as const}};
 adapter.send(event);assert.equal(ready.length,0);
 adapter.start();adapter.send(event);assert.equal(sent.length,0);
 adapter.stop();ready[0]();assert.equal(sent.length,0);assert.deepEqual(closed,[0]);assert.equal(cookies,1);
 adapter.start();ready[0]();adapter.send(event);assert.equal(sent.length,0);
 ready[1]();assert.deepEqual(sent,[event]);adapter.stop();adapter.send(event);assert.equal(sent.length,1);
});
