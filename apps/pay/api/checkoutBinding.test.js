import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import handler from "./checkout.js";

const names = ["INSTANT_ACCOUNT_INTROSPECTION_URL","PADDLE_API_KEY",
  "PADDLE_HOSTED_CHECKOUT_URL","PADDLE_PRICE_INSTANT_STUDY_PLUS_ANNUAL","PADDLE_ENV"];
const env = Object.fromEntries(names.map(k => [k, process.env[k]]));
const originalFetch = globalThis.fetch;
afterEach(() => {
  for (const key of names) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  globalThis.fetch = originalFetch;
});
function res() { return { code: 0, headers: {}, body: null,
  status(n) { this.code=n;return this; },
  setHeader(k,v) { this.headers[k]=v;return this; },
  end(t) { this.body=JSON.parse(t);return this; } }; }
function setup() {
  process.env.INSTANT_ACCOUNT_INTROSPECTION_URL="https://account.test/introspect";
  process.env.PADDLE_API_KEY="sandbox-key";
  process.env.PADDLE_ENV="sandbox";
  process.env.PADDLE_HOSTED_CHECKOUT_URL="https://checkout.test/checkout";
  process.env.PADDLE_PRICE_INSTANT_STUDY_PLUS_ANNUAL="pri_12345678901234567890";
}
const request={
  method:"POST",
  headers:{"content-type":"application/json"},
  body:{offer:"instant_study_plus_annual",source:"instant_study",accountUserId:"learner-123"},
};
test("Hardwall: checkout without account cannot create a Paddle transaction",async()=>{
  setup();let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error("unexpected");};
  const response=res();
  await handler(request,response);
  assert.equal(response.code,401);
  assert.equal(response.body.error,"account_required");
  assert.equal(calls,0);
});
test("Hardwall: verified account is included in Paddle transaction",async()=>{
  setup();let transaction;
  globalThis.fetch=async(url,opts)=>{
    if(url.includes("/introspect")) {
      assert.equal(opts.headers.authorization,"Bearer valid-student-token");
      return {ok:true,json:async()=>({user_id:"learner-123",email:"student@example.test"})};
    }
    if(url.endsWith("/transactions")){
      transaction=JSON.parse(opts.body);
      return {ok:true,json:async()=>({data:{id:"txn_local_e2e"}})};
    }
    throw Error("unexpected URL "+url);
  };
  const response=res();
  await handler({...request,headers:{...request.headers,authorization:"Bearer valid-student-token"}},response);
  assert.equal(response.code,200);
  assert.match(response.body.checkout_url,/transaction_id=txn_local_e2e/);
  assert.equal(transaction.custom_data.user_ref,"learner-123");
  assert.equal(transaction.custom_data.entitlement_key,"instant_study.plus");
  assert.equal(transaction.collection_mode,"automatic");
});
test("Hardwall: forged identity fails before Paddle is contacted",async()=>{
  setup();let paddleCalls=0;
  globalThis.fetch=async(url)=>{
    if(url.includes("/introspect"))return {ok:true,json:async()=>({user_id:"different-learner"})};
    paddleCalls++;throw Error("never");
  };
  const response=res();
  await handler({...request,headers:{...request.headers,authorization:"Bearer valid-student-token"}},response);
  assert.equal(response.code,403);
  assert.equal(response.body.error,"identity_mismatch");
  assert.equal(paddleCalls,0);
});
test("Hardwall: identity provider missing fails closed",async()=>{
  setup();delete process.env.INSTANT_ACCOUNT_INTROSPECTION_URL;
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error("never");};
  const response=res();
  await handler({...request,headers:{...request.headers,authorization:"Bearer valid-student-token"}},response);
  assert.equal(response.code,503);
  assert.equal(calls,0);
});
