# Admin overview

The read-only admin page is available at `/admin`. It lists registered users
(including users who have not connected Instagram), paid/referral Pro access,
saved subscription status and end dates, created automations, recent delivery
activity, and Instagram token expiry warnings.

## Deployment

Set this server-side environment variable on the deployed backend:

```env
ADMIN_EMAILS=pradeep.apps07@gmail.com
```

Restart/redeploy the backend and deploy the frontend. Sign into JustDMs with
that verified email. The sidebar will display **Admin overview**. Add further
admins only by updating the server variable (comma-separated emails).

The backend must use Supabase storage, with `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` configured. Do not use `BACKEND_STORAGE=local`
for the live admin overview. No RLS changes or public database grants are needed.
The admin route does not accept local-development user headers as authentication.

## Meaning of the numbers

- New users: registered in the last rolling seven days.
- Legacy data without a matching registered login is labeled separately in the
  users table and does not increase the registered-user count.
- Pro: the same entitlement rules used by the existing app, with paid and
  referral access distinguished. Billing status comes from the saved subscription
  record, not a fresh Razorpay query.
- Activity: resource-send and failure events from the last rolling 48 hours.
  Current interaction states cover rows updated during that window. Repeat
  failures and recovered attempts remain visible as historical failure events.
- Token status: derived from stored expiry/status, with a 14-day warning.
  An unexpired token has not necessarily been validated by Meta. A profile sync
  timestamp is not a token refresh timestamp. No token refresh or send is triggered
  by opening this page.
- The page is read-only. It cannot modify subscriptions, user accounts, tokens,
  or automations. Token values and billing credentials are never returned.

## Verification

Run backend tests and the frontend production build. After deployment, verify
that signed-out callers receive 401, ordinary users receive 403, and the configured
admin can open `/admin` and inspect a user. The response uses `Cache-Control:
no-store`; backend snapshots are reused for up to 30 seconds to limit database load.

## Responsive interface

The overview uses user cards on phones/tablets and a table on larger desktops.
Summary cards filter the user list. Dedicated filters cover new, paid Pro, free,
active automation, token warning, and automation failure records. User details
open in an accessible modal side panel (full width on phones), with keyboard
focus contained inside, Escape to close, and background scrolling disabled.

Opening the admin overview or a user panel never renews a token or sends a DM.
