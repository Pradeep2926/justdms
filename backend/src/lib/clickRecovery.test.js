const test = require('node:test');
const assert = require('node:assert/strict');
const { findConfirmedClick, createPostbackRunner, createClickRecovery } = require('./clickRecovery');
const openingAt = '2026-10-24T04:01:16.456Z';
const now = Date.parse('2026-10-24T04:05:00Z');
const interaction = { id: '1686054c-e65d-4a4a-9934-8637d6897f94', automation_id: '5e4eabb3-5eee-4b3f-9154-49d977f51ef8', instagram_sender_id: 'customer', opening_dm_sent_at: openingAt };
const automation = { id: interaction.automation_id, is_active: true, opening_dm_button_text: 'Click here for Details' };
const template = { id: 'template', created_time: '2026-10-24T04:01:15Z', from: { id: 'owner' }, to: { data: [{id:'customer'}] }, message: '' };
const click = { id: 'click', created_time: '2026-10-24T04:01:22Z', from: { id: 'customer' }, to: { data: [{id:'owner'}] }, message: 'Click here for Details' };
function match(messages, row = interaction) { return findConfirmedClick({ messages, interaction: row, automation, ownerIds: ['owner'], now }); }

test('matches exact incoming button after the recorded opening template regardless of API sort order', () => {
  assert.equal(match([click,template]).id, 'click');
});
for (const [name, messages] of [
  ['wrong sender', [template, {...click, from:{id:'someone'}}]],
  ['outgoing caption', [template, {...click, from:{id:'owner'}}]],
  ['wrong recipient', [template, {...click, to:{data:[{id:'other'}]}}]],
  ['different caption', [template, {...click,message:'Hi'}]],
  ['manual text preceding click', [{...template,message:'hello'},click]],
  ['unrelated template', [{...template,created_time:'2026-10-24T04:00:00Z'},click]],
  ['intervening manual message', [template,{...template,created_time:'2026-10-24T04:01:20Z',message:'hello'},click]],
  ['old click', [template,{...click,created_time:'2026-10-23T04:01:22Z'}]],
]) test(`never recovers ${name}`,()=>assert.equal(match(messages),null));

test('shared persistent lock prevents overlapping live and recovery sends and survives ambiguous failure', async () => {
  const held = new Map(); let release; let sends = 0;
  const db = { from() { return {
    async insert(row) { if(held.has(row.id))return {error:{code:'23505'}}; held.set(row.id,row);return {}; },
    delete() { return {eq:async(_,id)=>{held.delete(id);return {};}}; },
  }; } };
  const args = {messaging:{postback:{payload:`GET_DETAILS:${automation.id}:${interaction.id}`}}};
  const run = createPostbackRunner({db,processPostback:async()=>{sends++; await new Promise(r=>release=r);}});
  const first=run(args); await new Promise(r=>setImmediate(r));
  const second=await run({...args,recovery:{}});
  assert.equal(second.reason,'postback_in_progress_or_requires_review');assert.equal(sends,1);
  release();await first;assert.equal(held.size,0);
  const broken=createPostbackRunner({db,processPostback:async()=>{throw Error('uncertain send');}});
  await assert.rejects(broken(args));assert.equal(held.size,1);
  assert.equal((await run(args)).status,'skipped');
});

function recoveryHarness({ rows = [interaction], active = true, messages = [click,template] } = {}) {
  const calls=[];
  const db={from(table){const q={select(){return q;},eq(){return q;},gte(){return q;},order(){return q;},limit:async()=>({data:rows}),maybeSingle:async()=>({data:{...automation,is_active:active}})};return q;}};
  const recover=createClickRecovery({db,accountId:'pilot',now:()=>now,
    getAccount:async()=>({auth_provider:'instagram',messaging_owner_id:'owner'}),
    getMessages:async()=>{calls.push('read');return messages;},runPostback:async args=>calls.push(args),logger:{error(){}}});
  return {recover,calls};
}
test('recovery reuses the existing GET_DETAILS handler with evidence; concurrent ticks and immediate checks are bounded',async()=>{
  const h=recoveryHarness();await Promise.all([h.recover(),h.recover()]);await h.recover();
  assert.equal(h.calls.length,2);assert.equal(h.calls[1].recovery.messageId,'click');
  assert.equal(h.calls[1].messaging.recipient.id,'owner');
  assert.equal(h.calls[1].messaging.postback.payload,`GET_DETAILS:${automation.id}:${interaction.id}`);
});
test('multiple pending automations for the same sender are never guessed',async()=>{
  const h=recoveryHarness({rows:[interaction,{...interaction,id:'other'}]});await h.recover();assert.deepEqual(h.calls,[]);
});
test('inactive and delivered interactions never trigger recovery',async()=>{
  for(const options of [{active:false},{rows:[{...interaction,resource_delivered_at:openingAt}]}]){
    const h=recoveryHarness(options);await h.recover();assert.deepEqual(h.calls,[]);
  }
});
