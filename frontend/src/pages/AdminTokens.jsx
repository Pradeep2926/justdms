import {useEffect,useState} from 'react';
import {RefreshCw,ShieldCheck} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import TokenRefreshMonitor from '../components/dashboard/TokenRefreshMonitor';
import TokenAccountDirectory from '../components/dashboard/TokenAccountDirectory';
import AdminUserDetails from '../components/dashboard/AdminUserDetails';
import {formatAdminDate as date} from '../components/dashboard/AdminUI';
import {useAuth} from '../hooks/useAuth';
import api from '../api/api';
export default function AdminTokens(){
 const {user,loading:authLoading}=useAuth({redirectOnFail:true});
 const [snapshot,setSnapshot]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selectedId,setSelectedId]=useState(null);
 const overview=snapshot?.viewerId===user?.id?snapshot:null;
 useEffect(()=>{let active=true;if(!user?.id)return;setLoading(true);setSnapshot(null);api.get('/admin/overview').then(({data})=>{if(active){setSnapshot({...data,viewerId:user.id});setError('');}}).catch(err=>{if(active)setError(err.response?.data?.error||'Unable to load token monitoring.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[user?.id]);
 async function refresh(){setLoading(true);try{const {data}=await api.get('/admin/overview');setSnapshot({...data,viewerId:user.id});setError('');}catch(err){setError(err.response?.data?.error||'Unable to refresh monitoring.');if([401,403].includes(err.response?.status))setSnapshot(null);}finally{setLoading(false);}}
 const selected=overview?.users.find(item=>item.id===selectedId);
 return <AppLayout title="Token monitor" subtitle="Instagram accounts, renewal health & daily jobs" compactHeader action={<button type="button" disabled={loading||authLoading||!user} onClick={refresh} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</button>}><div className="mx-auto max-w-6xl space-y-5"><div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-500"><p className="inline-flex items-center gap-1 text-violet-700"><ShieldCheck className="h-3.5 w-3.5"/>Admin workspace · Token monitor</p><p>{overview?`Snapshot ${date(overview.generatedAt)} IST`:'Authorized administrators only'}</p></div>{error&&<div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}{overview&&' The previous snapshot remains visible.'}</div>}{(authLoading||loading&&!overview)&&<p role="status" className="py-12 text-center text-sm text-slate-500">Loading token monitoring…</p>}{overview&&<><TokenAccountDirectory users={overview.users} onSelect={setSelectedId}/><TokenRefreshMonitor monitor={overview.tokenRefresh} users={overview.users} onSelect={setSelectedId}/><p className="text-center text-[10px] leading-5 text-slate-400">Saved account data; no live Meta health checks. Refresh to update the snapshot; backend snapshots may be reused for up to 30 seconds.</p></>}{selected&&<AdminUserDetails key={selected.id} user={selected} tokenRefreshEnabled={overview.tokenRefresh?.applyEnabled===true} onGranted={refresh} onClose={()=>setSelectedId(null)}/>}</div></AppLayout>;
}
