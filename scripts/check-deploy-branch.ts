import {pathToFileURL} from 'node:url';

export function assertProductionBranch(env:NodeJS.ProcessEnv) {
  if (env.AWS_PULL_REQUEST_ID) {
    throw new Error('Pull-request previews are disabled for this production site.');
  }
  if (env.AWS_BRANCH !== 'main') {
    throw new Error('Only the main branch can deploy to production.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assertProductionBranch(process.env);
    console.log('Production branch verified. Tests and build must still succeed.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Branch check failed');
    process.exitCode = 1;
  }
}
