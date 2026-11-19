import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

interface RuleParameters {
  required_approving_review_count?: number;
  required_status_checks?: Array<{context: string; integration_id: number}>;
  [key: string]: unknown;
}
export interface Ruleset {
  name: string; target: string; enforcement: string;
  bypass_actors: Array<{actor_id: number | null; actor_type: string; bypass_mode: string}>;
  conditions: {ref_name: {include: string[]; exclude: string[]}};
  rules: Array<{type: string; parameters?: RuleParameters}>;
}
interface RulesetSummary {id: number; name: string;}
interface User {login: string; id: number;}
interface Repository {
  owner: User & {type: string}; default_branch: string; permissions?: {admin?: boolean};
}
interface CheckRun {name: string; app?: {slug: string; id: number};}
type Change = {endpoint: string; method: string; body?: unknown; verify?: unknown};
interface CodeQLSetup {state: string; query_suite: string; languages: string[]; runner_type: string;}
const codeql = {state: 'configured', query_suite: 'extended', languages: ['actions', 'javascript-typescript'], runner_type: 'standard'};

const repo = 'craguilar/mac-web';
const ownerId = 6916098;
const checkName = 'Test and build (Node 24)';
const ownerBypass = () => [{actor_id: ownerId, actor_type: 'User', bypass_mode: 'pull_request'}];
const mainConditions = () => ({ref_name: {include: ['refs/heads/main', '~DEFAULT_BRANCH'], exclude: []}});

export function validateOwner(user: User, repository: Repository) {
  if (user.login !== 'craguilar' || user.id !== ownerId) throw new Error('Authenticate gh as craguilar first.');
  if (repository.owner.type !== 'User' || repository.owner.id !== ownerId || repository.owner.login !== user.login || repository.default_branch !== 'main') {
    throw new Error('Repository ownership or default branch changed; review this policy before applying.');
  }
  if (!repository.permissions?.admin) throw new Error('Repository administration permission is required.');
}

export function reviewRuleset(existing: Ruleset): Ruleset {
  const body = structuredClone(existing);
  body.enforcement = 'active';
  body.bypass_actors = ownerBypass();
  const review = body.rules.find(rule => rule.type === 'pull_request');
  if (!review?.parameters) throw new Error('Expected the existing pull request rule; inspect repository rules before proceeding.');
  Object.assign(review.parameters, {
    dismiss_stale_reviews_on_push: true,
    required_review_thread_resolution: true,
    require_code_owner_review: true,
    require_last_push_approval: true,
    required_approving_review_count: Math.max(1, review.parameters.required_approving_review_count ?? 0),
  });
  // Only send writable fields, not IDs or other server metadata.
  return {name: body.name, target: body.target, enforcement: body.enforcement, bypass_actors: body.bypass_actors, conditions: body.conditions, rules: body.rules};
}

export function ownerMergeRuleset(): Ruleset {
  return {
    name: 'Only craguilar may merge main', target: 'branch', enforcement: 'active',
    bypass_actors: ownerBypass(), conditions: mainConditions(),
    rules: [{type: 'update'}],
  };
}

export function branchSafetyRuleset(): Ruleset {
  return {
    name: 'Main safety without bypass', target: 'branch', enforcement: 'active',
    bypass_actors: [], conditions: mainConditions(),
    rules: [{type: 'deletion'}, {type: 'non_fast_forward'}, {type: 'pull_request', parameters: {
      required_approving_review_count: 0, dismiss_stale_reviews_on_push: true,
      require_code_owner_review: false, require_last_push_approval: false,
      required_review_thread_resolution: true,
    }}],
  };
}

export function ciRuleset(integrationId: unknown): Ruleset {
  if (typeof integrationId !== 'number' || !Number.isSafeInteger(integrationId) || integrationId <= 0) throw new Error('A verified GitHub Actions check is required.');
  return {
    name: 'Required CI for main', target: 'branch', enforcement: 'active',
    bypass_actors: [], conditions: mainConditions(),
    rules: [{type: 'required_status_checks', parameters: {
      strict_required_status_checks_policy: true, do_not_enforce_on_create: false,
      required_status_checks: [{context: checkName, integration_id: integrationId}],
    }}],
  };
}

// GitHub can add defaults and metadata, but may not ignore requested restrictions.
// Arrays are exact: an unexpected extra bypass actor is a security failure.
export function assertSettings(actual: unknown, expected: unknown, path = 'settings'): void {
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${path}: expected an array`);
    assert.equal(actual.length, expected.length, `${path}: unexpected entries`);
    expected.forEach((value, index) => assertSettings(actual[index], value, `${path}[${index}]`));
  } else if (expected && typeof expected === 'object') {
    assert.ok(actual && typeof actual === 'object', `${path}: missing settings`);
    for (const [key, value] of Object.entries(expected)) assertSettings((actual as Record<string, unknown>)[key], value, `${path}.${key}`);
  } else {
    assert.equal(actual, expected, `${path}: requested setting was not applied`);
  }
}

export function codeqlConfigured(actual: CodeQLSetup): boolean {
  // GitHub also returns javascript/typescript aliases after the initial scan.
  return actual.state === codeql.state && actual.query_suite === codeql.query_suite
    && actual.runner_type === codeql.runner_type
    && codeql.languages.every(language => actual.languages.includes(language));
}

function api<T = unknown>(endpoint: string, method = 'GET', body?: unknown): T {
  const args = ['api', '--hostname', 'github.com', endpoint, '--method', method, '-H', 'X-GitHub-Api-Version: 2026-03-10'];
  if (body !== undefined) args.push('--input', '-');
  const result = execFileSync('gh', args, {encoding: 'utf8', input: body !== undefined ? JSON.stringify(body) : undefined, stdio: ['pipe', 'pipe', 'inherit']});
  return (result.trim() ? JSON.parse(result) : null) as T;
}

function main() {
  const apply = process.argv.includes('--apply');
  const verifyOnly = process.argv.includes('--verify');
  if (apply && verifyOnly) throw new Error('Use --apply or --verify, not both.');
  const base = `/repos/${repo}`;
  validateOwner(api<User>('/user'), api<Repository>(base));
  const summaries = api<RulesetSummary[]>(`${base}/rulesets?per_page=100`);
  const existing = summaries.find(rule => rule.name === 'Main enforced');
  if (!existing) throw new Error('Expected Main enforced ruleset was not found; no changes made.');
  const current = api<Ruleset>(`${base}/rulesets/${existing.id}`);
  const branch = api<{commit: {sha: string}}>(`${base}/branches/main`);
  const checks = api<{check_runs: CheckRun[]}>(`${base}/commits/${branch.commit.sha}/check-runs?per_page=100`).check_runs;
  const check = checks.find(run => run.name === checkName && run.app?.slug === 'github-actions');
  if (!check) throw new Error('No matching GitHub Actions check found on main; no changes made.');
  // Establish the merge restriction first. Other rule bypasses never bypass these independent rulesets.
  const rulesets = [ownerMergeRuleset(), branchSafetyRuleset(), ciRuleset(check.app?.id), reviewRuleset(current)];
  const ruleChanges: Change[] = rulesets.map(body => {
    const found = summaries.find(rule => rule.name === body.name);
    return {endpoint: found ? `${base}/rulesets/${found.id}` : `${base}/rulesets`, method: found ? 'PUT' : 'POST', body};
  });
  const security = {
    secret_scanning: {status: 'enabled'}, secret_scanning_push_protection: {status: 'enabled'},
  };
  const changes: Change[] = [
    ...ruleChanges,
    {endpoint: base, method: 'PATCH', body: {allow_auto_merge: false, security_and_analysis: security}},
    {endpoint: `${base}/vulnerability-alerts`, method: 'PUT', verify: null},
    {endpoint: `${base}/automated-security-fixes`, method: 'PUT', verify: {enabled: true, paused: false}},
    {endpoint: `${base}/private-vulnerability-reporting`, method: 'PUT', verify: {enabled: true}},
    {endpoint: `${base}/actions/permissions/workflow`, method: 'PUT', body: {default_workflow_permissions: 'read', can_approve_pull_request_reviews: false}},
    {endpoint: `${base}/actions/permissions/fork-pr-contributor-approval`, method: 'PUT', body: {approval_policy: 'all_external_contributors'}},
    {endpoint: `${base}/actions/permissions`, method: 'PUT', body: {enabled: true, allowed_actions: 'selected', sha_pinning_required: true}},
    {endpoint: `${base}/actions/permissions/selected-actions`, method: 'PUT', body: {github_owned_allowed: true, verified_allowed: false, patterns_allowed: []}},
  ];
  const codeqlEndpoint = `${base}/code-scanning/default-setup`;
  if (!verifyOnly) console.log(JSON.stringify({repository: repo, mode: apply ? 'apply' : 'preview', changes, codeql}, null, 2));
  if (!apply && !verifyOnly) {
    console.log('Preview only. Run node scripts/harden-github.ts --apply to apply, or --verify to audit without writing.');
    return;
  }
  if (apply) {
    for (const change of changes) {
      api(change.endpoint, change.method, change.body);
      console.log(`Applied ${change.method} ${change.endpoint}`);
    }
    if (!codeqlConfigured(api<CodeQLSetup>(codeqlEndpoint))) {
      console.log('CodeQL configuration requested:', JSON.stringify(api(codeqlEndpoint, 'PATCH', codeql)));
    }
  }
  const after = api<RulesetSummary[]>(`${base}/rulesets?per_page=100`);
  for (const expected of rulesets) {
    const found = after.find(rule => rule.name === expected.name);
    if (!found) throw new Error(`Missing ruleset: ${expected.name}`);
    assertSettings(api(`${base}/rulesets/${found.id}`), expected, expected.name);
  }
  for (const change of changes.slice(ruleChanges.length)) {
    assertSettings(api(change.endpoint), Object.hasOwn(change, 'verify') ? change.verify : change.body, change.endpoint);
  }
  assert.ok(codeqlConfigured(api<CodeQLSetup>(codeqlEndpoint)), 'CodeQL configuration is incomplete. Wait for CodeQL Setup in Actions, then run --verify again.');
  console.log('Verified owner-only merging, mandatory CI/PRs, branch safety, secret/dependency protections, Actions restrictions and CodeQL configuration. Check Security for scan findings.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : 'GitHub hardening failed'); process.exitCode = 1; }
}
