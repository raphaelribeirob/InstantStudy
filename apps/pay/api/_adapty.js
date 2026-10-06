function configured() {
  return Boolean(
    String(process.env.ADAPTY_PUBLIC_API_KEY || "").trim() &&
    String(process.env.ADAPTY_PLACEMENT_ID || "").trim()
  );
}

function parseRemoteConfig(input) {
  if (!input) return {};
  const data = input && typeof input === "object" ? input.data : undefined;
  if (data && typeof data === "object") return data;
  if (typeof data !== "string") return {};
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function recordView(customerId, variationId, store) {
  const key = String(process.env.ADAPTY_PUBLIC_API_KEY || "").trim();
  if (!key || !variationId) return;

  const response = await fetch("https://api.adapty.io/api/v2/web-api/paywall/visit/", {
    method: "POST",
    headers: {
      authorization: `Api-Key ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      customer_user_id: customerId,
      visited_at: new Date().toISOString(),
      store,
      variation_id: variationId,
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    console.warn("Adapty paywall visit failed", response.status);
  }
}

export async function resolveAdaptyContext({ customerId, locale, requestedOffer }) {
  if (!configured() || !customerId) {
    return { offerKey: requestedOffer, provider: "catalog" };
  }

  const key = String(process.env.ADAPTY_PUBLIC_API_KEY || "").trim();
  const placementId = String(process.env.ADAPTY_PLACEMENT_ID || "instant_pay_main").trim();
  const store = String(process.env.ADAPTY_STORE || "paddle").trim();

  try {
    const response = await fetch("https://api.adapty.io/api/v2/web-api/paywall/", {
      method: "POST",
      headers: {
        authorization: `Api-Key ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        store,
        locale,
        placement_id: placementId,
        customer_user_id: customerId,
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      console.warn("Adapty paywall lookup failed", response.status);
      return { offerKey: requestedOffer, provider: "catalog" };
    }

    const data = await response.json();
    const remote = parseRemoteConfig(data?.remote_config);
    const candidate =
      typeof remote.offer_key === "string"
        ? remote.offer_key
        : typeof remote.selected_offer_key === "string"
          ? remote.selected_offer_key
          : requestedOffer;

    const variationId = data?.variation_id ? String(data.variation_id) : undefined;
    const paywallId = data?.paywall_id ? String(data.paywall_id) : undefined;
    await recordView(customerId, variationId, store);

    return {
      offerKey: candidate,
      provider: "adapty",
      variationId,
      paywallId,
      placementId,
    };
  } catch (error) {
    console.warn(
      "Adapty lookup unavailable",
      error instanceof Error ? error.message : "unknown",
    );
    return { offerKey: requestedOffer, provider: "catalog" };
  }
}
