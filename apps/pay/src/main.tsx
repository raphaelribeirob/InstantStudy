import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { defaultOffer, offerFor } from "./catalog";
import "./styles.css";

function currentOffer() {
  const params = new URLSearchParams(window.location.search);
  return offerFor(params.get("offer")) ?? defaultOffer;
}

function sourceApp() {
  const params = new URLSearchParams(window.location.search);
  const raw = String(params.get("source") || "").toLowerCase();
  return /^[a-z0-9_-]{1,48}$/.test(raw) ? raw : "";
}

function locale() {
  const browser = navigator.language || "en";
  return browser.slice(0, 16);
}

function customerUserId() {
  const storageKey = "instant_pay_customer_id";
  const current = window.localStorage.getItem(storageKey);
  if (current && /^[a-zA-Z0-9._:-]{8,128}$/.test(current)) return current;

  const randomId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const id = `anon_${randomId}`;
  window.localStorage.setItem(storageKey, id);
  return id;
}

type AdaptyDecision = {
  adapty_enabled?: boolean;
  offer_key?: string;
  variation_id?: string;
  paywall_id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  cta?: string;
};

function App() {
  const baseOffer = useMemo(currentOffer, []);
  const [offer, setOffer] = useState(baseOffer);
  const [decision, setDecision] = useState<AdaptyDecision>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolvePaywall() {
      try {
        const response = await fetch("/api/paywall", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            offer: baseOffer.key,
            source: sourceApp(),
            locale: locale(),
            customer_user_id: customerUserId(),
          }),
        });
        const data = (await response.json().catch(() => ({}))) as AdaptyDecision;
        if (cancelled || !response.ok) return;

        const resolved = offerFor(data.offer_key ?? null);
        if (resolved) setOffer(resolved);
        setDecision(data);
      } catch {
        // Adapty is an optimization layer. Catalog checkout stays available.
      }
    }

    void resolvePaywall();
    return () => {
      cancelled = true;
    };
  }, [baseOffer]);

  async function continueToPayment() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          offer: offer.key,
          source: sourceApp(),
          locale: locale(),
          customer_user_id: customerUserId(),
          adapty_variation_id: decision.variation_id,
          adapty_paywall_id: decision.paywall_id,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error || "checkout_unavailable");
      }
      window.location.assign(String(data.checkout_url));
    } catch {
      setError("Secure checkout is unavailable right now. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">INSTANT</div>
        <div className="secure">Secure checkout</div>
      </header>

      <section className="layout">
        <div className="copy">
          <p className="eyebrow">{decision.eyebrow ?? offer.eyebrow}</p>
          <h1>{decision.title ?? offer.title}</h1>
          <p className="lead">{decision.description ?? offer.description}</p>

          <div className="trust">
            <span>Global payments</span>
            <span>Local payment methods</span>
            <span>Tax handled at checkout</span>
          </div>
        </div>

        <aside className="card" aria-label="Order summary">
          <div className="product-row">
            <div>
              <span className="label">PRODUCT</span>
              <strong>{offer.product}</strong>
            </div>
            <span className="pill">{offer.plan}</span>
          </div>

          <div className="summary">
            <div>
              <span>Billing</span>
              <strong>{offer.cadence === "annual" ? "Annual" : "Monthly"}</strong>
            </div>
            <div>
              <span>Currency</span>
              <strong>Localized at checkout</strong>
            </div>
            <div>
              <span>Taxes</span>
              <strong>Calculated by Paddle</strong>
            </div>
          </div>

          <button type="button" onClick={continueToPayment} disabled={busy}>
            {busy ? "Opening secure checkout…" : (decision.cta ?? "Continue to secure checkout")}
          </button>

          {error && <p className="error" role="alert">{error}</p>}

          <p className="fine">
            Final price, currency, taxes and available payment methods are shown by
            Paddle before purchase. You can review everything before confirming.
          </p>
        </aside>
      </section>

      <footer>
        <span>Instant</span>
        <span>Payments processed securely by Paddle</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
