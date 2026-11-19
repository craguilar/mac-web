'use strict';
const {validateContact} = require('../../../public/assets/contact-validation.js');

function createHandler({sendEmail, recipient, sender, origins, verifyChallenge, isEnabled}) {
  const reply = (statusCode, body) => ({statusCode, headers: {'content-type':'application/json', 'cache-control':'no-store'}, body: JSON.stringify(body)});
  return async event => {
    if (event.requestContext?.http?.method !== 'POST') return reply(405, {ok:false});
    // CORS is a browser control, not authentication. The endpoint is intentionally public.
    if (!origins.includes(event.headers?.origin)) return reply(403, {ok:false});
    if (!/^application\/json(?:;|$)/i.test(event.headers?.['content-type'] || '')) return reply(415, {ok:false});
    if (event.isBase64Encoded || typeof event.body !== 'string' || Buffer.byteLength(event.body, 'utf8') > 16384) return reply(413, {ok:false});
    let input;
    try { input = JSON.parse(event.body); } catch { return reply(400, {ok:false}); }
    if (input && typeof input.website === 'string' && input.website) return reply(200, {ok:true});
    const validated = validateContact(input);
    if (!validated.ok) return reply(400, {ok:false, errors:validated.errors});
    if (!recipient || !sender || !isEnabled()) return reply(503, {ok:false});
    const verification=await verifyChallenge(input.turnstileToken,event.headers.origin);
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
module.exports = {createHandler};
