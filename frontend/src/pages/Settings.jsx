import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, Save, Settings as SettingsIcon } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../hooks/useAuth";
import { useSearchParams, Link } from "react-router-dom";
import { useInstagram } from "../hooks/useInstagram";
import Billing from "./Billing";
import { Instagram, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Settings() {
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [params, setParams] = useSearchParams();
  const tab = ["general", "accounts", "billing"].includes(params.get("tab")) ? params.get("tab") : "general";
  const { ig, connected, reconnectRequired, loading: accountLoading } = useInstagram(user?.email);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", mobile: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    let active = true;
    const loadProfile = async () => {
      const { data } = await supabase
        .from("ProfileUsers")
        .select("FirstName,LastName,Mobile,Email")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      setProfile({
        firstName: data?.FirstName || user.user_metadata?.first_name || "",
        lastName: data?.LastName || user.user_metadata?.last_name || "",
        mobile: data?.Mobile || user.user_metadata?.mobile || "",
      });
      setLoading(false);
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  const updateField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setMessage("");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!user?.id) return;

    try {
      setSaving(true);
      setMessage("");
      const { error } = await supabase.from("ProfileUsers").upsert(
        {
          id: user.id,
          FirstName: profile.firstName.trim() || null,
          LastName: profile.lastName.trim() || null,
          Email: user.email,
          Mobile: profile.mobile.trim() || null,
        },
        { onConflict: "id" }
      );

      if (error) throw error;
      setMessage("Your settings have been saved.");
    } catch (error) {
      setMessage(error.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const pageLoading = authLoading || loading;

  return (
    <AppLayout title="Settings" subtitle="Manage your workspace preferences">
      {pageLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-6">
          <nav aria-label="Settings navigation" className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            {["general", "accounts", "billing"].map(item => <button key={item} type="button" aria-current={tab === item ? "page" : undefined} onClick={() => setParams({ tab: item })} className={`min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${tab === item ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>{item}</button>)}
          </nav>
          {tab === "accounts" && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-slate-900">Connected accounts</h2>
            <p className="mt-2 text-sm text-slate-500">Manage the Instagram account used for your automations.</p>
            <div className="mt-6 rounded-xl border border-slate-200 p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="rounded-xl bg-pink-50 p-3 text-pink-600"><Instagram className="h-6 w-6" /></span><h3 className="text-lg font-bold">Instagram</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{connected ? 1 : 0}</span></div>
              {accountLoading ? <p className="mt-6 text-sm text-slate-500">Loading account…</p> : <div className="mt-6 rounded-xl border border-slate-100 p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">{ig?.profile_picture_url && <img src={ig.profile_picture_url} alt="" className="h-14 w-14 rounded-full object-cover" />}<div><p className="text-lg font-bold text-slate-900">{ig?.username ? `@${ig.username}` : "No Instagram account connected"}</p><p className="mt-1 text-sm text-slate-500">{ig?.name}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${reconnectRequired ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{reconnectRequired ? "Reconnect required" : connected ? "Account linked" : "Not connected"}</span></div>
                <p className="mt-5 text-sm text-slate-500">{reconnectRequired ? "Renew your Instagram connection to resume DMs and sync new reels. Your automations are saved." : "Use Instagram’s secure login to connect or renew account access."}</p>
                <Link to="/connect-meta?switch=1" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"><RefreshCw className="h-4 w-4" />{connected ? "Reconnect Instagram" : "Connect Instagram"}</Link>
              </div>}
            </div>
          </section>}
          {tab === "billing" && <Billing embedded />}
          {tab === "general" && <>
          <form onSubmit={saveProfile} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-6 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <SettingsIcon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-ink-900">General settings</h2>
                  <p className="mt-1 text-sm text-slate-500">Update the details used for your JustDMs account.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name" value={profile.firstName} onChange={(value) => updateField("firstName", value)} />
                <Field label="Last name" value={profile.lastName} onChange={(value) => updateField("lastName", value)} />
              </div>
              <Field label="Email" value={user?.email || ""} disabled type="email" hint="Your login email cannot be changed here." />
              <Field label="Phone number" value={profile.mobile} onChange={(value) => updateField("mobile", value)} type="tel" placeholder="+91 00000 00000" />

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2 text-sm text-slate-500">
                  {message ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : null}
                  <span>{message}</span>
                </div>
                <button type="submit" disabled={saving} className="btn-primary justify-center">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </form>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-6 sm:px-8">
              <div>
                <h2 className="text-xl font-bold text-ink-900">Support channel</h2>
                <p className="mt-1 text-sm text-slate-500">Chat with the JustDMs team when you need help.</p>
              </div>
            </div>
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <a
                href="https://wa.me/917799100870"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5 transition hover:border-emerald-300 hover:bg-emerald-100 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-bold text-slate-900">WhatsApp support</span>
                    <span className="mt-0.5 block text-sm text-slate-600">+91 77991 00870</span>
                  </span>
                </span>
                <span className="text-sm font-bold text-emerald-700">Start chat</span>
              </a>
            </div>
          </section>
          </>}
        </div>
      )}
    </AppLayout>
  );
}

function Field({ label, value, onChange, disabled = false, type = "text", placeholder, hint }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        className={`input h-12 text-base ${disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
      {hint && <span className="mt-2 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
