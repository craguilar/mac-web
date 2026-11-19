import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {renderDocument} from '../src/seo-document.ts';
import type {TurnstileOptions} from '../src/contact-challenge.ts';
const bundle=fs.readFileSync(new URL('../dist/assets/app.js',import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

function fixture({enabled=true,saved=new Map<string,string>(),pathname='/'}={}){
 const dom=parseHTML(renderDocument(pathname==='/en/'?'en':'es'));
 const document=dom.document as unknown as Document;
 const cookies=new Map<string,string>();
 Object.defineProperty(document,'cookie',{configurable:true,get(){return [...cookies].map(([name,value])=>`${name}=${value}`).join('; ');},set(value:string){const [name,content]=value.split(';')[0].split('=');if(value.includes('Max-Age=0'))cookies.delete(name);else cookies.set(name,content);}});
 const location=new URL('https://mactecnologia.com.mx'+pathname+'?private=do-not-track#contact');
 const listeners=new Map<string,Set<(event:Record<string,unknown>)=>void>>();
 const messages:Array<{type:string;event?:{name:string;parameters:Record<string,unknown>}}>=[];
 const channels=new WeakMap<Element,{postMessage(message:typeof messages[number]):void}>();
 const widgets:TurnstileOptions[]=[];
 const requests:Array<Record<string,unknown>>=[];
 let respond:()=>Promise<{ok:boolean;status:number;json():Promise<unknown>}>=async()=>({ok:true,status:200,json:async()=>({ok:true})});
 // LinkeDOM supplies DOM parsing/events. These browser APIs are deliberately mocked.
 Object.defineProperty(dom.HTMLElement.prototype,'elements',{configurable:true,get(this:HTMLElement){return {namedItem:(name:string)=>this.querySelector(`[name="${name}"]`)};}});
 Object.defineProperty(dom.HTMLElement.prototype,'reset',{configurable:true,value:function(this:HTMLFormElement){this.dispatchEvent(new dom.Event('reset') as unknown as Event);this.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[name]').forEach(element=>{element.value='';});}});
 Object.defineProperty(dom.HTMLSelectElement.prototype,'value',{configurable:true,get(this:HTMLSelectElement){return this.querySelector('option[selected]')?.getAttribute('value')??'';},set(this:HTMLSelectElement,value:string){this.querySelectorAll('option').forEach(option=>{if(option.value===value)option.setAttribute('selected','');else option.removeAttribute('selected');});}});
 Object.defineProperty(dom.HTMLElement.prototype,'contentWindow',{configurable:true,get(this:HTMLElement){if(!channels.has(this))channels.set(this,{postMessage:message=>messages.push(message)});return channels.get(this);}});
 let failLeadTransport=false;
 const win={
  postMessage(message:typeof messages[number]){if(failLeadTransport&&message.event?.name==='generate_lead')throw new Error('Analytics transport unavailable');messages.push(message);},
  macContactConfig:{endpoint:'https://example123.execute-api.us-east-2.amazonaws.com/contact',siteKey:'0x4AAAAAAAAAAAExamplePublicKey'},
  macAnalyticsConfig:{enabled,measurementId:'G-TEST12345',productionHosts:['mactecnologia.com.mx']},
  localStorage:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value)},
  turnstile:{render(_container:unknown,options:TurnstileOptions){widgets.push(options);return String(widgets.length);},reset(){},remove(){}},
  addEventListener(type:string,callback:(event:Record<string,unknown>)=>void){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type)!.add(callback);},
  removeEventListener(type:string,callback:(event:Record<string,unknown>)=>void){listeners.get(type)?.delete(callback);}
 };
 class BrowserFormData{
  constructor(private form:HTMLFormElement){}
  *[Symbol.iterator](){for(const input of this.form.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[name]'))if(!input.disabled)yield [input.name,input.value] as const;}
 }
 vm.runInNewContext(bundle,{
  window:win,document,location,history:{replaceState(_state:unknown,_unused:string,url:string|URL){location.href=String(url);}},
  URL,URLSearchParams,AbortController,setTimeout,clearTimeout,queueMicrotask,console,FormData:BrowserFormData,
  HTMLInputElement:dom.HTMLInputElement,HTMLTextAreaElement:dom.HTMLTextAreaElement,HTMLSelectElement:dom.HTMLSelectElement,
  IntersectionObserver:class{observe(){}disconnect(){}},
  fetch:async(_url:string,options:{body:string})=>{requests.push(JSON.parse(options.body));return respond();}
 });
 function click(selector:string){const element=document.querySelector(selector);assert.ok(element,selector);element.dispatchEvent(new dom.Event('click',{bubbles:true,cancelable:true}) as unknown as Event);}
 function ready(){const frame=document.querySelector('iframe');assert.ok(frame);const source=(frame as HTMLIFrameElement).contentWindow;listeners.get('message')?.forEach(callback=>callback({source,origin:location.origin,data:{type:'mac-analytics-ready'}}));}
 function fill(){for(const [name,value] of Object.entries({name:'Private Name',email:'private@example.test',message:'Private inquiry text'})){const input=document.querySelector<HTMLInputElement|HTMLTextAreaElement>(`[name="${name}"]`)!;input.value=value;}widgets.at(-1)!.callback('verified-token');}
 function submit(){document.querySelector('form')!.dispatchEvent(new dom.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event);}
 return {document,location,saved,messages,requests,widgets,click,ready,fill,submit,failLeadTransport(){failLeadTransport=true;},respond:(callback:typeof respond)=>{respond=callback;}};
}

test('consent controls block collection before consent and after rejection, restore a choice, and allow withdrawal',async()=>{
 const f=fixture();await tick();
 assert.equal(f.document.querySelector('iframe'),null);
 assert.equal((f.document.querySelector('.consent-panel') as HTMLElement).hidden,false);
 f.click('[data-consent="denied"]');assert.equal(f.document.querySelector('iframe'),null);
 const returning=fixture({saved:f.saved});await tick();
 assert.equal((returning.document.querySelector('.consent-panel') as HTMLElement).hidden,true);
 assert.equal(returning.document.querySelector('iframe'),null);
 returning.click('[data-analytics-preferences]');returning.click('[data-consent="granted"]');returning.ready();
 returning.document.cookie='mac_ga=owned';returning.document.cookie='mac_ga_TEST12345=owned';returning.document.cookie='unrelated=keep';
 assert.equal(returning.messages.filter(message=>message.event?.name==='page_view').length,1);
 returning.click('[data-analytics-preferences]');returning.click('[data-consent="denied"]');
 assert.equal(returning.document.querySelector('iframe'),null);
 assert.equal(returning.document.cookie,'unrelated=keep');
 returning.click('a[href="#contact"]');assert.equal(returning.messages.filter(message=>message.event?.name==='contact_open').length,0);
 const disabled=fixture({enabled:false});await tick();assert.equal(disabled.document.querySelector('iframe'),null);assert.equal((disabled.document.querySelector('[data-analytics-preferences]') as HTMLElement).hidden,true);
});

test('language links preserve the draft, update SEO, and keep private fields out of analytics',async()=>{
 const f=fixture();await tick();f.fill();f.click('[data-consent="granted"]');f.ready();
 f.click('[data-lang="en"]');await tick();
 assert.equal(f.location.pathname,'/en/');assert.equal(f.document.documentElement.lang,'en');
 assert.match(f.document.title,/Software development/);
 assert.equal((f.document.querySelector('[rel="canonical"]') as HTMLLinkElement).href,'https://mactecnologia.com.mx/en/');
 assert.equal((f.document.querySelector('[name="message"]') as HTMLTextAreaElement).value,'Private inquiry text');
 assert.doesNotMatch(JSON.stringify(f.messages),/Private|private@example|do-not-track/);
});

test('failed and pending submissions never count as leads; one accepted request counts once',async()=>{
 const f=fixture();await tick();f.click('[data-consent="granted"]');f.ready();f.fill();
 f.respond(async()=>({ok:false,status:503,json:async()=>({ok:false})}));f.submit();await tick();
 assert.equal(f.messages.filter(message=>message.event?.name==='generate_lead').length,0);
 assert.equal((f.document.querySelector('[name="message"]') as HTMLTextAreaElement).value,'Private inquiry text');
 let finish:()=>void=()=>{};
 f.respond(()=>new Promise(resolve=>{finish=()=>resolve({ok:true,status:200,json:async()=>({ok:true})});}));
 f.fill();f.submit();f.submit();assert.equal(f.requests.length,2);assert.equal(f.messages.filter(message=>message.event?.name==='generate_lead').length,0);
 finish();await tick();assert.equal(f.messages.filter(message=>message.event?.name==='generate_lead').length,1);
 assert.doesNotMatch(JSON.stringify(f.messages),/Private|private@example|verified-token/);
});

test('withdrawing analytics during a pending submission leaves contact delivery working without a lead event',async()=>{
 const f=fixture();await tick();f.click('[data-consent="granted"]');f.ready();f.fill();
 let finish:()=>void=()=>{};
 f.respond(()=>new Promise(resolve=>{finish=()=>resolve({ok:true,status:200,json:async()=>({ok:true})});}));
 f.submit();f.click('[data-analytics-preferences]');f.click('[data-consent="denied"]');finish();await tick();
 assert.equal(f.requests.length,1);assert.equal(f.document.querySelector('iframe'),null);
 assert.equal(f.messages.filter(message=>message.event?.name==='generate_lead').length,0);
 assert.match(f.document.querySelector('.send-feedback')!.textContent??'',/Gracias/);
});


test('analytics transport failure cannot hide accepted contact feedback or retain a sent draft',async()=>{
 const f=fixture();await tick();f.click('[data-consent="granted"]');f.ready();f.fill();f.failLeadTransport();
 f.submit();await tick();
 assert.equal(f.requests.length,1);
 assert.match(f.document.querySelector('.send-feedback')!.textContent??'',/Gracias/);
 assert.equal((f.document.querySelector('[name="message"]') as HTMLTextAreaElement).value,'');
 assert.equal(f.document.querySelector('iframe'),null);
});
