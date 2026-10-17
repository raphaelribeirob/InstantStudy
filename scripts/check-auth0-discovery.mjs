// Auth0 MCP configuration smoke check. Read-only; no credentials or registration.
const issuer = process.env.INSTANTSTUDY_OAUTH_ISSUER;
const resource = process.env.INSTANTSTUDY_OAUTH_RESOURCE;
const jwks = process.env.INSTANTSTUDY_OAUTH_JWKS_URL;

function requireHttps(value, label) {
  if (!value) throw Error(label + " is not configured");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw Error(label + " must be HTTPS with no embedded credentials");
  }
  return url;
}
async function getJson(url) {
  const signal = AbortSignal.timeout(10000);
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    signal,
    redirect: "error",
  });
  if (!res.ok) throw Error(url + " returned HTTP " + res.status);
  return res.json();
}

try {
  const issuerUrl = requireHttps(issuer, "INSTANTSTUDY_OAUTH_ISSUER");
  const resourceUrl = requireHttps(resource, "INSTANTSTUDY_OAUTH_RESOURCE");
  const jwksUrl = requireHttps(jwks, "INSTANTSTUDY_OAUTH_JWKS_URL");
  const issuerExact = issuerUrl.origin + issuerUrl.pathname;
  const configUrl = new URL(".well-known/openid-configuration", issuerExact);
  const config = await getJson(configUrl);

  const errors = [];
  const check = (ok, why) => { if (!ok) errors.push(why); };
  check(config.issuer === issuerExact, "OIDC discovery issuer != configured token issuer");
  check(new URL(config.authorization_endpoint || "https://invalid.local").protocol === "https:",
    "Missing HTTPS authorization endpoint");
  check(new URL(config.token_endpoint || "https://invalid.local").protocol === "https:",
    "Missing HTTPS token endpoint");
  check(config.jwks_uri === jwksUrl.href, "Provider JWKS URI mismatch");
  check((config.code_challenge_methods_supported || []).includes("S256"),
    "Auth server must advertise PKCE S256");
  check(typeof config.registration_endpoint === "string" &&
    new URL(config.registration_endpoint).protocol === "https:",
    "DCR registration endpoint missing; plugin currently uses mode=dcr");
  check((config.token_endpoint_auth_methods_supported || ["client_secret_basic"]).includes("none"),
    "DCR public-client token endpoint method none not advertised");
  const keys = await getJson(jwksUrl);
  check(Array.isArray(keys.keys) && keys.keys.some(x=>x.kty === "RSA" && x.use !== "enc"),
    "No RSA verification key in JWKS");
  const protectedResourceUrl = new URL("/.well-known/oauth-protected-resource", resourceUrl);
  const m = await getJson(protectedResourceUrl);
  check(m.resource === resourceUrl.href.replace(/\/$/, ""),
    "MCP protected resource audience mismatch");
  check((m.authorization_servers || []).includes(issuerExact),
    "MCP protected resource issuer mismatch");
  check(["study:read", "study:write"].every(x=>(m.scopes_supported||[]).includes(x)),
    "MCP study scopes missing");

  if (errors.length) {
    for(const error of errors) console.error("FAIL", error);
    process.exitCode = 1;
  } else {
    console.log("OAuth discovery and MCP protected-resource metadata passed.");
    console.log("Still REQUIRED: real ChatGPT login/PKCE, signed user account binding, paid entitlement, per-user E2E.");
  }
} catch(error) {
  console.error("FAIL", error instanceof Error ? error.message : String(error));
  process.exitCode=1;
}
