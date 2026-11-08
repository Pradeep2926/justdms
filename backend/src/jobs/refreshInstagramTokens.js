// Runs separately from the HTTP server. Defaults to read-only dry-run.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { runWithMonitoring } = require('../services/tokenRefreshRun.service');
const { runTokenRefresh } = require('../services/instagramTokenRefresh.service');
async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--apply','--dry-run'].includes(arg) && !arg.startsWith('--account='))) throw new Error('Use --dry-run or --apply, optionally --account=<uuid>.');
  if (args.includes('--apply') && args.includes('--dry-run')) throw new Error('Choose one mode.');
  const accountArgs = args.filter(arg => arg.startsWith('--account='));
  const accountId = accountArgs[0]?.slice(10);
  if (accountArgs.length > 1 || (accountArgs.length && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId))) throw new Error('Invalid account UUID.');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.BACKEND_STORAGE === 'local') throw new Error('Explicit Supabase service configuration is required; local JSON storage is never used.');
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const apply = args.includes('--apply');
  if (apply && process.env.INSTAGRAM_TOKEN_REFRESH_ENABLED !== 'true') throw new Error('Apply disabled.');
  const run = () => runTokenRefresh({ db, http: axios, apply, enabled: process.env.INSTAGRAM_TOKEN_REFRESH_ENABLED === 'true', accountId });
  const result = apply ? await runWithMonitoring({ db, run }) : await run();
  console.log(JSON.stringify(result));
  if (result.failed) process.exitCode = 1;
}
main().catch(() => { console.error('Instagram token refresh job failed. Check configuration, database migration and job status. Credentials and provider payloads are intentionally omitted.'); process.exitCode = 1; });
