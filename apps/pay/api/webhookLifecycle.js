/**
 * Idempotent Paddle lifecycle, independent of the database transport.
 * A delivery counts as applied only after its material effects succeed.
 * A later retry can recover interrupted processing; a still-running claim
 * receives a retriable response, never an incorrect 200 acknowledgement.
 */
export async function applyVerifiedPaddleEvent(event, actions) {
  const eventId = String(event?.event_id || "");
  const eventType = String(event?.event_type || "");
  if (!eventId || !eventType) throw new Error("invalid_event");

  const claim = await actions.claim({
    eventId, eventType, occurredAt: event.occurred_at || null, payload: event,
  });
  if (!claim.claimed) {
    if (claim.state === "applied") return { duplicate: true };
    throw new Error("event_in_progress_retry");
  }

  try {
    const data = event.data || {};
    const occurredAt = event.occurred_at || null;
    if (eventType === "transaction.completed") {
      // A transaction is not evidence of an active recurring entitlement.
    } else if (["subscription.created", "subscription.activated", "subscription.trialing"].includes(eventType)) {
      const applied = await actions.provision(data, occurredAt);
      if (!applied) {
        const updated = await actions.update({
          subscriptionId: data.id,
          active: true,
          status: String(data.status || "active"),
          expiresAt: actions.expiration(data),
          occurredAt,
        });
        if (!updated) throw new Error("unmatched_subscription_event");
      }
    } else if ([
      "subscription.updated", "subscription.paused", "subscription.resumed",
      "subscription.canceled", "subscription.past_due",
    ].includes(eventType)) {
      const status = String(data.status || eventType.split(".")[1] || "unknown");
      const updated = await actions.update({
        subscriptionId: data.id,
        active: actions.activeSubscription(status),
        status,
        expiresAt: actions.expiration(data),
        occurredAt,
      });
      if (!updated && !(await actions.provision(data, occurredAt))) {
        // Fail and retry instead of silently dropping a cancellation.
        throw new Error("unmatched_subscription_event");
      }
    }
    await actions.applied(eventId, claim.claimToken);
    return { duplicate: false };
  } catch (error) {
    try { await actions.failed(eventId, claim.claimToken); } catch {
      // The lease will expire, allowing a later recovery.
    }
    throw error;
  }
}
