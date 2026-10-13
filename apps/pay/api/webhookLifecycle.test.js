import test from "node:test";
import assert from "node:assert/strict";
import { applyVerifiedPaddleEvent } from "./webhookLifecycle.js";

const event=(type="subscription.canceled")=>({
  event_id:"evt-123",
  event_type:type,
  occurred_at:"2026-10-12T10:00:00Z",
  data:{id:"sub-123",status:"canceled"},
});
function mock() {
  let state="pending",failUpdate=false,provisionResult=false;
  const calls=[];
  return {
    calls,
    setFailUpdate(value) { failUpdate=value; },
    setProvision(value) { provisionResult=value; },
    async claim() {
      calls.push("claim");
      if(state==="applied")return {claimed:false,state};
      if(state==="processing")return {claimed:false,state};
      state="processing";return {claimed:true,claimToken:"test-token"};
    },
    async update(x){calls.push(["update",x]);
      if(failUpdate)throw Error("transient_failure");
      return true;
    },
    async provision(){calls.push("provision");return provisionResult;},
    async applied(){calls.push("applied");state="applied";return true;},
    async failed(){calls.push("failed");state="failed";},
    expiration:()=>null,
    activeSubscription: status => ["active","trialing"].includes(status),
  };
}
test("Paddle: event isn't acknowledged until entitlement update succeeds", async()=>{
  const db=mock();db.setFailUpdate(true);
  await assert.rejects(applyVerifiedPaddleEvent(event(),db),/transient_failure/);
  assert.deepEqual(db.calls.map(x=>Array.isArray(x)?x[0]:x),["claim","update","failed"]);
  db.setFailUpdate(false);
  assert.deepEqual(await applyVerifiedPaddleEvent(event(),db),{duplicate:false});
  assert.equal(db.calls.at(-1),"applied");
  assert.deepEqual(await applyVerifiedPaddleEvent(event(),db),{duplicate:true});
});
test("Paddle: in-progress duplicate must remain retriable", async()=>{
  const db=mock();await db.claim();
  await assert.rejects(applyVerifiedPaddleEvent(event(),db),/event_in_progress_retry/);
});
test("Paddle: unbound cancellation is retriable, never silently dropped", async()=>{
  const db=mock();db.update=async()=>false;
  await assert.rejects(applyVerifiedPaddleEvent(event(),db),/unmatched_subscription_event/);
  assert.equal(db.calls.at(-1),"failed");
});
test("Paddle: completed transaction alone doesn't grant a subscription",async()=>{
  const db=mock();
  assert.deepEqual(await applyVerifiedPaddleEvent(event("transaction.completed"),db),{duplicate:false});
  assert.equal(db.calls.some(x=>Array.isArray(x)&&x[0]==="update"),false);
});
