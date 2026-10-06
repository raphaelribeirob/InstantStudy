import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  FilePlus2,
  FileText,
  GraduationCap,
  Home,
  Library,
  MessageCircle,
  Plug,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { prepareStudy, type StudyMode } from "./study";
import { agentPresets, mcpUrl } from "./connection";
import "./software.css";

type Material = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

type View =
  | "home"
  | "library"
  | "create"
  | "guide"
  | "flashcards"
  | "learn"
  | "test"
  | "ask"
  | "review"
  | "plugin";

const STORAGE_KEY = "instantstudy.library.v1";

function readLibrary(): Material[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLibrary(items: Material[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

function sentenceChunks(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 30);
}

function flashcardsFor(text: string) {
  return sentenceChunks(text)
    .slice(0, 12)
    .map((sentence, index) => ({
      front: `Concept ${index + 1}`,
      back: sentence,
    }));
}

function summaryFor(text: string) {
  const parts = sentenceChunks(text).slice(0, 4);
  return parts.length ? parts.join(" ") : text.slice(0, 700);
}

function navItem(view: View, active: View, icon: ReactNode, label: string, setView: (view: View) => void) {
  return (
    <button className={active === view ? "software-nav-item active" : "software-nav-item"} onClick={() => setView(view)}>
      {icon}<span>{label}</span>
    </button>
  );
}

export function SoftwareApp() {
  const [view, setView] = useState<View>("home");
  const [library, setLibrary] = useState<Material[]>(readLibrary);
  const [selectedId, setSelectedId] = useState<string | null>(() => readLibrary()[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Awaited<ReturnType<typeof prepareStudy>> | null>(null);
  const [question, setQuestion] = useState("");

  const selected = useMemo(
    () => library.find((item) => item.id === selectedId) ?? library[0] ?? null,
    [library, selectedId],
  );

  useEffect(() => saveLibrary(library), [library]);

  async function createMaterial() {
    const content = draft.trim();
    if (!content) return;
    const item: Material = {
      id: crypto.randomUUID(),
      title: title.trim() || "Untitled study material",
      content,
      createdAt: new Date().toISOString(),
    };
    setLibrary((current) => [item, ...current]);
    setSelectedId(item.id);
    setDraft("");
    setTitle("");
    setView("learn");
    await startMode("learn", item);
  }

  async function startMode(mode: StudyMode, material = selected) {
    if (!material) return;
    setBusy(true);
    setSession(null);
    try {
      setSession(await prepareStudy({
        contentText: material.content,
        title: material.title,
        mode,
      }));
    } finally {
      setBusy(false);
    }
  }

  function openMaterial(item: Material) {
    setSelectedId(item.id);
    setView("learn");
    void startMode("learn", item);
  }

  const cards = selected ? flashcardsFor(selected.content) : [];

  return (
    <div className="software-shell">
      <aside className="software-sidebar">
        <a className="software-brand" href="/">
          <span className="software-mark"><i /></span>
          <strong>InstantStudy<span>™</span></strong>
        </a>

        <button className="software-create" onClick={() => setView("create")}>
          <FilePlus2 size={17}/> Create
        </button>

        <nav>
          {navItem("home", view, <Home size={17}/>, "Home", setView)}
          {navItem("library", view, <Library size={17}/>, "Library", setView)}
          <div className="software-nav-label">STUDY</div>
          {navItem("guide", view, <BookOpen size={17}/>, "Study Guide", setView)}
          {navItem("flashcards", view, <FileText size={17}/>, "Flashcards", setView)}
          {navItem("learn", view, <Brain size={17}/>, "Learn", setView)}
          {navItem("test", view, <GraduationCap size={17}/>, "Practice Test", setView)}
          {navItem("ask", view, <MessageCircle size={17}/>, "Ask", setView)}
          {navItem("review", view, <BookOpen size={17}/>, "Review", setView)}
          <div className="software-nav-label">AI</div>
          {navItem("plugin", view, <Plug size={17}/>, "Plugin", setView)}
        </nav>

        <div className="software-plan">
          <span>InstantStudy Free</span>
          <small>Upgrade removes Learn and Test limits.</small>
          <a href="/#pricing">View plans</a>
        </div>
      </aside>

      <main className="software-main">
        <header className="software-topbar">
          <div className="software-search"><Search size={16}/><input placeholder="Search your study library" /></div>
          <span className="software-sync"><CheckCircle2 size={14}/> Synced learning state</span>
        </header>

        {view === "home" && (
          <section className="software-page">
            <div className="software-hero">
              <p>THE FUTURE OF LEARNING</p>
              <h1>What do you want to learn?</h1>
              <span>Turn any material into study guides, flashcards, adaptive Learn, tests and review.</span>
              <button onClick={() => setView("create")}><Sparkles size={17}/> Create from your material</button>
            </div>

            <div className="software-section-head"><h2>Continue studying</h2><button onClick={() => setView("library")}>View library</button></div>
            <div className="software-library-grid">
              {library.length ? library.slice(0, 6).map((item) => (
                <button className="software-material-card" key={item.id} onClick={() => openMaterial(item)}>
                  <span><FileText size={18}/></span>
                  <strong>{item.title}</strong>
                  <small>{new Date(item.createdAt).toLocaleDateString()}</small>
                </button>
              )) : (
                <div className="software-empty">
                  <Upload size={24}/>
                  <strong>Your library starts with one upload.</strong>
                  <p>Paste notes, lecture content or a reading and InstantStudy builds the learning loop.</p>
                </div>
              )}
            </div>

            <div className="software-feature-grid">
              <button onClick={() => setView("guide")}><BookOpen/><strong>Study Guide</strong><span>Summary + key ideas</span></button>
              <button onClick={() => setView("flashcards")}><FileText/><strong>Flashcards</strong><span>Fast active recall</span></button>
              <button onClick={() => setView("learn")}><Brain/><strong>Learn</strong><span>Adaptive practice</span></button>
              <button onClick={() => setView("test")}><GraduationCap/><strong>Practice Test</strong><span>Exam rehearsal</span></button>
            </div>
          </section>
        )}

        {view === "library" && (
          <section className="software-page">
            <div className="software-title-row"><div><p>YOUR MATERIAL</p><h1>Library</h1></div><button onClick={() => setView("create")}>Create</button></div>
            <div className="software-library-list">
              {library.map((item) => (
                <button key={item.id} onClick={() => openMaterial(item)}>
                  <span className="software-file-icon"><FileText size={18}/></span>
                  <span><strong>{item.title}</strong><small>{item.content.slice(0, 100)}</small></span>
                  <em>{new Date(item.createdAt).toLocaleDateString()}</em>
                </button>
              ))}
            </div>
          </section>
        )}

        {view === "create" && (
          <section className="software-page software-create-page">
            <div className="software-title-row"><div><p>CREATE</p><h1>Turn material into learning.</h1></div></div>
            <div className="software-import-tabs">
              <button className="active">Paste text</button><button>Upload files</button><button>Google Drive</button><button>Record audio</button>
            </div>
            <div className="software-editor">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste notes, a reading, lecture transcript, or anything you need to learn…" />
              <div><span>{draft.length.toLocaleString()} / 100,000 characters</span><button disabled={!draft.trim() || busy} onClick={() => void createMaterial()}>{busy ? "Building…" : "Generate study material"}</button></div>
            </div>
            <div className="software-output-preview">
              <span>FROM ONE SOURCE</span>
              <div><strong>Study Guide</strong><small>Summary + key concepts</small></div>
              <div><strong>Flashcards</strong><small>Active recall deck</small></div>
              <div><strong>Learn</strong><small>Adaptive practice</small></div>
              <div><strong>Practice Test</strong><small>Exam-style questions</small></div>
            </div>
          </section>
        )}

        {["guide","flashcards","learn","test","ask","review"].includes(view) && (
          <section className="software-page">
            {!selected ? (
              <div className="software-empty large"><Brain size={28}/><h2>Add study material first.</h2><button onClick={() => setView("create")}>Create material</button></div>
            ) : (
              <>
                <div className="software-workspace-head">
                  <div><p>{selected.title}</p><h1>{view === "test" ? "Practice Test" : view[0].toUpperCase() + view.slice(1)}</h1></div>
                  <div className="software-mode-switch">
                    <button onClick={() => setView("guide")}>Guide</button>
                    <button onClick={() => setView("flashcards")}>Flashcards</button>
                    <button onClick={() => { setView("learn"); void startMode("learn"); }}>Learn</button>
                    <button onClick={() => { setView("test"); void startMode("test"); }}>Test</button>
                    <button onClick={() => setView("ask")}>Ask</button>
                  </div>
                </div>

                {view === "guide" && (
                  <div className="software-guide">
                    <article>
                      <span>SUMMARY</span>
                      <h2>{selected.title}</h2>
                      <p>{summaryFor(selected.content)}</p>
                    </article>
                    <aside>
                      <span>KEY IDEAS</span>
                      {sentenceChunks(selected.content).slice(0, 7).map((idea, index) => (
                        <div key={idea}><b>{String(index + 1).padStart(2, "0")}</b><p>{idea}</p></div>
                      ))}
                    </aside>
                  </div>
                )}

                {view === "flashcards" && (
                  <div className="software-flashcards">
                    {cards.map((card) => <article key={card.front}><span>{card.front}</span><p>{card.back}</p></article>)}
                  </div>
                )}

                {(view === "learn" || view === "test") && (
                  <div className="software-study-stage">
                    <aside>
                      <span>STUDY GUIDE</span>
                      <p>{summaryFor(selected.content)}</p>
                    </aside>
                    <article>
                      {busy ? <div className="software-loading">Building your adaptive session…</div> : session?.next?.concept ? (
                        <>
                          <span className="software-question-type">{session.next.questionPolicy?.type || "adaptive"}</span>
                          <h2>{session.next.concept.label}</h2>
                          <p>{session.next.questionPolicy?.instruction}</p>
                          <textarea placeholder="Type your answer…" />
                          <button>Submit answer</button>
                        </>
                      ) : (
                        <>
                          <h2>Ready to study.</h2>
                          <p>Start a fresh {view === "test" ? "practice test" : "adaptive Learn round"} from this material.</p>
                          <button onClick={() => void startMode(view === "test" ? "test" : "learn")}>Start</button>
                        </>
                      )}
                    </article>
                  </div>
                )}

                {view === "ask" && (
                  <div className="software-ask">
                    <div className="software-ask-context"><Sparkles size={18}/><span>Answers stay grounded in <strong>{selected.title}</strong>.</span></div>
                    <div className="software-chat-empty"><MessageCircle size={28}/><h2>Ask anything about this material.</h2><p>Explanations can become flashcards, Learn questions or a practice test without leaving the workspace.</p></div>
                    <div className="software-ask-box"><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What would you like to understand?" /><button disabled={!question.trim()}>Ask</button></div>
                  </div>
                )}

                {view === "review" && (
                  <div className="software-review-list">
                    {cards.slice(0, 6).map((card, index) => (
                      <article key={card.front}><div><strong>{card.front}</strong><p>{card.back}</p></div><span>{index < 2 ? "Due now" : index < 4 ? "Today" : "Tomorrow"}</span></article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {view === "plugin" && (
          <section className="software-page">
            <div className="software-title-row"><div><p>PLUGIN</p><h1>Take InstantStudy into your AI.</h1></div></div>
            <p className="software-lead">The software and plugin use the same study engine. Learn on the desktop, then continue from the same knowledge state inside a compatible AI agent.</p>
            <div className="software-plugin-endpoint"><span>Remote MCP endpoint</span><code>{mcpUrl()}</code></div>
            <div className="software-plugin-grid">
              {agentPresets.map((agent) => (
                <article key={agent.id}><strong>{agent.name}</strong><span>{agent.label}</span><p>{agent.detail}</p><code>{agent.command?.(mcpUrl()) || agent.config?.(mcpUrl()) || mcpUrl()}</code></article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
