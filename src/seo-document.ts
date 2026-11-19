import type {Language} from './contact-validation.ts';
import {renderSite} from './render-site.ts';
import {canonicalUrl,seoContent,siteOrigin} from './seo.ts';
export function renderDocument(language:Language){
 const seo=seoContent[language],assets=language==='en'?'../assets/':'./assets/';
 // Controls become usable only after event handlers are attached by the app.
 const body=renderSite(language).replace(/<(input|textarea|select|button)(?=[ >])/g,'<$1 disabled');
 return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${seo.description}"><meta name="color-scheme" content="light"><meta name="referrer" content="strict-origin-when-cross-origin"><title>${seo.title}</title>
<link rel="canonical" href="${canonicalUrl(language)}"><link rel="alternate" hreflang="es" href="${canonicalUrl('es')}"><link rel="alternate" hreflang="en" href="${canonicalUrl('en')}"><link rel="alternate" hreflang="x-default" href="${canonicalUrl('es')}">
<meta property="og:type" content="website"><meta property="og:site_name" content="MAC Tecnología"><meta property="og:title" content="${seo.title}"><meta property="og:description" content="${seo.description}"><meta property="og:url" content="${canonicalUrl(language)}"><meta property="og:locale" content="${seo.locale}"><meta property="og:locale:alternate" content="${seoContent[language==='es'?'en':'es'].locale}"><meta property="og:image" content="${siteOrigin}/assets/social-${language}.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="MAC Tecnología"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${assets}favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${assets}styles.css"><script src="${assets}contact-config.js" defer></script><script src="${assets}analytics-config.js" defer></script><script src="${assets}app.js" defer></script></head><body data-variant="monolith"><div id="app">${body}</div><noscript>${language==='es'?'Activa JavaScript para usar el formulario de contacto.':'Enable JavaScript to use the contact form.'}</noscript></body></html>\n`;
}
