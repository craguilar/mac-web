"use strict";
const {execFileSync}=require('node:child_process');
const repo='craguilar/mac-web',checkName='Test and build (Node 24)';
function reviewRuleset(existing){
 const body={name:existing.name,target:existing.target,enforcement:existing.enforcement,bypass_actors:existing.bypass_actors,conditions:existing.conditions,rules:structuredClone(existing.rules)};
 const review=body.rules.find(rule=>rule.type==='pull_request');
 if(!review)throw new Error('Expected the existing pull request rule; inspect repository rules before proceeding.');
 review.parameters.dismiss_stale_reviews_on_push=true;
 review.parameters.require_review_thread_resolution=true;
 review.parameters.required_approving_review_count=Math.max(1,review.parameters.required_approving_review_count);
 return body;
}
function ciRuleset(integrationId){
 if(!Number.isSafeInteger(integrationId)||integrationId<=0)throw new Error('A verified GitHub Actions check is required.');
 return {name:'Required CI for main',target:'branch',enforcement:'active',bypass_actors:[],conditions:{ref_name:{include:['refs/heads/main'],exclude:[]}},rules:[{type:'required_status_checks',parameters:{strict_required_status_checks_policy:true,required_status_checks:[{context:checkName,integration_id:integrationId}]}}]};
}
function api(endpoint,method='GET',body){
 const args=['api','--hostname','github.com',endpoint,'--method',method,'-H','X-GitHub-Api-Version: 2022-11-28'];
 if(body)args.push('--input','-');
 const result=execFileSync('gh',args,{encoding:'utf8',input:body?JSON.stringify(body):undefined,stdio:['pipe','pipe','inherit']});
 return result.trim()?JSON.parse(result):null;
}
function main(){
 const apply=process.argv.includes('--apply');
 if(api('/user').login!=='craguilar')throw new Error('Authenticate gh as craguilar first.');
 const base=`/repos/${repo}`,metadata=api(base);
 if(!metadata.permissions?.admin)throw new Error('Repository administration permission is required.');
 const summaries=api(`${base}/rulesets?per_page=100`);
 const existing=summaries.find(rule=>rule.name==='Main enforced');
 if(!existing)throw new Error('Expected Main enforced ruleset was not found; no changes made.');
 const current=api(`${base}/rulesets/${existing.id}`);
 const branch=api(`${base}/branches/main`);
 const checks=api(`${base}/commits/${branch.commit.sha}/check-runs?per_page=100`).check_runs;
 const check=checks.find(run=>run.name===checkName&&run.app?.slug==='github-actions');
 if(!check)throw new Error('No matching GitHub Actions check found on main; no changes made.');
 const ci=ciRuleset(check.app.id),reviews=reviewRuleset(current);
 const existingCI=summaries.find(rule=>rule.name===ci.name);
 const changes=[
  [`${base}/rulesets/${existing.id}`,'PUT',reviews],
  [existingCI?`${base}/rulesets/${existingCI.id}`:`${base}/rulesets`,existingCI?'PUT':'POST',ci],
  [base,'PATCH',{security_and_analysis:{secret_scanning:{status:'enabled'},secret_scanning_push_protection:{status:'enabled'}}}],
  [`${base}/actions/permissions/workflow`,'PUT',{default_workflow_permissions:'read',can_approve_pull_request_reviews:false}],
  [`${base}/actions/permissions/fork-pr-contributor-approval`,'PUT',{approval_policy:'all_external_contributors'}]
 ];
 console.log(JSON.stringify({repository:repo,mode:apply?'apply':'preview',changes:changes.map(([endpoint,method,body])=>({endpoint,method,body}))},null,2));
 if(!apply){console.log('Preview only. Run node scripts/harden-github.cjs --apply to apply these settings.');return;}
 for(const [endpoint,method,body] of changes){api(endpoint,method,body);console.log(`Applied ${method} ${endpoint}`);}
 const updated=api(base),rules=api(`${base}/rulesets?per_page=100`);
 const verifiedCI=api(`${base}/rulesets/${rules.find(rule=>rule.name===ci.name).id}`);
 const verifiedReviews=api(`${base}/rulesets/${existing.id}`);
 const workflow=api(`${base}/actions/permissions/workflow`),forks=api(`${base}/actions/permissions/fork-pr-contributor-approval`);
 if(updated.security_and_analysis?.secret_scanning?.status!=='enabled'||updated.security_and_analysis?.secret_scanning_push_protection?.status!=='enabled'||verifiedCI.enforcement!=='active'||verifiedCI.bypass_actors.length||!verifiedCI.rules.some(rule=>rule.type==='required_status_checks'&&rule.parameters.required_status_checks.some(check=>check.context===checkName))||!verifiedReviews.rules.some(rule=>rule.type==='pull_request'&&rule.parameters.dismiss_stale_reviews_on_push&&rule.parameters.require_review_thread_resolution)||workflow.default_workflow_permissions!=='read'||workflow.can_approve_pull_request_reviews!==false||forks.approval_policy!=='all_external_contributors')throw new Error('Settings verification failed. Inspect the reported settings before retrying.');
 console.log('Verified CI, review, secret-scanning and Actions protections.');
}
module.exports={reviewRuleset,ciRuleset};
if(require.main===module){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
