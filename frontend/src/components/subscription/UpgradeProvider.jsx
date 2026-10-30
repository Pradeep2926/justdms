import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, X } from "lucide-react";
import ReminderOfferDialog from "./ReminderOfferDialog";
import Billing from "../../pages/Billing";
import { UpgradeContext } from "./UpgradeContext";

export default function UpgradeProvider({ children }) {
  const [reason, setReason] = useState(null);
  const actions = useMemo(() => ({ openUpgrade: (next = "manual") => setReason(next), closeUpgrade: () => setReason(null) }), []);
  return <UpgradeContext.Provider value={actions}>
    {children}
    {["reminder", "limit"].includes(reason) ? <ReminderOfferDialog reason={reason} onClose={() => setReason(null)} /> : reason && <UpgradeDialog reason={reason} onClose={() => setReason(null)} />}
  </UpgradeContext.Provider>;
}
export function UpgradeDialog({ reason, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, []);
  const checkoutVisibility = visible => {
    // Razorpay mounts outside this dialog: release the native top layer during checkout.
    const dialog = ref.current;
    if (!dialog) return;
    if (visible) dialog.close();
    else if (!dialog.open && dialog.isConnected) dialog.showModal();
  };
  return <dialog ref={ref} aria-labelledby="upgrade-dialog-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}} className="m-auto max-h-[92dvh] w-[calc(100%_-_24px)] max-w-5xl overflow-y-auto rounded-2xl border border-white bg-slate-50 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm">
    <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><div><p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-600"><Crown className="h-3.5 w-3.5" />JustDMs Pro</p><h2 id="upgrade-dialog-title" className="text-lg font-semibold tracking-tight">{reason === "limit" ? "Keep creating with unlimited automations" : reason === "reminder" ? "Make more room for your next idea" : "Manage your subscription"}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{reason === "limit" ? "Your Free plan includes 2 active automations. Subscribe to Pro to create more, or pause an existing automation." : reason === "reminder" ? "You’re on the Free plan. Explore Pro when you’re ready to grow." : "Review your current plan and subscription options."}</p></div><button autoFocus type="button" aria-label="Close subscription options" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-5 w-5" /></button></header>
    <div className="p-4 sm:p-6">{children || <Billing embedded onSubscribed={onClose} onCheckoutVisibility={checkoutVisibility} />}<button type="button" onClick={onClose} className="mx-auto mt-3 block min-h-11 px-4 text-xs font-medium text-slate-500 hover:text-slate-800">{reason === "manual" ? "Close subscription options" : "Maybe later · Continue with Free"}</button></div>
  </dialog>;
}
