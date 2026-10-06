export type FunnelOffer = {
  headline: string;
  cta: string;
  annualPrice: string;
  monthlyPrice: string;
  trial: string;
  checkoutUrl?: string;
  variationId?: string;
};

const FALLBACK_OFFER: FunnelOffer = {
  headline: "Make every study session remember what came before.",
  cta: "Start 7-day free trial",
  annualPrice: "$39.99 / year",
  monthlyPrice: "$6.99 / month",
  trial: "7 days free",
};

function customerId() {
  const key = "instantstudy_customer_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

function remoteData(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const config = input as Record<string, unknown>;
  const data = config.data;
  return data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : {};
}

function textValue(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function loadOffer(locale: string): Promise<FunnelOffer> {
  const base = import.meta.env.VITE_INSTANTSTUDY_API_URL as string | undefined;
  const apiKey = import.meta.env.VITE_INSTANTSTUDY_API_KEY as string | undefined;

  if (!base || !apiKey) return FALLBACK_OFFER;

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/offer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId: customerId(),
        locale,
      }),
    });

    if (!response.ok) return FALLBACK_OFFER;

    const payload = (await response.json()) as Record<string, unknown>;
    const data = remoteData(payload.remoteConfig);

    return {
      headline: textValue(data, "headline") ?? FALLBACK_OFFER.headline,
      cta: textValue(data, "cta") ?? FALLBACK_OFFER.cta,
      annualPrice:
        textValue(data, "annual_price") ?? FALLBACK_OFFER.annualPrice,
      monthlyPrice:
        textValue(data, "monthly_price") ?? FALLBACK_OFFER.monthlyPrice,
      trial: textValue(data, "trial") ?? FALLBACK_OFFER.trial,
      checkoutUrl: textValue(data, "checkout_url"),
      variationId:
        typeof payload.variationId === "string"
          ? payload.variationId
          : undefined,
    };
  } catch {
    return FALLBACK_OFFER;
  }
}
