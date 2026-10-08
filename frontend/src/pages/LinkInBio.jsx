import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Check, CheckCircle2, Copy, Eye, EyeOff, GripVertical, ImagePlus, Link2, LoaderCircle, Palette, Pencil, Plus, QrCode, Save, Smartphone, Trash2, UserRound, X, XCircle } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import BioPreview, { BIO_THEMES } from "../components/bio/BioPreview";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";

const emptyProfile = { username: "", display_name: "", description: "", profile_picture_url: "", theme: "justdms", is_published: false };

export default function LinkInBio() {
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [profile, setProfile] = useState(emptyProfile);
  const [links, setLinks] = useState([]);
  const [analytics, setAnalytics] = useState({ total_views: 0, total_clicks: 0, top_links: [], daily: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [draft, setDraft] = useState({ title: "", url: "" });
  const [editingId, setEditingId] = useState(null);
  const [usernameState, setUsernameState] = useState({ checking: false, available: null, error: "" });
  const dragId = useRef(null);

  const publicUrl = useMemo(() => profile.username ? `${window.location.origin}/@${profile.username}` : "", [profile.username]);
  const notify = (message, type = "success") => { setNotice({ message, type }); window.setTimeout(() => setNotice(null), 3500); };

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data }, analyticsResponse] = await Promise.all([api.get("/bio/me"), api.get("/bio/analytics")]);
      setProfile(data.profile ? { ...emptyProfile, ...data.profile } : { ...emptyProfile, display_name: user.user_metadata?.full_name || "" });
      setLinks(data.links || []);
      setAnalytics(analyticsResponse.data);
    } catch (error) { notify(error.response?.data?.error || "Unable to load Link in Bio.", "error"); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  useEffect(() => {
    const username = profile.username.trim();
    if (!username) {
      setUsernameState({ checking: false, available: null, error: "" });
      return undefined;
    }
    setUsernameState((current) => ({ ...current, checking: true }));
    const timeout = window.setTimeout(async () => {
      try {
        const { data } = await api.get(`/bio/username-availability/${encodeURIComponent(username)}`);
        setUsernameState({ checking: false, available: data.available, error: data.error || "" });
      } catch (error) {
        setUsernameState({ checking: false, available: false, error: error.response?.data?.error || "Unable to check username." });
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [profile.username]);

  const saveProfile = async () => {
    if (usernameState.available === false) {
      notify(usernameState.error || "That username is already taken.", "error");
      return null;
    }
    try {
      setSaving(true);
      const { data } = await api.put("/bio/profile", profile);
      setProfile((current) => ({ ...current, ...data.profile }));
      notify("Bio profile saved.");
      return data.profile;
    } catch (error) { notify(error.response?.data?.error || "Unable to save profile.", "error"); return null; }
    finally { setSaving(false); }
  };

  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) return notify("Choose an image smaller than 2 MB.", "error");
    const reader = new FileReader();
    reader.onload = () => setProfile((current) => ({ ...current, profile_picture_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const submitLink = async (event) => {
    event.preventDefault();
    try {
      if (!profile.id) {
        const saved = await saveProfile();
        if (!saved) return;
      }
      if (editingId) {
        const { data } = await api.patch(`/bio/links/${editingId}`, draft);
        setLinks((items) => items.map((item) => item.id === editingId ? data.link : item));
      } else {
        const { data } = await api.post("/bio/links", draft);
        setLinks((items) => [...items, data.link]);
      }
      setDraft({ title: "", url: "" }); setEditingId(null); notify(editingId ? "Link updated." : "Link added.");
    } catch (error) { notify(error.response?.data?.error || "Unable to save link.", "error"); }
  };

  const patchLink = async (link, updates) => {
    try { const { data } = await api.patch(`/bio/links/${link.id}`, updates); setLinks((items) => items.map((item) => item.id === link.id ? data.link : item)); }
    catch (error) { notify(error.response?.data?.error || "Unable to update link.", "error"); }
  };
  const deleteLink = async (link) => {
    if (!window.confirm(`Delete “${link.title}”?`)) return;
    try { await api.delete(`/bio/links/${link.id}`); setLinks((items) => items.filter((item) => item.id !== link.id).map((item, position) => ({ ...item, position }))); notify("Link deleted."); }
    catch (error) { notify(error.response?.data?.error || "Unable to delete link.", "error"); }
  };
  const reorder = async (targetId) => {
    if (!dragId.current || dragId.current === targetId) return;
    const from = links.findIndex((link) => link.id === dragId.current), to = links.findIndex((link) => link.id === targetId);
    const next = [...links]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); setLinks(next.map((link, position) => ({ ...link, position }))); dragId.current = null;
    try { await api.put("/bio/links/reorder", { ids: next.map((link) => link.id) }); }
    catch (error) { notify(error.response?.data?.error || "Unable to reorder links.", "error"); load(); }
  };
  const togglePublish = async () => {
    try { const { data } = await api.patch("/bio/publish", { is_published: !profile.is_published }); setProfile((current) => ({ ...current, ...data.profile })); notify(data.profile.is_published ? "Your bio page is live." : "Your bio page is unpublished."); }
    catch (error) { notify(error.response?.data?.error || "Unable to update publishing.", "error"); }
  };
  const copyLink = async () => { await navigator.clipboard.writeText(publicUrl); notify("Public link copied."); };

  if (authLoading || loading) return <AppLayout title="Link in Bio" subtitle="Loading your smart bio page"><div className="flex justify-center py-24"><LoaderCircle className="h-9 w-9 animate-spin text-brand-600" /></div></AppLayout>;

  return (
    <AppLayout title="Link in Bio" subtitle="Build, publish, and measure your smart bio page" action={<button className="btn-primary" onClick={togglePublish}><span className={`h-2 w-2 rounded-full ${profile.is_published ? "bg-emerald-300" : "bg-white/60"}`} />{profile.is_published ? "Unpublish" : "Publish"}</button>}>
      {notice && <div className={`fixed right-4 top-20 z-50 flex max-w-sm items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-xl ${notice.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>{notice.type === "error" ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}{notice.message}</div>}
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-brand-50/80 via-white to-violet-50/70 px-5 py-5 sm:px-7"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-brand-100"><UserRound className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-950">Profile</h2><p className="mt-0.5 text-sm text-slate-500">Choose how your public page appears.</p></div></div><button onClick={saveProfile} disabled={saving || usernameState.checking} className="btn-secondary"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save"}</button></div>
            <div className="p-5 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
              <label className="group flex h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-brand-300 bg-brand-50 text-brand-700">
                {profile.profile_picture_url ? <img src={profile.profile_picture_url} alt="Profile" className="h-full w-full object-cover" /> : <><ImagePlus className="h-7 w-7" /><span className="mt-2 text-xs font-bold">Upload photo</span></>}
                <input type="file" accept="image/*" className="sr-only" onChange={uploadImage} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Field label="Username" value={profile.username} onChange={(value) => setProfile({ ...profile, username: value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })} prefix="@" placeholder="yourname" /><div className={`mt-2 flex min-h-5 items-center gap-1.5 text-xs font-semibold ${usernameState.available === false ? "text-rose-600" : "text-emerald-600"}`}>{usernameState.checking ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin text-slate-400" /><span className="text-slate-400">Checking availability...</span></> : usernameState.available === true ? <><CheckCircle2 className="h-3.5 w-3.5" />Username is available</> : usernameState.available === false ? <><XCircle className="h-3.5 w-3.5" />{usernameState.error || "Username is already taken"}</> : null}</div></div>
                <Field label="Display name" value={profile.display_name || ""} onChange={(value) => setProfile({ ...profile, display_name: value })} placeholder="Your name or brand" />
                <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">Description</span><textarea className="input min-h-24 resize-y py-3" maxLength={300} value={profile.description || ""} onChange={(event) => setProfile({ ...profile, description: event.target.value })} placeholder="Tell visitors what you do." /><span className="mt-1 block text-right text-xs text-slate-400">{(profile.description || "").length}/300</span></label>
              </div>
            </div>
            <div className="mt-7 border-t border-slate-100 pt-6"><p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><Palette className="h-4 w-4 text-brand-600" />Choose theme</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Object.entries(BIO_THEMES).map(([key, theme]) => <button key={key} type="button" onClick={() => setProfile({ ...profile, theme: key })} className={`overflow-hidden rounded-lg border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md ${profile.theme === key ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200"}`}><span className={`block h-14 rounded-md ${theme.page}`} /><span className="mt-2 flex items-center justify-between text-xs font-bold text-slate-700">{theme.label}{profile.theme === key && <Check className="h-3.5 w-3.5 text-brand-600" />}</span></button>)}</div></div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5"><h2 className="text-lg font-bold text-slate-950">Links</h2><p className="mt-1 text-sm text-slate-500">Drag links to change their public order.</p></div>
            <form onSubmit={submitLink} className="grid gap-3 rounded-lg border border-brand-100 bg-brand-50/60 p-4 sm:grid-cols-[1fr_1.4fr_auto]"><input className="input" required maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Link title" /><input className="input" required type="url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://example.com" /><button className="btn-primary justify-center">{editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingId ? "Update" : "Add"}</button></form>
            <div className="mt-4 space-y-3">{links.map((link) => <div key={link.id} draggable onDragStart={() => { dragId.current = link.id; }} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(link.id)} className={`flex items-center gap-3 rounded-lg border bg-white p-3 transition ${link.is_active ? "border-slate-200" : "border-slate-200 opacity-55"}`}><GripVertical className="h-5 w-5 cursor-grab text-slate-400" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{link.title}</p><p className="truncate text-xs text-slate-500">{link.url}</p></div><button type="button" title={link.is_active ? "Disable" : "Enable"} onClick={() => patchLink(link, { is_active: !link.is_active })} className="icon-button">{link.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button><button type="button" title="Edit" onClick={() => { setEditingId(link.id); setDraft({ title: link.title, url: link.url }); }} className="icon-button"><Pencil className="h-4 w-4" /></button><button type="button" title="Delete" onClick={() => deleteLink(link)} className="icon-button hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>)}{links.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center"><Link2 className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-500">Add your first link above.</p></div>}</div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center gap-3"><BarChart3 className="h-5 w-5 text-brand-600" /><div><h2 className="text-lg font-bold text-slate-950">Analytics</h2><p className="text-sm text-slate-500">Last 30 days, without exposing visitor identities.</p></div></div><div className="grid gap-3 sm:grid-cols-2"><Metric label="Profile views" value={analytics.total_views} /><Metric label="Link clicks" value={analytics.total_clicks} /></div><div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]"><div><p className="mb-3 text-sm font-bold text-slate-700">Daily trend</p><div className="flex h-36 items-end gap-1 rounded-lg bg-slate-50 p-3">{analytics.daily.map((day) => { const max = Math.max(1, ...analytics.daily.map((item) => Math.max(item.views, item.clicks))); return <div key={day.date} className="flex h-full flex-1 items-end gap-px" title={`${day.date}: ${day.views} views, ${day.clicks} clicks`}><span className="w-1/2 rounded-t bg-brand-300" style={{ height: `${Math.max(3, day.views / max * 100)}%` }} /><span className="w-1/2 rounded-t bg-violet-500" style={{ height: `${Math.max(3, day.clicks / max * 100)}%` }} /></div>; })}</div><div className="mt-2 flex gap-4 text-xs text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-300" />Views</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />Clicks</span></div></div><div><p className="mb-3 text-sm font-bold text-slate-700">Top links</p><div className="space-y-2">{analytics.top_links.map((link, index) => <div key={link.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"><span className="text-xs font-bold text-slate-400">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{link.title}</span><span className="text-sm font-bold text-brand-700">{link.clicks}</span></div>)}{analytics.top_links.length === 0 && <p className="text-sm text-slate-400">No clicks yet.</p>}</div></div></div></section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start"><div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.38)]"><div className="mb-4 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold text-slate-800"><Smartphone className="h-4 w-4 text-brand-600" />Live preview</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${profile.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{profile.is_published ? "Live" : "Draft"}</span></div><div className="mx-auto aspect-[9/17] max-h-[calc(100vh-14rem)] min-h-[460px] overflow-y-auto rounded-[28px] border-[7px] border-slate-900 bg-slate-900 shadow-2xl"><BioPreview profile={profile} links={links} /></div>{publicUrl && <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2"><div className="truncate rounded-lg bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600">{publicUrl}</div><button title="Copy link" onClick={copyLink} className="icon-button border border-slate-200"><Copy className="h-4 w-4" /></button><button title="Show QR code" onClick={() => setShowQr(true)} className="icon-button border border-slate-200"><QrCode className="h-4 w-4" /></button></div>}</div></aside>
      </div>
      {showQr && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setShowQr(false)}><div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Share QR code</h2><button className="icon-button" onClick={() => setShowQr(false)}><X className="h-5 w-5" /></button></div><img className="mx-auto mt-5 h-56 w-56" alt={`QR code for ${publicUrl}`} src={`https://api.qrserver.com/v1/create-qr-code/?size=448x448&data=${encodeURIComponent(publicUrl)}`} /><p className="mt-4 break-all text-sm text-slate-500">{publicUrl}</p><button className="btn-primary mt-5 w-full justify-center" onClick={copyLink}><Copy className="h-4 w-4" />Copy link</button></div></div>}
    </AppLayout>
  );
}

function Field({ label, value, onChange, placeholder, prefix }) { return <label><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><span className="relative block">{prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">{prefix}</span>}<input className={`input ${prefix ? "pl-8" : ""}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></span></label>; }
function Metric({ label, value }) { return <div className="rounded-lg border border-slate-200 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-950">{value || 0}</p></div>; }
