'use strict';

function assertProductionBranch(env) {
  if (env.AWS_PULL_REQUEST_ID) {
    throw new Error('Pull-request previews are disabled for this production site.');
  }
  if (env.AWS_BRANCH !== 'main') {
    throw new Error('Only the main branch can deploy to production.');
  }
}

if (require.main === module) {
  try {
    assertProductionBranch(process.env);
    console.log('Production branch verified. Tests and build must still succeed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {assertProductionBranch};
