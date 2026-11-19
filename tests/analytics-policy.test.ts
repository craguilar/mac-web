import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activationAllowed, eventPayload} from '../src/analytics-policy.ts';
const config = {enabled:true, measurementId:'G-TEST123', productionHosts:['example.test']};
const location = {protocol:'https:',hostname:'example.test'};
test('activation requires every explicit production/consent gate', () => {
  assert.equal(activationAllowed(config, location, 'granted'), true);
  for (const consent of [undefined, 'denied', 'pending']) assert.equal(activationAllowed(config, location, consent), false);
  for (const override of [{enabled:false},{measurementId:''},{productionHosts:[]},{productionHosts:['other.test']}]) {
    assert.equal(activationAllowed({...config,...override},location,'granted'),false);
  }
  assert.equal(activationAllowed(config,{...location,protocol:'http:'},'granted'),false);
  assert.equal(activationAllowed(config,{...location,hostname:'preview.example.test'},'granted'),false);
});
test('events are allowlisted; a lead requires confirmed delivery and excludes private fields', () => {
  for (const event of ['generate_lead','form_submit','custom']) assert.equal(eventPayload(event),null);
  assert.deepEqual(eventPayload('generate_lead',{delivery:'accepted',language:'es',email:'private@example.test',message:'private'}),{name:'generate_lead',parameters:{language:'es'}});
  assert.deepEqual(eventPayload('page_view',{language:'en',page_location:'https://example.test/?email=private'}),{name:'page_view',parameters:{language:'en'}});
  assert.deepEqual(eventPayload('contact_open', {email:'private@example.test', message:'sensitive',language:'es'}),{name:'contact_open',parameters:{language:'es'}});
  assert.deepEqual(eventPayload('service_view', {service:'private free text',language:'bad'}),{name:'service_view',parameters:{}});
  assert.deepEqual(eventPayload('service_view', {service:'build',language:'en'}),{name:'service_view',parameters:{service:'build',language:'en'}});
});
test('policy stays pure and development builds never enable analytics', () => {
  const code=fs.readFileSync(new URL('../src/analytics-policy.ts',import.meta.url),'utf8');
  assert.doesNotMatch(code,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|gtag)\b/);
  assert.doesNotMatch(fs.readFileSync(new URL('../dist/assets/app.js',import.meta.url),'utf8'),/googletagmanager|google-analytics/);
  const config=fs.readFileSync(new URL('../dist/assets/analytics-config.js',import.meta.url),'utf8');
  assert.match(config,/"enabled":false/);assert.doesNotMatch(config,/measurementId/);
});
