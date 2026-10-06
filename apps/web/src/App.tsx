import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  FileText,
  FlaskConical,
  GraduationCap,
  Upload,
} from "lucide-react";
import { prepareStudy, type PreparedStudy, type StudyMode } from "./study";

const modes: Array<{
  id: StudyMode;
  label: string;
  detail: string;
  icon: React.ReactNode;
}> = [
  {
    id: "learn",
    label: "Learn",
    detail: "Teach, check, adapt.",
    icon: <Brain size={18} />,
  },
  {
    id: "review",
    label: "Review",
    detail: "Fast active recall.",
    icon: <BookOpenCheck size={18} />,
  },
  {
    id: "quiz",
    label: "Quiz",
    detail: "Questions + feedback.",
    icon: <FlaskConical size={18} />,
  },
  {
    id: "test",
    label: "Test",
    detail: "No hints until the end.",
    icon: <GraduationCap size={18} />,
  },
];

function event(name: string, properties: Record<string, unknown> = {}) {
  const detail = { name, properties, at: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent("instantstudy:funnel", { detail }));

  const dataLayer = (
    window as typeof window & {
      dataLayer?: Array<Record<string, unknown>>;
    }
  ).dataLayer;
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

export function App() {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<StudyMode>("learn");
  const [fileName, setFileName] = useState<string>();
  const [prepared, setPrepared] = useState<PreparedStudy>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canStart = content.trim().length >= 12 && !loading;

  const selectedMode = useMemo(
    () => modes.find((item) => item.id === mode)!,
    [mode],
  );

  async function onFile(file?: File) {
    if (!file) return;
    setFileName(file.name);

    const textLike =
      file.type.startsWith("text/") ||
      /\.(txt|md|csv|json|html?|xml)$/i.test(file.name);

    if (!textLike) {
      setError(
        "For PDFs, slides and images, send the file directly to InstantStudy inside your LLM. This web starter currently reads text files locally.",
      );
      return;
    }

    setError(undefined);
    setContent((await file.text()).slice(0, 200_000));
    event("content_added", { source: "file", fileType: file.type || "unknown" });
  }

  async function start() {
    if (!canStart) return;
    setLoading(true);
    setError(undefined);
    event("study_prepare_started", {
      mode,
      source: fileName ? "file" : "paste",
    });

    try {
      const result = await prepareStudy({
        contentText: content,
        mode,
        title: fileName,
      });
      setPrepared(result);
      event("first_study_value_reached", {
        mode,
        conceptCount: result.conceptCount,
        fallback: result.localFallback,
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not prepare this material.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (prepared) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <Logo />
          <button
            className="text-button"
            type="button"
            onClick={() => setPrepared(undefined)}
          >
            Study something else
          </button>
        </header>

        <div className="progress">
          <span style={{ width: "100%" }} />
        </div>

        <section className="funnel-stage">
          <div className="screen ready-screen">
            <Orb />
            <p className="eyebrow">{selectedMode.label} session ready</p>
            <h2>Your material is already in study mode.</h2>

            <div className="summary-card">
              <div>
                <span>Mode</span>
                <strong>{selectedMode.label}</strong>
              </div>
              <div>
                <span>First target</span>
                <strong>
                  {prepared.next?.concept?.label ?? "Start with the core ideas"}
                </strong>
              </div>
              <div>
                <span>Concepts</span>
                <strong>{prepared.conceptCount ?? "Adaptive"}</strong>
              </div>
            </div>

            <div className="handoff">
              <span>Inside your LLM</span>
              <p>“InstantStudy, study this with me.”</p>
            </div>

            <button
              className="primary full"
              type="button"
              onClick={() =>
                event("continue_in_llm_clicked", {
                  studySessionId: prepared.studySessionId,
                  mode,
                })
              }
            >
              Continue in InstantStudy <ArrowRight size={17} />
            </button>

            <p className="fineprint centered-copy">
              No deck creation required. Connect Anki later only if you want its
              scheduling and existing memory.
            </p>
          </div>
        </section>

        <footer className="footer">
          <span>Drop anything. Learn it.</span>
          <span>InstantStudy</span>
        </footer>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Logo />
        <span className="top-note">Quizlet-style study, native to LLMs.</span>
      </header>

      <div className="progress">
        <span style={{ width: "18%" }} />
      </div>

      <section className="funnel-stage">
        <div className="screen hero-screen content-first">
          <Orb />
          <p className="eyebrow">Adaptive study from anything</p>
          <h1>Drop anything. Learn it.</h1>
          <p className="lead">
            Paste notes here—or send a PDF, slide deck, image, document or Anki
            material directly to InstantStudy inside your LLM. We turn it into an
            adaptive study session immediately.
          </p>

          <div className="mode-picker" aria-label="Study mode">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mode-pill ${mode === item.id ? "selected" : ""}`}
                onClick={() => {
                  setMode(item.id);
                  event("study_mode_selected", { mode: item.id });
                }}
              >
                {item.icon}
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="content-box">
            <textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setFileName(undefined);
              }}
              placeholder="Paste notes, a chapter, lecture transcript, study guide, or anything you want to learn…"
              aria-label="Study material"
            />
            <div className="content-actions">
              <input
                ref={fileRef}
                type="file"
                hidden
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
              <button
                type="button"
                className="secondary"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={16} />
                {fileName ?? "Add text file"}
              </button>
              <span className="content-hint">
                <FileText size={14} /> PDF & images work directly inside your LLM
              </span>
            </div>
          </div>

          {error ? <p className="inline-error">{error}</p> : null}

          <button
            className="primary start-button"
            type="button"
            disabled={!canStart}
            onClick={() => void start()}
          >
            {loading ? "Preparing…" : `Start ${selectedMode.label}`}
            {!loading ? <ArrowRight size={17} /> : null}
          </button>

          <div className="post-value-note">
            <span>First value before signup.</span>
            <p>
              Account, Anki connection, reminders and Pro appear only after the
              learner has started studying.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>Quiet intelligence for learning.</span>
        <span>InstantStudy</span>
      </footer>
    </main>
  );
}
