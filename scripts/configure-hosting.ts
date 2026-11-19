import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export interface HostingRule {source:string;target:string;status:string;}
const root=path.resolve(import.meta.dirname,'..');
export const hostingRules:HostingRule[]=JSON.parse(fs.readFileSync(path.join(root,'infra/hosting-redirects.json'),'utf8'));
const previousRules=[{source:'/<*>',target:'/index.html',status:'404-200'}];
// Amplify's 404 redirect produces a 302. Its 404 rewrite preserves the missing
// resource's 404 status while serving our static error document.
const initialSeoRules=hostingRules.map(rule=>rule.source==='/<*>'?{...rule,status:'404'}:rule);
function normalize(rules:HostingRule[]){return rules.map(({source,target,status})=>({source,target,status}));}
export function checkHostingPlan(repository:string,current:HostingRule[]){
 assert.equal(repository,'https://github.com/craguilar/mac-web','Unexpected repository; refusing hosting changes');
 const state=JSON.stringify(normalize(current));
 assert.ok([previousRules,initialSeoRules,hostingRules].some(rules=>state===JSON.stringify(rules)),'Hosting rules changed; review them before applying');
 return {changed:state!==JSON.stringify(hostingRules),rules:hostingRules};
}
async function main(){
 const argument=(flag:string)=>{const i=process.argv.indexOf(flag);return i<0?'':process.argv[i+1]??'';};
 const appId=argument('--app-id'),account=argument('--account'),region='us-east-2';
 assert.match(appId,/^d[a-z0-9]{1,19}$/,'Supply --app-id');assert.match(account,/^\d{12}$/,'Supply --account');
 function aws(args:string[]){return JSON.parse(execFileSync('aws',[...args,'--region',region,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));}
 assert.equal(aws(['sts','get-caller-identity']).Account,account,'Unexpected AWS account');
 const app:{repository:string;rules:HostingRule[]}=aws(['amplify','get-app','--app-id',appId,'--query','app.{repository:repository,rules:customRules}']);
 const plan=checkHostingPlan(app.repository,app.rules);
 console.log(JSON.stringify(plan,null,2));
 if(!process.argv.includes('--apply')||!plan.changed)return;
 // New language files must be published before removing the old SPA fallback.
 const response=await fetch('https://mactecnologia.com.mx/en/');const html=await response.text();
 assert.ok(response.ok&&html.includes('<html lang="en">')&&html.includes('rel="canonical" href="https://mactecnologia.com.mx/en/"'),'Publish and verify the English HTML page before applying redirects');
 fs.mkdirSync(path.join(root,'.amplify'),{recursive:true});
 const backup=path.join(root,'.amplify',`hosting-rules-${Date.now()}.json`);
 fs.writeFileSync(backup,JSON.stringify(app.rules,null,2));
 const rulesFile='file://'+path.join(root,'infra/hosting-redirects.json').replaceAll('\\','/');
 aws(['amplify','update-app','--app-id',appId,'--custom-rules',rulesFile,'--query','app.customRules']);
 const actual:HostingRule[]=aws(['amplify','get-app','--app-id',appId,'--query','app.customRules']);
 assert.deepEqual(normalize(actual),hostingRules,'Hosting rule read-back mismatch');
 console.log(`Hosting redirects applied. Previous rules saved to ${backup}.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
