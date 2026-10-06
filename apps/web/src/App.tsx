import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  ChevronDown,
  Circle,
  Clipboard,
  FileText,
  FlaskConical,
  GraduationCap,
  Link2,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { agentPresets, mcpUrl, openApiUrl, type AgentId } from "./connection";
import { loadOffer, type FunnelOffer } from "./offer";

const modes = [
  { name: "Learn", icon: <Brain size={17} />, detail: "Teach → check → adapt" },
  { name: "Review", icon: <BookOpenCheck size={17} />, detail: "Fast active recall" },
  { name: "Quiz", icon: <FlaskConical size={17} />, detail: "Questions + feedback" },
  { name: "Test", icon: <GraduationCap size={17} />, detail: "No hints until the end" },
];

const faq = [
  {
    q: "What is InstantStudy™?",
    a: "InstantStudy™ turns material already inside your AI into active study. Drop in notes, PDFs, slides, lecture content, conversation context or Anki material and keep learning through Learn, Review, Quiz and Test without leaving your agent.",
  },
  {
    q: "Which agents can connect?",
    a: "Any agent that can call a remote MCP server can use the same InstantStudy endpoint. We provide ready connection patterns for Codex, Claude Code, Cursor and ChatGPT plugin packaging, plus OpenAPI for non-MCP tool callers.",
  },
  {
    q: "Why not just ask my AI to quiz me?",
    a: "Your AI is good at explanation and question wording. InstantStudy™ adds the learning system generic chat lacks: persistent mastery, adaptive difficulty, weak-concept repair, retesting, study modes and a consistent next-best-question policy.",
  },
  {
    q: "Do I need Anki?",
    a: "No. Anki is optional. Connect it if you already have decks or want its mature scheduling. Content-first InstantStudy sessions work without Anki.",
  },
  {
    q: "Can I use PDFs and files?",
    a: "Yes. InstantStudy can ingest text and supported PDFs directly, while host LLMs can also pass extracted text or use their own vision for image-heavy and scanned files.",
  },
  {
    q: "How does pricing work?",
    a: "Pricing is controlled through Adapty so plans, trial length and regional experiments can change without rebuilding the product. The page displays the active offer when the backend is configured.",
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
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      <span className="brand-word">InstantStudy<span className="tm">™</span></span>
    </a>
  );
}

function Orb({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "mini-orb" : "hero-orb"} aria-hidden="true">
      <span className="orb-blue" />
      <span className="orb-orange" />
    </span>
  );
}

function AgentRail() {
  return (
    <div className="agent-rail" aria-label="Supported agent examples">
      {["ChatGPT", "Claude", "Cursor", "Codex", "Any MCP agent"].map((name, index) => (
        <span key={name}>
          <Circle
            size={index === 0 ? 8 : 6}
            fill={index === 0 ? "currentColor" : "none"}
          />
          {name}
        </span>
      ))}
    </div>
  );
}

function ProductDemo() {
  return (
    <div className="product-demo" aria-label="InstantStudy agent workflow preview">
      <div className="demo-topbar">
        <div className="demo-brand">
          <Orb small />
          <span>Biology — Cell respiration</span>
        </div>
        <div className="demo-status">
          <span className="live-dot" />
          Agent connected
        </div>
      </div>

      <div className="demo-grid">
        <div className="agent-panel">
          <div className="panel-label">Agent</div>
          <div className="message user-message">
            <span>You</span>
            <p>InstantStudy this chapter. I have 15 minutes.</p>
          </div>
          <div className="message ai-message">
            <span>Claude</span>
            <p>
              I found 9 concepts. We’ll start with recall, then move into
              explanation and application.
            </p>
          </div>
          <div className="question-card">
            <span>Question 3 / 12 · Learn</span>
            <strong>
              Why does the electron transport chain create a proton gradient?
            </strong>
            <div className="fake-input">Type your answer…</div>
          </div>
        </div>

        <div className="state-panel">
          <div className="panel-label">InstantStudy</div>
          <div className="state-head">
            <div>
              <span>Knowledge state</span>
              <strong>Adaptive</strong>
            </div>
            <Orb small />
          </div>
          <div className="concept-row">
            <span>Electron transport chain</span>
            <strong>72%</strong>
            <i style={{ width: "72%" }} />
          </div>
          <div className="concept-row">
            <span>ATP synthase</span>
            <strong>48%</strong>
            <i style={{ width: "48%" }} />
          </div>
          <div className="concept-row">
            <span>Chemiosmosis</span>
            <strong>31%</strong>
            <i style={{ width: "31%" }} />
          </div>
          <div className="policy-box">
            <span>Next policy</span>
            <strong>Repair → retest</strong>
            <small>Missing concept: electrochemical potential</small>
          </div>
        </div>
      </div>
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
    <section className="section connect-section" id="connect">
      <div className="section-heading">
        <p className="eyebrow">Works with your agent</p>
        <h2>Connect InstantStudy™ once.</h2>
        <p>
          Your agent keeps the conversation. InstantStudy™ adds the learning layer:
          content ingestion, Learn, Review, Quiz, Test, mastery and optional Anki.
        </p>
      </div>

      <div className="connect-shell">
        <div className="connect-tabs" role="tablist" aria-label="Agent connectors">
          {agentPresets.map((agent) => (
            <button
              key={agent.id}
              type="button"
              className={selected === agent.id ? "active" : ""}
              onClick={() => {
                setSelected(agent.id);
                setCopied(false);
                event("agent_connect_selected", { agent: agent.id });
              }}
            >
              <strong>{agent.name}</strong>
              <small>{agent.label}</small>
            </button>
          ))}
        </div>

        <div className="connect-content">
          <div className="connect-copy">
            <p className="eyebrow">01 · Add the endpoint</p>
            <h3>{preset.detail}</h3>
            <p>{preset.note}</p>
          </div>

          <div className="terminal-card">
            <div className="terminal-bar">
              <span><TerminalSquare size={14} /> InstantStudy MCP</span>
              <button type="button" onClick={() => void copy()}>
                <Clipboard size={14} />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre>{snippet}</pre>
          </div>

          <div className="endpoint-grid">
            <div>
              <span>MCP</span>
              <code>{endpoint}</code>
            </div>
            <div>
              <span>OpenAPI fallback</span>
              <code>{openApiUrl()}</code>
            </div>
          </div>
        </div>
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

  const price = annual
    ? offer?.annualPrice ?? "$39.99 / year"
    : offer?.monthlyPrice ?? "$6.99 / month";

  return (
    <section className="section pricing-section" id="pricing">
      <div className="section-heading centered-heading">
        <p className="eyebrow">Pricing</p>
        <h2>Try the learning loop free. Go unlimited when it works.</h2>
        <p>
          Start with the complete learning loop, then remove usage limits with
          Unlimited. Pricing and trial variants are controlled through Adapty.
        </p>
      </div>

      <div className="billing-toggle">
        <button
          type="button"
          className={!annual ? "active" : ""}
          onClick={() => setAnnual(false)}
        >
          Monthly
        </button>
        <button
          type="button"
          className={annual ? "active" : ""}
          onClick={() => setAnnual(true)}
        >
          Annual
        </button>
      </div>

      <div className="price-grid">
        <article className="price-card">
          <span>InstantStudy™ Free</span>
          <h3>$0</h3>
          <p>Experience the complete loop before paying.</p>
          <ul>
            <li><Check size={15} /> Turn your own material into study</li>
            <li><Check size={15} /> Learn / Review / Quiz / Test</li>
            <li><Check size={15} /> Limited adaptive usage</li>
          </ul>
          <a className="secondary full-button" href="#connect">
            Connect your agent
          </a>
        </article>

        <article className="price-card featured">
          <div className="popular">Most useful</div>
          <span>InstantStudy™ Unlimited</span>
          <h3>{price}</h3>
          <p>{offer?.trial ?? "7 days free"} · cancel anytime.</p>
          <ul>
            <li><Check size={15} /> Unlimited Learn / Review / Quiz / Test</li>
            <li><Check size={15} /> Cross-session mastery + due reviews</li>
            <li><Check size={15} /> All supported AI agents</li>
            <li><Check size={15} /> Optional Anki memory integration</li>
          </ul>
          <a
            className="primary full-button"
            href={offer?.checkoutUrl ?? "#connect"}
            onClick={() =>
              event("pricing_cta_clicked", {
                billing: annual ? "annual" : "monthly",
                variationId: offer?.variationId,
              })
            }
          >
            {offer?.cta ?? "Start free trial"} <ArrowRight size={16} />
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
        <h2>Everything your agent needs to start studying.</h2>
      </div>
      <div className="faq-list">
        {faq.map((item, index) => (
          <button
            className="faq-item"
            type="button"
            key={item.q}
            onClick={() => setOpen(open === index ? -1 : index)}
          >
            <span>
              <strong>{item.q}</strong>
              {open === index ? <p>{item.a}</p> : null}
            </span>
            <ChevronDown
              size={17}
              className={open === index ? "rotated" : ""}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

export function App() {
  return (
    <main id="top">
      <header className="marketing-nav">
        <Logo />
        <nav>
          <a href="#how">How it works</a>
          <a href="#connect">Connect</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a className="nav-cta" href="#connect">
          Connect your agent <ArrowRight size={14} />
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="launch-pill">
            <Sparkles size={14} />
            Active study for the AI you already use
          </div>
          <h1>
            Your AI can explain anything. InstantStudy<span className="tm hero-tm">™</span> makes you learn it.
          </h1>
          <p>
            Drop in notes, PDFs, slides, lecture content, your current conversation
            or Anki. InstantStudy™ turns the material into adaptive Learn, Review,
            Quiz and Test sessions—and remembers what you need next.
          </p>
          <div className="hero-actions">
            <a className="primary hero-button" href="#connect">
              Connect your agent <ArrowRight size={17} />
            </a>
            <a className="secondary hero-button" href="#how">
              See how it works
            </a>
          </div>
          <small>No deck setup. No switching apps. Keep the AI you already use.</small>
        </div>

        <ProductDemo />
      </section>

      <section className="compatibility-strip">
        <span>Study where learning already starts</span>
        <AgentRail />
      </section>

      <section className="section how-section" id="how">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>From raw material to real recall.</h2>
          <p>
            Turn the material already in your AI into active recall without a second
            workflow: your material, practice and mastery stay in one learning loop.
          </p>
        </div>

        <div className="steps-grid">
          <article>
            <span className="step-number">01</span>
            <h3>Bring the AI you already use</h3>
            <p>
              Connect InstantStudy™ once to ChatGPT, Claude, Cursor, Codex or any
              compatible MCP agent.
            </p>
            <div className="step-visual agent-stack">
              <span>Claude</span>
              <span>ChatGPT</span>
              <span>Cursor</span>
              <span>Codex</span>
            </div>
          </article>

          <article>
            <span className="step-number">02</span>
            <h3>Drop in anything you’re learning</h3>
            <p>
              Notes, PDFs, slides, lectures, current chat context and Anki can
              become study material instantly—without building a deck first.
            </p>
            <div className="step-visual source-stack">
              <FileText size={22} />
              <span>lecture.pdf</span>
              <i>→</i>
              <Orb small />
            </div>
          </article>

          <article>
            <span className="step-number">03</span>
            <h3>Practice until it sticks</h3>
            <p>
              Learn adapts difficulty, Quiz gives fast feedback, Test simulates
              exam conditions and Review returns to what is weakening.
            </p>
            <div className="step-visual mastery-visual">
              <span><i style={{ width: "82%" }} /> 82%</span>
              <span><i style={{ width: "54%" }} /> 54%</span>
              <span><i style={{ width: "31%" }} /> 31%</span>
            </div>
          </article>
        </div>
      </section>

      <section className="section proof-section">
        <div className="proof-copy">
          <p className="eyebrow">A complete learning loop inside your AI</p>
          <h2>Understand. Practice. Test. Remember.</h2>
          <p>
            The difference is continuity. Your AI can explain the concept, then
            InstantStudy™ turns that same context into adaptive practice and keeps
            the knowledge state for what should happen next.
          </p>
          <div className="proof-metrics">
            <div><strong>4</strong><span>study modes</span></div>
            <div><strong>1</strong><span>continuous learning loop</span></div>
            <div><strong>0</strong><span>required handoffs</span></div>
          </div>
        </div>

        <div className="mode-grid">
          {modes.map((mode) => (
            <article key={mode.name}>
              <span>{mode.icon}</span>
              <div>
                <strong>{mode.name}</strong>
                <small>{mode.detail}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ConnectAgent />

      <section className="section api-section">
        <div className="section-heading">
          <p className="eyebrow">Two ways in</p>
          <h2>MCP for agents. OpenAPI for everything else.</h2>
          <p>
            The Study Engine is provider-neutral. Your product can call the same
            primitives without depending on an OpenAI, Anthropic or Google SDK.
          </p>
        </div>
        <div className="api-grid">
          <article>
            <Link2 size={20} />
            <strong>Remote MCP</strong>
            <p>
              Best for agent hosts. Discover tools once and let the agent run the
              adaptive loop.
            </p>
            <code>{mcpUrl()}</code>
          </article>
          <article>
            <TerminalSquare size={20} />
            <strong>REST / OpenAPI</strong>
            <p>
              Best for custom products and function-calling systems that do not
              expose MCP directly.
            </p>
            <code>{openApiUrl()}</code>
          </article>
        </div>
      </section>

      <Pricing />
      <FAQ />

      <section className="final-cta">
        <Orb />
        <p className="eyebrow">InstantStudy™</p>
        <h2>Your AI already explains. Now make it help you remember.</h2>
        <a className="primary hero-button" href="#connect">
          Connect your agent <ArrowRight size={17} />
        </a>
      </section>

      <footer className="marketing-footer">
        <Logo />
        <span>Drop anything. Learn it.</span>
        <div>
          <a href="#connect">Connect</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
      </footer>
    </main>
  );
}
