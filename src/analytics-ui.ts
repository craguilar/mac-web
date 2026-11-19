import {activationAllowed,policy} from './analytics-policy.ts';
import {createConsentController} from './consent-controller.ts';
import {browserAnalyticsHost,createAnalyticsAdapter} from './analytics-adapter.ts';
import {readConsent,saveConsent,type ConsentChoice,type ConsentStorage} from './consent-storage.ts';
import type {Language} from './contact-validation.ts';

const copy={
 es:{title:'Analítica opcional',description:'Si aceptas, usaremos Google Analytics para medir las visitas y los envíos del formulario. No enviaremos tu nombre, correo ni mensaje. Puedes cambiar tu elección cuando quieras.',accept:'Aceptar analítica',reject:'Rechazar analítica',preferences:'Preferencias de analítica',allowed:'Analítica permitida.',denied:'Analítica desactivada.',close:'Cerrar',temporary:'No pudimos guardar tu elección; solo se aplicará a esta visita.'},
 en:{title:'Optional analytics',description:'If you agree, we’ll use Google Analytics to measure visits and contact form submissions. We won’t send your name, email address, or message. You can change your choice at any time.',accept:'Accept analytics',reject:'Reject analytics',preferences:'Analytics preferences',allowed:'Analytics allowed.',denied:'Analytics disabled.',close:'Close',temporary:'Your choice could not be saved; it applies only to this visit.'}
};
export function createAnalyticsUi(initialLanguage:Language){
 const config=window.macAnalyticsConfig??{};
 const available=activationAllowed(config,location,'granted');
 const adapter=createAnalyticsAdapter(browserAnalyticsHost());
 const controller=createConsentController({policy,config,location,adapter});
 const storage:ConsentStorage={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
 let language=initialLanguage,choice=readConsent(storage),open=available&&!choice,temporary=false;
 const panel=document.createElement('aside');panel.className='consent-panel';panel.id='analytics-preferences';panel.hidden=true;
 panel.setAttribute('aria-labelledby','analytics-title');document.body.append(panel);
 if(available&&choice)controller.setConsent(choice);
 if(!available||choice==='denied')adapter.stop();
 if(controller.state().active)controller.track('page_view',{language});
 function draw(){
  const text=copy[language];panel.hidden=!available||!open;
  panel.innerHTML=`<h2 id="analytics-title">${text.title}</h2><p>${text.description}</p>${choice?`<p role="status">${choice==='granted'?text.allowed:text.denied}</p>`:''}${temporary?`<p role="status">${text.temporary}</p>`:''}<div class="consent-actions"><button type="button" data-consent="granted">${text.accept}</button><button type="button" data-consent="denied">${text.reject}</button>${choice?`<button type="button" data-consent-close>${text.close}</button>`:''}</div>`;
  panel.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach(button=>button.addEventListener('click',()=>{
   const next=button.dataset.consent as ConsentChoice;
   const wasActive=controller.state().active;choice=next;temporary=!saveConsent(storage,next);
   controller.setConsent(next);if(next==='denied')adapter.stop();
   if(!wasActive&&controller.state().active)controller.track('page_view',{language});
   open=temporary;draw();document.querySelector<HTMLButtonElement>('[data-analytics-preferences]')?.focus({preventScroll:true});
  }));
  panel.querySelector('[data-consent-close]')?.addEventListener('click',()=>{open=false;draw();document.querySelector<HTMLButtonElement>('[data-analytics-preferences]')?.focus({preventScroll:true});});
  const button=document.querySelector<HTMLButtonElement>('[data-analytics-preferences]');
  if(button){button.hidden=!available;button.textContent=text.preferences;}
 }
 // A withdrawal in another tab stops collection here too. A grant elsewhere does not start this tab.
 window.addEventListener('storage',event=>{
  if(event.key!==null&&event.key!=='mac.analytics-consent.v1')return;
  const next=readConsent(storage);
  if(next!=='granted'){choice=next;controller.setConsent('denied');adapter.stop();open=available&&!next;draw();}
 });
 draw();
 return {available,track:controller.track,setLanguage(next:Language){language=next;draw();},openPreferences(){if(!available)return;open=true;draw();panel.querySelector<HTMLButtonElement>('button')?.focus();}};
}
