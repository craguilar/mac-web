const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {activationAllowed, eventPayload} = require('../public/assets/analytics-policy.js');
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
test('events are allowlisted; contact preview is not a lead', () => {
  for (const event of ['generate_lead','form_submit','page_view','custom']) assert.equal(eventPayload(event),null);
  assert.deepEqual(eventPayload('contact_open', {email:'private@example.test', message:'sensitive',language:'es'}),{name:'contact_open',parameters:{language:'es'}});
  assert.deepEqual(eventPayload('service_view', {service:'private free text',language:'bad'}),{name:'service_view',parameters:{}});
  assert.deepEqual(eventPayload('service_view', {service:'software',language:'en'}),{name:'service_view',parameters:{service:'software',language:'en'}});
});
test('policy is inert and not enabled on the website', () => {
  const code=fs.readFileSync(require.resolve('../public/assets/analytics-policy.js'),'utf8');
  assert.doesNotMatch(code,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|gtag)\b/);
  assert.doesNotMatch(fs.readFileSync(require.resolve('../public/index.html'),'utf8'),/analytics-policy|googletagmanager|google-analytics/);
});
