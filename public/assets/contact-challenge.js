(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.macContactChallenge=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  let loading;
  function loadTurnstile(){
    if(window.turnstile)return Promise.resolve(window.turnstile);
    if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
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
  function createChallenge({container,siteKey,language,onState,load=loadTurnstile}){
    let api,widget=null,token='',destroyed=false,generation=0;
    const state=value=>{if(!destroyed)onState(value);};
    const clear=value=>{token='';state(value);};
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
      reset(){if(destroyed)return;clear('checking');if(widget===null){start();return;}try{api.reset(widget);}catch{clear('verificationUnavailable');}},
      destroy(){destroyed=true;generation++;token='';if(widget!==null){try{api.remove(widget);}catch{/* Already removed. */}}}
    };
  }
  return {createChallenge};
});
