import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import test, { afterEach } from "node:test";
import { verifySpeakCheckoutIntent, trustedSpeakCustomData, notifyInstantSpeak } from "./_speak-bridge.js";

const key = "instantpay-local-bridge-test-secret-1234567890";
afterEach(() => {
  delete process.env.INSTANT_PAY_BRIDGE_SECRET;
  delete process.env.INSTANT_SPEAK_BILLING_WEBHOOK_URL;
});
function signed(offer="instant_speak_pro_monthly", overrides={}) {
  const now=Date.now();
  const claim={v:1,source:"instant_speak",offer,uid:"neon:12345678-1234-1234-1234-123456789012",
    iat:now,exp:now+300000,nonce:randomUUID(),...overrides};
  const encoded=Buffer.from(JSON.stringify(claim)).toString("base64url");
  return encoded+"."+createHmac("sha256",key).update(encoded).digest("hex");
}
test("checkout intent is bound to account, offer, expiry and HMAC",()=>{
  process.env.INSTANT_PAY_BRIDGE_SECRET=key;
  const token=signed();
  assert.equal(verifySpeakCheckoutIntent(token,"instant_speak_pro_monthly")?.uid,"neon:12345678-1234-1234-1234-123456789012");
  assert.equal(verifySpeakCheckoutIntent(token,"instant_speak_pro_annual"),null);
  assert.equal(verifySpeakCheckoutIntent(signed("instant_speak_pro_monthly",{exp:Date.now()-1}),"instant_speak_pro_monthly"),null);
  assert.equal(verifySpeakCheckoutIntent(token.replace(/.$/,"0"),"instant_speak_pro_monthly"),null);
  assert.equal(verifySpeakCheckoutIntent(signed("instant_speak_pro_monthly",{uid:"guest:evil"}),"instant_speak_pro_monthly"),null);
});
test("never authorize transaction subject from unsourced custom_data",()=>{
  const fields={product_key:"instant_speak",source_app:"instant_speak",
    subject_verified:"instant_speak_bridge_v1",
    offer_key:"instant_speak_pro_monthly",
    user_ref:"neon:12345678-1234-1234-1234-123456789012"};
  assert.equal(trustedSpeakCustomData(fields),true);
  assert.equal(trustedSpeakCustomData({...fields,subject_verified:""}),false);
  assert.equal(trustedSpeakCustomData({...fields,user_ref:"guest:somebody"}),false);
});
test("verified subscription forwarded in signed canonical envelope; errors retry",async()=>{
  process.env.INSTANT_PAY_BRIDGE_SECRET=key;
  process.env.INSTANT_SPEAK_BILLING_WEBHOOK_URL="https://speak.example/api/config?action=billing-webhook";
  const event={event_id:"evt_12345678901234567890123456",event_type:"subscription.updated",
    occurred_at:new Date().toISOString(),data:{id:"sub_12345678901234567890123456",status:"active",
    custom_data:{product_key:"instant_speak",source_app:"instant_speak",subject_verified:"instant_speak_bridge_v1",
      offer_key:"instant_speak_pro_monthly",user_ref:"neon:12345678-1234-1234-1234-123456789012"}}};
  const seen=[];
  await notifyInstantSpeak(event,{fetchImpl:async(url,opt)=>{seen.push({url,opt});return {ok:true}}});
  assert.equal(seen.length,1);
  const encoded=JSON.parse(seen[0].opt.body).payload;
  const stamp=seen[0].opt.headers["x-instant-pay-timestamp"];
  assert.equal(seen[0].opt.headers["x-instant-pay-signature"],
    createHmac("sha256",key).update(stamp+":"+encoded).digest("hex"));
  assert.equal(JSON.parse(Buffer.from(encoded,"base64url").toString()).data.id,event.data.id);
  await assert.rejects(()=>notifyInstantSpeak(event,{fetchImpl:async()=>({ok:false})}),/callback_failed/);
});
