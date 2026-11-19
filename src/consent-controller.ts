import type {AnalyticsConfig,AnalyticsLocation,AnalyticsEvent,policy as analyticsPolicy} from './analytics-policy.ts';
export interface AnalyticsAdapter {start():boolean; stop():void; send(event:AnalyticsEvent):void;}
export interface ConsentOptions {policy:typeof analyticsPolicy; config:AnalyticsConfig; location:AnalyticsLocation; adapter:AnalyticsAdapter;}
  export function createConsentController({policy, config, location, adapter}: ConsentOptions) {
    let consent: 'pending' | 'granted' | 'denied'='pending', active=false;
    function stop() { active=false; adapter.stop(); }
    return Object.freeze({
      state: () => ({consent,active}),
      setConsent(next: unknown) {
        if (next !== 'granted' && next !== 'denied') throw new TypeError('Invalid consent');
        consent=next;
        const allowed=policy.activationAllowed(config,location,consent);
        if (!allowed) { if(active) stop(); return false; }
        if (!active) {
          // Start must be synchronous and fail closed. Async vendor readiness is
          // owned by the adapter, which must discard queued events on stop().
          try { active=adapter.start()===true; } catch { active=false; }
        }
        return active;
      },
      track(name:string,values?:Record<string,unknown>) {
        if (!active || consent!=='granted' || !policy.activationAllowed(config,location,consent)) return false;
        const event=policy.eventPayload(name,values);
        if (!event) return false;
        adapter.send(event);
        return true;
      },
      dispose() { consent='denied'; if(active) stop(); }
    });
  }
