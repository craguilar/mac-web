import {activationAllowed,eventPayload,type AnalyticsConfig} from './analytics-policy.ts';
import {canonicalUrl,seoContent} from './seo.ts';
import {isRecord} from './http.ts';
import type {Language} from './contact-validation.ts';

const config:AnalyticsConfig=window.macAnalyticsConfig??{};
let started=false;
function gtag(..._args:unknown[]){window.macAnalyticsLayer!.push(arguments);}
function pageConfiguration(language:Language){
 return {send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,
  page_location:canonicalUrl(language),page_referrer:'',page_title:seoContent[language].title,
  ignore_referrer:true,cookie_domain:'none',cookie_prefix:'mac',cookie_expires:15552000,cookie_flags:'SameSite=Lax;Secure'};
}
// Only the consenting same-origin parent can start this disposable analytics context.
window.addEventListener('message',(message:MessageEvent)=>{
 if(window.parent===window||message.source!==window.parent||message.origin!==location.origin||!isRecord(message.data))return;
 if(!activationAllowed(config,location,'granted'))return;
 if(message.data.type==='mac-analytics-start'&&!started){
  started=true;window.macAnalyticsLayer=[];
  gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  gtag('consent','update',{analytics_storage:'granted'});
  gtag('js',new Date());gtag('config',config.measurementId,pageConfiguration('es'));
  const script=document.createElement('script');script.async=true;script.referrerPolicy='no-referrer';
  script.src=`https://www.googletagmanager.com/gtag/js?id=${config.measurementId}&l=macAnalyticsLayer`;
  script.onload=()=>window.parent.postMessage({type:'mac-analytics-ready'},location.origin);
  document.head.append(script);
 }
 if(message.data.type==='mac-analytics-event'&&started&&isRecord(message.data.event)){
  const candidate=message.data.event;
  if(typeof candidate.name!=='string'||!isRecord(candidate.parameters))return;
  const event=eventPayload(candidate.name,{...candidate.parameters,delivery:candidate.name==='generate_lead'?'accepted':undefined});
  if(!event)return;
  const language=event.parameters.language==='en'?'en':'es';
  gtag('config',config.measurementId,pageConfiguration(language));
  gtag('event',event.name,{...event.parameters,send_to:config.measurementId,page_location:canonicalUrl(language),page_referrer:'',page_title:seoContent[language].title});
 }
});
