'use strict';

// Defense in depth only: owners can edit source/settings. This is not an IAM boundary.
function assertDeployApproval(env, checkoutCommit) {
  if (env.MAC_AMPLIFY_DEPLOY_APPROVED !== 'true') {
    throw new Error('Deployment is not approved. Follow docs/launch-runbook.md before enabling this branch.');
  }
  if (!env.AWS_BRANCH || env.MAC_AMPLIFY_APPROVED_BRANCH !== env.AWS_BRANCH) {
    throw new Error('Deployment approval must match the exact Amplify branch.');
  }
  if (!/^[a-f0-9]{40}$/.test(checkoutCommit || '') || env.MAC_AMPLIFY_APPROVED_COMMIT !== checkoutCommit) {
    throw new Error('Deployment approval must match the exact checked-out commit SHA.');
  }
  // Amplify documents AWS_COMMIT_ID=HEAD for rebuilds; still verify actual Git HEAD.
  if (env.AWS_COMMIT_ID !== 'HEAD' && env.AWS_COMMIT_ID !== checkoutCommit) {
    throw new Error('Amplify commit metadata does not match the checked-out source.');
  }
  if (env.AWS_PULL_REQUEST_ID) {
    throw new Error('Pull-request preview deployments are not approved by this build specification.');
  }
}

if (require.main === module) {
  try {
    const checkoutCommit = require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
    assertDeployApproval(process.env, checkoutCommit);
    console.log('Branch deployment gate passed. Tests and build must still succeed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {assertDeployApproval};
