import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

interface RuleParameters {
 required_approving_review_count?:number; dismiss_stale_reviews_on_push?:boolean; required_review_thread_resolution?:boolean;
 allowed_merge_methods?:string[]; required_status_checks?:Array<{context:string;integration_id:number}>;
 strict_required_status_checks_policy?:boolean; [key:string]:unknown;
}
export interface Ruleset {
 name:string;target:string;enforcement:string;bypass_actors:Array<{actor_id:number|null;actor_type:string;bypass_mode:string}>;
 conditions:{ref_name:{include:string[];exclude:string[]}};rules:Array<{type:string;parameters?:RuleParameters}>;
}
interface RulesetSummary {id:number;name:string;}
interface CheckRun {name:string;app?:{slug:string;id:number};}
interface Repository {
 permissions?:{admin?:boolean};security_and_analysis?:{secret_scanning?:{status:string};secret_scanning_push_protection?:{status:string}};
}

const repo='craguilar/mac-web',checkName='Test and build (Node 24)';
export function reviewRuleset(existing:Ruleset){
 const body={name:existing.name,target:existing.target,enforcement:existing.enforcement,bypass_actors:existing.bypass_actors,conditions:existing.conditions,rules:structuredClone(existing.rules)};
 const review=body.rules.find(rule=>rule.type==='pull_request');
 if(!review?.parameters)throw new Error('Expected the existing pull request rule; inspect repository rules before proceeding.');
 review.parameters.dismiss_stale_reviews_on_push=true;
 review.parameters.required_review_thread_resolution=true;
 review.parameters.required_approving_review_count=Math.max(1,review.parameters.required_approving_review_count ?? 0);
 return body;
}
export function ciRuleset(integrationId:unknown){
 if(typeof integrationId!=='number'||!Number.isSafeInteger(integrationId)||integrationId<=0)throw new Error('A verified GitHub Actions check is required.');
 return {name:'Required CI for main',target:'branch',enforcement:'active',bypass_actors:[],conditions:{ref_name:{include:['refs/heads/main'],exclude:[]}},rules:[{type:'required_status_checks',parameters:{strict_required_status_checks_policy:true,required_status_checks:[{context:checkName,integration_id:integrationId}]}}]};
}
function api<T=unknown>(endpoint:string,method='GET',body?:unknown):T{
 const args=['api','--hostname','github.com',endpoint,'--method',method,'-H','X-GitHub-Api-Version: 2022-11-28'];
 if(body)args.push('--input','-');
 const result=execFileSync('gh',args,{encoding:'utf8',input:body?JSON.stringify(body):undefined,stdio:['pipe','pipe','inherit']});
 return (result.trim()?JSON.parse(result):null) as T;
}
function main(){
 const apply=process.argv.includes('--apply');
 if(api<{login:string}>('/user').login!=='craguilar')throw new Error('Authenticate gh as craguilar first.');
 const base=`/repos/${repo}`,metadata=api<Repository>(base);
 if(!metadata.permissions?.admin)throw new Error('Repository administration permission is required.');
 const summaries=api<RulesetSummary[]>(`${base}/rulesets?per_page=100`);
 const existing=summaries.find(rule=>rule.name==='Main enforced');
 if(!existing)throw new Error('Expected Main enforced ruleset was not found; no changes made.');
 const current=api<Ruleset>(`${base}/rulesets/${existing.id}`);
 const branch=api<{commit:{sha:string}}>(`${base}/branches/main`);
 const checks=api<{check_runs:CheckRun[]}>(`${base}/commits/${branch.commit.sha}/check-runs?per_page=100`).check_runs;
 const check=checks.find(run=>run.name===checkName&&run.app?.slug==='github-actions');
 if(!check)throw new Error('No matching GitHub Actions check found on main; no changes made.');
 const ci=ciRuleset(check.app?.id),reviews=reviewRuleset(current);
 const existingCI=summaries.find(rule=>rule.name===ci.name);
 const changes:Array<[string,string,unknown]>=[
  [`${base}/rulesets/${existing.id}`,'PUT',reviews],
  [existingCI?`${base}/rulesets/${existingCI.id}`:`${base}/rulesets`,existingCI?'PUT':'POST',ci],
  [base,'PATCH',{security_and_analysis:{secret_scanning:{status:'enabled'},secret_scanning_push_protection:{status:'enabled'}}}],
  [`${base}/actions/permissions/workflow`,'PUT',{default_workflow_permissions:'read',can_approve_pull_request_reviews:false}],
  [`${base}/actions/permissions/fork-pr-contributor-approval`,'PUT',{approval_policy:'all_external_contributors'}]
 ];
 console.log(JSON.stringify({repository:repo,mode:apply?'apply':'preview',changes:changes.map(([endpoint,method,body])=>({endpoint,method,body}))},null,2));
 if(!apply){console.log('Preview only. Run node scripts/harden-github.ts --apply to apply these settings.');return;}
 for(const [endpoint,method,body] of changes){api(endpoint,method,body);console.log(`Applied ${method} ${endpoint}`);}
 const updated=api<Repository>(base),rules=api<RulesetSummary[]>(`${base}/rulesets?per_page=100`);
 const appliedCI=rules.find(rule=>rule.name===ci.name);
 if(!appliedCI)throw new Error('Required CI rule missing after update.');
 const verifiedCI=api<Ruleset>(`${base}/rulesets/${appliedCI.id}`);
 const verifiedReviews=api<Ruleset>(`${base}/rulesets/${existing.id}`);
 const workflow=api<{default_workflow_permissions:string;can_approve_pull_request_reviews:boolean}>(`${base}/actions/permissions/workflow`),forks=api<{approval_policy:string}>(`${base}/actions/permissions/fork-pr-contributor-approval`);
 if(updated.security_and_analysis?.secret_scanning?.status!=='enabled'||updated.security_and_analysis?.secret_scanning_push_protection?.status!=='enabled'||verifiedCI.enforcement!=='active'||verifiedCI.bypass_actors.length||!verifiedCI.rules.some(rule=>rule.type==='required_status_checks'&&rule.parameters?.required_status_checks?.some(check=>check.context===checkName))||!verifiedReviews.rules.some(rule=>rule.type==='pull_request'&&rule.parameters?.dismiss_stale_reviews_on_push&&rule.parameters?.required_review_thread_resolution)||workflow.default_workflow_permissions!=='read'||workflow.can_approve_pull_request_reviews!==false||forks.approval_policy!=='all_external_contributors')throw new Error('Settings verification failed. Inspect the reported settings before retrying.');
 console.log('Verified CI, review, secret-scanning and Actions protections.');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{main();}catch(error){console.error(error instanceof Error?error.message:'GitHub hardening failed');process.exitCode=1;}}
