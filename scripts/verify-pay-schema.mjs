#!/usr/bin/env node
/** READ-ONLY schema check for the independent InstantPay Neon project.
 * DATABASE_URL must be provided securely and point to the intended PAY DB.
 */
import { neon } from "@neondatabase/serverless";
const url=process.env.DATABASE_URL?.trim();
if(!url){console.error("InstantPay schema check: DATABASE_URL missing");process.exit(2);}
try {
  const sql=neon(url);
  const [r]=await sql`
    SELECT to_regclass('public.billing_events')::text AS events,
           to_regclass('public.billing_entitlements')::text AS entitlements,
           to_regclass('public.billing_family_members')::text AS family,
           EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='billing_events'
             AND column_name='processing_status') AS status_col,
           EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='billing_events'
             AND column_name='claim_token') AS claim_col,
           EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='billing_entitlements'
             AND column_name='provider_occurred_at') AS ordering_col
  `;
  const ready=Boolean(r.events&&r.entitlements&&r.family&&r.status_col&&r.claim_col&&r.ordering_col);
  console.log(JSON.stringify({service:"instantpay",schemaReady:ready,
    inboxReady:Boolean(r.status_col&&r.claim_col),
    orderingReady:Boolean(r.ordering_col)}));
  if(!ready)process.exitCode=1;
}catch{console.error("InstantPay schema check failed");process.exitCode=1;}
