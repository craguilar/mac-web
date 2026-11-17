const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-deploy-gate-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:AWS_|MAC_AMPLIFY_|GIT_)/.test(key)));
  env.GIT_CONFIG_NOSYSTEM = '1';
  const git = args => cp.execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  git(['init', '-q']);
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.copyFileSync(path.join(__dirname, '../scripts/check-deploy-approval.cjs'), path.join(root, 'scripts/check-deploy-approval.cjs'));
  fs.mkdirSync(path.join(root, 'public'));
  fs.writeFileSync(path.join(root, 'public/index.html'), '<!doctype html><title>Gate test fixture</title>');
  fs.writeFileSync(path.join(root, '.gitignore'), 'public/ignored.txt\ndist/\n');
  git(['add', '.']);
  git(['-c', 'user.name=Test fixture', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Test fixture only']);
  const sha = git(['rev-parse', 'HEAD']);
  const approval = {AWS_BRANCH: 'dev', AWS_COMMIT_ID: sha, MAC_AMPLIFY_DEPLOY_APPROVED: 'true', MAC_AMPLIFY_APPROVED_BRANCH: 'dev', MAC_AMPLIFY_APPROVED_COMMIT: sha};
  const run = overrides => cp.spawnSync(process.execPath, ['scripts/check-deploy-approval.cjs'], {cwd: root, env: {...env, ...overrides}, encoding: 'utf8'});
  return {root, sha, approval, run, git};
}

test('approval CLI fails closed and supports exact-commit and HEAD rebuild metadata', t => {
  const {approval, run} = fixture(t);
  const denied = run({});
  assert.equal(denied.status, 1);
  assert.match(denied.stderr, /Deployment is not approved/);
  for (const env of [approval, {...approval, AWS_COMMIT_ID: 'HEAD'}]) {
    const accepted = run(env);
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.match(accepted.stdout, /gate passed/);
  }
  for (const env of [
    {...approval, AWS_BRANCH: 'main'},
    {...approval, MAC_AMPLIFY_APPROVED_COMMIT: '0'.repeat(40)},
    {...approval, AWS_COMMIT_ID: '0'.repeat(40)},
    {...approval, AWS_PULL_REQUEST_ID: '42'}
  ]) assert.equal(run(env).status, 1);
});

test('approval CLI rejects both unstaged and staged changes for the approved commit', t => {
  const {root, approval, run, git} = fixture(t);
  fs.appendFileSync(path.join(root, 'public/index.html'), '<p>Unreviewed change</p>');
  const result = run(approval);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Tracked source changed/);
  git(['add', 'public/index.html']);
  const staged = run(approval);
  assert.equal(staged.status, 1);
  assert.match(staged.stderr, /Tracked source changed/);
});

test('approval CLI permits ignored build output outside source inputs', t => {
  const {root, approval, run} = fixture(t);
  fs.mkdirSync(path.join(root, 'dist'));
  fs.writeFileSync(path.join(root, 'dist/index.html'), 'Previous local output, rebuilt before publication');
  assert.equal(run(approval).status, 0);
});

test('approval CLI rejects ignored and untracked build inputs', t => {
  const {root, approval, run} = fixture(t);
  for (const file of ['public/new.txt', 'public/ignored.txt']) {
    fs.writeFileSync(path.join(root, file), 'Synthetic fixture, not approved');
    const result = run(approval);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Untracked build inputs/);
    fs.unlinkSync(path.join(root, file));
  }
});

test('approval CLI fails closed when Git metadata is unavailable', t => {
  const {root, approval, run} = fixture(t);
  fs.rmSync(path.join(root, '.git'), {recursive: true, force: true});
  assert.equal(run(approval).status, 1);
});
