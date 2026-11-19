import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {isRecord} from '../src/http.ts';
import type {ContactConfig} from '../src/contact-config.ts';

const projectRoot=path.resolve(import.meta.dirname,'..');
interface BuildOptions {root?:string;production?:boolean;env?:NodeJS.ProcessEnv;}
export async function buildSite({root=projectRoot,production=false,env=process.env}:BuildOptions={}) {
 const config:ContactConfig={endpoint:null,siteKey:null};
 if(production){
  const siteKey=env.TURNSTILE_SITE_KEY;
  if(typeof siteKey!=='string'||!/^0x[A-Za-z0-9_-]{10,100}$/.test(siteKey))throw new Error('Set a production TURNSTILE_SITE_KEY in the Amplify branch environment.');
  const outputs:unknown=JSON.parse(fs.readFileSync(path.join(root,'amplify_outputs.json'),'utf8'));
  const endpoint=isRecord(outputs)&&isRecord(outputs.custom)?outputs.custom.contact_endpoint:undefined;
  if(typeof endpoint!=='string'||!/^https:\/\/[a-z0-9]+\.execute-api\.us-east-2\.amazonaws\.com\/contact$/.test(endpoint))throw new Error('Amplify contact endpoint is missing or invalid.');
  config.endpoint=endpoint;config.siteKey=siteKey;
 }
 const out=path.join(root,'dist');
 fs.rmSync(out,{recursive:true,force:true});
 fs.cpSync(path.join(root,'public'),out,{recursive:true});
 await build({entryPoints:[path.join(root,'src/app.ts')],outfile:path.join(out,'assets/app.js'),bundle:true,platform:'browser',format:'iife',target:'es2022',sourcemap:false,tsconfig:path.join(projectRoot,'tsconfig.json')});
 fs.writeFileSync(path.join(out,'assets/contact-config.js'),`window.macContactConfig=Object.freeze(${JSON.stringify(config)});\n`);
 fs.cpSync(path.join(root,'licenses'),path.join(out,'licenses'),{recursive:true});
 fs.copyFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(out,'THIRD_PARTY_NOTICES.md'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 await buildSite({production:process.argv.includes('--amplify')});
 console.log('Built static site in dist/. No deployment performed.');
}
