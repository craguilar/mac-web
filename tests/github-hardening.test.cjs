const test=require('node:test');
const assert=require('node:assert/strict');
const {reviewRuleset,ciRuleset}=require('../scripts/harden-github.cjs');
test('hardening preserves existing merge restrictions and bypass actors',()=>{
 const original={name:'Main enforced',target:'branch',enforcement:'active',bypass_actors:[{actor_id:2,actor_type:'RepositoryRole',bypass_mode:'always'}],conditions:{ref_name:{include:['~DEFAULT_BRANCH'],exclude:[]}},rules:[{type:'deletion'},{type:'non_fast_forward'},{type:'pull_request',parameters:{required_approving_review_count:2,allowed_merge_methods:['squash'],dismiss_stale_reviews_on_push:false,require_review_thread_resolution:false}}]};
 const result=reviewRuleset(original);
 assert.deepEqual(result.bypass_actors,original.bypass_actors);assert.deepEqual(result.conditions,original.conditions);assert.deepEqual(result.rules.slice(0,2),original.rules.slice(0,2));
 assert.equal(result.rules[2].parameters.required_approving_review_count,2);assert.equal(result.rules[2].parameters.dismiss_stale_reviews_on_push,true);assert.deepEqual(result.rules[2].parameters.allowed_merge_methods,['squash']);
 assert.equal(original.rules[2].parameters.dismiss_stale_reviews_on_push,false);assert.deepEqual(reviewRuleset(result),result);
 assert.throws(()=>reviewRuleset({...original,rules:[]}),/Expected/);
});
test('main requires a check from the verified Actions app without bypasses',()=>{
 const result=ciRuleset(123);assert.deepEqual(result.bypass_actors,[]);assert.equal(result.enforcement,'active');assert.deepEqual(result.conditions.ref_name.include,['refs/heads/main']);
 assert.equal(result.rules[0].parameters.required_status_checks[0].integration_id,123);assert.equal(result.rules[0].parameters.strict_required_status_checks_policy,true);
 assert.throws(()=>ciRuleset(undefined),/verified/);
});
