import {
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
} from "jose";

export type PluginPrincipal = {
  learnerId: string;
  subject: string;
};

export type OAuthConfig = {
  issuer: string;
  resource: string;
  jwksUrl: string;
  learnerClaim: string;
};

type Environment = Record<string, string | undefined>;
type JwksResolver = ReturnType<typeof createRemoteJWKSet> | ReturnType<typeof createLocalJWKSet>;

const requiredScopes = ["study:read", "study:write"] as const;
const remoteJwks = new Map<string, JwksResolver>();

function canonicalHttps(value: string | undefined, trailingSlash = false): string | null {
  try {
    if (!value) return null;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.search || url.hash || (url.port && url.port !== "443")) {
      return null;
    }
    const pathname = url.pathname.replace(/\/+$/, "");
    return url.origin + pathname + (trailingSlash ? "/" : "");
  } catch {
    return null;
  }
}

export function oauthConfig(env: Environment = process.env): OAuthConfig | null {
  // Auth0 signs access tokens with an issuer ending in "/". JWT issuer
  // validation is an exact string comparison; stripping that slash breaks login.
  const issuer = canonicalHttps(env.INSTANTSTUDY_OAUTH_ISSUER, true);
  const resource = canonicalHttps(env.INSTANTSTUDY_OAUTH_RESOURCE);
  const jwksUrl = canonicalHttps(env.INSTANTSTUDY_OAUTH_JWKS_URL);
  const learnerClaim = env.INSTANTSTUDY_OAUTH_LEARNER_CLAIM ||
    (resource ? resource + "/learner_id" : undefined);
  if (!issuer || !resource || !jwksUrl ||
      !learnerClaim || !canonicalHttps(learnerClaim) ||
      !learnerClaim.includes("/learner_id")) return null;
  return { issuer, resource, jwksUrl, learnerClaim };
}

export function protectedResourceMetadata(config: OAuthConfig) {
  return {
    resource: config.resource,
    authorization_servers: [config.issuer],
    scopes_supported: [...requiredScopes],
  };
}

export function oauthChallenge(config: OAuthConfig) {
  const resourceMetadata = new URL("/.well-known/oauth-protected-resource", config.resource);
  return 'Bearer resource_metadata="' + resourceMetadata.toString() +
    '", scope="study:read study:write", error="invalid_token",' +
    ' error_description="Valid InstantStudy account authorization required"';
}

export function resolveLearnerId(
  requested: string | undefined,
  principal?: PluginPrincipal,
): string | undefined {
  if (!principal) return requested;
  if (requested && requested !== principal.learnerId) {
    throw new Error("Learner does not belong to the authenticated account.");
  }
  return principal.learnerId;
}

export function assertPaidPlan(plan: string) {
  if (plan !== "plus" && plan !== "unlimited") {
    throw new Error("A valid existing InstantStudy subscription is required.");
  }
}

function keySet(config: OAuthConfig): JwksResolver {
  const cached = remoteJwks.get(config.jwksUrl);
  if (cached) return cached;
  const resolver = createRemoteJWKSet(new URL(config.jwksUrl), {
    timeoutDuration: 5000,
    cooldownDuration: 30000,
  });
  remoteJwks.set(config.jwksUrl, resolver);
  return resolver;
}

export async function verifyOauthBearer(
  authorization: string | undefined,
  config: OAuthConfig,
  jwks: JwksResolver = keySet(config),
): Promise<PluginPrincipal> {
  const match = /^Bearer\s+([^\s]+)$/.exec(authorization ?? "");
  if (!match) throw new Error("missing_token");

  const { payload } = await jwtVerify(match[1], jwks, {
    issuer: config.issuer,
    audience: config.resource,
    algorithms: ["RS256", "ES256", "EdDSA"],
    clockTolerance: "5s",
  });

  // jose validates exp and nbf when present; require expiry explicitly so
  // a signed token without exp cannot become a permanent account credential.
  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp) ||
      typeof payload.iat !== "number" || !Number.isFinite(payload.iat) ||
      payload.exp <= payload.iat) {
    throw new Error("invalid_token_lifetime");
  }

  const scopes = typeof payload.scope === "string"
    ? payload.scope.split(/\s+/)
    : Array.isArray(payload.scp) ? payload.scp : [];
  if (!requiredScopes.every((scope) => scopes.includes(scope))) {
    throw new Error("insufficient_scope");
  }

  // This signed private claim MUST be minted by the trusted authorization server
  // from the canonical InstantStudy/InstantPay account, never from a model parameter.
  const learnerId = payload[config.learnerClaim];
  if (
    !payload.sub ||
    typeof learnerId !== "string" ||
    !/^[A-Za-z0-9:_-]{3,200}$/.test(learnerId)
  ) {
    throw new Error("missing_account_binding");
  }

  return { learnerId, subject: payload.sub };
}
