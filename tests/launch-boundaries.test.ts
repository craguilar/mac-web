import test from 'node:test';
import assert from 'node:assert/strict';
import {validateContact} from '../src/contact-validation.ts';
import type {ConsentOptions} from '../src/consent-controller.ts';
import type {AnalyticsEvent} from '../src/analytics-policy.ts';
import {createConsentController} from '../src/consent-controller.ts';
import {policy} from '../src/analytics-policy.ts';
const valid={name:' Ana ',email:'ana@example.test',message:' Consulta ',language:'es'};
test('contact boundary trims fields, excludes unknown keys and preserves Spanish',()=>{
  assert.deepEqual(validateContact({...valid,name:' María ',token:'secret',admin:true}),{ok:true,value:{name:'María',email:valid.email,message:'Consulta',language:'es'}});
});
test('contact requires a name and retains optional company and topic',()=>{assert.equal(validateContact({...valid,name:''}).ok,false);const result=validateContact({...valid,company:' Example ',topic:'build'});assert.ok(result.ok);assert.equal(result.value.company,'Example');});
test('contact boundary rejects malformed, empty, excessive and header-injection inputs',()=>{
  for(const value of [null,[],42]) assert.equal(validateContact(value).ok,false);
  for(const patch of [{message:''},{email:'not email'},{email:'a@b.test\r\nBcc:private@x.test'},{name:'a\nb'},{message:'x'.repeat(3001)},{message:'a\0b'},{language:'xx'},{email:7},{company:'x'.repeat(161)},{company:'a\nb'},{topic:'bad'}]) assert.equal(validateContact({...valid,...patch}).ok,false);
});
function setup(overrides:Partial<ConsentOptions>={}){
  const calls:Array<string|AnalyticsEvent>=[];
  const controller=createConsentController({policy,config:{enabled:true,measurementId:'G-TEST123',productionHosts:['example.test']},location:{protocol:'https:',hostname:'example.test'},adapter:{start(){calls.push('start');return true;},stop(){calls.push('stop');},send(e){calls.push(e);}},...overrides});
  return {calls,controller};
}
test('controller never starts before opt-in; revocation prevents later events',()=>{
  const {calls,controller:c}=setup();
  assert.deepEqual(c.state(),{consent:'pending',active:false});
  assert.equal(c.track('contact_open'),false);c.setConsent('denied');assert.equal(calls.length,0);
  assert.equal(c.setConsent('granted'),true);c.setConsent('granted');assert.deepEqual(calls,['start']);
  c.track('contact_open',{email:'secret',language:'es'});
  assert.deepEqual(calls[1],{name:'contact_open',parameters:{language:'es'}});
  c.setConsent('denied');assert.equal(c.track('contact_open'),false);assert.equal(calls.at(-1),'stop');
});
test('invalid config and failed adapter cannot activate; preview never becomes lead',()=>{
  const {controller:c,calls}=setup({config:{enabled:false}});
  assert.equal(c.setConsent('granted'),false);assert.equal(calls.length,0);
  const failed=setup({adapter:{start(){throw Error('unavailable');},stop(){},send(){}}}).controller;
  assert.equal(failed.setConsent('granted'),false);assert.equal(failed.track('contact_open'),false);
  const good=setup().controller;good.setConsent('granted');assert.equal(good.track('generate_lead'),false);good.dispose();assert.equal(good.track('contact_open'),false);
});
