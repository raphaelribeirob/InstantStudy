export type AdaptyStore =
  | "stripe"
  | "app_store"
  | "play_store"
  | "paddle"
  | string;

export type AdaptyOffer = {
  provider: "adapty";
  placementId: string;
  variationId: string;
  paywallId: string;
  paywallName: string;
  abTestName?: string;
  store: string;
  products: Array<{
    title?: string;
    adaptyProductId?: string;
    vendorProductId: string;
    offer?: unknown;
  }>;
  remoteConfig?: unknown;
};

type Config = {
  publicApiKey?: string;
  secretApiKey?: string;
  placementId?: string;
  store?: AdaptyStore;
};

export class AdaptyClient {
  constructor(private readonly config: Config) {}

  get enabled() {
    return Boolean(this.config.publicApiKey && this.config.placementId);
  }

  async ensureProfile(customerUserId: string, locale = "en") {
    if (!this.config.secretApiKey) return;

    const headers = {
      Authorization: `Api-Key ${this.config.secretApiKey}`,
      "Content-Type": "application/json",
      "adapty-customer-user-id": customerUserId,
      "adapty-platform": "web",
    };

    const current = await fetch(
      "https://api.adapty.io/api/v2/server-side-api/profile/",
      { method: "GET", headers },
    );

    if (current.ok) return;
    if (current.status !== 404) {
      throw new Error(
        `Adapty profile lookup failed: ${current.status} ${await current.text()}`,
      );
    }

    const created = await fetch(
      "https://api.adapty.io/api/v2/server-side-api/profile/",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          store: this.config.store ?? "stripe",
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
      throw new Error(
        `Adapty profile creation failed: ${created.status} ${await created.text()}`,
      );
    }
  }

  async getOffer(
    customerUserId: string,
    locale = "en",
  ): Promise<AdaptyOffer> {
    if (!this.enabled) {
      throw new Error(
        "Adapty is not configured. Set ADAPTY_PUBLIC_API_KEY and ADAPTY_PLACEMENT_ID.",
      );
    }

    await this.ensureProfile(customerUserId, locale);

    const store = this.config.store ?? "stripe";
    const response = await fetch(
      "https://api.adapty.io/api/v2/web-api/paywall/",
      {
        method: "POST",
        headers: {
          Authorization: `Api-Key ${this.config.publicApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store,
          locale,
          placement_id: this.config.placementId,
          customer_user_id: customerUserId,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Adapty paywall lookup failed: ${response.status} ${await response.text()}`,
      );
    }

    const data = (await response.json()) as Record<string, any>;
    let remoteConfig: unknown = data.remote_config;

    if (
      data.remote_config &&
      typeof data.remote_config.data === "string"
    ) {
      try {
        remoteConfig = {
          ...data.remote_config,
          data: JSON.parse(data.remote_config.data),
        };
      } catch {
        // Keep Adapty's original payload if custom JSON cannot be parsed.
      }
    }

    const offer: AdaptyOffer = {
      provider: "adapty",
      placementId: String(data.placement_id),
      variationId: String(data.variation_id),
      paywallId: String(data.paywall_id),
      paywallName: String(data.paywall_name),
      abTestName: data.ab_test_name
        ? String(data.ab_test_name)
        : undefined,
      store,
      products: Array.isArray(data.products)
        ? data.products.map((product: Record<string, any>) => ({
            title: product.title ? String(product.title) : undefined,
            adaptyProductId: product.adapty_product_id
              ? String(product.adapty_product_id)
              : undefined,
            vendorProductId: String(product.vendor_product_id),
            offer: product.offer,
          }))
        : [],
      remoteConfig,
    };

    await this.recordView(customerUserId, offer.variationId, store);
    return offer;
  }

  private async recordView(
    customerUserId: string,
    variationId: string,
    store: string,
  ) {
    const response = await fetch(
      "https://api.adapty.io/api/v2/web-api/paywall/visit/",
      {
        method: "POST",
        headers: {
          Authorization: `Api-Key ${this.config.publicApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_user_id: customerUserId,
          visited_at: new Date().toISOString(),
          store,
          variation_id: variationId,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Adapty paywall view failed: ${response.status} ${await response.text()}`,
      );
    }
  }
}
