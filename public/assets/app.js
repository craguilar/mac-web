(()=>{
'use strict';
const root=document.querySelector('#app'),variant='monolith';
let lang=new URLSearchParams(location.search).get('lang')==='es'?'es':'en',layer=0,contactObserver=null;
const words={
  "en": {
    "menu": "Menu",
    "close": "Close",
    "foot": "Working prototype. Service details and the contact destination still need approval.",
    "nav": [
      "Services",
      "About",
      "Approach",
      "Contact"
    ],
    "foundation": "Good ideas.",
    "forward": "Technology that brings them to life.",
    "chapter": "Architectural study",
    "study": "Concept illustration, not a client project",
    "layers": [
      "Context",
      "Decisions",
      "System"
    ],
    "layerCopy": [
      "Start with the real problem and its constraints.",
      "Make alternatives and trade-offs visible.",
      "Build a foundation your team can evolve."
    ],
    "explore": "Explore the layers",
    "local": "Local preview only",
    "blank": "Not provided",
    "review": "Here’s your message.",
    "reviewNote": "Just a preview. Nothing has been sent or stored. You can go back and keep editing.",
    "edit": "Keep editing",
    "reset": "Clear form",
    "prototype": "Design prototype",
    "language": "Language",
    "required": "Fields marked with * are required.",
    "skip": "Skip to content",
    "emailInvalid": "Enter a valid email address.",
    "fieldRequired": "Please complete this field.",
    "top": "Back to top",
    "topic": "What can we help with? · optional",
    "topicEmpty": "Still exploring",
    "serviceAction": "Talk about this",
    "secondary": "See how we work",
    "prompt": "What are you trying to do, and what is getting in the way?",
    "previewNotice": "Try the form. This prototype will only show a preview of your message.",
    "resetDone": "Form cleared."
  },
  "es": {
    "menu": "Menú",
    "close": "Cerrar",
    "foot": "Prototipo en desarrollo. Los servicios y el destino de contacto están pendientes de confirmar.",
    "nav": [
      "Servicios",
      "Nosotros",
      "Enfoque",
      "Contacto"
    ],
    "foundation": "Buenas ideas.",
    "forward": "Tecnología que las hace realidad.",
    "chapter": "Estudio arquitectónico",
    "study": "Ilustración conceptual, no un proyecto de cliente",
    "layers": [
      "Contexto",
      "Decisiones",
      "Sistema"
    ],
    "layerCopy": [
      "Empezar por el problema real y sus restricciones.",
      "Hacer visibles las alternativas y sus compromisos.",
      "Construir una base que tu equipo pueda evolucionar."
    ],
    "explore": "Explora las capas",
    "local": "Solo vista previa local",
    "blank": "No indicada",
    "review": "Así queda tu mensaje.",
    "reviewNote": "Es solo una vista previa. No se ha enviado ni guardado nada. Puedes volver y seguir editando.",
    "edit": "Seguir editando",
    "reset": "Borrar formulario",
    "prototype": "Prototipo de diseño",
    "language": "Idioma",
    "required": "Los campos marcados con * son obligatorios.",
    "skip": "Saltar al contenido",
    "emailInvalid": "Introduce un correo electrónico válido.",
    "fieldRequired": "Completa este campo.",
    "top": "Volver arriba",
    "topic": "¿Cómo podemos ayudarte? · opcional",
    "topicEmpty": "Aún lo estoy explorando",
    "serviceAction": "Hablemos de esto",
    "secondary": "Así trabajamos",
    "prompt": "¿Qué quieres conseguir y qué está dificultando el avance?",
    "previewNotice": "Prueba el formulario. Este prototipo solo mostrará una vista previa de tu mensaje.",
    "resetDone": "Formulario borrado."
  }
};
const arrow=(direction='ne')=>`<svg class="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><g transform="rotate(${direction==='sw'?180:direction==='up'?-45:0} 12 12)"><path d="M5 19 19 5M5 5h14v14"/></g></svg>`;
const mark=`<svg class="brand-symbol" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 28V7h19v21H4ZM10 23V2h18v21H10Z"/><path d="M4 7 10 2M23 7 28 2M23 28 28 23"/></svg>`;
function graphic(){const id="monolith";
 return `<svg class="architecture-art monolith-art" viewBox="0 0 780 680" role="img" aria-label="${words[lang].chapter}"><defs><linearGradient id="${id}-face"><stop stop-color="#d6d1c6"/><stop offset="1" stop-color="#a5aaa3"/></linearGradient></defs><path fill="#c9c8be" d="m80 559 327-165 289 141-327 133Z"/><g data-layer="2" class="art-layer"><path fill="#e3dfd5" d="m162 420 225-110 223 109-225 111Z"/><path fill="#8c968d" d="m162 420 223 110v89L162 509Z"/><path fill="#6c7d71" d="m385 530 225-111v89L385 619Z"/></g><g data-layer="1" class="art-layer"><path fill="#c6cec1" d="m225 249 225-111 105 51-225 111Z"/><path fill="url(#${id}-face)" d="m225 249 105 51v195L225 444Z"/><path fill="#748d7a" d="m330 300 225-111v195L330 495Z"/></g><g data-layer="0" class="art-layer"><path fill="#d47651" d="m160 111 226-111 224 110-226 111Z"/><path fill="#b95835" d="m160 111 224 110v60L160 171Z"/><path fill="#8e412b" d="m384 221 226-111v60L384 281Z"/></g><g class="drawing-lines"><path d="M115 121v406m-8-406h16m-16 406h16M650 115v410m-8-410h16m-16 410h16"/><circle cx="160" cy="111" r="4"/><circle cx="384" cy="281" r="4"/></g></svg>`;
}function langButtons(){return `<div class="language" aria-label="${words[lang].language}">${['es','en'].map(l=>`<button type="button" data-lang="${l}" aria-label="${l==='es'?'Español':'English'}" aria-pressed="${lang===l}">${l.toUpperCase()}</button>`).join('')}</div>`;}
function toolbar(){const x=words[lang];return `<div class="review-bar selected-bar"><span class="eyebrow">${x.prototype}</span><span class="selection-label"><span class="selection-dot"></span>MAC Tecnología</span>${langButtons()}</div>`;}
function hero(t,x){return `<section class="hero"><div class="hero-heading"><p class="eyebrow">${t.eyebrow}</p><h1><span>${x.foundation}</span><span>${x.forward}</span></h1></div><div class="hero-composition"><div class="hero-aside"><p class="hero-lead">${t.lead[2]}</p><div class="hero-actions"><a class="button" href="#contact">${t.cta}${arrow()}</a><a class="secondary-link" href="#approach">${x.secondary}<span aria-hidden="true">↓</span></a></div></div><div class="drawing">${graphic('monolith')}<div class="drawing-footer"><span>${x.chapter} / 03</span><span>${x.study}</span></div></div></div></section>`;}
function layerStudy(x){return `<section class="layer-study" aria-label="${x.explore}"><div class="layer-caption"><span class="eyebrow">${x.explore}</span><p class="layer-copy" aria-live="polite">${x.layerCopy[layer]}</p></div><div class="layer-buttons">${x.layers.map((l,i)=>`<button type="button" data-layer-button="${i}" aria-pressed="${i===layer}">${l}</button>`).join('')}</div></section>`;}
function services(t,x){const e=window.consultingExtra[lang];return `<section class="services section" id="services"><div class="section-label"><span class="eyebrow">${t.services}</span><h2>${t.serviceIntro}</h2></div><div class="service-list service-flow">${t.st.map((s,i)=>`<article class="service service-visible" aria-labelledby="service-title-${i}"><h3 class="service-title" id="service-title-${i}">${s}</h3><div class="service-content"><p class="service-description">${t.sd[i]}</p><div class="service-detail"><span class="eyebrow">${e.scope}</span><ul>${e.deliverables[i].map(v=>`<li>${v}</li>`).join('')}</ul><a href="#contact" class="service-action" aria-label="${x.serviceAction}: ${s}" data-service="${['build','architecture','delivery'][i]}">${x.serviceAction}${arrow()}</a></div></div></article>`).join('')}</div></section>`;}
function about(t,x){return `<section class="about section about-chiapas" id="about" aria-labelledby="about-title"><div class="section-label"><span class="eyebrow">${t.aboutLabel}</span><h2 id="about-title">${t.aboutTitle}</h2><div class="origin-note"><span class="origin-dot" aria-hidden="true"></span><span><span class="eyebrow">${t.originLabel}</span><span class="origin-place">${t.originPlace}</span></span></div></div><div class="about-story">${t.aboutParagraphs.map((p,i)=>`<p class="${i===0?'large-copy':'about-paragraph'}">${p}</p>`).join('')}</div></section>`;}
function process(t,x){return `<section class="process section" id="approach"><div class="section-label"><span class="eyebrow">${t.processLabel}</span><h2>${t.process}</h2></div><div class="process-list">${t.steps.map((v,i)=>`<article class="process-step"><span class="step-dot" aria-hidden="true"></span><h3>${v}</h3><p>${t.stepCopy[i]}</p></article>`).join('')}</div></section>`;}
function contact(t,x){return `<section class="contact section" id="contact"><div class="contact-heading"><span class="eyebrow">${t.contactLabel}</span><h2>${t.contact}</h2><p>${t.contactCopy}</p><span class="contact-mark" aria-hidden="true">${mark}</span></div><form novalidate><div class="preview-notice full"><span class="eyebrow">${x.local}</span><p>${x.previewNotice}</p></div><p class="form-note">${x.required}</p>${t.fields.map((label,i)=>`<label class="field ${i>1?'full':''}"><span id="field-label-${i}">${label}</span>${i===3?`<textarea name="problem" aria-labelledby="field-label-${i}" required maxlength="3000" rows="4" aria-describedby="error-problem" placeholder="${x.prompt}"></textarea>`:`<input name="${['name','email','company'][i]}" aria-labelledby="field-label-${i}" type="${i===1?'email':'text'}" ${i<2?'required':''} ${i===1?'inputmode="email" autocapitalize="none" spellcheck="false"':''} maxlength="${i===1?254:160}" autocomplete="${['name','email','organization'][i]}" aria-describedby="error-${['name','email','company'][i]}">`}<span id="error-${['name','email','company','problem'][i]}" class="field-error" aria-live="polite"></span></label>`).join('')}<label class="field full topic-field"><span>${x.topic}</span><select name="topic"><option value="">${x.topicEmpty}</option>${t.st.map((name,i)=>`<option value="${['build','architecture','delivery'][i]}">${name}</option>`).join('')}</select></label><div class="form-actions full"><button class="button" type="submit">${t.submit}${arrow()}</button><button class="text-button" type="reset">${x.reset}</button></div><p class="form-note full">${t.demo}</p><p class="reset-feedback full" role="status"></p></form></section>`;}
function render(){if(contactObserver)contactObserver.disconnect();document.body.classList.remove('menu-open');const t=window.consultingContent[lang],x=words[lang];const old=root.querySelector('form'),draft=old?Object.fromEntries(new FormData(old)):{};
document.documentElement.lang=lang;document.title=`${t.company} · ${t.eyebrow}`;const description=`${t.company}. ${x.foundation} ${x.forward}`;document.querySelector('meta[name="description"]').content=description;document.querySelector('meta[property="og:title"]').content=document.title;document.querySelector('meta[property="og:description"]').content=description;root.innerHTML=`<a class="skip-link" href="#main">${x.skip}</a>${toolbar()}<div class="site ${variant}"><header class="site-header"><a class="brand" href="#main">${mark}<span>${t.company}</span></a><button type="button" class="menu-toggle" aria-expanded="false" aria-controls="site-nav"><span>${x.menu}</span><i aria-hidden="true"></i></button><nav id="site-nav" aria-label="${lang==='es'?'Navegación principal':'Main navigation'}">${x.nav.map((v,i)=>`<a href="#${['services','about','approach','contact'][i]}">${v}${i===3?arrow():''}</a>`).join('')}</nav></header><main id="main" tabindex="-1">${hero(t,x)}${layerStudy(x)}${services(t,x)}${about(t,x)}${process(t,x)}${contact(t,x)}</main><footer class="site-footer"><span><span class="footer-brand">${t.company}</span><span class="footer-disciplines">${t.footer}</span></span><a href="#main">${x.top}${arrow('up')}</a><p>${x.prototype} · ${x.foot}</p></footer></div><dialog aria-labelledby="review-title"><button class="dialog-close" type="button" aria-label="${x.close}">×</button><span class="eyebrow">${x.local}</span><h2 id="review-title">${x.review}</h2><p>${x.reviewNote}</p><dl></dl><button class="button keep-editing" type="button">${x.edit}${arrow('sw')}</button></dialog><div class="mobile-contact" hidden><span>${t.eyebrow}</span><a class="button" href="#contact">${t.cta}${arrow()}</a></div>`;
const form=root.querySelector('form');Object.entries(draft).forEach(([k,v])=>{if(form.elements.namedItem(k))form.elements.namedItem(k).value=v;});
bindLanguage();
const menu=root.querySelector('.menu-toggle'),nav=root.querySelector('nav');function setMenu(on){document.body.classList.toggle('menu-open',on);menu.setAttribute('aria-expanded',on);menu.querySelector('span').textContent=on?x.close:x.menu;nav.classList.toggle('open',on);}menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));root.onkeydown=e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}};
root.querySelectorAll('[data-layer-button]').forEach(b=>b.addEventListener('click',()=>{layer=Number(b.dataset.layerButton);updateLayer();}));updateLayer();
form.addEventListener('input',e=>{root.querySelector('.reset-feedback').textContent='';e.target.removeAttribute('aria-invalid');const error=root.querySelector('#error-'+e.target.name);if(error)error.textContent='';});
form.addEventListener('reset',()=>{form.querySelectorAll('.field-error').forEach(e=>e.textContent='');form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));root.querySelector('.reset-feedback').textContent=x.resetDone;});
root.querySelectorAll('[data-service]').forEach(a=>a.addEventListener('click',()=>{form.elements.topic.value=a.dataset.service;}));
const dock=root.querySelector('.mobile-contact');let heroVisible=true,contactVisible=false;contactObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.target.classList.contains('hero'))heroVisible=entry.isIntersecting;else contactVisible=entry.isIntersecting;}dock.hidden=heroVisible||contactVisible;},{threshold:0});contactObserver.observe(root.querySelector('.hero'));contactObserver.observe(root.querySelector('#contact'));
const dialog=root.querySelector('dialog');form.addEventListener('submit',e=>{e.preventDefault();let first=null;for(const input of form.querySelectorAll('input,textarea')){const error=root.querySelector('#error-'+input.name);let message='';if(input.required&&!input.value.trim())message=x.fieldRequired;else if(input.type==='email'&&input.validity.typeMismatch)message=x.emailInvalid;error.textContent=message;if(message){input.setAttribute('aria-invalid','true');first=first||input;}else input.removeAttribute('aria-invalid');}if(first){first.focus();return;}const dl=dialog.querySelector('dl');dl.replaceChildren();['name','email','company','problem'].forEach((name,i)=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=t.fields[i].replace(' *','');dd.textContent=form.elements.namedItem(name).value.trim()||x.blank;dl.append(dt,dd);});const topicDt=document.createElement('dt'),topicDd=document.createElement('dd');topicDt.textContent=x.topic;topicDd.textContent=form.elements.topic.selectedOptions[0].textContent;dl.append(topicDt,topicDd);dialog.showModal();document.body.classList.add('dialog-open');});
dialog.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>dialog.close()));dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}
function updateLayer(){const x=words[lang];root.querySelector('.layer-copy').textContent=x.layerCopy[layer];root.querySelectorAll('[data-layer-button]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.layerButton)===layer));root.querySelectorAll('[data-layer]').forEach(g=>g.classList.toggle('layer-selected',Number(g.dataset.layer)===layer));}
function bindLanguage(){document.documentElement.lang=lang;root.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.lang===lang)return;lang=b.dataset.lang;const u=new URL(location.href);u.searchParams.set('lang',lang);history.replaceState(null,'',u);render();root.querySelector('[data-lang='+lang+']').focus({preventScroll:true});}));}
render();
})();
