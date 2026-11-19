import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRuleset, ciRuleset, ownerMergeRuleset, branchSafetyRuleset, validateOwner, assertSettings, codeqlConfigured, type Ruleset} from '../scripts/harden-github.ts';

const owner = {actor_id: 6916098, actor_type: 'User', bypass_mode: 'pull_request'};
const original: Ruleset = {
  name: 'Main enforced', target: 'branch', enforcement: 'active',
  bypass_actors: [{actor_id: 2, actor_type: 'RepositoryRole', bypass_mode: 'always'}],
  conditions: {ref_name: {include: ['~DEFAULT_BRANCH'], exclude: []}},
  rules: [{type: 'deletion'}, {type: 'non_fast_forward'}, {type: 'pull_request', parameters: {
    required_approving_review_count: 2, allowed_merge_methods: ['squash'],
    dismiss_stale_reviews_on_push: false, required_review_thread_resolution: false,
  }}],
};

test('only the verified owner can update main through a pull request', () => {
  const rule = ownerMergeRuleset();
  assert.deepEqual(rule.bypass_actors, [owner]);
  assert.equal(rule.enforcement, 'active');
  assert.deepEqual(rule.conditions.ref_name, {include: ['refs/heads/main', '~DEFAULT_BRANCH'], exclude: []});
  assert.deepEqual(rule.rules, [{type: 'update'}]);
});

test('owner exception cannot bypass CI, PR requirement, review conversations, deletion or force-push protection', () => {
  const safety = branchSafetyRuleset();
  assert.deepEqual(safety.bypass_actors, []);
  assert.equal(safety.enforcement, 'active');
  assert.ok(safety.rules.some(rule => rule.type === 'deletion'));
  assert.ok(safety.rules.some(rule => rule.type === 'non_fast_forward'));
  const pr = safety.rules.find(rule => rule.type === 'pull_request');
  assert.equal(pr?.parameters?.required_approving_review_count, 0);
  assert.equal(pr?.parameters?.required_review_thread_resolution, true);
  assert.deepEqual(ciRuleset(15368).bypass_actors, []);
});

test('review hardening replaces broad bypasses while preserving stronger existing restrictions', () => {
  const result = reviewRuleset(original);
  const review = result.rules.find(rule => rule.type === 'pull_request')!.parameters!;
  assert.deepEqual(result.bypass_actors, [owner]);
  assert.deepEqual(result.rules.slice(0, 2), original.rules.slice(0, 2));
  assert.equal(review.required_approving_review_count, 2);
  assert.equal(review.dismiss_stale_reviews_on_push, true);
  assert.equal(review.required_review_thread_resolution, true);
  assert.equal(Object.hasOwn(review, 'require_review_thread_resolution'), false);
  assert.equal(review.require_code_owner_review, true);
  assert.equal(review.require_last_push_approval, true);
  assert.deepEqual(review.allowed_merge_methods, ['squash']);
  assert.equal(original.rules[2].parameters!.dismiss_stale_reviews_on_push, false);
  assert.deepEqual(reviewRuleset(result), result);
  assert.throws(() => reviewRuleset({...original, rules: []}), /Expected/);
});

test('main requires an up-to-date check from the verified Actions app without bypasses', () => {
  const result = ciRuleset(15368);
  assert.equal(result.enforcement, 'active');
  assert.deepEqual(result.bypass_actors, []);
  assert.deepEqual(result.rules[0].parameters?.required_status_checks, [{context: 'Test and build (Node 24)', integration_id: 15368}]);
  assert.equal(result.rules[0].parameters?.strict_required_status_checks_policy, true);
  assert.equal(result.rules[0].parameters?.do_not_enforce_on_create, false);
  for (const invalid of [undefined, 0, -1, 1.5, '15368']) assert.throws(() => ciRuleset(invalid), /verified/);
});

test('refuses another account, transferred repository or unexpected default branch', () => {
  const user = {login: 'craguilar', id: 6916098};
  const repo = {owner: {...user, type: 'User'}, default_branch: 'main', permissions: {admin: true}};
  assert.doesNotThrow(() => validateOwner(user, repo));
  for (const invalid of [{...user, login: 'someone'}, {...user, id: 1}]) assert.throws(() => validateOwner(invalid, repo));
  for (const invalid of [{...repo, owner: {...repo.owner, type: 'Organization'}}, {...repo, owner: {...repo.owner, id: 1}}, {...repo, default_branch: 'dev'}, {...repo, permissions: {admin: false}}]) assert.throws(() => validateOwner(user, invalid));
});

test('read-back rejects ignored fields, extra bypass actors and missing restrictions', () => {
  assert.doesNotThrow(() => assertSettings({enabled: true, id: 1}, {enabled: true}));
  assert.throws(() => assertSettings({}, {enabled: true}));
  assert.throws(() => assertSettings({enabled: false}, {enabled: true}));
  const expected = ownerMergeRuleset();
  assert.throws(() => assertSettings({...expected, bypass_actors: [...expected.bypass_actors, {actor_type: 'RepositoryRole'}]}, expected));
  assert.throws(() => assertSettings({...expected, rules: []}, expected));
});

test('CodeQL verification accepts GitHub language aliases but rejects missing analysis', () => {
  const configured = {state: 'configured', query_suite: 'extended', runner_type: 'standard', languages: ['actions', 'javascript', 'javascript-typescript', 'typescript']};
  assert.equal(codeqlConfigured(configured), true);
  assert.equal(codeqlConfigured({...configured, languages: ['actions']}), false);
  assert.equal(codeqlConfigured({...configured, state: 'not-configured'}), false);
  assert.equal(codeqlConfigured({...configured, query_suite: 'default'}), false);
});
