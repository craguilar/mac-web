import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'yaml';
const origin='https://mactecnologia.com.mx';
const endpoint='https://mvxp0vhfuh.execute-api.us-east-2.amazonaws.com/contact';
const rules=parse(fs.readFileSync('customHttp.yml','utf8')).customHeaders;
const headers=Object.fromEntries(rules.find((r:{pattern:string})=>r.pattern==='**/*').headers.map((h:{key:string;value:string})=>[h.key,h.value]));

// These tests render the real build and enforce its CSP. All vendor/API traffic
// is intercepted: they cannot send mail, solve a real challenge, or collect GA data.
async function fixture(page:Page){
 const unexpected:string[]=[],errors:string[]=[],posts:unknown[]=[];
 let accepted=false;
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  (window as unknown as {violations:string[]}).violations=[];
  document.addEventListener('securitypolicyviolation',event=>{
   (window as unknown as {violations:string[]}).violations.push(event.violatedDirective+': '+event.blockedURI);
  });
 });
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===origin){
   if(url.pathname==='/assets/contact-config.js')return route.fulfill({contentType:'text/javascript',headers,body:`window.macContactConfig={endpoint:${JSON.stringify(endpoint)},siteKey:'0x4AAAAAAAAAAAExamplePublicKey'};`});
   if(url.pathname==='/assets/analytics-config.js')return route.fulfill({contentType:'text/javascript',headers,body:`window.macAnalyticsConfig={enabled:true,measurementId:'G-TEST12345',productionHosts:['mactecnologia.com.mx']};`});
   const relative=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
   const base=path.resolve('dist'),file=path.resolve(base,'.'+relative);
   if(!file.startsWith(base+path.sep)||!fs.existsSync(file)){unexpected.push(url.pathname);return route.abort();}
   const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
   return route.fulfill({headers,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  }
  if(url.origin==='https://challenges.cloudflare.com'){
   if(url.pathname==='/test-widget')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body>Test verification</body></html>'});
   return route.fulfill({contentType:'text/javascript',body:`window.turnstile={render(container,options){const frame=document.createElement('iframe');frame.src='https://challenges.cloudflare.com/test-widget';frame.width='150';frame.height='140';frame.title='Test verification';container.append(frame);window.__testChallenge=options;setTimeout(()=>options.callback('local-test-token'),0);return 'test';},reset(){setTimeout(()=>window.__testChallenge.callback('local-test-token'),0);},remove(){}};`});
  }
  if(url.origin==='https://www.googletagmanager.com'&&url.pathname==='/gtag/js')return route.fulfill({contentType:'text/javascript',body:'/* No Google code or collection in this fixture. */'});
  if(request.url()===endpoint){
   if(request.method()==='POST')posts.push(request.postDataJSON());
   return route.fulfill({status:request.method()==='OPTIONS'?204:accepted?200:503,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type'},contentType:'application/json',body:request.method()==='OPTIONS'?'':JSON.stringify({ok:accepted})});
  }
  unexpected.push(request.url());await route.abort();
 });
 return {unexpected,errors,posts,accept(){accepted=true;}};
}
async function commands(page:Page){
 const frame=page.frames().find(frame=>frame.url()===origin+'/analytics.html');
 if(!frame)return [];
 return frame.evaluate(()=>((window as unknown as {macAnalyticsLayer:ArrayLike<unknown>[]}).macAnalyticsLayer??[]).map(command=>Array.from(command)));
}
for(const language of ['es','en'] as const){
 test(`${language}: mobile form, consent, failed delivery and a single accepted lead`,async({page})=>{
  const f=await fixture(page);
  await page.goto(origin+(language==='en'?'/en/':'/')+'?private=never-track');
  await expect(page.locator('html')).toHaveAttribute('lang',language);
  await expect(page.locator('.consent-panel')).toBeVisible();
  const box=await page.locator('.consent-panel').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(page.frames().some(frame=>frame.url().includes('/analytics.html'))).toBe(false);
  await page.locator('[data-consent="denied"]').tap();
  await page.locator('button[type="submit"]').tap();
  await expect(page.locator('[name="name"]')).toHaveAttribute('aria-invalid','true');
  expect(f.posts).toHaveLength(0);
  await page.locator('[name="name"]').fill('Private Test Name');
  await page.locator('[name="email"]').fill('private@example.test');
  await page.locator('[name="message"]').fill('Private message that must stay out of analytics.');
  await page.locator('[data-analytics-preferences]').tap();
  await page.locator('[data-consent="granted"]').tap();
  await expect.poll(async()=>(await commands(page)).filter(c=>c[0]==='event'&&c[1]==='page_view').length).toBe(1);
  await page.locator('button[type="submit"]').tap();
  await expect(page.locator('.send-feedback')).toContainText(language==='es'?'No pudimos':'could not');
  expect((await commands(page)).filter(c=>c[1]==='generate_lead')).toHaveLength(0);
  await expect(page.locator('[name="message"]')).not.toHaveValue('');
  f.accept();await page.locator('button[type="submit"]').tap();
  await expect(page.locator('.send-feedback')).toContainText(language==='es'?'Gracias':'Thank you');
  await expect.poll(async()=>(await commands(page)).filter(c=>c[1]==='generate_lead').length).toBe(1);
  const data=JSON.stringify(await commands(page));
  expect(data).not.toMatch(/Private|private@example|never-track|local-test-token/);
  expect(f.posts).toHaveLength(2);
  await page.locator('[data-analytics-preferences]').tap();await page.locator('[data-consent="denied"]').tap();
  await expect(page.locator('iframe[src="/analytics.html"]')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as unknown as {violations:string[]}).violations)).toEqual([]);
  expect(f.unexpected).toEqual([]);expect(f.errors).toEqual([]);
 });
}
