import {validateContact} from '../../../src/contact-validation.ts';
import {isRecord} from '../../../src/http.ts';
import type {SendEmailCommandInput} from '@aws-sdk/client-sesv2';
import type {APIGatewayProxyEventV2,APIGatewayProxyStructuredResultV2} from 'aws-lambda';
import type {VerifyChallenge} from './turnstile.ts';
export interface DeliveryOptions {
 sendEmail:(input:SendEmailCommandInput)=>Promise<unknown>; recipient?:string; sender?:string;
 origins:readonly string[]; verifyChallenge:VerifyChallenge; isEnabled:()=>boolean;
}
/** Only the HTTP event fields used by the endpoint; API Gateway supplies the full event. */
export interface ContactRequest {
 requestContext?:{http?:{method?:string}}; headers:APIGatewayProxyEventV2['headers']; body?:string; isBase64Encoded?:boolean;
}
export type ContactResponse = APIGatewayProxyStructuredResultV2 & {statusCode:number;body:string};

export function createHandler({sendEmail, recipient, sender, origins, verifyChallenge, isEnabled}: DeliveryOptions) {
  const reply = (statusCode:number, body:unknown): ContactResponse => ({statusCode, headers: {'content-type':'application/json', 'cache-control':'no-store'}, body: JSON.stringify(body)});
  return async (event:ContactRequest): Promise<ContactResponse> => {
    if (event.requestContext?.http?.method !== 'POST') return reply(405, {ok:false});
    // CORS is a browser control, not authentication. The endpoint is intentionally public.
    const origin=event.headers?.origin;
    if (!origin || !origins.includes(origin)) return reply(403, {ok:false});
    if (!/^application\/json(?:;|$)/i.test(event.headers?.['content-type'] || '')) return reply(415, {ok:false});
    if (event.isBase64Encoded || typeof event.body !== 'string' || Buffer.byteLength(event.body, 'utf8') > 16384) return reply(413, {ok:false});
    let input:unknown;
    try { input = JSON.parse(event.body); } catch { return reply(400, {ok:false}); }
    if (isRecord(input) && typeof input.website === 'string' && input.website) return reply(200, {ok:true});
    const validated = validateContact(input);
    if (!validated.ok) return reply(400, {ok:false, errors:validated.errors});
    if (!recipient || !sender || !isEnabled()) return reply(503, {ok:false});
    const verification=await verifyChallenge(isRecord(input)?input.turnstileToken:undefined,origin);
    if (!verification.ok) return reply(verification.reason==='verification'?403:503,{ok:false,reason:verification.reason});
    const v = validated.value;
    const text = [
      `Name / Nombre: ${v.name}`, `Email / Correo: ${v.email}`,
      `Company / Empresa: ${v.company || '-'}`, `Topic / Tema: ${v.topic || '-'}`,
      `Language / Idioma: ${v.language}`, '', v.message
    ].join('\n');
    try {
      await sendEmail({
        FromEmailAddress: `MAC Tecnología <${sender}>`,
        Destination: {ToAddresses:[recipient]}, ReplyToAddresses:[v.email],
        Content: {Simple: {
          Subject: {Data:v.language === 'es' ? 'Nueva consulta · MAC Tecnología' : 'New inquiry · MAC Tecnología', Charset:'UTF-8'},
          Body: {Text:{Data:text, Charset:'UTF-8'}}
        }}
      });
      return reply(200, {ok:true});
    } catch {
      // Do not log the event, message, email addresses or provider error payload.
      console.error('Contact delivery could not be confirmed.');
      return reply(503, {ok:false});
    }
  };
}
