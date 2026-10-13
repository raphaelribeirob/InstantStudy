import assert from "node:assert/strict";
import test from "node:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { accountId, configFromEnv, createAuthenticator, AuthUnavailableError } from "./auth.js";

const issuer = "https://test-tenant.auth0.com/";
const audience = "https://instant-cloud.example.com";
const env = { INSTANT_CLOUD_OAUTH_ISSUER: issuer, INSTANT_CLOUD_OAUTH_AUDIENCE: audience };

test("Fail closed on missing or malformed OAuth config", async () => {
  assert.equal(configFromEnv({}), null);
  assert.equal(configFromEnv({ ...env, INSTANT_CLOUD_OAUTH_ISSUER: "http://test.invalid/" }), null);
  assert.equal(configFromEnv({ ...env, INSTANT_CLOUD_OAUTH_ISSUER: "https://test-tenant.auth0.com" }), null);
  assert.deepEqual(configFromEnv(env), { issuer, audience });
  await assert.rejects(createAuthenticator({})("Bearer abc", "cloud:read"), AuthUnavailableError);
});

test("Same tenant/subject is the same Instant ID; different subjects and issuers are isolated", () => {
  assert.equal(accountId(issuer, "auth0|alice"), accountId(issuer, "auth0|alice"));
  assert.notEqual(accountId(issuer, "auth0|alice"), accountId(issuer, "auth0|bob"));
  assert.notEqual(accountId(issuer, "auth0|alice"), accountId("https://other.auth0.com/", "auth0|alice"));
  assert.match(accountId(issuer, "auth0|alice"), /^[a-f0-9]{64}$/);
  assert.throws(() => accountId(issuer, ""), /invalid_subject/);
});

test("Only valid, signed, audience-scoped, expiring access tokens authenticate", async () => {
  const pair = await generateKeyPair("RS256");
  const jwk = await exportJWK(pair.publicKey);
  jwk.kid = "test-key";
  const resolver = createLocalJWKSet({ keys: [jwk] });
  const authenticate = createAuthenticator(env, resolver);
  const token = async ({ scope = "cloud:read cloud:write", aud = audience, expire = true } = {}) => {
    let jwt = new SignJWT({ scope }).setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(issuer).setAudience(aud).setSubject("auth0|alice").setIssuedAt();
    if (expire) jwt = jwt.setExpirationTime("5m");
    return jwt.sign(pair.privateKey);
  };
  const valid = await token();
  const principal = await authenticate("Bearer " + valid, "cloud:write");
  assert.equal(principal.userId, accountId(issuer, "auth0|alice"));
  await assert.rejects(authenticate("Bearer " + await token({ scope: "cloud:read" }), "cloud:write"));
  await assert.rejects(authenticate("Bearer " + await token({ aud: "https://wrong.example" }), "cloud:read"));
  await assert.rejects(authenticate("Bearer " + await token({ expire: false }), "cloud:read"));
  await assert.rejects(authenticate("", "cloud:read"));
});
