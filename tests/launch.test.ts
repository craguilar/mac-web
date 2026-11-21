import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

function runBranchCheck(overrides:NodeJS.ProcessEnv) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:AWS_|AMPLIFY_|MAC_AMPLIFY_)/.test(key)));
  return spawnSync(process.execPath, [path.join(import.meta.dirname, '../scripts/check-deploy-branch.ts')], {
    env: {...env, ...overrides}, encoding: 'utf8'
  });
}

test('native Amplify main build works without AWS credentials or approval variables', () => {
  const result = runBranchCheck({AWS_BRANCH: 'main'});
  assert.equal(result.status, 0, result.stderr);
});

test('production branch check rejects missing branches, other branches and PR previews', () => {
  for (const env of [{}, {AWS_BRANCH: 'dev'}, {AWS_BRANCH: 'feature/main'}, {AWS_BRANCH: 'main', AWS_PULL_REQUEST_ID: '42'}]) {
    const result = runBranchCheck(env);
    assert.equal(result.status, 1, JSON.stringify(env));
    assert.match(result.stderr, /Only the main branch|Pull-request previews are disabled/);
  }
});

test('CI remains validation-only with pinned actions and locked dependencies', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /image: mcr\.microsoft\.com\/playwright@sha256:[a-f0-9]{64}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /package-manager-cache: false/);
  const actions = [...workflow.matchAll(/uses: ([^\s]+)@([a-f0-9]{40})/g)];
  assert.equal(actions.length, 3);
  assert.deepEqual(actions.map(m => m[1]), ['actions/checkout', 'actions/setup-node', 'actions/upload-artifact']);
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm run build/);
  assert.doesNotMatch(workflow, /pull_request_target|id-token:|secrets\.|configure-aws-credentials|run:.*(?:deploy|amplify publish)/);
  const spec = fs.readFileSync(path.join(root, 'amplify.yml'), 'utf8');
  assert.match(spec, /node scripts\/check-deploy-branch\.ts/);
  assert.match(spec, /baseDirectory: dist/);
  assert.match(workflow, /run: npm ci/);
  assert.match(spec, /pipeline-deploy/);
});
