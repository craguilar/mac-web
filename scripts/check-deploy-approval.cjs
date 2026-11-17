'use strict';

// Defense in depth only: owners can edit source/settings. This is not an IAM boundary.
function assertDeployApproval(env, checkoutCommit) {
  if (env.AWS_PULL_REQUEST_ID) {
    throw new Error('Pull-request preview deployments are not approved by this build specification.');
  }
  if (!/^[a-f0-9]{40}$/.test(checkoutCommit || '')) {
    throw new Error('The checked-out source must have a full commit SHA.');
  }
  // Only the dev push path can use the branch policy in place of a one-off approval.
  if (env.MAC_AMPLIFY_CONTINUOUS_DEV === 'true' && env.AWS_BRANCH === 'dev' && env.AWS_COMMIT_ID === checkoutCommit) {
    return;
  }
  if (env.MAC_AMPLIFY_DEPLOY_APPROVED !== 'true') {
    throw new Error('Deployment is not approved. Follow docs/launch-runbook.md before enabling this branch.');
  }
  if (!env.AWS_BRANCH || env.MAC_AMPLIFY_APPROVED_BRANCH !== env.AWS_BRANCH) {
    throw new Error('Deployment approval must match the exact Amplify branch.');
  }
  if (env.MAC_AMPLIFY_APPROVED_COMMIT !== checkoutCommit) {
    throw new Error('Deployment approval must match the exact checked-out commit SHA.');
  }
  // Amplify can report HEAD for a rebuild; the one-off approval still pins its checkout.
  if (env.AWS_COMMIT_ID !== 'HEAD' && env.AWS_COMMIT_ID !== checkoutCommit) {
    throw new Error('Amplify commit metadata does not match the checked-out source.');
  }
}

if (require.main === module) {
  try {
    const execFileSync = require('node:child_process').execFileSync;
    const git = args => execFileSync('git', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
    const checkoutCommit = git(['rev-parse', '--verify', 'HEAD']);
    assertDeployApproval(process.env, checkoutCommit);
    if (git(['status', '--porcelain', '--untracked-files=no'])) {
      throw new Error('Tracked source changed after checkout. Deploy only the reviewed commit.');
    }
    // Include ignored files too: none may silently enter the copied public artifact.
    if (git(['ls-files', '--others', '--', 'public', 'licenses', 'scripts', 'tests', 'package.json', 'amplify.yml', 'THIRD_PARTY_NOTICES.md'])) {
      throw new Error('Untracked build inputs are present. Deploy only committed, reviewed files.');
    }
    console.log('Branch deployment gate passed. Tests and build must still succeed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {assertDeployApproval};
