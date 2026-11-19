import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
interface Resource {
 Type:string;Properties?:{PermissionsBoundary?:unknown;ReservedConcurrentExecutions?:number;Timeout?:number;MemorySize?:number;Environment?:{Variables?:Record<string,string>}};
}
const directory=process.argv[2],appId=process.env.AWS_APP_ID;
assert.ok(directory&&appId,'Supply the synth directory and AWS_APP_ID');
let roles=0,contact=0;
for(const name of fs.readdirSync(directory).filter(name=>name.endsWith('.template.json'))){
 const template:{Resources?:Record<string,Resource>}=JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
 for(const resource of Object.values(template.Resources||{})){
  if(resource.Type==='AWS::IAM::Role'){
   roles++;assert.ok(JSON.stringify(resource.Properties?.PermissionsBoundary)?.includes(`mac-web-${appId}-runtime-boundary`),'Every generated role must have the app runtime boundary');
  }
  const variables=resource.Properties?.Environment?.Variables;
  if(resource.Type==='AWS::Lambda::Function'&&variables?.CONTACT_FROM){
   contact++;assert.equal(resource.Properties?.ReservedConcurrentExecutions,2);
   assert.equal(resource.Properties?.Timeout,10);assert.equal(resource.Properties?.MemorySize,128);
   assert.equal(variables.CONTACT_ENABLED,'false','Validation synth must keep sending disabled');
   const secret=JSON.parse(variables.AMPLIFY_SSM_ENV_CONFIG).TURNSTILE_SECRET_KEY;
   assert.ok(secret.path.startsWith(`/amplify/${appId}/main-branch-`));
   assert.equal(secret.sharedPath,`/amplify/shared/${appId}/TURNSTILE_SECRET_KEY`);
  }
 }
}
assert.equal(roles,3,'Review permissions before adding backend roles');assert.equal(contact,1);
console.log('Verified all generated role boundaries, secret references and sending limits.');
