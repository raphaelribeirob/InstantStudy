export type InstantBillingSession = Readonly<{
  userId: string;
  accessToken: string;
  email?: string;
}>;

function env(name: string) {
  return String((import.meta.env as Record<string, unknown>)[name] ?? '').trim();
}

function payBaseUrl() {
  return (env('VITE_INSTANT_PAY_URL') || 'https://instant-pay.vercel.app').replace(/\/$/, '');
}

export function instantBillingConfigured() {
  return Boolean(payBaseUrl());
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

export async function hasInstantEntitlement(
  _entitlementKey: string,
  _session = readInstantAccountSession(),
) {
  // Entitlement verification remains server-owned. The public payment path is
  // intentionally decoupled from product-specific billing APIs.
  return false;
}

function offerFor(plan: 'plus' | 'unlimited', annual: boolean) {
  const suffix = annual ? 'annual' : 'monthly';
  return plan === 'plus'
    ? `instant_study_plus_${suffix}`
    : `instant_study_unlimited_${suffix}`;
}

export async function openInstantStudyCheckout(plan: 'plus' | 'unlimited', annual: boolean) {
  const url = new URL(payBaseUrl());
  url.searchParams.set('offer', offerFor(plan, annual));
  url.searchParams.set('source', 'instant_study');
  window.location.assign(url.toString());
  return true;
}
