import { useCallback, useEffect, useRef, useState } from "react";
import { canGrantPaidStudy, matchesCurrentPaywallRequest } from "./paidAccessGuard";
import { openInstantStudyCheckout, readInstantAccountSession } from "./instantBilling";
import { SoftwareApp } from "./SoftwareApp";
import SiriOrb from "./components/smoothui/SiriOrb";
import { StudyMotionPanel } from "./StudyMotion";
import "./hard-paywall.css";

type Access = {
  enabled: boolean;
  authorized: boolean;
  plan?: "plus" | "unlimited" | null;
  reason?: string | null;
};
type Stage = "checking" | "welcome" | "paywall" | "granted" | "error";

const accountLoginUrl = (() => {
  const raw = String(import.meta.env.VITE_INSTANT_ACCOUNT_LOGIN_URL || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
})();

/**
 * The app is not rendered before entitlements have been checked. This prevents
 * unauthorized background calls, exposing cached study materials and UI flashes.
 * Authorization still happens on EVERY study endpoint request on the server.
 */
export function HardPaywallGate() {
  const [stage, setStage] = useState<Stage>("checking");
  const [reason, setReason] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"plus" | "unlimited">("unlimited");
  const [annual, setAnnual] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const latestCheckId = useRef(0);

  const refresh = useCallback(async () => {
    const checkId = ++latestCheckId.current;
    setStage("checking");
    const session = readInstantAccountSession();
    try {
      const response = await fetch("/api/study", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "paywall_status",
          learnerId: session?.userId,
          accountUserId: session?.userId,
          accountAccessToken: session?.accessToken,
        }),
      });
      if (!response.ok) throw new Error("access_check_unavailable");
      const payload = await response.json() as Access;
      if (typeof payload.enabled !== "boolean" || typeof payload.authorized !== "boolean") {
        throw new Error("access_check_invalid");
      }
      const currentSession = readInstantAccountSession();
      if (checkId !== latestCheckId.current) return;
      if (!matchesCurrentPaywallRequest(session, currentSession, checkId, latestCheckId.current)) {
        setReason("A conta foi alterada durante a verificação. Verifique novamente.");
        setStage("error");
        return;
      }
      if (canGrantPaidStudy(payload, session, currentSession, checkId, latestCheckId.current)) {
        setStage("granted");
        return;
      }
      if (payload.authorized) {
        setReason("O acesso não foi validado como assinatura ativa desta conta.");
        setStage("error");
        return;
      }
      if (payload.reason === "billing_unavailable" ||
          payload.reason === "billing_response_invalid" ||
          payload.reason === "hard_paywall_signing_not_configured" ||
          payload.reason === "billing_not_configured") {
        setReason("A verificação da assinatura está indisponível. Tente novamente.");
        setStage("error");
        return;
      }
      setStage("welcome");
    } catch {
      if (checkId !== latestCheckId.current) return;
      if (!matchesCurrentPaywallRequest(session, readInstantAccountSession(), checkId, latestCheckId.current)) {
        setReason("A conta mudou durante a verificação. Verifique novamente.");
      } else {
        setReason("Não foi possível validar o acesso. O app permanece protegido.");
      }
      setStage("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => { latestCheckId.current++; };
  }, [refresh]);

  useEffect(() => {
    if (stage !== "granted") return;
    const revalidate = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const sessionChanged = (event: StorageEvent) => {
      if (event.key === "instant.account.session" || event.key === null) void refresh();
    };
    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("focus", revalidate);
    window.addEventListener("storage", sessionChanged);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("storage", sessionChanged);
      window.clearInterval(interval);
    };
  }, [stage, refresh]);

  const beginCheckout = async () => {
    if (checkoutBusy) return;
    setCheckoutBusy(true);
    setCheckoutError("");
    try { await openInstantStudyCheckout(selectedPlan, annual); }
    catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "checkout_unavailable");
      setCheckoutBusy(false);
    }
  };
  if (stage === "granted") return <SoftwareApp />;
  const session = readInstantAccountSession();

  return (
    <main className="study-paywall" aria-busy={stage === "checking"}>
      <div className="study-paywall__body">
        <div className="study-paywall__branding" aria-label="InstantStudy">
          InstantStudy<sup>™</sup>
        </div>
        <StudyMotionPanel id={stage}>
        {stage === "checking" && (
          <section className="study-paywall__panel" role="status" aria-live="polite">
            <p className="study-paywall__kicker">VERIFICAÇÃO SEGURA</p>
            <h1>Validando seu acesso.</h1>
            <p>Conferindo sua assinatura com o Instant Pay.</p>
          </section>
        )}
        {stage === "welcome" && (
          <section className="study-paywall__panel">
            <p className="study-paywall__kicker">ESTUDE COM A ÓRBITA</p>
            <h1>Aprenda com o que você já tem.</h1>
            <p>Importe materiais, transforme conteúdo em flashcards, faça simulados e revise com inteligência adaptativa.</p>
            <div className="study-paywall__illustration" aria-hidden="true">
              <SiriOrb size="94px" state="idle" colors={{ bg: "#f5f3f1", c1: "#0447ff", c2: "#ff4704", c3: "#bda9d8", c4: "#f7baa4" }} />
            </div>
            <button type="button" className="study-paywall__primary" onClick={() => setStage("paywall")}>
              Continuar
            </button>
          </section>
        )}
        {stage === "paywall" && (
          <section className="study-paywall__panel" aria-label="Assinatura InstantStudy">
            <p className="study-paywall__kicker">ACESSO PREMIUM</p>
            <h1>Seu estudo, sem interrupções.</h1>
            <p>Assine para entrar na Órbita. Planos e condições finais são confirmados no checkout.</p>
            <div className="study-paywall__choices" role="group" aria-label="Escolher plano">
              <button type="button" aria-pressed={selectedPlan === "plus"} className={selectedPlan === "plus" ? "selected" : ""} onClick={() => setSelectedPlan("plus")}>
                <strong>Plus</strong><span>Mais sessões e simulados</span>
              </button>
              <button type="button" aria-pressed={selectedPlan === "unlimited"} className={selectedPlan === "unlimited" ? "selected" : ""} onClick={() => setSelectedPlan("unlimited")}>
                <strong>Unlimited</strong><span>Sem limite principal de Learn/Test</span>
              </button>
            </div>
            <div className="study-paywall__period" role="group" aria-label="Período de cobrança">
              <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>Mensal</button>
              <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>Anual</button>
            </div>
            {session ? (
              <button type="button" className="study-paywall__primary"
                disabled={checkoutBusy} onClick={() => void beginCheckout()}>
                {checkoutBusy ? "Preparando checkout…" : "Ver assinatura e condições"}
              </button>
            ) : (
              accountLoginUrl ? (
                <a className="study-paywall__primary" href={accountLoginUrl}>
                  Entrar ou criar conta
                </a>
              ) : (
                <p role="status" className="study-paywall__alert">
                  A vinculação de contas não está configurada. A compra ficará indisponível até que o login Instant Account seja conectado.
                </p>
              )
            )}
            {checkoutError && <p role="alert" className="study-paywall__alert">{checkoutError}</p>}
            <button type="button" className="study-paywall__restore" onClick={() => void refresh()}>
              Já assinei — verificar acesso
            </button>
            <p className="study-paywall__legal">
              Não há cobrança nesta tela. Antes de pagar, confira o valor total, a moeda, a periodicidade, a renovação automática, as regras de cancelamento e o reembolso no checkout. Não há acesso gratuito aos recursos de estudo.
            </p>
          </section>
        )}
        {stage === "error" && (
          <section className="study-paywall__panel" role="alert">
            <p className="study-paywall__kicker">ACESSO PROTEGIDO</p>
            <h1>Não foi possível verificar sua assinatura.</h1>
            <p>{reason}</p>
            <button type="button" className="study-paywall__primary" onClick={() => void refresh()}>Tentar novamente</button>
          </section>
        )}
        </StudyMotionPanel>
      </div>
    </main>
  );
}
