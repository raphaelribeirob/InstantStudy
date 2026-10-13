#!/usr/bin/env node
/** Offline-only migration/contract inventory. Cannot certify a live Neon DB. */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const read=p=>readFileSync(resolve(process.cwd(),p),"utf8");
const required=[
  "database/migrations/0001_instantstudy_core.sql",
  "database/migrations/0002_quizlet_offer_layer.sql",
  "database/migrations/0003_orbital_agents_and_quotas.sql",
  "database/migrations/0004_concept_progress.sql",
  "database/migrations/0005_flashcard_progress.sql",
  "apps/pay/migrations/0000_core_billing.sql",
  "apps/pay/migrations/20261012_billing_inbox.sql",
];
let failures=0;
for(const file of required){
  if(!existsSync(resolve(process.cwd(),file))){
    console.error("MISSING migration:",file);failures++;
  }
}
const guards=[
  ["atomic quota", "apps/mcp-server/src/entitlements.ts", ["ON CONFLICT (learner_id, period) DO UPDATE","instantstudy_usage.learn_rounds + 1","instantstudy_usage.practice_tests + 1"]],
  ["retryable webhook", "apps/pay/api/_db.js", ["claimEvent","markEventApplied","markEventFailed","claim_token","provider_occurred_at"]],
  ["verified handler", "apps/pay/api/webhook.js", ["applyVerifiedPaddleEvent","markEventApplied"]],
  ["study due index", "apps/mcp-server/src/studyPersistence.ts", ["INSTANTSTUDY_INDEXED_REVIEW_ENABLED","instantstudy_concept_progress","this.sql.transaction"]],
  ["indexed schema", "database/migrations/0004_concept_progress.sql", ["instantstudy_concept_due_idx","PRIMARY KEY (learner_id, concept_key)"]],
  ["billing migration", "apps/pay/migrations/20261012_billing_inbox.sql", ["processing_status","claim_token","provider_occurred_at"]],
  ["quota tests", "apps/mcp-server/src/neonScalability.test.ts", ["concurrent Learn admissions","indexed due projection"]],
  ["webhook replay tests", "apps/pay/api/webhookLifecycle.test.js", ["in-progress duplicate","event isn't acknowledged"]],
];
for(const [label,path,terms]of guards){
  if(!existsSync(resolve(process.cwd(),path))){console.error("MISSING",path);failures++;continue;}
  const content=read(path);
  for(const term of terms)if(!content.includes(term)){console.error("FAIL",label,path,term);failures++;}
}
if(failures){console.error("Neon-scale code audit FAILED with",failures,"issues");process.exitCode=1;}
else console.log("Neon-scale source, migration order and regression inventory OK; live migration/load acceptance pending.");
