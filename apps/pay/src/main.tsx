import { useMemo, useState } from "react";
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

function variationId() {
  const params = new URLSearchParams(window.location.search);
  const raw = String(params.get("variation_id") || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw) ? raw : "";
}

function locale() {
  const browser = navigator.language || "en";
  return browser.slice(0, 16);
}

function App() {
  const offer = useMemo(currentOffer, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
          variation_id: variationId(),
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
          <p className="eyebrow">{offer.eyebrow}</p>
          <h1>{offer.title}</h1>
          <p className="lead">{offer.description}</p>

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
            {busy ? "Opening secure checkout…" : "Continue to secure checkout"}
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
