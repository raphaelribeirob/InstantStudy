/** Per-user authorization for persisted study sessions. No session ID is an access credential. */
export function ownsStudySession(
  session: { learnerId?: string } | null | undefined,
  learnerId: string | undefined,
  paidOnly: boolean,
): boolean {
  if (!paidOnly) return true;
  return Boolean(session && learnerId && learnerId.length >= 3 && session.learnerId === learnerId);
}
