import { useEffect, useState, type ReactNode } from "react";
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
  icon: ReactNode;
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
        <p className="eyebrow light">Learning, native to AI</p>
        <h2>The study engine follows you into the AI you already use.</h2>
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
        <p className="eyebrow">Start now</p>
        <h2>The future of learning starts free.</h2>
        <p>Experience the full learning loop first. Upgrade only when you want unlimited practice and continuity.</p>
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
          <a href="#tools">Learn</a>
          <a href="#test">Test</a>
          <a href="#review">Review</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <a className="nav-cta" href="#connect">
          Try InstantStudy™ <ArrowRight size={14} />
        </a>
      </header>

      <section className="hero future-hero">
        <div className="future-kicker">
          <span><Sparkles size={13} /> Introducing InstantStudy™</span>
          <span>Adaptive learning · Persistent memory</span>
        </div>

        <div className="future-title" aria-label="The future of learning">
          <span>The future</span>
          <span>of learning.</span>
        </div>

        <div className="future-intro">
          <p>
            Your AI already knows how to explain. InstantStudy™ adds the system
            that makes learning stick: adaptive practice, exam rehearsal,
            mastery and right-time review.
          </p>
          <div className="hero-actions">
            <a className="hero-primary" href="#connect">
              Start learning <ArrowRight size={17} />
            </a>
            <a className="hero-secondary" href="#demo">Experience the loop</a>
          </div>
        </div>

        <div className="future-materials">
          <div className="future-material-copy">
            <span className="source-stack-label">Any material becomes practice</span>
            <strong>Drop it in. Start with the first question.</strong>
          </div>
          <div className="future-material-grid">
            <SourceCard icon={<FileText size={20} />} label="Notes" note="PDF · text" />
            <SourceCard icon={<Layers3 size={20} />} label="Slides" note="lecture deck" />
            <SourceCard icon={<MessageSquareText size={20} />} label="AI context" note="current conversation" />
            <SourceCard icon={<Headphones size={20} />} label="Lecture" note="transcript · notes" />
          </div>
        </div>

        <HeroProduct />
      </section>

      <section className="trust-strip future-strip">
        <span>One learning system, wherever you think.</span>
        <strong>ChatGPT</strong><strong>Claude</strong><strong>Cursor</strong><strong>Codex</strong><strong>Any MCP agent</strong>
      </section>

      <section className="section tools-section" id="tools">
        <div className="section-heading wide-heading">
          <p className="eyebrow">A new learning architecture</p>
          <h2>Learning should adapt to you, not the other way around.</h2>
          <p>
            One knowledge state connects explanation, recall, testing and review.
            Every answer changes what happens next.
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
          <p className="eyebrow light">Future-ready testing</p>
          <h2>Practice under pressure before it matters.</h2>
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
          <p className="eyebrow">Memory, not repetition</p>
          <h2>The system knows what is fading before you do.</h2>
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
          <p className="eyebrow">A living knowledge state</p>
          <h2>Every session starts where the last one left off.</h2>
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
          <h2>Learn once. Keep it longer.</h2>
          <p>The future of learning is adaptive, continuous and already inside your AI.</p>
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
