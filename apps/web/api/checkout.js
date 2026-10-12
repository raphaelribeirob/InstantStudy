/**
 * Secure same-origin checkout BFF. Never include account tokens in URLs.
 * Instant Pay independently introspects the Bearer before creating Paddle data.
 */
function json(res,status,body){res.status(status);res.setHeader("content-type","application/json; charset=utf-8");res.setHeader("cache-control","no-store");return res.end(JSON.stringify(body));}
const OFFERS=new Set(["instant_study_plus_monthly","instant_study_plus_annual","instant_study_unlimited_monthly","instant_study_unlimited_annual","instant_study_family_annual"]);
export default async function handler(req,res){
  if(req.method!=="POST")return json(res,405,{error:"method_not_allowed"});
  const body=req.body&&typeof req.body==="object"?req.body:{};
  if(!OFFERS.has(String(body.offer||"")))return json(res,400,{error:"offer_unavailable"});
  const id=String(body.accountUserId||"").trim();
  const token=String(req.headers?.authorization||"");
  if(!id||id.length>200||!/^Bearer [^\s]{10,4000}$/.test(token))return json(res,401,{error:"account_required"});
  const base=String(process.env.INSTANT_PAY_URL||"").trim().replace(/\/$/,"");
  if(!base.startsWith("https://"))return json(res,503,{error:"billing_not_configured"});
  try{
    const response=await fetch(base+"/api/checkout",{
      method:"POST",
      headers:{authorization:token,"content-type":"application/json"},
      body:JSON.stringify({offer:body.offer,source:"instant_study",accountUserId:id,locale:"en"}),
      signal:AbortSignal.timeout(15000),
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return json(res,response.status>=500?503:response.status,{error:String(data.error||"checkout_unavailable")});
    const url=String(data.checkout_url||"");
    if(!url.startsWith("https://"))return json(res,502,{error:"checkout_url_invalid"});
    return json(res,200,{checkout_url:url});
  }catch{return json(res,503,{error:"billing_unavailable"});}
}
