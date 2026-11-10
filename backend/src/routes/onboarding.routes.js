const express=require('express');
const crypto=require('node:crypto');
const db=require('../lib/supabase');
const {getAuthenticatedUser}=require('../lib/authClient');
const {dispatchWelcomeEmail}=require('../services/welcomeEmail.service');
const router=express.Router();
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
router.post('/welcome',async(req,res)=>{
 res.set('Cache-Control','no-store');
 try{const user=await getAuthenticatedUser(req);if(!user?.id||!user.email_confirmed_at)return res.status(401).json({error:'Verified sign-in required.'});
  return res.json(await dispatchWelcomeEmail({db,id:user.id}));
 }catch{return res.status(503).json({error:'Welcome email temporarily unavailable.'});}
});
router.post('/welcome-hook',async(req,res)=>{
 const expected=process.env.WELCOME_EMAIL_WEBHOOK_SECRET;
 const supplied=req.headers.authorization?.replace(/^Bearer\s+/i,'')||'';
 if(!expected)return res.status(503).json({error:'Webhook not configured.'});
 const a=Buffer.from(supplied),b=Buffer.from(expected);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.sendStatus(401);
 // Use only the inserted queue ID; resolve the recipient from trusted database state.
 if(req.body?.type!=='INSERT'||req.body?.schema!=='public'||req.body?.table!=='welcome_emails'||!uuid(req.body?.record?.id))return res.sendStatus(400);
 try{const result=await dispatchWelcomeEmail({db,id:req.body.record.id});return res.status(['retry','not_configured'].includes(result.status)?503:200).json(result);}catch{return res.sendStatus(503);}
});
module.exports=router;
