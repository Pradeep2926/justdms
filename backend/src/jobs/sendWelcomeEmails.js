// Optional retry worker. No schedule is installed by this file.
require('dotenv').config({quiet:true});
const {createClient}=require('@supabase/supabase-js');
const {dispatchWelcomeEmail}=require('../services/welcomeEmail.service');
(async()=>{
 const args=process.argv.slice(2);
 if(args.some(a=>!['--apply','--dry-run'].includes(a))||args.includes('--apply')&&args.includes('--dry-run'))throw new Error('Choose --dry-run or --apply.');
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.BACKEND_STORAGE==='local')throw new Error('Explicit Supabase configuration required.');
 if(args.includes('--apply')&&(process.env.WELCOME_EMAIL_ENABLED!=='true'||!process.env.RESEND_API_KEY||!process.env.WELCOME_EMAIL_FROM))throw new Error('Welcome mail is not enabled and configured.');
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const timestamp=new Date().toISOString();
 const {data,error}=await db.from('welcome_emails').select('id').in('status',['pending','retry','sending']).lte('next_attempt_at',timestamp).or(`lease_until.is.null,lease_until.lt.${timestamp}`).order('created_at').limit(50);
 if(error)throw new Error('Queue unavailable.');
 const counts={mode:args.includes('--apply')?'apply':'dry_run',candidates:data.length,accepted:0,retry:0,review:0,skipped:0};
 if(args.includes('--apply'))for(const row of data){const result=await dispatchWelcomeEmail({db,id:row.id});if(result.status==='sent')counts.accepted++;else if(result.status==='retry')counts.retry++;else if(result.status==='review')counts.review++;else counts.skipped++;}
 console.log(JSON.stringify(counts));if(counts.retry||counts.review)process.exitCode=1;
})().catch(()=>{console.error('Welcome email job failed; check configuration and queue status. Private details omitted.');process.exitCode=1;});
