import {isRecord, type Fetcher} from '../../../src/http.ts';
export type VerificationResult = {ok:true} | {ok:false;reason:'verification'|'unavailable'};
export interface VerifierOptions {getSecret:()=>string | undefined;fetcher?:Fetcher;}
export type VerifyChallenge = (token:unknown,origin:string)=>Promise<VerificationResult>;
export function createVerifier({getSecret,fetcher=fetch}: VerifierOptions): VerifyChallenge {
  return async (token,origin) => {
    if (typeof token !== 'string' || token.length>2048 || !token || /[\s\x00-\x1f\x7f]/.test(token)) return {ok:false,reason:'verification'};
    const secret=getSecret();
    if (!secret || secret.startsWith('<') || /^[123]x000/.test(secret)) return {ok:false,reason:'unavailable'};
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
    try {
      const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret,response:token}),signal:controller.signal
      });
      if(!response.ok)return {ok:false,reason:'unavailable'};
      const result=await response.json?.();
      return isRecord(result) && result.success===true && result.hostname===new URL(origin).hostname && result.action==='contact'
        ? {ok:true} : {ok:false,reason:'verification'};
    } catch { return {ok:false,reason:'unavailable'}; }
    finally {clearTimeout(timer);}
  };
}
