/* No vendor loader. Application must inject an audited analytics adapter. */
(function (root) {
  'use strict';
  function createConsentController({policy, config, location, adapter}) {
    let consent='pending', active=false;
    function stop() { active=false; adapter.stop(); }
    return Object.freeze({
      state: () => ({consent,active}),
      setConsent(next) {
        if (!['granted','denied'].includes(next)) throw new TypeError('Invalid consent');
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
      track(name,values) {
        if (!active || consent!=='granted' || !policy.activationAllowed(config,location,consent)) return false;
        const event=policy.eventPayload(name,values);
        if (!event) return false;
        adapter.send(event);
        return true;
      },
      dispose() { consent='denied'; if(active) stop(); }
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports={createConsentController};
  else root.macConsentController=Object.freeze({createConsentController});
})(typeof window !== 'undefined' ? window : globalThis);
