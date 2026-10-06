import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  GraduationCap,
  Languages,
  Link2,
  MessageCircleMore,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { loadOffer, type FunnelOffer } from "./offer";

type Step =
  | "welcome"
  | "role"
  | "goal"
  | "source"
  | "paywall"
  | "reminders"
  | "ready";

type Choice = {
  id: string;
  label: string;
  detail?: string;
  icon: React.ReactNode;
};

type FunnelState = {
  role?: string;
  goal?: string;
  source?: string;
  reminders?: boolean;
  billing?: "annual" | "monthly";
};

const STEPS: Step[] = [
  "welcome",
  "role",
  "goal",
  "source",
  "paywall",
  "reminders",
  "ready",
];

const roles: Choice[] = [
  { id: "school", label: "School", icon: <BookOpen size={20} /> },
  { id: "university", label: "University", icon: <GraduationCap size={20} /> },
  { id: "career", label: "Work or certification", icon: <BriefcaseBusiness size={20} /> },
  { id: "language", label: "Language learning", icon: <Languages size={20} /> },
];

const goals: Choice[] = [
  {
    id: "remember",
    label: "Remember what I study",
    detail: "Turn learning into durable recall.",
    icon: <Sparkles size={20} />,
  },
  {
    id: "exam",
    label: "Prepare for an exam",
    detail: "Practice the ideas most likely to break.",
    icon: <Target size={20} />,
  },
  {
    id: "anki",
    label: "Study my Anki with AI",
    detail: "Keep your decks and scheduling.",
    icon: <Link2 size={20} />,
  },
  {
    id: "understand",
    label: "Understand difficult concepts",
    detail: "Explain, test, then retest.",
    icon: <MessageCircleMore size={20} />,
  },
];

const sources: Choice[] = [
  {
    id: "anki",
    label: "Connect Anki",
    detail: "Bring your decks, due cards, and review history.",
    icon: <Link2 size={20} />,
  },
  {
    id: "material",
    label: "Start with study material",
    detail: "Paste or upload notes later from your LLM.",
    icon: <Upload size={20} />,
  },
];

function event(name: string, properties: Record<string, unknown> = {}) {
  const detail = { name, properties, at: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent("instantstudy:funnel", { detail }));

  const dataLayer = (window as typeof window & {
    dataLayer?: Array<Record<string, unknown>>;
  }).dataLayer;
  dataLayer?.push({ event: name, ...properties });
}

function Logo() {
  return (
    <div className="brand" aria-label="InstantStudy">
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      <span>InstantStudy</span>
    </div>
  );
}

function Orb() {
  return (
    <div className="orb-wrap" aria-hidden="true">
      <div className="orb">
        <span className="orb-memory" />
        <span className="orb-attention" />
      </div>
    </div>
  );
}

function Progress({ index }: { index: number }) {
  const usable = STEPS.length - 1;
  const progress = Math.max(0, Math.min(1, index / usable));
  return (
    <div className="progress" aria-label={`Onboarding step ${index + 1} of ${STEPS.length}`}>
      <span style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

function ChoiceList({
  options,
  value,
  onChange,
}: {
  options: Choice[];
  value?: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="choice-list">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            className={`choice ${selected ? "selected" : ""}`}
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            <span className="choice-icon">{option.icon}</span>
            <span className="choice-copy">
              <strong>{option.label}</strong>
              {option.detail ? <small>{option.detail}</small> : null}
            </span>
            <span className="choice-check" aria-hidden="true">
              {selected ? <Check size={16} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function App() {
  const [step, setStep] = useState<Step>("welcome");
  const [state, setState] = useState<FunnelState>({ billing: "annual" });
  const [offer, setOffer] = useState<FunnelOffer | null>(null);
  const index = STEPS.indexOf(step);

  useEffect(() => {
    void loadOffer(navigator.language || "en").then(setOffer);
  }, []);

  useEffect(() => {
    event("funnel_step_viewed", { step, stepIndex: index });
  }, [step, index]);

  const roleName = useMemo(
    () => roles.find((item) => item.id === state.role)?.label,
    [state.role],
  );

  const goalName = useMemo(
    () => goals.find((item) => item.id === state.goal)?.label,
    [state.goal],
  );

  function next() {
    const nextStep = STEPS[index + 1];
    if (nextStep) setStep(nextStep);
  }

  function back() {
    const previous = STEPS[index - 1];
    if (previous) setStep(previous);
  }

  function choose<K extends keyof FunnelState>(key: K, value: FunnelState[K]) {
    setState((current) => ({ ...current, [key]: value }));
    event("funnel_choice", { step, key, value });
  }

  function startTrial() {
    event("paywall_cta_clicked", {
      billing: state.billing,
      variationId: offer?.variationId,
    });

    if (offer?.checkoutUrl) {
      window.location.assign(offer.checkoutUrl);
      return;
    }

    next();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Logo />
        {step !== "welcome" && step !== "ready" ? (
          <button className="text-button" type="button" onClick={back}>
            <ChevronLeft size={16} /> Back
          </button>
        ) : (
          <span />
        )}
      </header>

      <Progress index={index} />

      <section className="funnel-stage">
        {step === "welcome" && (
          <div className="screen hero-screen">
            <Orb />
            <p className="eyebrow">Adaptive study for your existing memory</p>
            <h1>Study where you already think.</h1>
            <p className="lead">
              Bring Anki and your study material into the LLM you already use.
              InstantStudy remembers what you know, tests what is weakening, and
              keeps the review loop moving.
            </p>

            <div className="auth-stack">
              <button
                className="primary"
                type="button"
                onClick={() => {
                  event("signup_started", { provider: "google" });
                  next();
                }}
              >
                Continue with Google <ArrowRight size={17} />
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  event("signup_started", { provider: "email" });
                  next();
                }}
              >
                Continue with email
              </button>
            </div>
            <p className="fineprint">
              By continuing, you agree to the Terms and Privacy Policy.
            </p>
          </div>
        )}

        {step === "role" && (
          <div className="screen">
            <p className="eyebrow">A little context</p>
            <h2>What are you learning for?</h2>
            <p className="body-copy">
              We use this to shape the first study session—not to build a noisy profile.
            </p>
            <ChoiceList
              options={roles}
              value={state.role}
              onChange={(value) => choose("role", value)}
            />
            <button className="primary full" disabled={!state.role} onClick={next}>
              Continue <ArrowRight size={17} />
            </button>
          </div>
        )}

        {step === "goal" && (
          <div className="screen">
            <p className="eyebrow">Your first outcome</p>
            <h2>What should InstantStudy help with first?</h2>
            <ChoiceList
              options={goals}
              value={state.goal}
              onChange={(value) => choose("goal", value)}
            />
            <button className="primary full" disabled={!state.goal} onClick={next}>
              Continue <ArrowRight size={17} />
            </button>
          </div>
        )}

        {step === "source" && (
          <div className="screen">
            <p className="eyebrow">Bring your context</p>
            <h2>Your memory should travel with you.</h2>
            <p className="body-copy">
              InstantStudy can use Anki as the source of truth, or start from new
              material and connect Anki later.
            </p>
            <ChoiceList
              options={sources}
              value={state.source}
              onChange={(value) => choose("source", value)}
            />
            <div className="trust-note">
              <span className="trust-dot" />
              Anki remains yours. InstantStudy does not replace your scheduler.
            </div>
            <button className="primary full" disabled={!state.source} onClick={next}>
              Continue <ArrowRight size={17} />
            </button>
          </div>
        )}

        {step === "paywall" && (
          <div className="screen paywall-screen">
            <div className="paywall-orb"><Orb /></div>
            <p className="eyebrow">InstantStudy Pro</p>
            <h2>{offer?.headline ?? "Make every study session remember what came before."}</h2>

            <div className="benefits">
              <div><Check size={16} /> Adaptive recall and semantic grading</div>
              <div><Check size={16} /> Study your Anki from any supported LLM</div>
              <div><Check size={16} /> Weak-concept retesting and exam practice</div>
            </div>

            <div className="plans" role="radiogroup" aria-label="Billing period">
              <button
                className={`plan ${state.billing === "annual" ? "selected" : ""}`}
                onClick={() => choose("billing", "annual")}
                type="button"
                role="radio"
                aria-checked={state.billing === "annual"}
              >
                <span>
                  <strong>Annual</strong>
                  <small>{offer?.trial ?? "7 days free"}</small>
                </span>
                <span className="plan-price">{offer?.annualPrice ?? "$39.99 / year"}</span>
              </button>
              <button
                className={`plan ${state.billing === "monthly" ? "selected" : ""}`}
                onClick={() => choose("billing", "monthly")}
                type="button"
                role="radio"
                aria-checked={state.billing === "monthly"}
              >
                <span>
                  <strong>Monthly</strong>
                  <small>Cancel anytime</small>
                </span>
                <span className="plan-price">{offer?.monthlyPrice ?? "$6.99 / month"}</span>
              </button>
            </div>

            <button className="primary full" type="button" onClick={startTrial}>
              {offer?.cta ?? "Start 7-day free trial"} <ArrowRight size={17} />
            </button>
            <button className="text-button centered" type="button" onClick={next}>
              Continue with limited access
            </button>
            <p className="fineprint centered-copy">
              Annual trial converts to the selected plan unless cancelled. Pricing
              may vary by experiment and region.
            </p>
          </div>
        )}

        {step === "reminders" && (
          <div className="screen">
            <div className="mini-visual">
              <span className="due-dot" />
              <span className="due-line" />
              <span className="due-dot memory" />
            </div>
            <p className="eyebrow">Keep the loop alive</p>
            <h2>Want a reminder when memory is due?</h2>
            <p className="body-copy">
              One useful reminder beats a streak. We only surface review when it can
              change what you remember.
            </p>
            <button
              className="primary full"
              type="button"
              onClick={() => {
                choose("reminders", true);
                next();
              }}
            >
              Turn on study reminders
            </button>
            <button
              className="text-button centered"
              type="button"
              onClick={() => {
                choose("reminders", false);
                next();
              }}
            >
              Not now
            </button>
          </div>
        )}

        {step === "ready" && (
          <div className="screen ready-screen">
            <Orb />
            <p className="eyebrow">Ready to study</p>
            <h2>Your first session already has a direction.</h2>
            <div className="summary-card">
              <div>
                <span>Context</span>
                <strong>{roleName ?? "Learning"}</strong>
              </div>
              <div>
                <span>Goal</span>
                <strong>{goalName ?? "Build durable memory"}</strong>
              </div>
              <div>
                <span>Source</span>
                <strong>{state.source === "anki" ? "Anki" : "Study material"}</strong>
              </div>
            </div>
            <div className="handoff">
              <span>Try this in your LLM</span>
              <p>“InstantStudy, let’s study for 10 minutes.”</p>
            </div>
            <button
              className="primary full"
              type="button"
              onClick={() =>
                event("first_session_started", {
                  role: state.role,
                  goal: state.goal,
                  source: state.source,
                })
              }
            >
              Start first session <ArrowRight size={17} />
            </button>
          </div>
        )}
      </section>

      <footer className="footer">
        <span>Quiet intelligence for learning.</span>
        <span>InstantStudy</span>
      </footer>
    </main>
  );
}
