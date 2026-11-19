import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {isRecord} from '../src/http.ts';
import type {ContactConfig} from '../src/contact-config.ts';
import type {AnalyticsConfig} from '../src/analytics-policy.ts';
import {renderDocument} from '../src/seo-document.ts';
import {canonicalUrl,siteOrigin} from '../src/seo.ts';

const projectRoot=path.resolve(import.meta.dirname,'..');
interface BuildOptions {root?:string;production?:boolean;env?:NodeJS.ProcessEnv;}
export async function buildSite({root=projectRoot,production=false,env=process.env}:BuildOptions={}) {
 const config:ContactConfig={endpoint:null,siteKey:null};
 const analytics:AnalyticsConfig={enabled:false,productionHosts:['mactecnologia.com.mx']};
 if(production){
  const siteKey=env.TURNSTILE_SITE_KEY;
  if(typeof siteKey!=='string'||!/^0x[A-Za-z0-9_-]{10,100}$/.test(siteKey))throw new Error('Set a production TURNSTILE_SITE_KEY in the Amplify branch environment.');
  const outputs:unknown=JSON.parse(fs.readFileSync(path.join(root,'amplify_outputs.json'),'utf8'));
  const endpoint=isRecord(outputs)&&isRecord(outputs.custom)?outputs.custom.contact_endpoint:undefined;
  if(typeof endpoint!=='string'||!/^https:\/\/[a-z0-9]+\.execute-api\.us-east-2\.amazonaws\.com\/contact$/.test(endpoint))throw new Error('Amplify contact endpoint is missing or invalid.');
  config.endpoint=endpoint;config.siteKey=siteKey;
  if(env.GA4_ENABLED==='true'){
   if(!/^G-[A-Z0-9]{4,20}$/.test(env.GA4_MEASUREMENT_ID??''))throw new Error('Set GA4_MEASUREMENT_ID before enabling GA4.');
   analytics.enabled=true;analytics.measurementId=env.GA4_MEASUREMENT_ID;
  }
 }
 const out=path.join(root,'dist');
 fs.rmSync(out,{recursive:true,force:true});
 fs.cpSync(path.join(root,'public'),out,{recursive:true});
 await build({entryPoints:[path.join(root,'src/app.ts')],outfile:path.join(out,'assets/app.js'),bundle:true,platform:'browser',format:'iife',target:'es2022',sourcemap:false,tsconfig:path.join(projectRoot,'tsconfig.json')});
 await build({entryPoints:[path.join(root,'src/analytics-frame.ts')],outfile:path.join(out,'assets/analytics-frame.js'),bundle:true,platform:'browser',format:'iife',target:'es2022',sourcemap:false,tsconfig:path.join(projectRoot,'tsconfig.json')});
 fs.writeFileSync(path.join(out,'assets/contact-config.js'),`window.macContactConfig=Object.freeze(${JSON.stringify(config)});\n`);
 fs.writeFileSync(path.join(out,'assets/analytics-config.js'),`window.macAnalyticsConfig=Object.freeze(${JSON.stringify(analytics)});\n`);
 fs.writeFileSync(path.join(out,'index.html'),renderDocument('es'));
 fs.mkdirSync(path.join(out,'en'),{recursive:true});
 fs.writeFileSync(path.join(out,'en/index.html'),renderDocument('en'));
 fs.writeFileSync(path.join(out,'analytics.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Optional analytics</title><script src="/assets/analytics-config.js" defer></script><script src="/assets/analytics-frame.js" defer></script></head><body></body></html>\n');
 fs.writeFileSync(path.join(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`);
 const alternates=['es','en'].map(language=>`<xhtml:link rel="alternate" hreflang="${language}" href="${canonicalUrl(language as 'es'|'en')}"/>`).join('')+`<xhtml:link rel="alternate" hreflang="x-default" href="${canonicalUrl('es')}"/>`;
 fs.writeFileSync(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${(['es','en'] as const).map(language=>`<url><loc>${canonicalUrl(language)}</loc>${alternates}</url>`).join('')}</urlset>\n`);
 fs.cpSync(path.join(root,'licenses'),path.join(out,'licenses'),{recursive:true});
 fs.copyFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(out,'THIRD_PARTY_NOTICES.md'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 await buildSite({production:process.argv.includes('--amplify')});
 console.log('Built static site in dist/. No deployment performed.');
}
