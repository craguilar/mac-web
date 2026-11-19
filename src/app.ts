import {consultingContent} from './content.ts';
import {renderSite,words,arrow} from './render-site.ts';
import {languageForLocation,languagePath,seoContent,canonicalUrl} from './seo.ts';
import {validateContact,type Language} from './contact-validation.ts';
import {sendContact} from './contact-client.ts';
import {createChallenge,type ContactChallenge} from './contact-challenge.ts';
import {createAnalyticsUi} from './analytics-ui.ts';

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
function find<T extends Element = HTMLElement>(selector:string, scope:ParentNode=document):T {
 const element=scope.querySelector<T>(selector);
 if(!element)throw new Error(`Missing page element: ${selector}`);
 return element;
}
function control(form:HTMLFormElement,name:string):FormControl | null {
 const element=form.elements.namedItem(name);
 return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement ? element : null;
}
function field(form:HTMLFormElement,name:string):FormControl {
 const element=control(form,name);
 if(!element)throw new Error(`Missing form field: ${name}`);
 return element;
}
function draftValues(form:HTMLFormElement):Record<string,string> {
 return Object.fromEntries(Array.from(new FormData(form),([name,value])=>[name,String(value)]));
}

const root=find<HTMLElement>('#app');
let lang:Language=languageForLocation(location.pathname,location.search);
let contactObserver:IntersectionObserver | null=null;
let clearSnapshot:Record<string,string> | null=null;
let sending=false;
let contactChallenge:ContactChallenge | null=null;
const analytics=createAnalyticsUi(lang);
function updateMetadata(){
 const seo=seoContent[lang];document.documentElement.lang=lang;document.title=seo.title;
 find<HTMLMetaElement>('meta[name="description"]',document).content=seo.description;
 for(const [key,value] of Object.entries({title:seo.title,description:seo.description,url:canonicalUrl(lang),locale:seo.locale,'locale:alternate':seoContent[lang==='es'?'en':'es'].locale,image:`https://mactecnologia.com.mx/assets/social-${lang}.png`}))find<HTMLMetaElement>(`meta[property="og:${key}"]`,document).content=value;
 find<HTMLLinkElement>('link[rel="canonical"]',document).href=canonicalUrl(lang);
}

function render(){contactChallenge?.destroy();if(contactObserver)contactObserver.disconnect();document.body.classList.remove('menu-open');const t=consultingContent[lang],x=words[lang];const old=root.querySelector('form'),draft=old?draftValues(old):{},detailsOpen=Boolean(old?.querySelector<HTMLDetailsElement>('.optional-details')?.open);
updateMetadata();root.innerHTML=renderSite(lang,Boolean(clearSnapshot));
const form=find<HTMLFormElement>('form',root);Object.entries(draft).forEach(([k,v])=>{const input=control(form,k);if(input)input.value=v;});
find<HTMLDetailsElement>('.optional-details',form).open=detailsOpen||Boolean(draft.company||draft.topic);
bindLanguage();analytics.setLanguage(lang);
find<HTMLButtonElement>('[data-analytics-preferences]',root).addEventListener('click',analytics.openPreferences);
root.querySelectorAll<HTMLAnchorElement>('a[href="#contact"]').forEach(link=>link.addEventListener('click',()=>analytics.track('contact_open',{language:lang})));
const menu=find<HTMLButtonElement>('.menu-toggle',root),nav=find<HTMLElement>('nav',root);function setMenu(on:boolean){document.body.classList.toggle('menu-open',on);menu.setAttribute('aria-expanded',String(on));find<HTMLElement>('span',menu).textContent=on?x.close:x.menu;nav.classList.toggle('open',on);}menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));root.onkeydown=e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}};

const counter=find<HTMLElement>('#message-count',root),feedback=find<HTMLElement>('.reset-feedback',root),undo=find<HTMLButtonElement>('.undo-reset',root);
function updateCounter(){counter.textContent=`${field(form,'message').value.length} / 3000 ${x.characters}`;}updateCounter();if(clearSnapshot)feedback.textContent=x.resetDone;
form.addEventListener('input',e=>{const target=e.target;if(!(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement))return;sendFeedback.textContent='';feedback.textContent='';clearSnapshot=null;undo.hidden=true;target.removeAttribute('aria-invalid');const error=root.querySelector('#error-'+target.name);if(error)error.textContent='';updateCounter();});
form.addEventListener('change',()=>{clearSnapshot=null;undo.hidden=true;feedback.textContent='';});
form.addEventListener('reset',()=>{contactChallenge?.reset();sendFeedback.textContent='';const values=draftValues(form);if(Object.values(values).some(v=>String(v).trim()))clearSnapshot=values;form.querySelectorAll('.field-error').forEach(e=>e.textContent='');form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));feedback.textContent=x.resetDone;undo.hidden=!clearSnapshot;find<HTMLDetailsElement>('.optional-details',form).open=false;counter.textContent=`0 / 3000 ${x.characters}`;});
undo.addEventListener('click',()=>{if(!clearSnapshot)return;Object.entries(clearSnapshot).forEach(([k,v])=>{field(form,k).value=v;});clearSnapshot=null;undo.hidden=true;find<HTMLDetailsElement>('.optional-details',form).open=Boolean(field(form,'company').value||field(form,'topic').value);feedback.textContent=x.restored;updateCounter();field(form,'message').focus({preventScroll:true});});
root.querySelectorAll<HTMLAnchorElement>('[data-service]').forEach(a=>a.addEventListener('click',()=>{if(sending)return;field(form,'topic').value=a.dataset.service ?? '';find<HTMLDetailsElement>('.optional-details',form).open=true;clearSnapshot=null;undo.hidden=true;feedback.textContent='';}));
const dock=find<HTMLElement>('.mobile-contact',root);let heroVisible=true,contactVisible=false;function syncDock(){dock.hidden=heroVisible||contactVisible||document.body.classList.contains('menu-open')||form.contains(document.activeElement);}contactObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.target.classList.contains('hero'))heroVisible=entry.isIntersecting;else contactVisible=entry.isIntersecting;}syncDock();},{threshold:0});contactObserver.observe(find<HTMLElement>('.hero',root));contactObserver.observe(find<HTMLElement>('#contact',root));form.addEventListener('focusin',syncDock);form.addEventListener('focusout',()=>queueMicrotask(syncDock));
const sendFeedback=find<HTMLElement>('.send-feedback',form),submit=find<HTMLButtonElement>('[type=submit]',form);
const verificationFeedback=find<HTMLElement>('.verification-feedback',form),retryVerification=find<HTMLButtonElement>('.verification-retry',form);
contactChallenge=createChallenge({container:find<HTMLElement>('.contact-challenge',form),siteKey:window.macContactConfig?.siteKey,language:lang,onState:state=>{verificationFeedback.textContent=state==='verified'?'':x[state];retryVerification.hidden=state!=='verificationUnavailable';}});
retryVerification.addEventListener('click',()=>contactChallenge?.reset());
function setSending(on:boolean){sending=on;form.setAttribute('aria-busy',String(on));form.querySelectorAll<FormControl | HTMLButtonElement>('input,textarea,select,button').forEach(el=>el.disabled=on);root.querySelectorAll<HTMLAnchorElement>('[data-lang]').forEach(el=>el.setAttribute('aria-disabled',String(on)));submit.innerHTML=`${on?x.sending:t.submit}${arrow()}`;}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(sending)return;
 const payload:Record<string,string>={...draftValues(form),language:lang};
 const checked=validateContact(payload);
 form.querySelectorAll('.field-error').forEach(el=>el.textContent='');form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
 if(!checked.ok){let first:FormControl | null=null;for(const [name,reason] of Object.entries(checked.errors)){const input=control(form,name),error=form.querySelector('#error-'+name);if(input){input.setAttribute('aria-invalid','true');first=first||input;}if(error)error.textContent=reason==='required'?x.fieldRequired:name==='email'?x.emailInvalid:x.fieldInvalid;}sendFeedback.textContent=x.invalid;if(first){if(first.closest('.optional-details'))find<HTMLDetailsElement>('.optional-details',form).open=true;first.focus();}return;}
 payload.turnstileToken=contactChallenge?.getToken() ?? '';
 if(!payload.turnstileToken){sendFeedback.textContent=x.verification;find<HTMLElement>('.contact-challenge',form).focus();return;}
 setSending(true);sendFeedback.textContent=x.sending;
 const result=await sendContact(window.macContactConfig?.endpoint,payload);
 setSending(false);
 if(result.ok){analytics.track('generate_lead',{language:lang,delivery:'accepted'});form.reset();clearSnapshot=null;undo.hidden=true;feedback.textContent='';sendFeedback.textContent=x.sent;}
 else {contactChallenge?.reset();sendFeedback.textContent=x[result.reason]||x.failed;}
});
}
function bindLanguage(){
 root.querySelectorAll<HTMLAnchorElement>('[data-lang]').forEach(link=>link.addEventListener('click',event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();const next=link.dataset.lang;if(sending||next===lang||(next!=='es'&&next!=='en'))return;
  lang=next;const url=new URL(location.href);url.pathname=languagePath(lang);url.searchParams.delete('lang');history.replaceState(null,'',url);
  analytics.track('language_change',{language:lang});render();analytics.track('page_view',{language:lang});
  find<HTMLAnchorElement>('[data-lang='+lang+']',root).focus({preventScroll:true});
 }));
}
window.addEventListener('popstate',()=>{if(sending)return;const next=languageForLocation(location.pathname,location.search);if(next!==lang){lang=next;render();analytics.track('page_view',{language:lang});}});
const normalizedUrl=new URL(location.href);normalizedUrl.pathname=languagePath(lang);normalizedUrl.searchParams.delete('lang');history.replaceState(null,'',normalizedUrl);
render();
