/**
 * Hard-paywall acceptance guard. A response must match the *current*
 * authenticated account and the latest access check; IDs alone are not
 * credentials and an earlier successful response cannot regrant access.
 */
export type PaywallSession = Readonly<{ userId: string; accessToken: string }> | null;
export type PaywallAccess = Readonly<{
  enabled: boolean;
  authorized: boolean;
  plan?: "plus" | "unlimited" | null;
}>;

export function canGrantPaidStudy(
  access: PaywallAccess,
  sessionAtRequest: PaywallSession,
  currentSession: PaywallSession,
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId === latestRequestId &&
    Boolean(sessionAtRequest?.userId && sessionAtRequest?.accessToken) &&
    sessionAtRequest?.userId === currentSession?.userId &&
    sessionAtRequest?.accessToken === currentSession?.accessToken &&
    access.enabled === true &&
    access.authorized === true &&
    (access.plan === "plus" || access.plan === "unlimited");
}

export function matchesCurrentPaywallRequest(
  sessionAtRequest: PaywallSession,
  currentSession: PaywallSession,
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId === latestRequestId &&
    sessionAtRequest?.userId === currentSession?.userId &&
    sessionAtRequest?.accessToken === currentSession?.accessToken;
}
