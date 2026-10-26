import { useEffect, useRef, useSyncExternalStore } from "react";
import { AlertCircle } from "lucide-react";

let queue = [];
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => queue[0] || null;
function enqueue(message, confirmation) {
  return new Promise(resolve => {
    queue = [...queue, { message: String(message), confirmation, resolve }];
    listeners.forEach(listener => listener());
  });
}
export const showMessage = message => enqueue(message, false);
export const confirmAction = message => enqueue(message, true);

export default function AppDialog() {
  const current = useSyncExternalStore(subscribe, snapshot, () => null);
  const dialog = useRef(null);
  const finish = accepted => {
    const item = queue[0];
    queue = queue.slice(1);
    item?.resolve(accepted);
    listeners.forEach(listener => listener());
  };
  useEffect(() => {
    if (!current) return;
    const previous = document.activeElement;
    const modal = dialog.current;
    modal.showModal();
    return () => { modal.close(); previous?.focus?.(); };
  }, [current]);
  if (!current) return null;
  const destructive = /delete|cancel renewal/i.test(current.message);
  return <dialog ref={dialog} aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message" onCancel={event => { event.preventDefault(); finish(false); }} className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45">
    <div className="p-6 sm:p-7">
      <span className={`mb-4 inline-flex rounded-xl p-3 ${destructive ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600"}`}><AlertCircle className="h-6 w-6" /></span>
      <h2 id="app-dialog-title" className="text-xl font-bold">{current.confirmation ? destructive ? "Confirm your action" : "Please confirm" : "Something needs your attention"}</h2>
      <p id="app-dialog-message" className="mt-3 break-words text-sm leading-6 text-slate-600">{current.message}</p>
      <div className="mt-6 flex justify-end gap-3">
        {current.confirmation && <button autoFocus type="button" onClick={() => finish(false)} className="min-h-11 rounded-lg border border-slate-200 px-5 text-sm font-semibold hover:bg-slate-50">{/cancel renewal/i.test(current.message) ? "Keep renewal" : "Cancel"}</button>}
        <button autoFocus={!current.confirmation} type="button" onClick={() => finish(true)} className={`min-h-11 rounded-lg px-5 text-sm font-semibold text-white ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"}`}>{current.confirmation ? /delete/i.test(current.message) ? "Delete" : "Confirm" : "Got it"}</button>
      </div>
    </div>
  </dialog>;
}
