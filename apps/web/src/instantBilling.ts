export type InstantBillingSession = Readonly<{
  userId: string;
  accessToken: string;
  email?: string;
}>;

function env(name: string) {
  return String((import.meta.env as Record<string, unknown>)[name] ?? '').trim();
}

function payBaseUrl() {
  return (env('VITE_INSTANT_PAY_URL') || 'https://instant-pay-gamma.vercel.app').replace(/\/$/, '');
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
  entitlementKey: string,
  session = readInstantAccountSession(),
) {
  if (!session) return false;

  try {
    const response = await fetch(
      `${payBaseUrl()}/v1/billing/entitlements?user_id=${encodeURIComponent(session.userId)}`,
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${session.accessToken}`,
        },
      },
    );
    if (!response.ok) return false;
    const data = (await response.json()) as { entitlements?: Array<{ key?: string; active?: boolean }> };
    return Array.isArray(data.entitlements) &&
      data.entitlements.some(item => item?.key === entitlementKey && item?.active === true);
  } catch {
    return false;
  }
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
