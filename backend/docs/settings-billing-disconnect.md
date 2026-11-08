# Settings billing and Instagram disconnect

Deployment order: apply `backend/migrations/20261031_disconnect_instagram.sql` using the database owner. The function is executable only by the backend service role. Deploy backend before frontend.

Settings Billing reads the latest 100 Razorpay invoices for the saved current subscription, resolved from the verified login email. Previous replaced subscription IDs are not currently retained in a payment history table. Free/complimentary users have no invoices. An invoice lookup failure is shown as an error, not an empty history.

Disconnect verifies the session using Supabase Auth and delegates ownership verification, automation pause, and credential clearing to a single SQL transaction. The connected row, cached media, automations and interactions are retained. Reconnecting restores account access; the user must reactivate paused automations. Disconnect does not revoke the app in Meta settings. A profile sync uses a token comparison when saving, preventing an earlier sync from restoring disconnected credentials/status.

Automatic subscription reminders are removed from the dashboard, including the pre-connection onboarding state. The landing-page paid offer banner is removed; introductory pricing remains in the Pro pricing card and checkout. Landing and Instagram connection copy explain the two free active automations and no-payment requirement.

The third-active-automation limit still opens the compact offer popup, using selected INR/USD currency and eligible UPI/card offers, then opens Razorpay directly. Explicit Upgrade actions remain available. The backend still enforces the two-active-automation limit. Closing the popup preserves the current page and builder state. Razorpay opens outside the native dialog; the native top layer is released during checkout and restored on dismissal.

Validation: production frontend build, backend suite (102 tests, including invoice isolation, disconnect identity/error handling, and direct checkout verification/dismissal), desktop/mobile component preview. No live customer was disconnected and no payment was submitted. Database integration checks passed on 31 October 2026 using temporary records inside a rolled-back transaction: ownership rejection, repeated disconnect, pause count, saved automation preservation, credential clearing, stale sync token comparison, reconnect leaving automations paused, and RPC execution privileges. The function was then installed with backend-only execution permission. No customer account was changed by validation.
