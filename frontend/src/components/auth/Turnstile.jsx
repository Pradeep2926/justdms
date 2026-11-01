import { useEffect, useRef, useState } from "react";

// Public widget identifier; the secret lives only in Supabase Auth settings.
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAFuXL6iNSnN_E9oQ";
const enabled = Boolean(siteKey) && import.meta.env.VITE_USE_LOCAL_AUTH !== "true";
let scriptPromise;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => reject(new Error("Security check could not load. Please refresh and try again."));
      document.head.appendChild(script);
    }).catch(error => { scriptPromise = undefined; throw error; });
  }
  return scriptPromise;
}

export function useCaptcha() {
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  return {
    token, enabled, attempt, setToken,
    ready: !enabled || Boolean(token),
    reset() { setToken(""); setAttempt(value => value + 1); },
  };
}

export default function Turnstile({ captcha }) {
  const container = useRef(null);
  const [error, setError] = useState("");
  const { attempt, setToken } = captcha;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let widget;
    setError("");
    loadTurnstile().then(api => {
      if (cancelled) return;
      widget = api.render(container.current, {
        sitekey: siteKey, theme: "light", size: "flexible",
        callback: value => { setError(""); setToken(value); },
        "expired-callback": () => setToken(""),
        "error-callback": () => { setToken(""); setError("Security check failed. Please refresh and try again."); },
      });
    }).catch(err => { if (!cancelled) setError(err.message); });
    return () => {
      cancelled = true;
      if (widget !== undefined) window.turnstile?.remove(widget);
    };
  }, [attempt, setToken]);
  if (!enabled) return null;
  return <div className="my-3 text-left"><div ref={container} />{!captcha.ready && !error && <p role="status" className="mt-2 text-xs leading-5 text-slate-500">Complete the security check to continue.</p>}{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>;
}
