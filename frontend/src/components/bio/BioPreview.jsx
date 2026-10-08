import { ExternalLink, Share2, Sparkles } from "lucide-react";

export const BIO_THEMES = {
  justdms: { label: "JustDMs", page: "bg-gradient-to-br from-cyan-400 via-blue-600 to-violet-600 text-white", link: "bg-white/95 text-slate-900 shadow-lg" },
  midnight: { label: "Midnight", page: "bg-slate-950 text-white", link: "border border-slate-700 bg-slate-900 text-white" },
  sunrise: { label: "Sunrise", page: "bg-gradient-to-br from-rose-400 via-orange-400 to-amber-200 text-slate-950", link: "bg-white/90 text-slate-950 shadow-md" },
  minimal: { label: "Minimal", page: "bg-white text-slate-950", link: "border border-slate-300 bg-white text-slate-900" },
  forest: { label: "Forest", page: "bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-600 text-white", link: "bg-emerald-50 text-emerald-950 shadow-md" },
};

export default function BioPreview({ profile, links, interactive = false, apiBaseUrl = "", fullPage = false }) {
  const theme = BIO_THEMES[profile.theme] || BIO_THEMES.justdms;
  const sharePage = async () => {
    if (navigator.share) {
      await navigator.share({ title: profile.display_name || profile.username, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };
  return (
    <div className={`${fullPage ? "min-h-screen" : "min-h-full"} relative w-full ${theme.page}`}>
      {interactive && (
        <button type="button" onClick={sharePage} aria-label="Share this page" title="Share" className="fixed right-5 top-5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/30 sm:right-8 sm:top-7">
          <Share2 className="h-5 w-5" />
        </button>
      )}
      <div className={`mx-auto flex w-full max-w-[680px] flex-col items-center px-5 text-center sm:px-8 ${fullPage ? "min-h-screen py-16 sm:py-20" : "min-h-full py-10"}`}>
        {profile.profile_picture_url ? (
          <img src={profile.profile_picture_url} alt="" className="h-24 w-24 rounded-full border-4 border-white/70 object-cover shadow-xl" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/60 bg-white/20 text-3xl font-bold shadow-xl">
            {(profile.display_name || profile.username || "J").slice(0, 1).toUpperCase()}
          </div>
        )}
        <h1 className="mt-5 break-words text-2xl font-bold">{profile.display_name || "Your display name"}</h1>
        <p className="mt-1 text-sm opacity-75">@{profile.username || "username"}</p>
        {profile.description && <p className="mt-4 max-w-sm whitespace-pre-wrap text-sm leading-6 opacity-90">{profile.description}</p>}
        <div className="mt-8 w-full space-y-4">
          {links.filter((link) => link.is_active !== false).map((link) => {
            const href = interactive ? `${apiBaseUrl}/bio/r/${link.id}` : undefined;
            return (
              <a key={link.id} href={href} target={interactive ? "_blank" : undefined} rel="noreferrer" className={`flex min-h-16 w-full items-center justify-center gap-2 rounded-lg px-6 py-4 text-base font-bold transition ${theme.link} ${interactive ? "hover:-translate-y-0.5 hover:shadow-xl" : "pointer-events-none"}`}>
                <span className="min-w-0 break-words">{link.title}</span>
                {interactive && <ExternalLink className="h-4 w-4 shrink-0 opacity-60" />}
              </a>
            );
          })}
          {!links.some((link) => link.is_active !== false) && <p className="rounded-lg border border-dashed border-current/30 px-4 py-8 text-sm opacity-70">Your active links will appear here.</p>}
        </div>
        {interactive ? (
          <div className="mt-auto flex flex-col items-center gap-3 pt-12">
            <a href="https://justdms.in" className="text-xs font-semibold opacity-70 transition hover:opacity-100">
              Made with JustDMs
            </a>
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-bold shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-lg"
            >
              <Sparkles className="h-4 w-4" />
              Create yours for free
            </a>
          </div>
        ) : (
          <span className="mt-auto pt-12 text-xs font-semibold opacity-60">Made with JustDMs</span>
        )}
      </div>
    </div>
  );
}
