import type {Language} from './contact-validation.ts';
export const siteOrigin='https://mactecnologia.com.mx';
export const seoContent={
 es:{title:'MAC Tecnología | Desarrollo y consultoría de software en Chiapas',description:'Creamos y mejoramos software, revisamos arquitectura y optimizamos pruebas y despliegues. Tecnología útil y atención cercana desde Chiapas, México.',locale:'es_MX'},
 en:{title:'MAC Tecnología | Software development and consulting in Chiapas',description:'Build and improve software, review architecture, and strengthen testing and releases. Practical technology and a collaborative team based in Chiapas, Mexico.',locale:'en_US'}
};
export function languagePath(language:Language){return language==='en'?'/en/':'/';}
export function canonicalUrl(language:Language){return siteOrigin+languagePath(language);}
export function languageForLocation(pathname:string,search=''):Language{
 const explicit=new URLSearchParams(search).get('lang');
 return explicit==='es'||explicit==='en'?explicit: /^\/en(?:\/|$)/.test(pathname)?'en':'es';
}
