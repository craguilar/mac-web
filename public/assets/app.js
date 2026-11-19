(()=>{
'use strict';
const root=document.querySelector('#app'),variant='monolith';
let lang=new URLSearchParams(location.search).get('lang')==='es'?'es':'en',contactObserver=null,clearSnapshot=null,sending=false;
const words={
  "en": {
    "language": "Language",
    "foundation": "Good ideas.",
    "forward": "Technology that brings them to life.",
    "secondary": "See how we work",
    "serviceAction": "Talk about this",
    "messageHelp": "Tell us what you want to achieve and what is getting in the way. A few lines are enough.",
    "prompt": "For example: we want to improve a system we already use…",
    "characters": "characters",
    "required": "Fields marked with * are required.",
    "optionalDetails": "Add company or topic · optional",
    "topic": "What can we help with? · optional",
    "topicEmpty": "Still exploring",
    "reset": "Clear form",
    "undo": "Undo",
    "skip": "Skip to content",
    "menu": "Menu",
    "nav": [
      "Services",
      "About",
      "Approach",
      "Contact"
    ],
    "top": "Back to top",
    "close": "Close",
    "resetDone": "Form cleared.",
    "restored": "Your message has been restored.",
    "fieldRequired": "Complete this field to send your message.",
    "emailInvalid": "Enter a valid email address.",
    "contactNotice": "We use your details to reply to your inquiry. Delivery uses AWS and our Google-hosted inbox. Please do not include sensitive information.",
    "fieldInvalid": "Check this field and its length.",
    "sending": "Sending…",
    "sent": "Thank you. Your message has been submitted.",
    "failed": "We could not confirm sending. Your message is still here. Please wait before trying again.",
    "busy": "We are receiving several messages. Please wait a minute and try again.",
    "invalid": "Check your details and try again.",
    "unavailable": "Sending is currently unavailable. Your message has not been sent."
  },
  "es": {
    "language": "Idioma",
    "foundation": "Buenas ideas.",
    "forward": "Tecnología que las hace realidad.",
    "secondary": "Así trabajamos",
    "serviceAction": "Hablemos de esto",
    "messageHelp": "Cuéntanos qué quieres lograr y qué te está frenando. Unas líneas bastan.",
    "prompt": "Por ejemplo: queremos mejorar un sistema que ya usamos…",
    "characters": "caracteres",
    "required": "Los campos marcados con * son obligatorios.",
    "optionalDetails": "Agregar empresa o tema · opcional",
    "topic": "¿Cómo podemos ayudarte? · opcional",
    "topicEmpty": "Aún lo estoy explorando",
    "reset": "Borrar formulario",
    "undo": "Deshacer",
    "skip": "Saltar al contenido",
    "menu": "Menú",
    "nav": [
      "Servicios",
      "Nosotros",
      "Enfoque",
      "Contacto"
    ],
    "top": "Volver arriba",
    "close": "Cerrar",
    "resetDone": "Formulario borrado.",
    "restored": "Tu mensaje se ha recuperado.",
    "fieldRequired": "Completa este campo para enviar tu mensaje.",
    "emailInvalid": "Introduce un correo electrónico válido.",
    "contactNotice": "Usamos tus datos para responder tu consulta. El envío utiliza AWS y nuestro buzón alojado en Google. Evita incluir información sensible.",
    "fieldInvalid": "Revisa este campo y su longitud.",
    "sending": "Enviando…",
    "sent": "Gracias. Tu mensaje se ha enviado.",
    "failed": "No pudimos confirmar el envío. Tu mensaje sigue aquí. Espera antes de volver a intentarlo.",
    "busy": "Estamos recibiendo varios mensajes. Espera un minuto e inténtalo de nuevo.",
    "invalid": "Revisa tus datos e inténtalo de nuevo.",
    "unavailable": "El envío no está disponible en este momento. Tu mensaje no se ha enviado."
  }
};
const arrow=(direction='ne')=>`<svg class="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><g transform="rotate(${direction==='sw'?180:direction==='up'?-45:0} 12 12)"><path d="M5 19 19 5M5 5h14v14"/></g></svg>`;
const mark=`<svg class="brand-symbol" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 28V7h19v21H4ZM10 23V2h18v21H10Z"/><path d="M4 7 10 2M23 7 28 2M23 28 28 23"/></svg>`;
function graphic(){const id="monolith";
 return `<svg class="architecture-art monolith-art" viewBox="0 0 780 680" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-face"><stop stop-color="#d6d1c6"/><stop offset="1" stop-color="#a5aaa3"/></linearGradient></defs><path fill="#c9c8be" d="m80 559 327-165 289 141-327 133Z"/><g data-layer="2" class="art-layer"><path fill="#e3dfd5" d="m162 420 225-110 223 109-225 111Z"/><path fill="#8c968d" d="m162 420 223 110v89L162 509Z"/><path fill="#6c7d71" d="m385 530 225-111v89L385 619Z"/></g><g data-layer="1" class="art-layer"><path fill="#c6cec1" d="m225 249 225-111 105 51-225 111Z"/><path fill="url(#${id}-face)" d="m225 249 105 51v195L225 444Z"/><path fill="#748d7a" d="m330 300 225-111v195L330 495Z"/></g><g data-layer="0" class="art-layer"><path fill="#d47651" d="m160 111 226-111 224 110-226 111Z"/><path fill="#b95835" d="m160 111 224 110v60L160 171Z"/><path fill="#8e412b" d="m384 221 226-111v60L384 281Z"/></g><g class="drawing-lines"><path d="M115 121v406m-8-406h16m-16 406h16M650 115v410m-8-410h16m-16 410h16"/><circle cx="160" cy="111" r="4"/><circle cx="384" cy="281" r="4"/></g></svg>`;
}function langButtons(){return `<div class="language" role="group" aria-label="${words[lang].language}">${['es','en'].map(l=>`<button type="button" data-lang="${l}" aria-label="${l==='es'?'Español':'English'}" aria-pressed="${lang===l}">${l.toUpperCase()}</button>`).join('')}</div>`;}
function hero(t,x){return `<section class="hero"><div class="hero-heading"><p class="eyebrow">${t.eyebrow}</p><h1><span>${x.foundation}</span><span>${x.forward}</span></h1></div><div class="hero-composition"><div class="hero-aside"><p class="hero-lead">${t.lead[2]}</p><div class="hero-actions"><a class="button" href="#contact">${t.cta}${arrow()}</a><a class="secondary-link" href="#approach">${x.secondary}<span aria-hidden="true">↓</span></a></div></div><div class="drawing">${graphic()}</div></div></section>`;}
function services(t,x){const e=window.consultingExtra[lang];return `<section class="services section" id="services"><div class="section-label"><span class="eyebrow">${t.services}</span><h2>${t.serviceIntro}</h2></div><div class="service-list service-flow">${t.st.map((s,i)=>`<article class="service service-visible" aria-labelledby="service-title-${i}"><h3 class="service-title" id="service-title-${i}">${s}</h3><div class="service-content"><p class="service-description">${t.sd[i]}</p><div class="service-detail"><span class="eyebrow">${e.scope}</span><ul>${e.deliverables[i].map(v=>`<li>${v}</li>`).join('')}</ul><a href="#contact" class="service-action" aria-label="${x.serviceAction}: ${s}" data-service="${['build','architecture','delivery'][i]}">${x.serviceAction}${arrow()}</a></div></div></article>`).join('')}</div></section>`;}
function about(t,x){return `<section class="about section about-chiapas" id="about" aria-labelledby="about-title"><div class="section-label"><span class="eyebrow">${t.aboutLabel}</span><h2 id="about-title">${t.aboutTitle}</h2><div class="origin-note"><span class="origin-dot" aria-hidden="true"></span><span><span class="eyebrow">${t.originLabel}</span><span class="origin-place">${t.originPlace}</span></span></div></div><div class="about-story">${t.aboutParagraphs.map((p,i)=>`<p class="${i===0?'large-copy':'about-paragraph'}">${p}</p>`).join('')}</div></section>`;}
function process(t,x){return `<section class="process section" id="approach"><div class="section-label"><span class="eyebrow">${t.processLabel}</span><h2>${t.process}</h2></div><div class="process-list">${t.steps.map((v,i)=>`<article class="process-step"><span class="step-dot" aria-hidden="true"></span><h3>${v}</h3><p>${t.stepCopy[i]}</p></article>`).join('')}</div></section>`;}
function contact(t,x){
 const field=i=>{const name=['name','email','company','message'][i];return `<label class="field ${i>1?'full':''}"><span id="field-label-${i}">${t.fields[i]}</span>${i===3?`<span class="field-hint" id="message-help">${x.messageHelp}</span><textarea name="message" aria-labelledby="field-label-${i}" required maxlength="3000" rows="5" aria-describedby="message-help message-count error-message" placeholder="${x.prompt}"></textarea><span class="field-meta" id="message-count">0 / 3000 ${x.characters}</span>`:`<input name="${name}" aria-labelledby="field-label-${i}" type="${i===1?'email':'text'}" ${i<2?'required':''} ${i===1?'inputmode="email" autocapitalize="none" spellcheck="false"':''} maxlength="${i===1?254:160}" autocomplete="${['name','email','organization'][i]}" aria-describedby="error-${name}">`}<span id="error-${name}" class="field-error" aria-live="polite"></span></label>`;};
 return `<section class="contact section" id="contact" aria-labelledby="contact-title"><div class="contact-heading"><span class="eyebrow">${t.contactLabel}</span><h2 id="contact-title">${t.contact}</h2><p>${t.contactCopy}</p></div><form novalidate aria-label="${t.contactLabel}"><div class="contact-notice full"><p>${x.contactNotice}</p></div><p class="form-note full">${x.required}</p>${field(0)}${field(1)}${field(3)}<details class="optional-details full"><summary>${x.optionalDetails}</summary><div class="optional-fields">${field(2)}<label class="field full topic-field"><span>${x.topic}</span><select name="topic"><option value="">${x.topicEmpty}</option>${t.st.map((name,i)=>`<option value="${['build','architecture','delivery'][i]}">${name}</option>`).join('')}</select></label></div></details><label class="contact-trap" aria-hidden="true">Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label><p class="send-feedback full" role="status" aria-live="polite"></p><div class="form-actions full"><button class="button" type="submit">${t.submit}${arrow()}</button><button class="text-button" type="reset">${x.reset}</button></div><div class="reset-row full"><p class="reset-feedback" role="status"></p><button class="undo-reset text-button" type="button" ${clearSnapshot?'':'hidden'}>${x.undo}</button></div></form></section>`;
}
function render(){if(contactObserver)contactObserver.disconnect();document.body.classList.remove('menu-open');const t=window.consultingContent[lang],x=words[lang];const old=root.querySelector('form'),draft=old?Object.fromEntries(new FormData(old)):{},detailsOpen=Boolean(old?.querySelector('.optional-details')?.open);
document.documentElement.lang=lang;document.title=`${t.company} · ${t.eyebrow}`;const description=`${t.company}. ${x.foundation} ${x.forward}`;document.querySelector('meta[name="description"]').content=description;document.querySelector('meta[property="og:title"]').content=document.title;document.querySelector('meta[property="og:description"]').content=description;root.innerHTML=`<a class="skip-link" href="#main">${x.skip}</a><div class="site ${variant}"><header class="site-header"><a class="brand" href="#main">${mark}<span>${t.company}</span></a><div class="header-controls">${langButtons()}<button type="button" class="menu-toggle" aria-expanded="false" aria-controls="site-nav"><span>${x.menu}</span><i aria-hidden="true"></i></button></div><nav id="site-nav" aria-label="${lang==='es'?'Navegación principal':'Main navigation'}">${x.nav.map((v,i)=>`<a href="#${['services','about','approach','contact'][i]}">${v}${i===3?arrow():''}</a>`).join('')}</nav></header><main id="main" tabindex="-1">${hero(t,x)}${services(t,x)}${about(t,x)}${process(t,x)}${contact(t,x)}</main><footer class="site-footer"><span><span class="footer-brand">${t.company}</span><span class="footer-disciplines">${t.footer}</span></span><a href="#main">${x.top}${arrow('up')}</a></footer></div><div class="mobile-contact" hidden><span>${t.eyebrow}</span><a class="button" href="#contact">${t.cta}${arrow()}</a></div>`;
const form=root.querySelector('form');Object.entries(draft).forEach(([k,v])=>{if(form.elements.namedItem(k))form.elements.namedItem(k).value=v;});
form.querySelector('.optional-details').open=detailsOpen||Boolean(draft.company||draft.topic);
bindLanguage();
const menu=root.querySelector('.menu-toggle'),nav=root.querySelector('nav');function setMenu(on){document.body.classList.toggle('menu-open',on);menu.setAttribute('aria-expanded',on);menu.querySelector('span').textContent=on?x.close:x.menu;nav.classList.toggle('open',on);}menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));root.onkeydown=e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}};

const counter=root.querySelector('#message-count'),feedback=root.querySelector('.reset-feedback'),undo=root.querySelector('.undo-reset');
function updateCounter(){counter.textContent=`${form.elements.message.value.length} / 3000 ${x.characters}`;}updateCounter();if(clearSnapshot)feedback.textContent=x.resetDone;
form.addEventListener('input',e=>{sendFeedback.textContent='';feedback.textContent='';clearSnapshot=null;undo.hidden=true;e.target.removeAttribute('aria-invalid');const error=root.querySelector('#error-'+e.target.name);if(error)error.textContent='';updateCounter();});
form.addEventListener('change',()=>{clearSnapshot=null;undo.hidden=true;feedback.textContent='';});
form.addEventListener('reset',()=>{sendFeedback.textContent='';const values=Object.fromEntries(new FormData(form));if(Object.values(values).some(v=>String(v).trim()))clearSnapshot=values;form.querySelectorAll('.field-error').forEach(e=>e.textContent='');form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));feedback.textContent=x.resetDone;undo.hidden=!clearSnapshot;form.querySelector('.optional-details').open=false;counter.textContent=`0 / 3000 ${x.characters}`;});
undo.addEventListener('click',()=>{if(!clearSnapshot)return;Object.entries(clearSnapshot).forEach(([k,v])=>{form.elements.namedItem(k).value=v;});clearSnapshot=null;undo.hidden=true;form.querySelector('.optional-details').open=Boolean(form.elements.company.value||form.elements.topic.value);feedback.textContent=x.restored;updateCounter();form.elements.message.focus({preventScroll:true});});
root.querySelectorAll('[data-service]').forEach(a=>a.addEventListener('click',()=>{if(sending)return;form.elements.topic.value=a.dataset.service;form.querySelector('.optional-details').open=true;clearSnapshot=null;undo.hidden=true;feedback.textContent='';}));
const dock=root.querySelector('.mobile-contact');let heroVisible=true,contactVisible=false;function syncDock(){dock.hidden=heroVisible||contactVisible||document.body.classList.contains('menu-open')||form.contains(document.activeElement);}contactObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.target.classList.contains('hero'))heroVisible=entry.isIntersecting;else contactVisible=entry.isIntersecting;}syncDock();},{threshold:0});contactObserver.observe(root.querySelector('.hero'));contactObserver.observe(root.querySelector('#contact'));form.addEventListener('focusin',syncDock);form.addEventListener('focusout',()=>queueMicrotask(syncDock));
const sendFeedback=form.querySelector('.send-feedback'),submit=form.querySelector('[type=submit]');
function setSending(on){sending=on;form.setAttribute('aria-busy',String(on));form.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=on);root.querySelectorAll('[data-lang]').forEach(el=>el.disabled=on);submit.innerHTML=`${on?x.sending:t.submit}${arrow()}`;}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(sending)return;
 const payload={...Object.fromEntries(new FormData(form)),language:lang};
 const checked=window.macContactValidation.validateContact(payload);
 form.querySelectorAll('.field-error').forEach(el=>el.textContent='');form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
 if(!checked.ok){let first=null;for(const [name,reason] of Object.entries(checked.errors)){const input=form.elements.namedItem(name),error=form.querySelector('#error-'+name);if(input){input.setAttribute('aria-invalid','true');first=first||input;}if(error)error.textContent=reason==='required'?x.fieldRequired:name==='email'?x.emailInvalid:x.fieldInvalid;}sendFeedback.textContent=x.invalid;if(first){if(first.closest('.optional-details'))form.querySelector('.optional-details').open=true;first.focus();}return;}
 setSending(true);sendFeedback.textContent=x.sending;
 const result=await window.macContactClient.sendContact(window.macContactConfig?.endpoint,payload);
 setSending(false);
 if(result.ok){form.reset();clearSnapshot=null;undo.hidden=true;feedback.textContent='';sendFeedback.textContent=x.sent;}
 else sendFeedback.textContent=x[result.reason]||x.failed;
});
}
function bindLanguage(){document.documentElement.lang=lang;root.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{if(sending||b.dataset.lang===lang)return;lang=b.dataset.lang;const u=new URL(location.href);u.searchParams.set('lang',lang);history.replaceState(null,'',u);render();root.querySelector('[data-lang='+lang+']').focus({preventScroll:true});}));}
render();
})();
