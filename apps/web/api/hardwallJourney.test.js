import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test, { afterEach } from "node:test";
import webCheckout from "./checkout.js";
import study from "./study.js";
import payCheckout from "../../pay/api/checkout.js";

/** In-process, cross-service E2E. Paddle, Account and entitlement DB are mocked;
 * production payment, devices and Neon are NOT exercised here.
 */
const vars = {
  INSTANTSTUDY_HARD_PAYWALL_ENABLED: "true",
  INSTANTSTUDY_BFF_SIGNING_SECRET: "local-e2e-only-secret-not-a-production-key-64-chars-00000000",
  INSTANTSTUDY_API_URL: "https://study-api.test",
  INSTANTSTUDY_API_KEY: "local-e2e-bff-token",
  INSTANT_PAY_URL: "https://pay-api.test",
  INSTANT_ACCOUNT_INTROSPECTION_URL: "https://auth-api.test/introspect",
  PADDLE_API_KEY: "local-sandbox-mock",
  PADDLE_HOSTED_CHECKOUT_URL: "https://checkout.test/checkout",
  PADDLE_PRICE_INSTANT_STUDY_PLUS_ANNUAL: "pri_12345678901234567890",
  PADDLE_ENV: "sandbox",
};
const snapshot = Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]]));
const originalFetch = globalThis.fetch;
afterEach(()=>{
  for(const [k,v] of Object.entries(snapshot))
    if(v===undefined)delete process.env[k]; else process.env[k]=v;
  globalThis.fetch=originalFetch;
});
function collector() {
  return { code: 0, data: null, headers: {},
    status(v){this.code=v;return this;},
    setHeader(k,v){this.headers[k]=v;return this;},
    end(text){this.data=JSON.parse(text);return this;} };
}
function jsonResult(code,data) {
  return {status:code,ok:code>=200&&code<300,json:async()=>data};
}
function req(body,token="") {
  return {method:"POST",headers:token?{"content-type":"application/json",authorization:"Bearer "+token}:{"content-type":"application/json"},body};
}
const identity = {learnerId:"user-e2e-123",accountUserId:"user-e2e-123",accountAccessToken:"mock-valid-user-token"};
const studyBody = {...identity,action:"prepare",contentText:"Photosynthesis converts sunlight to chemical energy in chloroplasts.",title:"Biology",mode:"learn"};
test("E2E Hardwall: no account -> denied; checkout binds account; paid study -> allowed; cancellation/expiry -> denied",async()=>{
  Object.assign(process.env,vars);
  let phase="unpaid";
  let transaction=null;
  let upstreamCalls=0;
  globalThis.fetch=async(url,options={})=>{
    const address=new URL(String(url));
    if(address.hostname==="auth-api.test") {
      assert.equal(options.headers.authorization,"Bearer "+identity.accountAccessToken);
      return jsonResult(200,{user_id:identity.accountUserId,email:"student@example.test"});
    }
    if(address.hostname==="pay-api.test"&&address.pathname==="/api/checkout") {
      const result=collector();
      await payCheckout({
        method:"POST",
        headers:{"content-type":"application/json",authorization:options.headers.authorization},
        body:JSON.parse(options.body),
      },result);
      return jsonResult(result.code,result.data);
    }
    if(address.hostname==="sandbox-api.paddle.com"&&address.pathname==="/transactions") {
      transaction=JSON.parse(options.body);
      return jsonResult(200,{data:{id:"txn_mock_completed"}});
    }
    if(address.hostname==="pay-api.test"&&address.pathname==="/v1/billing/entitlements") {
      assert.equal(address.searchParams.get("user_id"),identity.accountUserId);
      assert.equal(options.headers.authorization,"Bearer "+identity.accountAccessToken);
      const item = phase==="unpaid" ? [] : [{
        key:"instant_study.plus",active:true,
        status: phase==="canceled"?"canceled":"active",
        expires_at:phase==="expired"?"2020-01-01T00:00:00Z":"2099-01-01T00:00:00Z",
      }];
      return jsonResult(200,{entitlements:item});
    }
    if(address.hostname==="study-api.test"&&address.pathname==="/api/v1/study/prepare") {
      upstreamCalls++;
      const stamp=options.headers["x-instantstudy-timestamp"];
      const proof=options.headers["x-instantstudy-signature"];
      const signed=createHmac("sha256",vars.INSTANTSTUDY_BFF_SIGNING_SECRET)
        .update(stamp+"\nPOST\n"+address.pathname+"\n"+options.body).digest("hex");
      assert.equal(proof,signed);
      const payload=JSON.parse(options.body);
      assert.equal(payload.learnerId,identity.accountUserId);
      assert.equal(payload.billingPlan,"plus");
      return jsonResult(200,{studySessionId:"session-mock",mode:"learn",next:{question:{prompt:"Recall photosynthesis"}}});
    }
    if (address.hostname==="study-api.test" &&
      ["/api/v1/study/evaluate","/api/v1/study/next","/api/v1/study/finish","/api/v1/ask","/api/v1/materials/duplicate"].includes(address.pathname)) {
      upstreamCalls++;
      const stamp=options.headers["x-instantstudy-timestamp"];
      const proof=options.headers["x-instantstudy-signature"];
      const signed=createHmac("sha256",vars.INSTANTSTUDY_BFF_SIGNING_SECRET)
        .update([stamp,"POST",address.pathname,options.body].join(String.fromCharCode(10))).digest("hex");
      assert.equal(proof,signed);
      const payload=JSON.parse(options.body);
      if (address.pathname!=="/api/v1/ask") assert.equal(payload.learnerId,identity.accountUserId);
      if (address.pathname==="/api/v1/ask") return jsonResult(200,{answer:"Chloroplasts capture light energy."});
      if (address.pathname==="/api/v1/materials/duplicate") {
        assert.equal(payload.id,"2eacde46-050a-4546-8e80-e69826667210");
        return jsonResult(200,{material:{id:"new-copy",title:"Biology (copy)"}});
      }
      if (address.pathname==="/api/v1/study/evaluate") return jsonResult(200,{grade:{feedback:"Correct"},next:null});
      if (address.pathname==="/api/v1/study/finish") return jsonResult(200,{completed:true});
      return jsonResult(200,{done:false,question:{prompt:"Next question"}});
    }
    throw Error("Unexpected test URL: "+url);
  };
  let response=collector();
  await study(req({action:"prepare",contentText:studyBody.contentText}),response);
  assert.equal(response.code,401);
  assert.equal(upstreamCalls,0);

  response=collector();
  await study(req(studyBody),response);
  assert.equal(response.code,402);
  assert.equal(upstreamCalls,0);

  response=collector();
  await webCheckout(req({offer:"instant_study_plus_annual",accountUserId:identity.accountUserId},identity.accountAccessToken),response);
  assert.equal(response.code,200);
  assert.match(response.data.checkout_url,/transaction_id=txn_mock_completed/);
  assert.equal(transaction.custom_data.user_ref,identity.accountUserId);
  assert.equal(upstreamCalls,0);

  // Simulate a provider-verified subscription event applied to the entitlement DB.
  phase="active";
  response=collector();
  await study(req(studyBody),response);
  assert.equal(response.code,200);
  assert.equal(response.data.studySessionId,"session-mock");
  assert.equal(upstreamCalls,1);

  // Every paid follow-up still traverses entitlement checks and a signed BFF.
  for (const payload of [
    {...identity,action:"answer",studySessionId:"session-mock",conceptId:"concept-mock",userAnswer:"chloroplast"},
    {...identity,action:"next",studySessionId:"session-mock"},
    {...identity,action:"finish",studySessionId:"session-mock"},
    {...identity,action:"ask",contentText:studyBody.contentText,question:"Where is light captured?"},
    {...identity,action:"material_duplicate",materialId:"2eacde46-050a-4546-8e80-e69826667210"},
  ]) {
    response=collector();
    await study(req(payload),response);
    assert.equal(response.code,200);
  }
  assert.equal(upstreamCalls,6);

  // Unpaid or spoofed identities cannot duplicate someone else's material.
  response=collector();
  await study(req({...identity,accountUserId:"different-account",action:"material_duplicate",
    materialId:"2eacde46-050a-4546-8e80-e69826667210"}),response);
  assert.equal(response.code,401);
  assert.equal(upstreamCalls,6);

  phase="canceled";
  response=collector();
  await study(req(studyBody),response);
  assert.equal(response.code,402);
  assert.equal(upstreamCalls,6);

  phase="expired";
  response=collector();
  await study(req(studyBody),response);
  assert.equal(response.code,402);
  assert.equal(upstreamCalls,6);
});
