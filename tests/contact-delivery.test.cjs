const test=require('node:test');
const assert=require('node:assert/strict');
const {createHandler}=require('../amplify/functions/contact/delivery.cjs');
const origin='https://mactecnologia.com.mx';
const valid={name:' Ana ',email:'ana@example.test',message:' Consulta de integración ',company:'Example',topic:'architecture',language:'es'};
const event=(body=valid)=>({requestContext:{http:{method:'POST'}},headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
function setup(overrides={}){const sent=[];return {sent,handler:createHandler({recipient:'owner@example.test',sender:'web@mactecnologia.com.mx',origins:[origin],sendEmail:async input=>sent.push(input),...overrides})};}
test('SES acceptance delivers normalized fields to fixed inbox with visitor Reply-To',async()=>{
 const {handler,sent}=setup();const result=await handler(event({...valid,to:'attacker@example.test'}));
 assert.equal(result.statusCode,200);assert.deepEqual(JSON.parse(result.body),{ok:true});assert.equal(sent.length,1);
 assert.deepEqual(sent[0].Destination,{ToAddresses:['owner@example.test']});assert.deepEqual(sent[0].ReplyToAddresses,[valid.email]);
 assert.equal(sent[0].FromEmailAddress,'MAC Tecnología <web@mactecnologia.com.mx>');
 assert.match(sent[0].Content.Simple.Body.Text.Data,/Name \/ Nombre: Ana/);assert.match(sent[0].Content.Simple.Body.Text.Data,/Example/);assert.match(sent[0].Content.Simple.Body.Text.Data,/architecture/);assert.match(sent[0].Content.Simple.Body.Text.Data,/Consulta de integración/);
 assert.doesNotMatch(result.body,/owner@|ana@/);
});
test('invalid payloads and request boundaries cannot send email',async()=>{
 const {handler,sent}=setup();
 const cases=[
  [{...event(),requestContext:{http:{method:'GET'}}},405],
  [{...event(),headers:{origin:'https://evil.example','content-type':'application/json'}},403],
  [{...event(),headers:{origin,'content-type':'text/plain'}},415],
  [{...event(),body:'{'},400], [{...event(),body:'x'.repeat(16385)},413],
  [{...event(),body:'é'.repeat(8193)},413], [{...event(),isBase64Encoded:true},413],
  [event(null),400],[event([]),400],[event({...valid,email:'a@example.test\r\nBcc:evil@example.test'}),400],
  [event({...valid,message:'x'.repeat(3001)}),400], [event({...valid,name:''}),400], [event({...valid,topic:'arbitrary'}),400]
 ];
 for(const [input,status] of cases)assert.equal((await handler(input)).statusCode,status);
 assert.equal(sent.length,0);
});
test('honeypot reports success without delivering',async()=>{const {handler,sent}=setup();assert.equal((await handler(event({...valid,website:'spam'}))).statusCode,200);assert.equal(sent.length,0);});
test('provider failures and missing configuration never claim success',async()=>{
 const logs=[];const original=console.error;console.error=(...x)=>logs.push(x.join(' '));
 try {const {handler}=setup({sendEmail:async()=>{throw Error('secret provider body ana@example.test');}});assert.equal((await handler(event())).statusCode,503);}
 finally{console.error=original;}
 assert.equal(logs.length,1);assert.doesNotMatch(logs[0],/secret|ana@/);
 const {handler,sent}=setup({recipient:''});assert.equal((await handler(event())).statusCode,503);assert.equal(sent.length,0);
});
