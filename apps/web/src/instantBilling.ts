export type InstantBillingSession = Readonly<{
  userId: string;
  accessToken: string;
  email?: string;
}>;

type CheckoutInput = Readonly<{
  productId: string;
  entitlementKey: string;
  providerPriceId?: string;
  session: InstantBillingSession;
  metadata?: Record<string, unknown>;
}>;

function env(name: string) {
  return String((import.meta.env as Record<string, unknown>)[name] ?? '').trim();
}

export function instantBillingConfigured() {
  return Boolean(env('VITE_INSTANT_BILLING_API_URL'));
}

export function readInstantAccountSession(): InstantBillingSession | null {
  try {
    const raw = localStorage.getItem('instant.account.session');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InstantBillingSession>;
    if (!parsed.userId || !parsed.accessToken) return null;
    return {
      userId: String(parsed.userId),
      accessToken: String(parsed.accessToken),
      email: parsed.email ? String(parsed.email) : undefined,
    };
  } catch {
    return null;
  }
}

async function request(path: string, session: InstantBillingSession, init?: RequestInit) {
  const base = env('VITE_INSTANT_BILLING_API_URL').replace(/\/$/, '');
  if (!base) throw new Error('instant_billing_not_configured');

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`instant_billing_http_${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function createInstantCheckout(input: CheckoutInput) {
  const data = await request('/v1/billing/checkout-sessions', input.session, {
    method: 'POST',
    body: JSON.stringify({
      user: {
        id: input.session.userId,
        email: input.session.email,
      },
      product: {
        id: input.productId,
        entitlement_key: input.entitlementKey,
        provider_price_id: input.providerPriceId || undefined,
        metadata: input.metadata ?? {},
      },
    }),
  });

  const url = String(data.checkout_url ?? '');
  if (!url) throw new Error('instant_billing_missing_checkout_url');
  return url;
}

export async function hasInstantEntitlement(
  entitlementKey: string,
  session = readInstantAccountSession(),
) {
  if (!session) return false;
  const data = await request(
    `/v1/billing/entitlements?user_id=${encodeURIComponent(session.userId)}`,
    session,
  );
  const entitlements = Array.isArray(data.entitlements) ? data.entitlements : [];
  return entitlements.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return record.key === entitlementKey && record.active === true;
  });
}

export async function openInstantStudyCheckout(plan: 'plus' | 'unlimited', annual: boolean) {
  const session = readInstantAccountSession();
  if (!session || !instantBillingConfigured()) return false;

  const suffix = annual ? 'annual' : 'monthly';
  const productId = plan === 'plus'
    ? `instant_study_plus_${suffix}`
    : `instant_study_unlimited_${suffix}`;
  const entitlementKey = plan === 'plus'
    ? 'instant_study.plus'
    : 'instant_study.unlimited';

  const envKey = plan === 'plus'
    ? (annual ? 'VITE_INSTANT_STUDY_PLUS_ANNUAL_PRICE_ID' : 'VITE_INSTANT_STUDY_PLUS_MONTHLY_PRICE_ID')
    : (annual ? 'VITE_INSTANT_STUDY_UNLIMITED_ANNUAL_PRICE_ID' : 'VITE_INSTANT_STUDY_UNLIMITED_MONTHLY_PRICE_ID');

  const url = await createInstantCheckout({
    productId,
    entitlementKey,
    providerPriceId: env(envKey) || undefined,
    session,
    metadata: { app: 'instant_study', plan, interval: suffix },
  });

  window.location.assign(url);
  return true;
}
