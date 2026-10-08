import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarCheck, Check, Clock3, Copy, CreditCard, Eye, EyeOff, LoaderCircle, Plus, Save, Settings2, Trash2, UserRound } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";

const TABS = [
  ["overview", "Overview", BarChart3], ["services", "My Services", CalendarCheck],
  ["availability", "Availability", Clock3], ["bookings", "Bookings", UserRound],
  ["payments", "Payment Settings", CreditCard], ["settings", "Booking Page Settings", Settings2],
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultProfile = { username: "", display_name: "", professional_title: "", bio: "", profile_picture_url: "", timezone: "Asia/Kolkata", buffer_minutes: 0, hold_minutes: 15, is_published: false };
const defaultPayment = { upi_enabled: false, upi_id: "", upi_display_name: "", upi_qr_path: "", razorpay_enabled: false, razorpay_payment_link: "" };

function suggestedUsername(user) {
  const source = user?.email?.split("@")[0] || user?.user_metadata?.full_name || "";
  const normalized = source.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 30);
  return normalized.length >= 3 ? normalized : "";
}

export default function AppointmentBooking() {
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [tab, setTab] = useState("overview");
  const [profile, setProfile] = useState(defaultProfile);
  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [payment, setPayment] = useState(defaultPayment);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [usernameState, setUsernameState] = useState({ checking: false, available: null, error: "" });

  const notify = (message, type = "success") => { setNotice({ message, type }); window.setTimeout(() => setNotice(null), 3500); };
  const publicUrl = profile.username ? `${window.location.origin}/book/${profile.username}` : "";
  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data }, bookingResponse] = await Promise.all([api.get("/booking/me"), api.get("/booking/bookings")]);
      setProfile(data.profile ? { ...defaultProfile, ...data.profile } : { ...defaultProfile, username: suggestedUsername(user), display_name: user.user_metadata?.full_name || "" });
      setServices(data.services || []); setAvailability(data.availability || []); setBlockedDates(data.blocked_dates || []);
      setPayment(data.payment_settings ? { ...defaultPayment, ...data.payment_settings } : defaultPayment);
      setBookings(bookingResponse.data || []);
    } catch (error) { notify(error.response?.data?.error || "Unable to load appointments.", "error"); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  useEffect(() => {
    const username = profile.username.trim();
    if (!username) { setUsernameState({ checking: false, available: null, error: "" }); return; }
    setUsernameState((current) => ({ ...current, checking: true }));
    const timer = window.setTimeout(async () => {
      try { const { data } = await api.get(`/booking/username-availability/${encodeURIComponent(username)}`); setUsernameState({ checking: false, available: data.available, error: data.error || "" }); }
      catch { setUsernameState({ checking: false, available: false, error: "Unable to check username." }); }
    }, 400);
    return () => clearTimeout(timer);
  }, [profile.username]);

  const saveProfile = async () => {
    if (usernameState.available === false) return notify(usernameState.error || "Username is unavailable.", "error");
    try { setSaving(true); const { data } = await api.put("/booking/profile", profile); setProfile((p) => ({ ...p, ...data.profile })); notify("Booking page settings saved."); return data.profile; }
    catch (error) { notify(error.response?.data?.error || "Unable to save booking profile.", "error"); return null; }
    finally { setSaving(false); }
  };
  const togglePublish = async () => {
    try { const { data } = await api.patch("/booking/publish", { is_published: !profile.is_published }); setProfile((p) => ({ ...p, ...data.profile })); notify(data.profile.is_published ? "Booking page published." : "Booking page unpublished."); }
    catch (error) { notify(error.response?.data?.error || "Unable to update publishing.", "error"); }
  };
  const uploadImage = (field) => (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) return notify("Choose an image under 2 MB.", "error");
    const reader = new FileReader(); reader.onload = () => field === "profile" ? setProfile((p) => ({ ...p, profile_picture_url: reader.result })) : setPayment((p) => ({ ...p, upi_qr_path: reader.result })); reader.readAsDataURL(file);
  };

  if (authLoading || loading) return <AppLayout title="Appointment Booking" subtitle="Loading your booking workspace"><div className="flex justify-center py-24"><LoaderCircle className="h-9 w-9 animate-spin text-brand-600" /></div></AppLayout>;
  const counts = bookings.reduce((all, b) => ({ ...all, [b.status]: (all[b.status] || 0) + 1 }), {});

  return <AppLayout title="Appointment Booking" subtitle="Offer services and receive payments directly" action={<button onClick={togglePublish} className="btn-primary">{profile.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{profile.is_published ? "Unpublish" : "Publish"}</button>}>
    {notice && <div className={`fixed right-4 top-20 z-50 rounded-lg px-4 py-3 text-sm font-bold text-white shadow-xl ${notice.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>{notice.message}</div>}
    <div className="mb-6 overflow-x-auto"><div className="flex min-w-max gap-2">{TABS.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${tab === id ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md" : "border border-slate-200 bg-white text-slate-600 hover:border-brand-200"}`}><Icon className="h-4 w-4" />{label}</button>)}</div></div>
    {tab === "overview" && <Overview profile={profile} publicUrl={publicUrl} bookings={bookings} counts={counts} services={services} copy={() => navigator.clipboard.writeText(publicUrl).then(() => notify("Booking link copied."))} />}
    {tab === "services" && <Services services={services} profile={profile} setServices={setServices} saveProfile={saveProfile} notify={notify} />}
    {tab === "availability" && <Availability profile={profile} setProfile={setProfile} availability={availability} setAvailability={setAvailability} blockedDates={blockedDates} setBlockedDates={setBlockedDates} notify={notify} saveProfile={saveProfile} />}
    {tab === "bookings" && <Bookings bookings={bookings} setBookings={setBookings} notify={notify} />}
    {tab === "payments" && <Payments payment={payment} setPayment={setPayment} uploadImage={uploadImage("qr")} notify={notify} />}
    {tab === "settings" && <ProfileSettings profile={profile} setProfile={setProfile} usernameState={usernameState} uploadImage={uploadImage("profile")} save={saveProfile} saving={saving} publicUrl={publicUrl} />}
  </AppLayout>;
}

function Overview({ profile, publicUrl, bookings, counts, services, copy }) {
  const upcoming = bookings.filter((b) => new Date(b.starts_at) > new Date() && ["confirmed","pending_confirmation","payment_review"].includes(b.status)).slice(0, 5);
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Total bookings" value={bookings.length} /><Metric label="Upcoming" value={upcoming.length} /><Metric label="Payment reviews" value={counts.payment_review || 0} /><Metric label="Active services" value={services.filter((s) => s.is_active).length} /></div><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Public booking link</h2>{publicUrl ? <div className="mt-4 flex flex-col gap-3 sm:flex-row"><div className="flex-1 truncate rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">{publicUrl}</div><button onClick={copy} className="btn-secondary"><Copy className="h-4 w-4" />Copy</button><a href={publicUrl} target="_blank" rel="noreferrer" className="btn-primary justify-center">Preview</a></div> : <p className="mt-2 text-sm text-slate-500">Set a username in Booking Page Settings to create your link.</p>}<p className="mt-4 text-xs text-slate-500">Booking works independently of Instagram. Paste this URL into any JustDMs automated reply or Link in Bio page.</p></section><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Upcoming appointments</h2><div className="mt-4 space-y-3">{upcoming.map((b) => <BookingSummary key={b.id} booking={b} />)}{!upcoming.length && <Empty text="No upcoming appointments yet." />}</div></section></div>;
}

function Services({ services, profile, setServices, saveProfile, notify }) {
  const empty = { name: "", description: "", duration_minutes: 30, price: 0, appointment_type: "online", is_active: true };
  const [draft, setDraft] = useState(empty); const [editing, setEditing] = useState(null);
  const submit = async (event) => { event.preventDefault(); try { if (!profile.id) { if (!profile.username) return notify("Choose your booking username in Booking Page Settings first.", "error"); if (!(await saveProfile())) return; } const response = editing ? await api.patch(`/booking/services/${editing}`, draft) : await api.post("/booking/services", draft); setServices((items) => editing ? items.map((s) => s.id === editing ? response.data.service : s) : [...items, response.data.service]); setDraft(empty); setEditing(null); notify(editing ? "Service updated." : "Service added."); } catch (error) { notify(error.response?.data?.error || "Unable to save service.", "error"); } };
  const remove = async (service) => { if (!window.confirm(`Delete ${service.name}?`)) return; try { await api.delete(`/booking/services/${service.id}`); setServices((items) => items.filter((s) => s.id !== service.id)); } catch (error) { notify(error.response?.data?.error || "Unable to delete service.", "error"); } };
  return <div className="grid gap-6 xl:grid-cols-[380px_1fr]"><form onSubmit={submit} className="h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">{editing ? "Edit service" : "Add service"}</h2><div className="mt-5 space-y-4"><Field label="Service name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} required /><label className="block"><Label>Description</Label><textarea className="input min-h-24 py-3" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label><div className="grid grid-cols-2 gap-3"><Select label="Duration" value={draft.duration_minutes} onChange={(v) => setDraft({ ...draft, duration_minutes: Number(v) })} options={[[15,"15 minutes"],[30,"30 minutes"],[45,"45 minutes"],[60,"60 minutes"]]} /><Field label="Price (₹)" type="number" min="0" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} /></div><Select label="Appointment type" value={draft.appointment_type} onChange={(v) => setDraft({ ...draft, appointment_type: v })} options={[["online","Online"],["offline","Offline"]]} /><button className="btn-primary w-full justify-center"><Save className="h-4 w-4" />{editing ? "Update service" : "Add service"}</button></div></form><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Your services</h2><div className="mt-5 space-y-3">{services.map((s) => <div key={s.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="flex-1"><div className="flex items-center gap-2"><h3 className="font-bold">{s.name}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{s.is_active ? "Active" : "Inactive"}</span></div><p className="mt-1 text-sm text-slate-500">{s.duration_minutes} min · {s.appointment_type} · {s.price_paise ? `₹${s.price_paise / 100}` : "Free"}</p></div><button className="btn-secondary" onClick={() => { setEditing(s.id); setDraft({ ...s, price: s.price_paise / 100 }); }}>Edit</button><button className="icon-button text-rose-500" onClick={() => remove(s)}><Trash2 className="h-4 w-4" /></button></div>)}{!services.length && <Empty text="Add your first appointment service." />}</div></section></div>;
}

function Availability({ profile, setProfile, availability, setAvailability, blockedDates, setBlockedDates, notify, saveProfile }) {
  const windowsByDay = new Map(availability.map((w) => [Number(w.weekday), w]));
  const updateDay = (day, updates) => { const existing = windowsByDay.get(day) || { weekday: day, start_time: "09:00", end_time: "17:00", is_enabled: false }; setAvailability((items) => [...items.filter((w) => Number(w.weekday) !== day), { ...existing, ...updates }].sort((a,b) => a.weekday-b.weekday)); };
  const save = async () => { try { if (!(await saveProfile())) return; const { data } = await api.put("/booking/availability", { windows: availability.filter((w) => w.is_enabled) }); setAvailability(data.availability); notify("Availability saved."); } catch (error) { notify(error.response?.data?.error || "Unable to save availability.", "error"); } };
  const [block, setBlock] = useState({ blocked_date: "", reason: "" });
  const addBlock = async () => { try { const { data } = await api.post("/booking/blocked-dates", block); setBlockedDates((items) => [...items, data.blocked_date]); setBlock({ blocked_date: "", reason: "" }); } catch (error) { notify(error.response?.data?.error || "Unable to block date.", "error"); } };
  return <div className="grid gap-6 xl:grid-cols-[1fr_380px]"><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Weekly hours</h2><p className="mt-1 text-sm text-slate-500">Appointments are stored in UTC and shown in your selected time zone.</p><div className="mt-5 space-y-3">{DAYS.map((day, index) => { const w = windowsByDay.get(index) || { is_enabled:false,start_time:"09:00",end_time:"17:00" }; return <div key={day} className="grid items-center gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[120px_70px_1fr_1fr]"><span className="font-semibold">{day}</span><input type="checkbox" checked={w.is_enabled} onChange={(e) => updateDay(index,{is_enabled:e.target.checked})} /><input type="time" className="input" value={w.start_time} disabled={!w.is_enabled} onChange={(e) => updateDay(index,{start_time:e.target.value})} /><input type="time" className="input" value={w.end_time} disabled={!w.is_enabled} onChange={(e) => updateDay(index,{end_time:e.target.value})} /></div>; })}</div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Field label="Time zone" value={profile.timezone} onChange={(v) => setProfile({...profile,timezone:v})} /><Field label="Buffer minutes" type="number" min="0" value={profile.buffer_minutes} onChange={(v) => setProfile({...profile,buffer_minutes:Number(v)})} /><Field label="Payment hold minutes" type="number" min="5" value={profile.hold_minutes} onChange={(v) => setProfile({...profile,hold_minutes:Number(v)})} /></div><button onClick={save} className="btn-primary mt-5"><Save className="h-4 w-4" />Save availability</button></section><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Blocked dates</h2><div className="mt-4 space-y-3"><Field label="Date" type="date" value={block.blocked_date} onChange={(v) => setBlock({...block,blocked_date:v})} /><Field label="Reason" value={block.reason} onChange={(v) => setBlock({...block,reason:v})} /><button onClick={addBlock} className="btn-secondary w-full justify-center"><Plus className="h-4 w-4" />Block date</button></div><div className="mt-5 space-y-2">{blockedDates.map((d) => <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{d.blocked_date}{d.reason ? ` · ${d.reason}` : ""}</span><button onClick={async()=>{await api.delete(`/booking/blocked-dates/${d.id}`);setBlockedDates((x)=>x.filter((i)=>i.id!==d.id));}} className="icon-button"><Trash2 className="h-4 w-4" /></button></div>)}</div></section></div>;
}

function Bookings({ bookings, setBookings, notify }) {
  const [filter, setFilter] = useState("all"); const visible = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const change = async (booking, status) => { try { const { data } = await api.patch(`/booking/bookings/${booking.id}/status`, { status }); setBookings((items) => items.map((b) => b.id === booking.id ? { ...b, ...data.booking } : b)); notify("Booking updated."); } catch (error) { notify(error.response?.data?.error || "Unable to update booking.", "error"); } };
  return <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Bookings</h2><p className="text-sm text-slate-500">Paid bookings must be manually verified in your own bank or Razorpay account.</p></div><select className="input w-auto" value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="all">All statuses</option>{["pending_payment","payment_review","pending_confirmation","confirmed","completed","cancelled","rejected","expired","no_show"].map((s)=><option key={s} value={s}>{pretty(s)}</option>)}</select></div><div className="mt-5 space-y-3">{visible.map((b)=><div key={b.id} className="rounded-lg border border-slate-200 p-4"><BookingSummary booking={b}/><div className="mt-3 flex flex-wrap gap-2">{b.status === "payment_review" && <><button onClick={()=>change(b,"confirmed")} className="btn-primary">Confirm Payment & Booking</button><button onClick={()=>change(b,"rejected")} className="btn-secondary">Payment Not Received</button></>}{b.status === "pending_confirmation" && <button onClick={()=>change(b,"confirmed")} className="btn-primary">Confirm Booking</button>}{b.status === "confirmed" && <><button onClick={()=>change(b,"completed")} className="btn-secondary">Complete</button><button onClick={()=>change(b,"no_show")} className="btn-secondary">No show</button><button onClick={()=>change(b,"cancelled")} className="btn-secondary">Cancel</button></>}</div></div>)}{!visible.length&&<Empty text="No bookings match this filter."/>}</div></section>;
}

function Payments({ payment, setPayment, uploadImage, notify }) {
  const save = async()=>{try{const {data}=await api.put("/booking/payment-settings",payment);setPayment(data.payment_settings);notify("Payment settings saved.");}catch(error){notify(error.response?.data?.error||"Unable to save payment settings.","error");}};
  return <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Direct UPI</h2><input type="checkbox" checked={payment.upi_enabled} onChange={(e)=>setPayment({...payment,upi_enabled:e.target.checked})}/></div><p className="mt-2 text-sm text-slate-500">Payments go directly to your UPI account. A valid format does not verify account ownership.</p><div className="mt-5 space-y-4"><Field label="UPI ID" value={payment.upi_id||""} onChange={(v)=>setPayment({...payment,upi_id:v})} placeholder="creator@bank"/><Field label="Payment display name" value={payment.upi_display_name||""} onChange={(v)=>setPayment({...payment,upi_display_name:v})}/><label className="block"><Label>UPI QR image</Label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadImage} className="input" /></label>{payment.upi_qr_path&&<img src={payment.upi_qr_path} alt="UPI QR preview" className="h-40 w-40 rounded-lg border object-contain"/>}</div></section><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Creator-owned Razorpay link</h2><input type="checkbox" checked={payment.razorpay_enabled} onChange={(e)=>setPayment({...payment,razorpay_enabled:e.target.checked})}/></div><p className="mt-2 text-sm leading-6 text-slate-500">Use your own Razorpay-hosted payment link. You handle KYC, settlement, refunds, and matching the link amount to the service price. JustDMs never receives your secret keys.</p><div className="mt-5"><Field label="Razorpay payment link" type="url" value={payment.razorpay_payment_link||""} onChange={(v)=>setPayment({...payment,razorpay_payment_link:v})} placeholder="https://rzp.io/l/..."/></div></section><div className="lg:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Customer payment references and screenshots are claims for manual review, not proof of payment. Verify funds in your own account before confirming.</div><button onClick={save} className="btn-primary lg:col-span-2 lg:w-fit"><Save className="h-4 w-4"/>Save payment settings</button></div>;
}

function ProfileSettings({ profile,setProfile,usernameState,uploadImage,save,saving,publicUrl }) { return <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Public booking page</h2><div className="mt-5 grid gap-5 sm:grid-cols-[150px_1fr]"><label className="flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-brand-300 bg-brand-50">{profile.profile_picture_url?<img src={profile.profile_picture_url} alt="" className="h-full w-full object-cover"/>:<span className="text-sm font-bold text-brand-700">Upload photo</span>}<input type="file" accept="image/*" className="sr-only" onChange={uploadImage}/></label><div className="grid gap-4 sm:grid-cols-2"><div><Field label="Username" value={profile.username} onChange={(v)=>setProfile({...profile,username:v.toLowerCase().replace(/[^a-z0-9._-]/g,"")})} placeholder="yourname"/><p className={`mt-1 text-xs font-semibold ${usernameState.available===false?"text-rose-600":"text-emerald-600"}`}>{usernameState.checking?"Checking...":usernameState.available===true?"Username is available":usernameState.error}</p></div><Field label="Display name" value={profile.display_name||""} onChange={(v)=>setProfile({...profile,display_name:v})}/><Field label="Professional title" value={profile.professional_title||""} onChange={(v)=>setProfile({...profile,professional_title:v})}/><div className="sm:col-span-2"><label><Label>Bio</Label><textarea className="input min-h-24 py-3" maxLength="500" value={profile.bio||""} onChange={(e)=>setProfile({...profile,bio:e.target.value})}/></label></div></div></div>{publicUrl&&<p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">{publicUrl}</p>}<button onClick={save} disabled={saving} className="btn-primary mt-5"><Save className="h-4 w-4"/>{saving?"Saving...":"Save settings"}</button></section>; }

function Metric({label,value}){return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value||0}</p></div>}
function BookingSummary({booking}){return <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{booking.customer_name} · {booking.service_name}</p><p className="text-sm text-slate-500">{new Date(booking.starts_at).toLocaleString()} · {booking.amount_paise?`₹${booking.amount_paise/100}`:"Free"}</p></div><span className="w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{pretty(booking.status)}</span></div>}
function Empty({text}){return <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{text}</div>}
function Label({children}){return <span className="mb-2 block text-sm font-bold text-slate-700">{children}</span>}
function Field({label,value,onChange,type="text",...props}){return <label className="block"><Label>{label}</Label><input className="input" type={type} value={value} onChange={(e)=>onChange(e.target.value)} {...props}/></label>}
function Select({label,value,onChange,options}){return <label className="block"><Label>{label}</Label><select className="input" value={value} onChange={(e)=>onChange(e.target.value)}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}
function pretty(value){return String(value||"").replaceAll("_"," ").replace(/\b\w/g,(c)=>c.toUpperCase())}
