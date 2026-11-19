import type {ContactConfig} from './contact-config.ts';
import type {TurnstileApi} from './contact-challenge.ts';
declare global {
 interface Window {macContactConfig?:Readonly<ContactConfig>; turnstile?:TurnstileApi;}
}
