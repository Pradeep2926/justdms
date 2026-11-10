# One-time verified-signup welcome email

Release status (10 November 2026): welcome queue migration installed after transactional validation; code prepared for deployment. No email-provider setup, webhook or schedule is enabled. No email has been sent. Production Render environment has no RESEND_API_KEY, WELCOME_EMAIL_FROM, WELCOME_EMAIL_ENABLED or WELCOME_EMAIL_WEBHOOK_SECRET configured. Existing booking email code uses Resend; this feature uses the same provider without changing booking emails.

Sender selected by user: `JustDMs <support@justdms.in>`; reply-to `support@justdms.in`.

## Content

Personalized greeting; two free active automations; no payment/card requirement; Professional Instagram (Business or Creator) prerequisite; official Instagram login; direct links to `/connect-meta` and `/automation`. The message explains the configured click/follow steps rather than promising instant link delivery for every comment. No unsupported referral/conversion analytics claims are included. HTML and plain text are provided. Rendered names are escaped and capped at 100 characters.

## Trigger and duplicate prevention

`20261110_welcome_emails.sql` creates a private outbox keyed by Auth user ID. An AFTER INSERT/first email-confirmation UPDATE trigger queues only verified users, including auto-confirmed Google identities. Existing verified users are not backfilled or bulk emailed. Email verification happens before the welcome message, so its “account ready” statement does not conflict with confirmation requirements.

The trigger catches enqueue failures so email infrastructure cannot prevent account creation/verification. Such failures need investigation via database logs; delivery is not guaranteed if the queue itself is unavailable.

The preferred trigger is a Supabase Database Webhook on INSERT into `public.welcome_emails`, pointing at `https://api.justdms.in/onboarding/welcome-hook` with `Authorization: Bearer <WELCOME_EMAIL_WEBHOOK_SECRET>`. The receiver validates that secret and event shape, then loads recipient/name exclusively from the database. Never configure a webhook containing Auth-user rows or credentials. A signed-in verified user's `/onboarding/welcome` request is a fallback that dispatches only their own queued record; the request cannot select the recipient. Repeated useAuth mounts are coalesced and do not block login.

The queue is service-role-only and uses a row-locked five-minute lease. Successful provider acceptance is recorded as `sent` with a message ID (this means provider accepted, not necessarily inbox delivery). Resend receives a stable `Idempotency-Key` for the same user/template, protecting uncertain network retries for 24 hours. Automated retries stop at 23 hours after first attempt or 10 attempts and mark `review`, rather than risking a duplicate after the provider key expires. Permanent provider errors also require review. Do not reset uncertain records to pending blindly. Avoid changing the sender/template while uncertain attempts are pending: provider idempotency also expects matching request bodies.

Optional retry worker: `npm run emails:welcome -- --dry-run` lists bounded aggregate counts only; `--apply` processes up to 50 due records with backoff. Nothing is scheduled automatically. Recommended production retry interval: every 5 minutes using an external scheduler; database webhook is primary. Frontend-only fallback cannot guarantee dispatch if a verified user never opens the app. This welcome worker is independent of the parked Instagram token scheduler.

## Activation checklist

1. Verify `justdms.in` with Resend (DNS/SPF/DKIM as required) and establish the selected sender. Configure backend secrets `RESEND_API_KEY`, `WELCOME_EMAIL_FROM=JustDMs <support@justdms.in>`, and a strong `WELCOME_EMAIL_WEBHOOK_SECRET`. Do not expose them in frontend variables.
2. Validate the migration transactionally with synthetic Auth users: unverified registration does not queue, first verification queues once, repeated updates do not requeue, Google-style verified insert queues, and anon/authenticated roles have no table/RPC access. Roll back fixtures. Then apply migration before deploying the feature.
3. Deploy backend then frontend, initially keeping `WELCOME_EMAIL_ENABLED` unset/false. Install the database webhook and optional retry worker. Do not enable without sender verification and credentials.
4. Set `WELCOME_EMAIL_ENABLED=true` and test with an explicitly selected internal email. Verify receipt and queue status; verify repeat callbacks/logins send only once. Do not backfill existing accounts or send test mail to customers.
5. Enable for subsequent verified signups. Monitor queue `retry`/`review` rows and Resend delivery/bounce events. Decide whether to dispatch new queue rows created while disabled or review them before activation.

The user authorized the one-time onboarding email. This is not a marketing-drip subscription. No contact-list upload, backfill campaign, deployment or real-send test was performed in this local implementation.

## Validation

133 backend tests pass (including local-only early token-trial tests already in this workspace). Welcome-specific tests cover escaping, accurate flow copy, disabled configuration, rejected duplicate claims, trusted recipient routing, stable provider idempotency, safe failure handling, auth verification and webhook rejection. Frontend production build passes. PostgreSQL trigger and claim integration checks passed using rolled-back synthetic Auth users: unverified signup exclusion, first confirmation enqueue, Google-style verified insert, individualized name snapshot, duplicate update suppression, lease exclusion, sent-record exclusion, late-retry review and backend-only privileges. The installed queue had zero entries; existing users were not backfilled. Real provider delivery remains pending until activation.

References:
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://supabase.com/docs/guides/database/webhooks
