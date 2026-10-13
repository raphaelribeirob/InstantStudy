import assert from "node:assert/strict";
import test from "node:test";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import {
  assertPaidPlan,
  oauthConfig,
  oauthChallenge,
  protectedResourceMetadata,
  resolveLearnerId,
  verifyOauthBearer,
} from "./mcpOAuth.js";

const config = {
  issuer: "https://auth.instantstudy.example",
  resource: "https://instantstudy.example",
  jwksUrl: "https://auth.instantstudy.example/jwks",
};

test("OAuth configuration fails closed without a complete HTTPS issuer/resource/JWKS", () => {
  assert.equal(oauthConfig({}), null);
  assert.equal(oauthConfig({
    INSTANTSTUDY_OAUTH_ISSUER: "http://localhost",
    INSTANTSTUDY_OAUTH_RESOURCE: config.resource,
    INSTANTSTUDY_OAUTH_JWKS_URL: config.jwksUrl,
  }), null);
  assert.deepEqual(oauthConfig({
    INSTANTSTUDY_OAUTH_ISSUER: config.issuer,
    INSTANTSTUDY_OAUTH_RESOURCE: config.resource,
    INSTANTSTUDY_OAUTH_JWKS_URL: config.jwksUrl,
  }), config);
});

test("Protected-resource discovery advertises correct issuer and OAuth scopes", () => {
  assert.deepEqual(protectedResourceMetadata(config), {
    resource: config.resource,
    authorization_servers: [config.issuer],
    scopes_supported: ["study:read", "study:write"],
  });
  assert.match(oauthChallenge(config), /oauth-protected-resource/);
});

test("Requested learner IDs cannot override the signed account identity", () => {
  const principal = { learnerId: "account-A", subject: "user-A" };
  assert.equal(resolveLearnerId(undefined, principal), "account-A");
  assert.equal(resolveLearnerId("account-A", principal), "account-A");
  assert.throws(() => resolveLearnerId("account-B", principal), /does not belong/);
  assert.equal(resolveLearnerId("account-B"), "account-B");
  assert.throws(() => assertPaidPlan("free"), /subscription/);
  assert.doesNotThrow(() => assertPaidPlan("plus"));
});

test("JWT issuer, audience, scopes and canonical account binding are enforced", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "instantstudy-test";
  publicJwk.alg = "RS256";
  const jwks = createLocalJWKSet({ keys: [publicJwk] });

  const token = async (claims: Record<string, unknown>, aud = config.resource) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "instantstudy-test" })
      .setIssuer(config.issuer).setAudience(aud).setSubject("user-A")
      .setIssuedAt().setExpirationTime("5m")
      .sign(privateKey);

  const valid = await token({
    scope: "study:read study:write",
    instantstudy_learner_id: "account-A",
  });
  assert.deepEqual(await verifyOauthBearer("Bearer " + valid, config, jwks), {
    learnerId: "account-A",
    subject: "user-A",
  });
  await assert.rejects(
    verifyOauthBearer("Bearer " + await token({
      scope: "study:read", instantstudy_learner_id: "account-A",
    }), config, jwks),
    /insufficient_scope/,
  );
  await assert.rejects(
    verifyOauthBearer("Bearer " + await token({
      scope: "study:read study:write",
    }), config, jwks),
    /missing_account_binding/,
  );
  await assert.rejects(
    verifyOauthBearer("Bearer " + await token({
      scope: "study:read study:write", instantstudy_learner_id: "account-A",
    }, "https://different.example"), config, jwks),
  );
  await assert.rejects(verifyOauthBearer(undefined, config, jwks), /missing_token/);
});
