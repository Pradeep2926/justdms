const {randomUUID}=require('node:crypto');
const {welcomeEmail}=require('../emails/welcome');
async function dispatchWelcomeEmail({db,id,fetcher=fetch,env=process.env,now=()=>Date.now()}) {
 if(env.WELCOME_EMAIL_ENABLED!=='true')return {status:'disabled'};
 if(!env.RESEND_API_KEY||!env.WELCOME_EMAIL_FROM) return {status:'not_configured'};
 const lease=randomUUID();
 const {data:row,error}=await db.rpc('claim_welcome_email',{p_id:id,p_lease_id:lease});
 if(error)throw new Error('Welcome email queue is unavailable.');
 if(!row)return {status:'skipped'};
 if(row.template_version!=='v1')throw new Error('Unsupported welcome template.');
 let updates;
 try {
  const message=welcomeEmail(row.display_name);
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`justdms-welcome/v1/${row.id}`},body:JSON.stringify({from:env.WELCOME_EMAIL_FROM,to:[row.recipient],reply_to:'support@justdms.in',...message}),signal:AbortSignal.timeout(15000)});
  if(!response.ok){const e=new Error('Email provider rejected request');e.httpStatus=response.status;throw e;}
  const data=await response.json();
  if(typeof data.id!=='string'||!data.id)throw new Error('Missing message receipt');
  updates={status:'sent',accepted_at:new Date(now()).toISOString(),provider_message_id:data.id,error_code:null,lease_id:null,lease_until:null};
 }catch(error){
  const retryable=!error.httpStatus||error.httpStatus===429||error.httpStatus>=500;
  updates={status:retryable?'retry':'review',error_code:retryable?'temporary_or_uncertain_send':'provider_rejected',next_attempt_at:new Date(now()+Math.min(60,2**Math.min(row.attempts||1,6))*60000).toISOString(),lease_id:null,lease_until:null};
 }
 const {error:saveError,data:saved}=await db.from('welcome_emails').update(updates).eq('id',row.id).eq('lease_id',lease).select('id');
 if(saveError||!saved?.length)throw new Error('Welcome email result could not be recorded.');
 return {status:updates.status};
}
module.exports={dispatchWelcomeEmail};
