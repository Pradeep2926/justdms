import { useEffect, useState } from "react";
import { CheckCircle2, Info, Mail, Pencil, Phone, Save, Settings as SettingsIcon } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export default function Settings() {
  const { user, loading: authLoading } = useAuth({ redirectOnFail: true });
  const [profile, setProfile] = useState({ firstName: "", lastName: "", mobile: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSupport, setEditingSupport] = useState(false);
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
                <p className="mt-1 text-sm text-slate-500">How JustDMs can contact you about your workspace.</p>
              </div>
              <button type="button" onClick={() => setEditingSupport((current) => !current)} className="btn-secondary py-2.5 text-sm">
                <Pencil className="h-4 w-4" />
                {editingSupport ? "Done" : "Edit"}
              </button>
            </div>
            <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
              <ContactRow icon={Mail} label="Support email" value={user?.email || "Not available"} />
              <ContactRow icon={Phone} label="Support phone number" value={profile.mobile || "Not added"} />
              {editingSupport && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  Edit your support contact details in General settings above, then save changes.
                </div>
              )}
            </div>
          </section>
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

function ContactRow({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-600">{label}</p>
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-700">
        <Icon className="h-5 w-5 text-slate-400" />
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
