# Admin complimentary Pro grants

Apply `backend/migrations/20261030_admin_pro_grants.sql` before deploying the backend and frontend. This creates a service-role-only transactional RPC and an RLS-protected audit table. It does not change existing subscriptions. No anon/authenticated policies should be added to the audit table or RPC.

In Admin overview, open a registered user, choose **Grant 1 month Pro**, review their email and expected expiry, then confirm. A month starts from the latest of now, current complimentary access, and the active paid access expiry. Calendar month arithmetic clamps dates such as January 31 to February's last day. Paid access without an expiry cannot be extended by this operation.

The server checks its existing confirmed-admin allowlist and resolves the target email through Supabase Auth. The browser cannot choose an email, admin identity, duration, or billing status. The RPC changes only complimentary expiry (or inserts an inactive complimentary subscription when none exists). Charges, renewal, subscription identifiers and existing plan fields are unchanged.

A per-user transaction lock serializes grants. The request UUID makes retries idempotent, including retries after reopening the drawer in the same browser session. One successful grant disables further grants in that drawer; closing and reopening allows an intentional additional month.

Audit records in `admin_pro_grants` include administrator and recipient identities, request ID, prior access boundary, new expiry, and timestamp. Failed transactions roll back both the grant and audit insert.

Validation before release: backend tests, frontend build, then test the migration/RPC in a disposable database with existing paid/free accounts, duplicate request IDs, concurrent requests, and rollback on audit failure. No real customer grant should be used as a deployment smoke test.

Deployment validation (30 October 2026): migration applied to production. A transaction using a synthetic Auth user passed free grant, duplicate UUID retry, paid extension, billing preservation, and anon/authenticated privilege checks, then rolled back all test records. No customer grant was issued.
