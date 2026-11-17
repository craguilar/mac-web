const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {assertDeployApproval} = require('../scripts/check-deploy-approval.cjs');
const sha = '1234567890abcdef1234567890abcdef12345678';
const approved = {AWS_BRANCH: 'dev', MAC_AMPLIFY_DEPLOY_APPROVED: 'true', MAC_AMPLIFY_APPROVED_BRANCH: 'dev', AWS_COMMIT_ID: sha, MAC_AMPLIFY_APPROVED_COMMIT: sha};

test('deployment gate rejects missing, false, mismatched and PR-preview approval', () => {
  for (const env of [
    {},
    {AWS_BRANCH: 'main'},
    {AWS_BRANCH: 'main', MAC_AMPLIFY_DEPLOY_APPROVED: 'false'},
    {MAC_AMPLIFY_DEPLOY_APPROVED: 'true', MAC_AMPLIFY_APPROVED_BRANCH: 'main'},
    {AWS_BRANCH: 'main', MAC_AMPLIFY_DEPLOY_APPROVED: 'true', MAC_AMPLIFY_APPROVED_BRANCH: 'dev'},
    {...approved, AWS_COMMIT_ID: undefined},
    {...approved, MAC_AMPLIFY_APPROVED_COMMIT: undefined},
    {...approved, MAC_AMPLIFY_APPROVED_COMMIT: 'abcdef1234567890abcdef1234567890abcdef12'},
    {...approved, AWS_PULL_REQUEST_ID: '123'}
  ]) assert.throws(() => assertDeployApproval(env, sha));
  assert.throws(() => assertDeployApproval(approved));
  assert.throws(() => assertDeployApproval(approved, 'abcdef1234567890abcdef1234567890abcdef12'));
});

test('deployment gate accepts explicit approval for exactly one branch and commit', () => {
  assert.doesNotThrow(() => assertDeployApproval(approved, sha));
  assert.doesNotThrow(() => assertDeployApproval({...approved, AWS_COMMIT_ID: 'HEAD'}, sha));
});

test('continuous deployment requires an opted-in dev branch, matching SHA and no PR preview', () => {
  const push = {AWS_BRANCH: 'dev', AWS_COMMIT_ID: sha, MAC_AMPLIFY_CONTINUOUS_DEV: 'true'};
  assert.doesNotThrow(() => assertDeployApproval(push, sha));
  for (const override of [
    {AWS_BRANCH: 'main'}, {AWS_BRANCH: 'feature/dev'}, {AWS_PULL_REQUEST_ID: '17'},
    {AWS_COMMIT_ID: 'HEAD'}, {AWS_COMMIT_ID: '0'.repeat(40)}, {AWS_COMMIT_ID: undefined},
    {MAC_AMPLIFY_CONTINUOUS_DEV: undefined}, {MAC_AMPLIFY_CONTINUOUS_DEV: 'false'}
  ]) assert.throws(() => assertDeployApproval({...push, ...override}, sha));
  assert.throws(() => assertDeployApproval({...push, AWS_COMMIT_ID: 'HEAD'}, 'HEAD'));
  // An operator can still rebuild a specifically approved commit when AWS reports HEAD.
  assert.doesNotThrow(() => assertDeployApproval({...push, ...approved, AWS_COMMIT_ID: 'HEAD'}, sha));
});

test('CI remains validation-only with pinned actions and no installation dependency', () => {
  const root = path.resolve(__dirname, '..');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /package-manager-cache: false/);
  const actions = [...workflow.matchAll(/uses: ([^\s]+)@([a-f0-9]{40})/g)];
  assert.equal(actions.length, 2);
  assert.deepEqual(actions.map(m => m[1]), ['actions/checkout', 'actions/setup-node']);
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm run build/);
  assert.doesNotMatch(workflow, /pull_request_target|id-token:|secrets\.|configure-aws-credentials|run:.*(?:npm ci|deploy|amplify publish)/);
  const spec = fs.readFileSync(path.join(root, 'amplify.yml'), 'utf8');
  assert.match(spec, /node scripts\/check-deploy-approval\.cjs/);
  assert.match(spec, /baseDirectory: dist/);
  assert.doesNotMatch(spec, /^backend:/m);
});
