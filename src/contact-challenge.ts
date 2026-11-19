import type {Language} from './contact-validation.ts';
export type ChallengeState = 'checking' | 'verified' | 'verificationUnavailable';
export interface TurnstileOptions {
 sitekey:string; action:'contact'; language:Language; theme:'light'; size:'compact'; 'response-field':false;
 callback:(token:string)=>void; 'expired-callback':()=>void; 'error-callback':()=>void; 'timeout-callback':()=>void;
}
export interface TurnstileApi {
 render(container: HTMLElement | string, options:TurnstileOptions):string;
 reset(id:string):void;
 remove(id:string):void;
}
export interface ChallengeOptions {
 container:HTMLElement | string; siteKey?:string | null; language:Language;
 onState:(state:ChallengeState)=>void; load?:()=>Promise<TurnstileApi>;
}
export type ContactChallenge = ReturnType<typeof createChallenge>;

  let loading: Promise<TurnstileApi> | null = null;
  function loadTurnstile(): Promise<TurnstileApi>{
    if(window.turnstile)return Promise.resolve(window.turnstile);
    if(loading)return loading;
    loading=new Promise<TurnstileApi>((resolve,reject)=>{
      const script=document.createElement('script');
      const fail=()=>{clearTimeout(timer);script.remove();loading=null;reject(new Error('Verification unavailable'));};
      const timer=setTimeout(fail,10000);
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true;script.defer=true;script.onerror=fail;
      script.onload=()=>{if(!window.turnstile){fail();return;}clearTimeout(timer);resolve(window.turnstile);};
      document.head.append(script);
    });
    return loading;
  }
  export function createChallenge({container,siteKey,language,onState,load=loadTurnstile}: ChallengeOptions){
    let api: TurnstileApi | undefined, widget: string | null = null, token='',destroyed=false,generation=0;
    const state=(value: ChallengeState)=>{if(!destroyed)onState(value);};
    const clear=(value: ChallengeState)=>{token='';state(value);};
    async function start(){
      const current=++generation;
      if(typeof siteKey!=='string'||!/^0x[A-Za-z0-9_-]{10,100}$/.test(siteKey)){clear('verificationUnavailable');return;}
      clear('checking');
      try{
        api=await load();
        if(destroyed||current!==generation)return;
        widget=api.render(container,{
          sitekey:siteKey,action:'contact',language,theme:'light',size:'compact','response-field':false,
          callback:value=>{if(!destroyed&&current===generation){token=value;state('verified');}},
          'expired-callback':()=>{if(current===generation)clear('checking');},
          'error-callback':()=>{if(current===generation)clear('verificationUnavailable');},
          'timeout-callback':()=>{if(current===generation)clear('verificationUnavailable');}
        });
      }catch{if(current===generation)clear('verificationUnavailable');}
    }
    start();
    return {
      getToken:()=>token,
      reset(){if(destroyed)return;clear('checking');if(widget===null){start();return;}try{api?.reset(widget);}catch{clear('verificationUnavailable');}},
      destroy(){destroyed=true;generation++;token='';if(widget!==null){try{api?.remove(widget);}catch{/* Already removed. */}}}
    };
  }
