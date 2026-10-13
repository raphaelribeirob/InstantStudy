import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

export class AuthUnavailableError extends Error {
  constructor() { super("auth_not_configured"); }
}

export function configFromEnv(env = process.env) {
  const issuer = env.INSTANT_CLOUD_OAUTH_ISSUER;
  const audience = env.INSTANT_CLOUD_OAUTH_AUDIENCE;
  if (!issuer || !audience) return null;
  try {
    const a = new URL(issuer);
    const b = new URL(audience);
    if (a.protocol !== "https:" || b.protocol !== "https:" ||
        a.username || a.password || b.username || b.password ||
        a.search || a.hash || b.search || b.hash) return null;
    // Exact match to Auth0 JWT issuer including the terminal slash.
    if (!issuer.endsWith("/") || issuer !== a.toString()) return null;
    if (audience !== b.toString().replace(/\/$/, "")) return null;
    return { issuer, audience };
  } catch {
    return null;
  }
}

export function accountId(issuer, subject) {
  if (!issuer || typeof subject !== "string" || !subject.trim()) {
    throw new Error("invalid_subject");
  }
  // Stable pseudonymous account key: same Auth0 tenant/user across products;
  // never rely on an email or caller-supplied userId.
  return createHash("sha256").update(issuer).update("\0").update(subject).digest("hex");
}

export function createAuthenticator(env = process.env, resolver) {
  const config = configFromEnv(env);
  const jwks = config && (resolver || createRemoteJWKSet(
    new URL(".well-known/jwks.json", config.issuer),
    { timeoutDuration: 5000, cooldownDuration: 30000 },
  ));

  return async function authenticate(header, scope) {
    if (!config || !jwks) throw new AuthUnavailableError();
    const match = /^Bearer\s+([^\s]+)$/.exec(header || "");
    if (!match) throw new Error("missing_bearer_token");

    const { payload } = await jwtVerify(match[1], jwks, {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ["RS256"],
      clockTolerance: "5s",
    });
    if (typeof payload.exp !== "number" || typeof payload.iat !== "number" ||
        payload.exp <= payload.iat || !payload.sub) {
      throw new Error("invalid_token_lifetime_or_subject");
    }
    const granted = typeof payload.scope === "string" ? payload.scope.split(/\s+/) : [];
    if (!granted.includes(scope)) throw new Error("insufficient_scope");
    return { userId: accountId(config.issuer, payload.sub), subject: payload.sub };
  };
}
