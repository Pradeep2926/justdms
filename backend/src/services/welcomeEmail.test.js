const test=require('node:test');const assert=require('node:assert/strict');
const {welcomeEmail}=require('../emails/welcome');const {dispatchWelcomeEmail}=require('./welcomeEmail.service');
const config={WELCOME_EMAIL_ENABLED:'true',RESEND_API_KEY:'fixture-api-secret',WELCOME_EMAIL_FROM:'JustDMs <support@justdms.in>'};
function harness({claimed=true,status=200,networkError=false,saveError=false}={}){
 const calls=[],writes=[];
 const db={async rpc(name,args){calls.push({name,args});return {data:claimed?{id:'user-one',recipient:'verified@example.invalid',display_name:'Creator',template_version:'v1',attempts:1}:null};},from(table){assert.equal(table,'welcome_emails');return {update(row){writes.push(row);return {eq(){return this;},async select(){return {data:[{id:'user-one'}],error:saveError?Error('db'):null};}};}};}};
 const fetcher=async(url,options)=>{calls.push({url,options});if(networkError)throw Error('fixture-private-error');return {ok:status===200,status,async json(){return {id:'message-fixture'};}};};
 return {calls,writes,run:env=>dispatchWelcomeEmail({db,id:'user-one',fetcher,env:env||config,now:()=>Date.parse('2026-11-10')})};
}
test('welcome template personalizes safely and states the actual free flow',()=>{
 const mail=welcomeEmail('<img src=x onerror=evil()>');assert.ok(mail.html.includes('&lt;img'));assert.ok(!mail.html.includes('<img src=x'));
 for(const content of ['2 free active automations','https://justdms.in/connect-meta','https://justdms.in/automation']){assert.ok(mail.html.includes(content));assert.ok(mail.text.includes(content));}
 assert.ok(!mail.text.includes('every comment gets'));assert.ok(mail.text.includes('tap your button'));
 assert.ok(welcomeEmail(null).text.startsWith('Welcome to JustDMs!'));
});
test('disabled or missing sender configuration performs no claim or send',async()=>{
 for(const env of [{},{...config,WELCOME_EMAIL_ENABLED:'false'},{...config,RESEND_API_KEY:''},{...config,WELCOME_EMAIL_FROM:''}]){const h=harness();await h.run(env);assert.equal(h.calls.length,0);}
});
test('duplicate delivery callback does not send when the queue rejects a claim',async()=>{
 const h=harness({claimed:false});assert.equal((await h.run()).status,'skipped');assert.equal(h.calls.length,1);
});
test('only trusted queued recipient is sent with stable idempotency key and safe receipt',async()=>{
 const h=harness();assert.equal((await h.run()).status,'sent');const send=h.calls[1];assert.equal(send.url,'https://api.resend.com/emails');assert.equal(send.options.headers['Idempotency-Key'],'justdms-welcome/v1/user-one');const body=JSON.parse(send.options.body);assert.deepEqual(body.to,['verified@example.invalid']);assert.equal(body.from,config.WELCOME_EMAIL_FROM);assert.equal(body.reply_to,'support@justdms.in');assert.equal(h.writes[0].provider_message_id,'message-fixture');assert.ok(!JSON.stringify(h.writes).includes('fixture-api-secret'));
});
test('temporary and uncertain sends retry without recording accepted mail',async()=>{
 for(const options of [{status:429},{status:503},{networkError:true}]){const h=harness(options);assert.equal((await h.run()).status,'retry');assert.equal(h.writes[0].accepted_at,undefined);assert.equal(h.writes[0].error_code,'temporary_or_uncertain_send');}
});
test('provider permanent errors require review and failed result storage is not claimed as sent',async()=>{
 const h=harness({status:422});assert.equal((await h.run()).status,'review');assert.equal(h.writes[0].error_code,'provider_rejected');await assert.rejects(harness({saveError:true}).run(),/could not be recorded/);
});
