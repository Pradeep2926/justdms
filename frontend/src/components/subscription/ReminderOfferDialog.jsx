import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Crown, Loader2, X } from "lucide-react";
import api from "../../api/api";
import { useAuth } from "../../hooks/useAuth";
import { openSubscriptionCheckout } from "../../lib/razorpayCheckout";
import "./offerDialog.css";

export default function ReminderOfferDialog({ onClose, onUpgrade, reason = "reminder", offer: sampleOffer }) {
  const dialogRef = useRef(null);
  const busyRef = useRef(false);
  const { user } = useAuth({ redirectOnFail: sampleOffer === undefined });
  const [details, setDetails] = useState(sampleOffer === undefined ? null : { foundingOffer: sampleOffer, checkoutCurrencies: { INR: true, USD: true } });
  const [loading, setLoading] = useState(sampleOffer === undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [method, setMethod] = useState("upi");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);
  useEffect(() => {
    if (sampleOffer !== undefined) return;
    let active = true;
    setLoading(true); setError("");
    api.get("/billing/subscription").then(({data}) => { if (active) setDetails(data); })
      .catch(() => { if (active) setError("Couldn’t load checkout. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sampleOffer, attempt]);
  const offer = details?.foundingOffer;
  const introductory = currency === "INR" && offer?.enabled && offer?.eligible && new Date(offer.expiresAt).getTime() > Date.now();
  const available = details?.checkoutCurrencies?.[currency] ?? (currency === "INR" && details?.checkoutConfigured);
  const visibility = visible => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (visible) dialog.close();
    else if (!dialog.open && dialog.isConnected) dialog.showModal();
  };
  const close = () => { if (!busyRef.current) onClose(); };
  const checkout = async () => {
    if (busyRef.current || loading || !available) return;
    if (sampleOffer !== undefined) { onUpgrade?.(); return; }
    if (!user) { setError("Please sign in again to subscribe."); return; }
    busyRef.current = true; setBusy(true); setError("");
    const finished = () => { busyRef.current = false; setBusy(false); };
    try {
      await openSubscriptionCheckout({ user, currency, billingCycle: "monthly", introductory, foundingOffer: offer, offerPaymentMethod: method,
        onVisibility: visibility,
        onVerified: () => { finished(); window.dispatchEvent(new Event("justdms:subscription-updated")); onClose(); },
        onError: err => setError(err.response?.data?.error || err.message || "Unable to open checkout."),
        onDismiss: finished,
      });
    } catch (err) { finished(); visibility(false); setError(err.response?.data?.error || err.message || "Unable to open checkout."); }
  };
  const amount = currency === "USD" ? "$4.99" : introductory ? "₹99" : "₹199";
  return <dialog ref={dialogRef} aria-labelledby="dashboard-offer-title" onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}} className="offer-dialog">
    <div className="offer-dialog-hero">
      <button autoFocus type="button" disabled={busy} onClick={close} aria-label="Close upgrade reminder" className="offer-dialog-close"><X size={18}/></button>
      <div className="offer-dialog-badge"><span><Crown size={18}/></span>{introductory ? "Limited-time offer" : "JustDMs Pro"}</div>
      <h2 id="dashboard-offer-title">Unlock more with<br/><span>JustDMs Pro.</span></h2>
      <p className="offer-dialog-description">{reason === "limit" ? "You’ve reached 2 active automations. Go Pro to create unlimited automations." : "Turn more comments into conversations. Let your next big idea grow."}</p>
      <div className="offer-dialog-price" aria-live="polite">{loading ? <span className="text-sm">Checking your offer…</span> : details ? <><strong>{amount}</strong><span>{introductory ? "first month" : "/ month"}</span>{introductory && <small>Save ₹100</small>}</> : <span className="text-sm">Checkout unavailable</span>}</div>
      <p className="offer-dialog-terms">{introductory ? "Then ₹199/month · Cancel renewal anytime" : "Monthly subscription · Cancel renewal anytime"}</p>
    </div>
    <div className="offer-dialog-body">
      <div className="offer-dialog-currencies" aria-label="Checkout currency">{["INR","USD"].map(value=><button key={value} type="button" aria-pressed={currency === value} disabled={busy} onClick={()=>{setCurrency(value);setError("");}}>{value === "INR" ? "₹ INR" : "$ USD"}</button>)}</div>
      <ul className="offer-dialog-features">{["Unlimited automations","Comment & keyword triggers","Follow prompts & link delivery","Link in Bio & bookings","Lead collection & analytics","WhatsApp support"].map(feature=><li key={feature}><Check size={14}/>{feature}</li>)}</ul>
      {introductory && <div className="offer-dialog-methods"><span>Pay with</span>{["upi","card"].map(value=><button key={value} type="button" aria-pressed={method === value} disabled={busy} onClick={()=>setMethod(value)}>{value === "upi" ? "UPI" : "Card"}</button>)}</div>}
      {error && <p role="alert" className="offer-dialog-error">{error} {!details && <button type="button" onClick={()=>setAttempt(n=>n+1)}>Retry</button>}</p>}
      {!loading && details && !available && <p className="offer-dialog-error">Checkout is unavailable for {currency}. Please try another currency.</p>}
      <button type="button" disabled={loading || busy || !available} onClick={checkout} className="offer-dialog-cta">{busy ? <><Loader2 className="animate-spin" size={16}/>Opening checkout…</> : <>Upgrade to Pro{!loading && details && ` · ${amount}`}<ArrowRight size={16}/></>}</button>
      <p className="offer-dialog-secure">Secure checkout with Razorpay{introductory ? " · First-month offer" : ""}</p>
      <button type="button" disabled={busy} onClick={close} className="offer-dialog-later">Maybe later</button>
    </div>
  </dialog>;
}
