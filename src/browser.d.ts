import type {ContactConfig} from './contact-config.ts';
import type {TurnstileApi} from './contact-challenge.ts';
import type {AnalyticsConfig} from './analytics-policy.ts';
declare global {
 interface Window {macContactConfig?:Readonly<ContactConfig>; turnstile?:TurnstileApi;macAnalyticsConfig?:Readonly<AnalyticsConfig>;macAnalyticsLayer?:unknown[];}
}
