import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  ChevronDown,
  Clipboard,
  FileText,
  FlaskConical,
  GraduationCap,
  Headphones,
  Layers3,
  MessageSquareText,
  Sparkles,
  TerminalSquare,
  Timer,
} from "lucide-react";
import { agentPresets, mcpUrl, type AgentId } from "./connection";
import { loadOffer, type FunnelOffer } from "./offer";

const modes = [
  {
    name: "Learn",
    icon: <Brain size={19} />,
    eyebrow: "Adaptive practice",
    detail: "Questions get harder when you are ready and repair weak concepts when you are not.",
  },
  {
    name: "Quiz",
    icon: <FlaskConical size={19} />,
    eyebrow: "Fast feedback",
    detail: "Turn the same material into focused questions and explanations in seconds.",
  },
  {
    name: "Test",
    icon: <GraduationCap size={19} />,
    eyebrow: "Exam rehearsal",
    detail: "Choose question styles and a timer. Feedback stays hidden until the test ends.",
  },
  {
    name: "Review",
    icon: <BookOpenCheck size={19} />,
    eyebrow: "Right-time recall",
    detail: "Come back to concepts when they are due instead of rereading everything.",
  },
];

const faq = [
  {
    q: "What can I study with InstantStudy™?",
    a: "Notes, PDFs, slides, lecture material, text already in your AI conversation and optional Anki material can all become Learn, Review, Quiz or Test sessions.",
  },
  {
    q: "How is this different from asking ChatGPT to quiz me?",
    a: "A normal chat can create questions. InstantStudy™ adds the learning system around them: mastery by concept, adaptive difficulty, weak-concept repair, retesting, due reviews and a consistent next-best-question policy.",
  },
  {
    q: "Do I have to create flashcards first?",
    a: "No. InstantStudy™ is content-first. Give the AI what you are learning and start with the first question. Anki is optional if you already use it.",
  },
  {
    q: "Does Test mode behave like a real practice exam?",
    a: "Test can use multiple choice, true/false, short answer, free recall and application questions, with an optional timer and feedback released only at the end.",
  },
  {
    q: "Which AI apps can use InstantStudy™?",
    a: "The study engine is exposed through remote MCP and REST/OpenAPI, so compatible AI agents can use the same learning loop. Ready connection patterns are included for ChatGPT packaging, Claude Code, Cursor and Codex.",
  },
  {
    q: "What does Unlimited unlock?",
    a: "Unlimited removes study limits and is designed for persistent mastery, due reviews, every supported study mode, all supported AI agents and optional Anki integration.",
  },
];

function event(name: string, properties: Record<string, unknown> = {}) {
  const detail = { name, properties, at: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent("instantstudy:marketing", { detail }));
  const dataLayer = (
    window as typeof window & { dataLayer?: Array<Record<string, unknown>> }
  ).dataLayer;
  dataLayer?.push({ event: name, ...properties });
}

function Logo() {
  return (
    <a className="brand" href="#top" aria-label="InstantStudy home">
      <span className="brand-orb" aria-hidden="true">
        <i />
        <b />
      </span>
      <span className="brand-word">
        InstantStudy<span className="tm">™</span>
      </span>
    </a>
  );
}

function SourceCard({
  icon,
  label,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  note: string;
}) {
  return (
    <div className="source-card">
      <span className="source-icon">{icon}</span>
      <div>
        <strong>{label}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}

function HeroProduct() {
  return (
    <div className="hero-product" id="demo">
      <div className="study-window">
        <div className="study-window-top">
          <span className="window-dots"><i /><i /><i /></span>
          <span>Biology · Cell respiration</span>
          <span className="study-mode-pill">Learn</span>
        </div>

        <div className="study-window-grid">
          <aside className="study-rail">
            <span className="rail-label">Study path</span>
            <button className="active">01 · Learn</button>
            <button>02 · Quiz</button>
            <button>03 · Test</button>
            <button>04 · Review</button>
            <div className="rail-progress">
              <span>Mastery</span>
              <strong>61%</strong>
              <i><b style={{ width: "61%" }} /></i>
            </div>
          </aside>

          <div className="study-question">
            <div className="question-meta">
              <span>Question 3 of 12</span>
              <span>Free recall</span>
            </div>
            <h3>Why does the electron transport chain create a proton gradient?</h3>
            <p>Answer in your own words. InstantStudy will use your response to decide what comes next.</p>
            <div className="answer-box">Type your answer…</div>
            <div className="question-actions">
              <span>Difficulty adapts after every answer</span>
              <button>Submit answer <ArrowRight size={15} /></button>
            </div>
          </div>

          <aside className="knowledge-panel">
            <span className="rail-label">Knowledge state</span>
            <div className="knowledge-score">
              <strong>3</strong>
              <span>concepts to strengthen</span>
            </div>
            {[
              ["Electron transport chain", 72],
              ["ATP synthase", 48],
              ["Chemiosmosis", 31],
            ].map(([label, value]) => (
              <div className="concept-meter" key={label}>
                <span><b>{label}</b><em>{value}%</em></span>
                <i><b style={{ width: `${value}%` }} /></i>
              </div>
            ))}
            <div className="next-review-card">
              <span>Next review</span>
              <strong>ATP synthase · tomorrow</strong>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TestPreview() {
  return (
    <div className="test-preview">
      <div className="test-head">
        <div>
          <span>Practice test</span>
          <strong>Cellular respiration</strong>
        </div>
        <div className="timer-chip"><Timer size={15} /> 24:18</div>
      </div>
      <div className="test-progress"><i style={{ width: "42%" }} /></div>
      <span className="test-kicker">Question 5 of 12 · Multiple choice</span>
      <h3>Which process directly drives ATP synthase?</h3>
      <div className="choices">
        <span>A <b>Movement of protons down their electrochemical gradient</b></span>
        <span>B <b>Transfer of electrons directly to ATP</b></span>
        <span>C <b>Breakdown of glucose in the cytosol</b></span>
        <span>D <b>Release of carbon dioxide in glycolysis</b></span>
      </div>
      <div className="test-foot">
        <span>No hints or score until the test ends.</span>
        <button>Next question <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

function RetentionPreview() {
  return (
    <div className="retention-preview">
      <div className="retention-top">
        <span>Review queue</span>
        <strong>6 concepts due</strong>
      </div>
      {[
        ["Chemiosmosis", "Due now", 31],
        ["ATP synthase", "Today", 48],
        ["NADH oxidation", "Tomorrow", 66],
        ["Krebs cycle", "In 3 days", 81],
      ].map(([label, due, mastery]) => (
        <div className="review-row" key={label}>
          <div>
            <strong>{label}</strong>
            <span>{due}</span>
          </div>
          <div className="review-mastery">
            <i><b style={{ width: `${mastery}%` }} /></i>
            <span>{mastery}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConnectAgent() {
  const [selected, setSelected] = useState<AgentId>("codex");
  const [copied, setCopied] = useState(false);
  const endpoint = mcpUrl();
  const preset = agentPresets.find((item) => item.id === selected)!;
  const snippet = preset.command?.(endpoint) ?? preset.config?.(endpoint) ?? endpoint;

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    event("agent_connect_copy", { agent: selected });
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="connect-band" id="connect">
      <div className="connect-intro">
        <p className="eyebrow light">Study where you already think</p>
        <h2>Bring InstantStudy™ into your AI.</h2>
        <p>
          Your AI keeps the conversation. InstantStudy adds the adaptive learning
          loop behind it.
        </p>
        <div className="agent-list">
          {agentPresets.map((agent) => (
            <button
              type="button"
              key={agent.id}
              className={selected === agent.id ? "active" : ""}
              onClick={() => {
                setSelected(agent.id);
                setCopied(false);
              }}
            >
              {agent.name}
            </button>
          ))}
        </div>
      </div>

      <div className="connect-code">
        <div className="code-top">
          <span><TerminalSquare size={14} /> {preset.name}</span>
          <button type="button" onClick={() => void copy()}>
            <Clipboard size={14} /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre>{snippet}</pre>
        <small>{preset.note}</small>
      </div>
    </section>
  );
}

function Pricing() {
  const [offer, setOffer] = useState<FunnelOffer | null>(null);
  const [annual, setAnnual] = useState(true);

  useEffect(() => {
    void loadOffer(navigator.language || "en").then(setOffer);
  }, []);

  const annualPrice = offer?.annualPrice ?? "$44.99 / year";
  const monthlyPrice = offer?.monthlyPrice ?? "$6.99 / month";

  return (
    <section className="section pricing-section" id="pricing">
      <div className="section-heading pricing-heading">
        <p className="eyebrow">Simple pricing</p>
        <h2>Start free. Remove the limits when study becomes a habit.</h2>
        <p>Get the learning loop first. Upgrade only when you need unlimited practice and continuity.</p>
      </div>

      <div className="billing-switch" aria-label="Billing interval">
        <button type="button" className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>
          Monthly
        </button>
        <button type="button" className={annual ? "active" : ""} onClick={() => setAnnual(true)}>
          Annual <span>7-day trial</span>
        </button>
      </div>

      <div className="pricing-grid">
        <article className="pricing-card free-card">
          <div>
            <span className="plan-name">Free</span>
            <h3>$0</h3>
            <p>See if active study works for you.</p>
          </div>
          <ul>
            <li><Check size={16} /> Study your own material</li>
            <li><Check size={16} /> Learn, Review, Quiz and Test</li>
            <li><Check size={16} /> Adaptive practice with usage limits</li>
            <li><Check size={16} /> Connect a supported AI agent</li>
          </ul>
          <a className="plan-button secondary-plan" href="#connect">Start studying free</a>
        </article>

        <article className="pricing-card unlimited-card">
          <div className="most-popular">Best for daily study</div>
          <div>
            <span className="plan-name">Unlimited</span>
            <h3>{annual ? annualPrice : monthlyPrice}</h3>
            <p>{annual ? (offer?.trial ?? "7 days free") : "Cancel anytime"}.</p>
          </div>
          <ul>
            <li><Check size={16} /> Unlimited Learn, Review, Quiz and Test</li>
            <li><Check size={16} /> Cross-session mastery and due reviews</li>
            <li><Check size={16} /> All supported AI agents</li>
            <li><Check size={16} /> Optional Anki integration</li>
          </ul>
          <a
            className="plan-button primary-plan"
            href={offer?.checkoutUrl ?? "#connect"}
            onClick={() =>
              event("pricing_cta_clicked", {
                billing: annual ? "annual" : "monthly",
                variationId: offer?.variationId,
              })
            }
          >
            {annual ? (offer?.cta ?? "Start 7-day free trial") : "Go Unlimited"}
            <ArrowRight size={16} />
          </a>
        </article>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section className="section faq-section" id="faq">
      <div className="section-heading">
        <p className="eyebrow">FAQ</p>
        <h2>The important questions, answered.</h2>
      </div>
      <div className="faq-list">
        {faq.map((item, index) => (
          <button
            type="button"
            className="faq-item"
            key={item.q}
            onClick={() => setOpen(open === index ? -1 : index)}
          >
            <span>
              <strong>{item.q}</strong>
              {open === index ? <p>{item.a}</p> : null}
            </span>
            <ChevronDown size={18} className={open === index ? "rotated" : ""} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function App() {
  return (
    <main id="top">
      <header className="nav-shell">
        <Logo />
        <nav>
          <a href="#tools">Study tools</a>
          <a href="#test">Practice tests</a>
          <a href="#review">Review</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <a className="nav-cta" href="#connect">
          Start free <ArrowRight size={14} />
        </a>
      </header>

      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-pill"><Sparkles size={14} /> Built for active recall</div>
            <h1>Turn anything you’re learning into practice.</h1>
            <p>
              Drop in notes, PDFs, slides, lecture material or the conversation
              already inside your AI. InstantStudy™ turns it into adaptive Learn,
              Review, Quiz and Test sessions—without building a deck first.
            </p>
            <div className="hero-actions">
              <a className="hero-primary" href="#connect">
                Start studying free <ArrowRight size={17} />
              </a>
              <a className="hero-secondary" href="#demo">See a study session</a>
            </div>
            <small>No deck setup · No switching apps · Your material stays in the learning loop</small>
          </div>

          <div className="source-stack">
            <span className="source-stack-label">Any input</span>
            <SourceCard icon={<FileText size={20} />} label="Lecture notes" note="notes.pdf" />
            <SourceCard icon={<Layers3 size={20} />} label="Slides" note="week-07.pptx" />
            <SourceCard icon={<MessageSquareText size={20} />} label="AI conversation" note="current context" />
            <SourceCard icon={<Headphones size={20} />} label="Lecture material" note="transcript or notes" />
            <div className="source-arrow">↓</div>
            <div className="instant-card">
              <span className="brand-orb large" aria-hidden="true"><i /><b /></span>
              <div>
                <strong>InstantStudy™</strong>
                <span>12 concepts found · ready to learn</span>
              </div>
            </div>
          </div>
        </div>

        <HeroProduct />
      </section>

      <section className="trust-strip">
        <span>One learning loop across</span>
        <strong>ChatGPT</strong><strong>Claude</strong><strong>Cursor</strong><strong>Codex</strong><strong>Any MCP agent</strong>
      </section>

      <section className="section tools-section" id="tools">
        <div className="section-heading wide-heading">
          <p className="eyebrow">Study tools that work together</p>
          <h2>Understand it once. Practice it four ways.</h2>
          <p>
            The same material moves through explanation, recall, testing and
            scheduled review instead of becoming separate disconnected study assets.
          </p>
        </div>

        <div className="mode-cards">
          {modes.map((mode, index) => (
            <article key={mode.name} className={index === 0 ? "featured-mode" : ""}>
              <span className="mode-icon">{mode.icon}</span>
              <span className="mode-eyebrow">{mode.eyebrow}</span>
              <h3>{mode.name}</h3>
              <p>{mode.detail}</p>
              <span className="mode-number">0{index + 1}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-band test-band" id="test">
        <div className="feature-copy">
          <p className="eyebrow light">Practice tests</p>
          <h2>Rehearse the exam before the exam.</h2>
          <p>
            Build a test from your own material, mix question types, add a timer
            and keep feedback hidden until the end.
          </p>
          <div className="feature-points">
            <span><Check size={15} /> Multiple choice + written responses</span>
            <span><Check size={15} /> Optional time limit</span>
            <span><Check size={15} /> Final score + weak concepts</span>
          </div>
        </div>
        <TestPreview />
      </section>

      <section className="feature-band review-band" id="review">
        <RetentionPreview />
        <div className="feature-copy dark-copy">
          <p className="eyebrow">Right-time review</p>
          <h2>Study what is getting weak—not everything again.</h2>
          <p>
            Every answer updates mastery and schedules the next review. Weak and
            overdue concepts return first.
          </p>
          <div className="feature-points dark-points">
            <span><Check size={15} /> Mastery by concept</span>
            <span><Check size={15} /> Due-review queue</span>
            <span><Check size={15} /> Repair → retest loop</span>
          </div>
        </div>
      </section>

      <section className="section continuity-section">
        <div className="continuity-copy">
          <p className="eyebrow">Built for continuity</p>
          <h2>Your next study session should know what happened in the last one.</h2>
          <p>
            InstantStudy™ is designed to carry your knowledge state forward:
            what you know, what is fragile and what should come next.
          </p>
        </div>
        <div className="continuity-visual">
          <div className="memory-ring"><span>78%</span><small>overall mastery</small></div>
          <div className="continuity-list">
            <span><i className="good" /> Glycolysis <b>strong</b></span>
            <span><i className="mid" /> Krebs cycle <b>review soon</b></span>
            <span><i className="weak" /> Chemiosmosis <b>due now</b></span>
          </div>
        </div>
      </section>

      <ConnectAgent />
      <Pricing />
      <FAQ />

      <section className="final-cta">
        <div>
          <p className="eyebrow light">InstantStudy™</p>
          <h2>Turn today’s material into tomorrow’s memory.</h2>
          <p>Start with your own notes. Upgrade only when you want the limits gone.</p>
        </div>
        <a href="#connect">
          Start studying free <ArrowRight size={17} />
        </a>
      </section>

      <footer>
        <Logo />
        <span>Active study for the AI you already use.</span>
        <div>
          <a href="#tools">Study tools</a>
          <a href="#pricing">Pricing</a>
          <a href="#connect">Connect</a>
        </div>
      </footer>
    </main>
  );
}
