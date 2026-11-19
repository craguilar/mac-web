import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {buildSite} from '../scripts/build.ts';

function filesUnder(base:string,prefix=''):string[]{
 return fs.readdirSync(path.join(base,prefix),{withFileTypes:true}).flatMap(entry=>{
  const relative=path.join(prefix,entry.name);
  assert.ok(!entry.isSymbolicLink(),'Build inputs must not contain symlinks: '+relative);
  return entry.isDirectory()?filesUnder(base,relative):[relative];
 }).sort();
}
test('build bundles TypeScript and includes only public assets, config and license notices',async()=>{
 const root=path.resolve(import.meta.dirname,'..');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mac-build-'));
 try{
  for(const folder of ['public','src','licenses'])fs.cpSync(path.join(root,folder),path.join(tmp,folder),{recursive:true});
  fs.copyFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(tmp,'THIRD_PARTY_NOTICES.md'));
  const inputs=new Map(filesUnder(tmp).map(file=>[file,fs.readFileSync(path.join(tmp,file))]));
  fs.mkdirSync(path.join(tmp,'dist/private'),{recursive:true});
  fs.writeFileSync(path.join(tmp,'dist/private/stale.txt'),'Must be removed');
  await buildSite({root:tmp});
  const copied=new Map<string,string>([
   ...filesUnder(path.join(root,'public')).map(file=>[file,path.join(root,'public',file)] as [string,string]),
   ...filesUnder(path.join(root,'licenses')).map(file=>[path.join('licenses',file),path.join(root,'licenses',file)] as [string,string]),
   ['THIRD_PARTY_NOTICES.md',path.join(root,'THIRD_PARTY_NOTICES.md')]
  ]);
  const expected=[...copied.keys(),path.join('assets','app.js'),path.join('assets','contact-config.js')].sort();
  assert.deepEqual(filesUnder(path.join(tmp,'dist')),expected,'No source, backend, maps or stale files may be published');
  for(const [file,source] of copied)assert.deepEqual(fs.readFileSync(path.join(tmp,'dist',file)),fs.readFileSync(source));
  const configFile=path.join(tmp,'dist/assets/contact-config.js');
  const readConfig=()=>{
   const context={window:{macContactConfig:undefined}};
   vm.runInNewContext(fs.readFileSync(configFile,'utf8'),context);
   return JSON.parse(JSON.stringify(context.window.macContactConfig));
  };
  assert.deepEqual(readConfig(),{endpoint:null,siteKey:null});
  const siteKey='0x4AAAAAAAAAAAExamplePublicKey';
  const env={TURNSTILE_SITE_KEY:siteKey,TURNSTILE_SECRET_KEY:'DO_NOT_PUBLISH_SECRET',CONTACT_EMAIL:'DO_NOT_PUBLISH_RECIPIENT'};
  const production=(environment:NodeJS.ProcessEnv=env)=>buildSite({root:tmp,production:true,env:environment});
  await assert.rejects(production(),/ENOENT/,'Production requires backend outputs');
  const outputFile=path.join(tmp,'amplify_outputs.json');
  fs.writeFileSync(outputFile,JSON.stringify({custom:{contact_endpoint:'https://evil.example/contact'}}));
  await assert.rejects(production(),/endpoint is missing or invalid/);
  const endpoint='https://example123.execute-api.us-east-2.amazonaws.com/contact';
  fs.writeFileSync(outputFile,JSON.stringify({custom:{contact_endpoint:endpoint,private_value:'DO_NOT_PUBLISH_OUTPUT'}}));
  await assert.rejects(production({}),/TURNSTILE_SITE_KEY/);
  await assert.rejects(production({TURNSTILE_SITE_KEY:'1x00000000000000000000AA'}),/TURNSTILE_SITE_KEY/);
  await production();
  assert.deepEqual(readConfig(),{endpoint,siteKey});
  assert.deepEqual(filesUnder(path.join(tmp,'dist')),expected);
  for(const file of ['assets/contact-config.js','assets/app.js'])assert.doesNotMatch(fs.readFileSync(path.join(tmp,'dist',file),'utf8'),/DO_NOT_PUBLISH/);
  for(const [file,content] of inputs)assert.deepEqual(fs.readFileSync(path.join(tmp,file)),content,'Source must remain unchanged: '+file);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
