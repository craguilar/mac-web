export type ConsentChoice='granted'|'denied';
export const consentKey='mac.analytics-consent.v1';
const lifetime=180*24*60*60*1000;
export interface ConsentStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;}
export function readConsent(storage:ConsentStorage,now=Date.now()):ConsentChoice|null{
 try{
  const value:unknown=JSON.parse(storage.getItem(consentKey)||'null');
  if(!value||typeof value!=='object')return null;
  const record=value as Record<string,unknown>;
  return record.version===1&&(record.choice==='granted'||record.choice==='denied')&&typeof record.savedAt==='number'&&record.savedAt<=now&&now-record.savedAt<lifetime?record.choice:null;
 }catch{return null;}
}
export function saveConsent(storage:ConsentStorage,choice:ConsentChoice,now=Date.now()){
 try{storage.setItem(consentKey,JSON.stringify({version:1,choice,savedAt:now}));return true;}catch{return false;}
}
