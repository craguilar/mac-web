/* Activation policy only. Not loaded by index.html; no tracking or storage. */
(function (root) {
  'use strict';
  const events = new Set(['contact_open', 'language_change', 'service_view']);
  function activationAllowed(config, location, consent) {
    return config.enabled === true && consent === 'granted' &&
      /^G-[A-Z0-9]+$/.test(config.measurementId || '') &&
      location.protocol === 'https:' &&
      Array.isArray(config.productionHosts) &&
      config.productionHosts.includes(location.hostname);
  }
  // Only enumerated values can cross the analytics boundary. Never pass through
  // free text, contact information, URL queries, referrers or form fields.
  function eventPayload(name, values = {}) {
    if (!events.has(name)) return null;
    const payload = {};
    if (['es', 'en'].includes(values.language)) payload.language = values.language;
    if (name === 'service_view' && ['software', 'automation', 'consulting'].includes(values.service)) {
      payload.service = values.service;
    }
    return {name, parameters: payload};
  }
  const policy = Object.freeze({activationAllowed, eventPayload});
  if (typeof module !== 'undefined' && module.exports) module.exports = policy;
  else root.macAnalyticsPolicy = policy;
})(typeof window !== 'undefined' ? window : globalThis);
