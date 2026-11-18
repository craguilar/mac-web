const test = require('node:test');
const assert = require('node:assert/strict');
const {configuration, deploy, cleanup} = require('../scripts/deploy-amplify.cjs');

const commit = 'a'.repeat(40);
const config = {appId: 'dexample', branchName: 'main', commit, owner: '123-1'};
const env = {
  GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main',
  GITHUB_REPOSITORY: 'craguilar/mac-web', GITHUB_SHA: commit,
  GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1',
  AWS_REGION: 'us-west-2', AWS_ROLE_ARN: 'arn:aws:iam::123456789012:role/deploy', AMPLIFY_APP_ID: 'dexample'
};

function fixture(statuses = ['RUNNING', 'SUCCEED']) {
  const app = {repository: 'https://github.com/craguilar/mac-web', platform: 'WEB'};
  const branch = {
    branchName: 'main', stage: 'PRODUCTION', enableAutoBuild: false, enablePullRequestPreview: false,
    environmentVariables: {UNRELATED: 'preserve', MAC_AMPLIFY_DEPLOY_APPROVED: 'false'}
  };
  const calls = [];
  let saved;
  let statusIndex = 0;
  const call = (operation, request) => {
    calls.push({operation, request: structuredClone(request)});
    switch (operation) {
      case 'get-app': return {app};
      case 'get-branch': return {branch};
      case 'list-jobs': return {jobSummaries: []};
      case 'update-branch':
        branch.environmentVariables = structuredClone(request.environmentVariables);
        return {branch};
      case 'start-job': return {jobSummary: {jobId: '7', commitId: commit}};
      case 'get-job':
        return {job: {summary: {jobId: '7', commitId: commit, status: statuses[Math.min(statusIndex++, statuses.length - 1)]}}};
      case 'stop-job': return {jobSummary: {status: 'CANCELLING'}};
      default: throw new Error('Unexpected operation ' + operation);
    }
  };
  return {app, branch, calls, call,
    save(value) { saved = structuredClone(value); },
    state() { return saved; }};
}
const noWait = async () => {};
const noLog = () => {};

test('deployment configuration requires manual main, the selected SHA and AWS setup', () => {
  assert.deepEqual(configuration(env, commit), config);
  for (const change of [
    {GITHUB_REF: 'refs/heads/dev'}, {GITHUB_EVENT_NAME: 'pull_request'}, {GITHUB_REPOSITORY: 'someone/fork'},
    {AWS_REGION: ''}, {AWS_ROLE_ARN: ''}, {AMPLIFY_APP_ID: ''}, {AMPLIFY_APP_ID: '../app'},
    {GITHUB_SHA: 'HEAD'}, {GITHUB_RUN_ID: ''}, {GITHUB_RUN_ATTEMPT: ''}
  ]) assert.throws(() => configuration({...env, ...change}, commit));
  assert.throws(() => configuration(env, 'b'.repeat(40)));
});

test('successful deployment pins the commit and cleans its approval while preserving other variables', async () => {
  const f = fixture();
  const state = await deploy(config, f.call, f.save, noWait, noLog);
  const start = f.calls.find(c => c.operation === 'start-job').request;
  assert.equal(start.commitId, commit);
  assert.equal(start.jobType, 'RELEASE');
  assert.equal(f.branch.environmentVariables.MAC_AMPLIFY_APPROVED_COMMIT, commit);
  assert.equal(state.jobId, '7');
  // A setting changed during the job must survive cleanup.
  f.branch.environmentVariables.NEW_SETTING = 'also-preserve';
  cleanup(f.state(), f.call);
  assert.deepEqual(f.branch.environmentVariables, {UNRELATED: 'preserve', NEW_SETTING: 'also-preserve', MAC_AMPLIFY_DEPLOY_APPROVED: 'false'});
  assert.equal(f.calls.some(c => c.operation === 'stop-job'), false);
  cleanup(f.state(), f.call);
  assert.equal(f.branch.environmentVariables.MAC_AMPLIFY_DEPLOY_APPROVED, 'false');
});

test('automatic deployment selects the successful CI commit even when the default branch has advanced', () => {
  const ciEvent = {
    action: 'completed',
    workflow_run: {
      name: 'CI', event: 'push', conclusion: 'success', head_branch: 'main', head_sha: commit,
      head_repository: {full_name: 'craguilar/mac-web'}
    }
  };
  const autoEnv = {...env, GITHUB_EVENT_NAME: 'workflow_run', GITHUB_SHA: 'b'.repeat(40)};
  assert.deepEqual(configuration(autoEnv, commit, ciEvent), config);
  assert.throws(() => configuration(autoEnv, autoEnv.GITHUB_SHA, ciEvent), /checkout must match/);
});

test('automatic deployment rejects failed, cancelled, PR, foreign and incomplete CI events', () => {
  const run = {
    name: 'CI', event: 'push', conclusion: 'success', head_branch: 'main', head_sha: commit,
    head_repository: {full_name: 'craguilar/mac-web'}
  };
  const autoEnv = {...env, GITHUB_EVENT_NAME: 'workflow_run'};
  for (const change of [
    {name: 'Other workflow'}, {event: 'pull_request'}, {event: 'workflow_dispatch'},
    {conclusion: 'failure'}, {conclusion: 'cancelled'}, {conclusion: null},
    {head_branch: 'feature'}, {head_repository: {full_name: 'other/fork'}},
    {head_repository: undefined}, {head_sha: undefined}, {head_sha: 'HEAD'}
  ]) assert.throws(() => configuration(autoEnv, commit, {action: 'completed', workflow_run: {...run, ...change}}));
  assert.throws(() => configuration(autoEnv, commit));
  assert.throws(() => configuration(autoEnv, commit, {action: 'requested', workflow_run: run}));
});

test('invalid app, branch settings and active jobs prevent an approval or deployment', async () => {
  const variants = [
    f => { f.app.repository = 'https://github.com/other/repo'; },
    f => { f.app.platform = 'WEB_COMPUTE'; },
    f => { f.app.environmentVariables = {MAC_AMPLIFY_DEPLOY_APPROVED: 'true'}; },
    f => { f.branch.stage = 'DEVELOPMENT'; },
    f => { f.branch.enableAutoBuild = true; },
    f => { f.branch.enablePullRequestPreview = true; },
    f => { f.branch.environmentVariables.MAC_AMPLIFY_DEPLOY_APPROVED = 'true'; },
    f => { f.branch.environmentVariables.MAC_AMPLIFY_APPROVAL_OWNER = 'another-run'; }
  ];
  for (const change of variants) {
    const f = fixture();
    change(f);
    await assert.rejects(deploy(config, f.call, f.save, noWait, noLog));
    assert.equal(f.calls.some(c => c.operation === 'update-branch' || c.operation === 'start-job'), false);
  }
  const f = fixture();
  const call = (op, req) => op === 'list-jobs' ? {jobSummaries: [{status: 'PENDING'}]} : f.call(op, req);
  await assert.rejects(deploy(config, call, f.save, noWait, noLog), /already active/);
});

test('startup failure and a lost update response still leave enough state to remove approval', async () => {
  for (const failedOperation of ['update-branch', 'start-job']) {
    const f = fixture();
    const call = (op, req) => {
      const result = f.call(op, req);
      if (op === failedOperation) throw new Error('Connection lost');
      return result;
    };
    await assert.rejects(deploy(config, call, f.save, noWait, noLog), /Connection lost/);
    assert.equal(f.state().owner, config.owner);
    cleanup(f.state(), f.call);
    assert.deepEqual(f.branch.environmentVariables, {UNRELATED: 'preserve', MAC_AMPLIFY_DEPLOY_APPROVED: 'false'});
  }
});

test('failed and cancelled builds fail the workflow without a redundant stop request', async () => {
  for (const status of ['FAILED', 'CANCELLED']) {
    const f = fixture([status]);
    await assert.rejects(deploy(config, f.call, f.save, noWait, noLog), new RegExp(status));
    cleanup(f.state(), f.call);
    assert.equal(f.calls.some(c => c.operation === 'stop-job'), false);
  }
});

test('an advanced main commit is rejected and its running job is stopped during cleanup', async () => {
  const f = fixture(['RUNNING']);
  const call = (op, req) => {
    const result = f.call(op, req);
    if (op === 'get-job') result.job.summary.commitId = 'b'.repeat(40);
    return result;
  };
  await assert.rejects(deploy(config, call, f.save, noWait, noLog), /different commit/);
  cleanup(f.state(), call);
  assert.equal(f.calls.filter(c => c.operation === 'stop-job').length, 1);
});

test('polling timeout removes approval and stops the unfinished job', async () => {
  const f = fixture(['RUNNING']);
  await assert.rejects(deploy(config, f.call, f.save, noWait, noLog), /polling limit/);
  cleanup(f.state(), f.call);
  assert.equal(f.branch.environmentVariables.MAC_AMPLIFY_DEPLOY_APPROVED, 'false');
  assert.equal(f.calls.some(c => c.operation === 'stop-job'), true);
});

test('cleanup respects another run owner and still stops only its own job', () => {
  const f = fixture(['RUNNING']);
  f.branch.environmentVariables.MAC_AMPLIFY_APPROVAL_OWNER = 'someone-else';
  cleanup({...config, previousApproval: {}, jobId: '7'}, f.call);
  assert.equal(f.calls.some(c => c.operation === 'update-branch'), false);
  assert.equal(f.calls.find(c => c.operation === 'stop-job').request.jobId, '7');
});

test('cleanup attempts to stop an unfinished job even if approval removal fails', () => {
  const f = fixture(['RUNNING']);
  const call = (op, req) => {
    if (op === 'get-branch') throw new Error('AWS unavailable');
    return f.call(op, req);
  };
  assert.throws(() => cleanup({...config, previousApproval: {}, jobId: '7'}, call), /AWS unavailable/);
  assert.equal(f.calls.some(c => c.operation === 'stop-job'), true);
});
