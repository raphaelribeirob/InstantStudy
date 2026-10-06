import {
  isSameProductOffer,
  offerDefinition,
} from "./_catalog.js";

const ADAPTY_API = "https://api.adapty.io";

const placementEnvByProduct = {
  instant_speak: "ADAPTY_PLACEMENT_INSTANT_SPEAK",
  instant_study: "ADAPTY_PLACEMENT_INSTANT_STUDY",
  instant_bible: "ADAPTY_PLACEMENT_INSTANT_BIBLE",
  instant_vest: "ADAPTY_PLACEMENT_INSTANT_VEST",
  instant_closer: "ADAPTY_PLACEMENT_INSTANT_CLOSER",
  dotspeak: "ADAPTY_PLACEMENT_DOTSPEAK",
  instant_one: "ADAPTY_PLACEMENT_INSTANT_ONE",
};

export function cleanCustomerUserId(value) {
  const id = String(value || "").trim();
  return /^[a-zA-Z0-9._:-]{8,128}$/.test(id) ? id : "";
}

export function cleanOpaqueId(value) {
  const id = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{8,96}$/.test(id) ? id : "";
}

export function cleanLocale(value) {
  const locale = String(value || "").slice(0, 16);
  return /^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?$/.test(locale)
    ? locale
    : "en";
}

export function placementForProduct(product) {
  const envKey = placementEnvByProduct[String(product || "")];
  const productPlacement = envKey
    ? String(process.env[envKey] || "").trim()
    : "";
  return productPlacement || String(process.env.ADAPTY_PLACEMENT_ID || "").trim();
}

function profileHeaders(secretKey, customerUserId) {
  return {
    Authorization: `Api-Key ${secretKey}`,
    "Content-Type": "application/json",
    "adapty-customer-user-id": customerUserId,
    "adapty-platform": "web",
  };
}

async function ensureProfile({ secretKey, customerUserId, locale, store }) {
  const headers = profileHeaders(secretKey, customerUserId);
  const current = await fetch(
    `${ADAPTY_API}/api/v2/server-side-api/profile/`,
    { method: "GET", headers },
  );

  if (current.ok) return;
  if (current.status !== 404) {
    throw new Error(`adapty_profile_lookup_${current.status}`);
  }

  const created = await fetch(
    `${ADAPTY_API}/api/v2/server-side-api/profile/`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        store,
        analytics_disabled: false,
        installation_meta: {
          device_id: customerUserId,
          locale,
          platform: "web",
        },
      }),
    },
  );

  if (!created.ok) {
    throw new Error(`adapty_profile_create_${created.status}`);
  }
}

function parseRemoteConfig(value) {
  if (!value) return {};
  let raw = value;
  if (typeof value === "object" && typeof value.data === "string") {
    raw = value.data;
  }
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

function safeText(value, max) {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, max);
  return text || undefined;
}

export function safeRemoteConfig(baseOfferKey, remoteConfig) {
  const raw = parseRemoteConfig(remoteConfig);
  const requestedOffer = safeText(raw.offer_key, 80);
  const offerKey =
    requestedOffer && isSameProductOffer(baseOfferKey, requestedOffer)
      ? requestedOffer
      : baseOfferKey;

  return {
    offer_key: offerKey,
    eyebrow: safeText(raw.eyebrow, 48),
    title: safeText(raw.title, 120),
    description: safeText(raw.description, 240),
    cta: safeText(raw.cta, 72),
  };
}

export function adaptyConfig(baseOfferKey) {
  const offer = offerDefinition(baseOfferKey);
  if (!offer) return null;

  const publicApiKey = String(process.env.ADAPTY_PUBLIC_API_KEY || "").trim();
  const secretApiKey = String(process.env.ADAPTY_SECRET_API_KEY || "").trim();
  const store = String(process.env.ADAPTY_STORE || "").trim();
  const placementId = placementForProduct(offer.product);

  if (!publicApiKey || !secretApiKey || !store || !placementId) return null;

  return { offer, publicApiKey, secretApiKey, store, placementId };
}

export async function getAdaptyPaywall({
  baseOfferKey,
  customerUserId,
  locale,
}) {
  const config = adaptyConfig(baseOfferKey);
  if (!config) return null;

  const safeCustomerId = cleanCustomerUserId(customerUserId);
  if (!safeCustomerId) return null;
  const safeLocale = cleanLocale(locale);

  await ensureProfile({
    secretKey: config.secretApiKey,
    customerUserId: safeCustomerId,
    locale: safeLocale,
    store: config.store,
  });

  const response = await fetch(
    `${ADAPTY_API}/api/v2/web-api/paywall/`,
    {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${config.publicApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        store: config.store,
        locale: safeLocale,
        placement_id: config.placementId,
        customer_user_id: safeCustomerId,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`adapty_paywall_${response.status}`);
  }

  const data = await response.json();
  const variationId = cleanOpaqueId(data?.variation_id);
  const paywallId = cleanOpaqueId(data?.paywall_id);
  if (!variationId || !paywallId) {
    throw new Error("adapty_paywall_invalid");
  }

  const visit = await fetch(
    `${ADAPTY_API}/api/v2/web-api/paywall/visit/`,
    {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${config.publicApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_user_id: safeCustomerId,
        visited_at: new Date().toISOString(),
        store: config.store,
        variation_id: variationId,
      }),
    },
  );

  if (!visit.ok) {
    throw new Error(`adapty_paywall_visit_${visit.status}`);
  }

  return {
    provider: "adapty",
    placement_id: config.placementId,
    variation_id: variationId,
    paywall_id: paywallId,
    paywall_name: safeText(data?.paywall_name, 120),
    ab_test_name: safeText(data?.ab_test_name, 120),
    ...safeRemoteConfig(baseOfferKey, data?.remote_config),
  };
}
