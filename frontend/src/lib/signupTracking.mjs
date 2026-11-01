// Public identifier only. Set after the website dataset is created in Meta.
const pixelId = import.meta.env?.VITE_META_PIXEL_ID || "";
const intentKey = "justdms_signup_intent";
const maxAge = 24 * 60 * 60 * 1000;

export function isNewVerifiedSignup(user, intent, now = Date.now()) {
  const created = Date.parse(user?.created_at);
  return Boolean(user?.id && user.email_confirmed_at && intent &&
    Number.isFinite(created) && intent.startedAt <= now &&
    now - intent.startedAt <= maxAge && created >= intent.startedAt - 5000 &&
    (!intent.userId || intent.userId === user.id));
}

function emit(name, params = {}, eventId) {
  if (!/^\d+$/.test(pixelId)) return false;
  // Never load tracking on verification/reset URLs, which can contain credentials.
  if (!['/', '/register', '/login', '/dashboard'].includes(window.location.pathname) ||
      /(?:access_token|refresh_token|token_hash|code)=/i.test(window.location.href)) return false;
  if (!window.fbq) {
    const queue = function (...args) {
      if (queue.callMethod) queue.callMethod(...args);
      else queue.queue.push(args);
    };
    queue.queue = [];
    queue.push = queue;
    queue.loaded = true;
    queue.version = '2.0';
    window.fbq = queue;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
    queue('init', pixelId);
  }
  window.fbq(name === 'CompleteRegistration' || name === 'PageView' ? 'track' : 'trackCustom',
    name, params, eventId ? { eventID: eventId } : undefined);
  return true;
}

export function trackLandingView() {
  emit("PageView");
}

export function trackSignupView() {
  emit('PageView');
  emit('SignupView');
}

export function startSignupTracking(method) {
  try { localStorage.setItem(intentKey, JSON.stringify({ startedAt: Date.now(), method })); } catch { /* Storage may be blocked. */ }
  emit('SignupAttempt', { method });
}

export function rememberSignupUser(user) {
  try {
    const intent = JSON.parse(localStorage.getItem(intentKey) || 'null');
    if (intent && user?.id) localStorage.setItem(intentKey, JSON.stringify({ ...intent, userId: user.id }));
  } catch { /* Registration must work without analytics storage. */ }
}

export function trackVerifiedSignup(user) {
  try {
    const intent = JSON.parse(localStorage.getItem(intentKey) || 'null');
    const doneKey = `justdms_verified_signup:${user?.id}`;
    if (!isNewVerifiedSignup(user, intent) || localStorage.getItem(doneKey)) return;
    if (emit('CompleteRegistration', { status: true, content_name: 'JustDMs verified signup' }, `verified_signup_${user.id}`)) {
      localStorage.setItem(doneKey, '1');
      localStorage.removeItem(intentKey);
    }
  } catch { /* Tracking must never block authentication. */ }
}
