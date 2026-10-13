import assert from "node:assert/strict";
import test from "node:test";
import { EntitlementService, MemoryEntitlementStore, UsageLimitError } from "./entitlements.js";
import { indexedProgressRows } from "./studyPersistence.js";
import type { AdaptiveStudySession, ConceptState } from "./studyEngine.js";

test("50 concurrent Learn admissions on Plus consume exactly 20 rounds",async()=>{
  const service=new EntitlementService(new MemoryEntitlementStore());
  await service.setPlan("load-test-learner","plus");
  const results=await Promise.allSettled(Array.from({length:50},()=>service.consume("load-test-learner","learn")));
  assert.equal(results.filter(x=>x.status==="fulfilled").length,20);
  assert.equal(results.filter(x=>x.status==="rejected"&&x.reason instanceof UsageLimitError).length,30);
  assert.equal((await service.getStatus("load-test-learner")).learnRounds,20);
});
test("50 concurrent Test admissions on Plus consume exactly 3 tests",async()=>{
  const service=new EntitlementService(new MemoryEntitlementStore());
  await service.setPlan("learner-test","plus");
  const results=await Promise.allSettled(Array.from({length:50},()=>service.consume("learner-test","test")));
  assert.equal(results.filter(x=>x.status==="fulfilled").length,3);
  assert.equal((await service.getStatus("learner-test")).practiceTests,3);
});
function concept(label:string,lastSeenAt?:string,nextReviewAt?:string):ConceptState {
  return {id:label,label,sourceExcerpt:"Source",mastery:0.7,attempts:1,correct:1,partial:0,incorrect:0,
    difficulty:0.5,stabilityDays:1,missingConcepts:[],lastSeenAt,nextReviewAt};
}
test("indexed due projection rejects unattempted concepts and deduplicates concept keys",()=>{
  const old="2026-10-10T00:00:00.000Z",latest="2026-10-12T00:00:00.000Z";
  const session={concepts:[
    concept("Photosynthesis"),
    concept("Photosynthesis",old,"2026-10-20T00:00:00.000Z"),
    concept(" photosynthesis ",latest,"2026-10-13T00:00:00.000Z"),
    concept("Mitochondria",old,"2026-10-13T00:00:00.000Z"),
  ]} as AdaptiveStudySession;
  const rows=indexedProgressRows(session);
  assert.equal(rows.length,2);
  assert.equal(rows.find(x=>x.concept_key==="photosynthesis")?.last_seen_at,latest);
});
