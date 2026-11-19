/* Shared consent and event boundary. Never accepts contact fields or URLs. */
import type {Language} from './contact-validation.ts';
export interface AnalyticsConfig {enabled?:boolean; measurementId?:string; productionHosts?:string[];}
export interface AnalyticsLocation {protocol:string; hostname:string;}
export interface AnalyticsEvent {name:string; parameters:{language?:Language;service?:'build'|'architecture'|'delivery'};}
  const events = new Set(['page_view','generate_lead','contact_open', 'language_change', 'service_view']);
  export function activationAllowed(config: AnalyticsConfig, location: AnalyticsLocation, consent: unknown) {
    return config.enabled === true && consent === 'granted' &&
      /^G-[A-Z0-9]+$/.test(config.measurementId || '') &&
      location.protocol === 'https:' &&
      Array.isArray(config.productionHosts) &&
      config.productionHosts.includes(location.hostname);
  }
  // Only enumerated values can cross the analytics boundary. Never pass through
  // free text, contact information, URL queries, referrers or form fields.
  export function eventPayload(name: string, values: Record<string, unknown> = {}): AnalyticsEvent | null {
    if (!events.has(name) || (name==='generate_lead' && values.delivery!=='accepted')) return null;
    const payload: AnalyticsEvent["parameters"] = {};
    if (values.language === 'es' || values.language === 'en') payload.language = values.language;
    if (name === 'service_view' && (values.service === 'build' || values.service === 'architecture' || values.service === 'delivery')) {
      payload.service = values.service;
    }
    return {name, parameters: payload};
  }

export const policy = Object.freeze({activationAllowed, eventPayload});
