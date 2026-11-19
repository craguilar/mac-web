import type {AnalyticsAdapter} from './consent-controller.ts';
import type {AnalyticsEvent} from './analytics-policy.ts';
export interface AnalyticsChannel {send(event:AnalyticsEvent):void;destroy():void;}
export interface AnalyticsChannelHost {open(ready:()=>void):AnalyticsChannel;clearCookies():void;}
/** Each consent grant owns a disposable context; revocation discards all pending events. */
export function createAnalyticsAdapter(host:AnalyticsChannelHost):AnalyticsAdapter{
 let channel:AnalyticsChannel|null=null,ready=false,generation=0,queue:AnalyticsEvent[]=[];
 return {
  start(){
   if(channel)return true;
   const current=++generation;ready=false;queue=[];
   try{channel=host.open(()=>{
    if(current!==generation||!channel)return;
    ready=true;const pending=queue;queue=[];pending.forEach(event=>channel?.send(event));
   });return true;}catch{channel=null;queue=[];return false;}
  },
  stop(){generation++;ready=false;queue=[];channel?.destroy();channel=null;host.clearCookies();},
  send(event){if(!channel)return;if(ready)channel.send(event);else if(queue.length<20)queue.push(event);}
 };
}
export function browserAnalyticsHost():AnalyticsChannelHost{
 return {
  open(ready){
   const frame=document.createElement('iframe');
   frame.hidden=true;frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
   frame.title='Optional analytics';frame.referrerPolicy='no-referrer';frame.src='/analytics.html';
   // Use this window's method so WebKit attributes the sender to this realm.
   const post=(message:unknown)=>{if(frame.contentWindow)window.postMessage.call(frame.contentWindow,message,{targetOrigin:location.origin});};
   const onMessage=(event:MessageEvent)=>{if(event.source===frame.contentWindow&&event.origin===location.origin&&event.data?.type==='mac-analytics-ready')ready();};
   window.addEventListener('message',onMessage);
   frame.onload=()=>post({type:'mac-analytics-start'});
   document.body.append(frame);
   return {send(event){post({type:'mac-analytics-event',event});},destroy(){window.removeEventListener('message',onMessage);frame.onload=null;frame.remove();}};
  },
  clearCookies(){
   try{
   for(const pair of document.cookie.split(';')){
    const name=pair.trim().split('=')[0];
    if(!/^mac_ga(?:_[A-Za-z0-9]+)?$/.test(name))continue;
    document.cookie=`${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
   }
   }catch{/* Cookie restrictions must not prevent withdrawing consent. */}
  }
 };
}
