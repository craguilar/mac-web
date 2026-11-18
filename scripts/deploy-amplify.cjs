'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {setTimeout: sleep} = require('node:timers/promises');

const approvalKeys = [
  'MAC_AMPLIFY_DEPLOY_APPROVED',
  'MAC_AMPLIFY_APPROVED_BRANCH',
  'MAC_AMPLIFY_APPROVED_COMMIT',
  'MAC_AMPLIFY_APPROVAL_OWNER'
];
const terminalStatuses = new Set(['SUCCEED', 'FAILED', 'CANCELLED']);

function configuration(env, checkoutCommit) {
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_REF !== 'refs/heads/main' ||
      env.GITHUB_REPOSITORY !== 'craguilar/mac-web') {
    throw new Error('Run this workflow manually from main in craguilar/mac-web.');
  }
  if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '') || checkoutCommit !== env.GITHUB_SHA) {
    throw new Error('The checkout must match the commit selected for this workflow.');
  }
  for (const name of ['AWS_REGION', 'AWS_ROLE_ARN', 'AMPLIFY_APP_ID']) {
    if (!env[name]) throw new Error('Set the ' + name + ' variable in the production GitHub environment.');
  }
  if (!/^d[a-z0-9]{1,19}$/.test(env.AMPLIFY_APP_ID)) throw new Error('Invalid AMPLIFY_APP_ID.');
  if (!/^\d+$/.test(env.GITHUB_RUN_ID || '') || !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT || '')) {
    throw new Error('GitHub run identity is missing.');
  }
  return {
    appId: env.AMPLIFY_APP_ID,
    branchName: 'main',
    commit: checkoutCommit,
    owner: env.GITHUB_RUN_ID + '-' + env.GITHUB_RUN_ATTEMPT
  };
}

// A private request file keeps branch configuration out of process arguments and logs.
function aws(operation, request) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-amplify-'));
  const input = path.join(directory, 'request.json');
  try {
    fs.writeFileSync(input, JSON.stringify(request), {mode: 0o600});
    const output = execFileSync('aws', [
      'amplify', operation, '--cli-input-json', 'file://' + input,
      '--output', 'json', '--no-cli-pager', '--cli-connect-timeout', '10', '--cli-read-timeout', '30'
    ], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000, maxBuffer: 16 * 1024 * 1024,
      env: {...process.env, AWS_MAX_ATTEMPTS: operation === 'start-job' ? '1' : '3'}
    });
    return JSON.parse(output);
  } catch {
    throw new Error('AWS Amplify ' + operation + ' failed. Check the AWS role permissions and Amplify job history.');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

async function deploy(config, call, save, pause = sleep, log = console.log) {
  const target = {appId: config.appId, branchName: config.branchName};
  const {app} = call('get-app', {appId: config.appId});
  if (app.repository?.replace(/\.git$/, '').replace(/\/$/, '') !== 'https://github.com/craguilar/mac-web' ||
      app.platform !== 'WEB') {
    throw new Error('The Amplify app must host the static craguilar/mac-web repository.');
  }
  if (approvalKeys.some(key => Object.hasOwn(app.environmentVariables || {}, key))) {
    throw new Error('Remove app-wide approval variables before using the branch deployment workflow.');
  }
  const {branch} = call('get-branch', target);
  if (branch.branchName !== 'main' || branch.stage !== 'PRODUCTION' ||
      branch.enableAutoBuild || branch.enablePullRequestPreview) {
    throw new Error('Configure main as PRODUCTION with auto-build and PR previews disabled.');
  }
  const variables = branch.environmentVariables || {};
  if (variables.MAC_AMPLIFY_DEPLOY_APPROVED === 'true' || variables.MAC_AMPLIFY_APPROVAL_OWNER) {
    throw new Error('Another deployment approval is active. Complete or clear it before starting a new run.');
  }
  // The CLI paginates ListJobs so a queued job cannot be hidden by completed jobs.
  const jobs = call('list-jobs', target).jobSummaries;
  if (jobs.some(job => !terminalStatuses.has(job.status))) {
    throw new Error('An Amplify job is already active for main.');
  }
  const state = {
    ...config,
    previousApproval: Object.fromEntries(approvalKeys.filter(key => Object.hasOwn(variables, key)).map(key => [key, variables[key]]))
  };
  save(state);
  call('update-branch', {...target, environmentVariables: {
    ...variables,
    MAC_AMPLIFY_DEPLOY_APPROVED: 'true',
    MAC_AMPLIFY_APPROVED_BRANCH: 'main',
    MAC_AMPLIFY_APPROVED_COMMIT: config.commit,
    MAC_AMPLIFY_APPROVAL_OWNER: config.owner
  }});
  const {jobSummary} = call('start-job', {...target, jobType: 'RELEASE', commitId: config.commit,
    jobReason: 'GitHub Actions ' + config.owner});
  state.jobId = jobSummary.jobId;
  save(state);
  log('Amplify job ' + state.jobId + ' started for commit ' + config.commit);
  let previousStatus;
  for (let attempt = 0; attempt < 120; attempt++) {
    const {summary} = call('get-job', {...target, jobId: state.jobId}).job;
    if (summary.commitId !== config.commit) {
      throw new Error('Amplify selected a different commit. Start a new workflow from the current main.');
    }
    if (summary.status !== previousStatus) {
      log('Amplify job ' + state.jobId + ' is ' + summary.status);
      previousStatus = summary.status;
    }
    if (summary.status === 'SUCCEED') return state;
    if (terminalStatuses.has(summary.status)) throw new Error('Amplify deployment ended with ' + summary.status + '.');
    await pause(10000);
  }
  throw new Error('Amplify deployment exceeded the 20-minute polling limit.');
}

function cleanup(state, call) {
  const target = {appId: state.appId, branchName: state.branchName};
  try {
    const {branch} = call('get-branch', target);
    const variables = {...branch.environmentVariables};
    if (variables.MAC_AMPLIFY_APPROVAL_OWNER === state.owner) {
      for (const key of approvalKeys) delete variables[key];
      Object.assign(variables, state.previousApproval);
      call('update-branch', {...target, environmentVariables: variables});
    }
  } finally {
    if (state.jobId) {
      const job = {...target, jobId: state.jobId};
      const {summary} = call('get-job', job).job;
      if (!terminalStatuses.has(summary.status) && summary.status !== 'CANCELLING') call('stop-job', job);
    }
  }
}

async function main() {
  const command = process.argv[2];
  if (!process.env.RUNNER_TEMP) throw new Error('RUNNER_TEMP must point to the GitHub runner temporary directory.');
  const statePath = path.join(process.env.RUNNER_TEMP, 'amplify-deployment.json');
  if (command === 'cleanup') {
    if (!fs.existsSync(statePath)) return;
    cleanup(JSON.parse(fs.readFileSync(statePath, 'utf8')), aws);
    fs.unlinkSync(statePath);
    console.log('Deployment approval cleanup completed.');
    return;
  }
  const checkoutCommit = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  const config = configuration(process.env, checkoutCommit);
  if (command === 'check') return;
  if (command !== 'deploy') throw new Error('Expected check, deploy or cleanup.');
  const state = await deploy(config, aws, value => fs.writeFileSync(statePath, JSON.stringify(value), {mode: 0o600}));
  const summary = 'Amplify production deployment succeeded.\n\nCommit `' + state.commit + '` · Job `' + state.jobId + '`\n';
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {configuration, deploy, cleanup};
