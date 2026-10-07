import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  Mic,
  Plug,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  askStudyMaterial,
  fileToStudyInput,
  getDueReviews,
  googleDriveStudyInput,
  importStudyMaterial,
  listStudyMaterials,
  prepareStudy,
  submitStudyAnswer,
  type DueReview,
  type StudyMaterial,
  type StudyMode,
  type StudySummary,
  type TestQuestionType,
} from "./study";
import { agentPresets, mcpUrl } from "./connection";
import "./software.css";

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

type SourceType = "paste" | "upload" | "drive" | "audio";

const STORAGE_KEY = "instantstudy.library.v2";

function readCachedLibrary(): StudyMaterial[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cacheLibrary(items: StudyMaterial[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

function navItem(view: View, active: View, icon: ReactNode, label: string, setView: (view: View) => void) {
  return (
    <button className={active === view ? "software-nav-item active" : "software-nav-item"} onClick={() => setView(view)}>
      {icon}<span>{label}</span>
    </button>
  );
}

function dueLabel(value: string) {
  const date = new Date(value);
  const delta = date.getTime() - Date.now();
  if (delta <= 0) return "Due now";
  const days = Math.ceil(delta / 86_400_000);
  if (days <= 1) return "Tomorrow";
  return `In ${days} days`;
}

export function SoftwareApp() {
  const cached = readCachedLibrary();
  const [view, setView] = useState<View>("home");
  const [library, setLibrary] = useState<StudyMaterial[]>(cached);
  const [selectedId, setSelectedId] = useState<string | null>(cached[0]?.id ?? null);
  const [sourceType, setSourceType] = useState<SourceType>("paste");
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [session, setSession] = useState<Awaited<ReturnType<typeof prepareStudy>> | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [question, setQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [dueReviews, setDueReviews] = useState<DueReview[]>([]);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [testQuestions, setTestQuestions] = useState(20);
  const [testDuration, setTestDuration] = useState(30);
  const [testTypes, setTestTypes] = useState<TestQuestionType[]>([
    "multiple_choice",
    "true_false",
    "short_answer",
    "free_recall",
  ]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  const selected = useMemo(
    () => library.find((item) => item.id === selectedId) ?? library[0] ?? null,
    [library, selectedId],
  );

  const filteredLibrary = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return library;
    return library.filter(
      (item) =>
        item.title.toLocaleLowerCase().includes(needle) ||
        item.content.toLocaleLowerCase().includes(needle) ||
        item.assets.keyConcepts.some((concept) =>
          concept.toLocaleLowerCase().includes(needle),
        ),
    );
  }, [library, search]);

  useEffect(() => {
    void listStudyMaterials()
      .then(({ materials }) => {
        setLibrary(materials);
        cacheLibrary(materials);
        if (!selectedId && materials[0]) setSelectedId(materials[0].id);
      })
      .catch(() => {
        // Cached library remains available offline.
      });
  }, []);

  useEffect(() => cacheLibrary(library), [library]);

  useEffect(() => {
    if (view !== "review") return;
    setReviewBusy(true);
    void getDueReviews()
      .then(setDueReviews)
      .catch(() => setDueReviews([]))
      .finally(() => setReviewBusy(false));
  }, [view]);

  async function createMaterial() {
    setBusy(true);
    setCreateError("");

    try {
      const files =
        sourceType === "upload" || sourceType === "audio"
          ? await Promise.all(selectedFiles.map(fileToStudyInput))
          : sourceType === "drive"
            ? [googleDriveStudyInput(driveUrl)]
            : [];

      const result = await importStudyMaterial({
        title: title.trim() || undefined,
        sourceType,
        contentText: sourceType === "paste" ? draft.trim() : undefined,
        files,
      });

      const item = result.material;
      setLibrary((current) => [item, ...current.filter((row) => row.id !== item.id)]);
      setSelectedId(item.id);
      setDraft("");
      setTitle("");
      setDriveUrl("");
      setSelectedFiles([]);
      setView("learn");
      await startMode("learn", item);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not import this material.");
    } finally {
      setBusy(false);
    }
  }

  async function startMode(mode: StudyMode, material = selected) {
    if (!material) return;
    setBusy(true);
    setSession(null);
    setSummary(null);
    setAnswer("");
    setFeedback("");
    try {
      setSession(await prepareStudy({
        contentText: material.content,
        title: material.title,
        mode,
        maxQuestions: mode === "test" ? testQuestions : 12,
        testDurationMinutes: mode === "test" ? testDuration : undefined,
        testQuestionTypes: mode === "test" ? testTypes : undefined,
      }));
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(value = answer) {
    const studySessionId = session?.studySessionId;
    const conceptId = session?.next?.concept?.id;
    if (!studySessionId || !conceptId || !value.trim()) return;

    setBusy(true);
    setFeedback("");
    try {
      const result = await submitStudyAnswer({
        studySessionId,
        conceptId,
        userAnswer: value.trim(),
      });

      const testMode = session.mode === "test";
      setFeedback(
        testMode
          ? result.submission?.done
            ? "Practice test complete."
            : "Answer recorded. Test feedback stays hidden until the end."
          : result.grade?.feedback || "Answer recorded.",
      );
      setAnswer("");

      if (result.submission?.summary) {
        setSummary(result.submission.summary);
      }

      if (result.next) {
        setSession({ ...session, next: result.next });
      } else if (result.submission?.done) {
        setSession({ ...session, next: undefined });
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not evaluate this answer.");
    } finally {
      setBusy(false);
    }
  }

  async function askMaterial() {
    if (!selected || !question.trim()) return;
    setAskBusy(true);
    setAskAnswer("");
    try {
      const result = await askStudyMaterial({
        contentText: selected.content,
        question: question.trim(),
      });
      setAskAnswer(result.answer);
    } catch (error) {
      setAskAnswer(
        error instanceof Error
          ? error.message
          : "InstantStudy could not answer from this material.",
      );
    } finally {
      setAskBusy(false);
    }
  }

  async function searchLibrary() {
    try {
      const { materials } = await listStudyMaterials(search);
      setLibrary(materials);
      cacheLibrary(materials);
    } catch {
      // Local filtering still works.
    }
  }

  function openMaterial(item: StudyMaterial) {
    setSelectedId(item.id);
    setView("learn");
    void startMode("learn", item);
  }

  function toggleTestType(type: TestQuestionType) {
    setTestTypes((current) => {
      if (current.includes(type)) {
        return current.length === 1 ? current : current.filter((item) => item !== type);
      }
      return [...current, type];
    });
  }

  async function startReview(item: DueReview) {
    const material: StudyMaterial = {
      id: `review-${item.conceptId}`,
      learnerId: "",
      title: item.title,
      content: item.sourceExcerpt,
      sourceType: "paste",
      sourceNames: [],
      assets: {
        summary: item.sourceExcerpt,
        outline: [item.sourceExcerpt],
        keyConcepts: [item.label],
        flashcards: [],
        generatedBy: "review",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setView("review");
    await startMode("review", material);
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `lecture-${Date.now()}.webm`, { type: blob.type });
        setSelectedFiles([file]);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setCreateError("Microphone access is unavailable. Upload an audio file instead.");
    }
  }

  const cards = selected?.assets.flashcards ?? [];
  const hasCreateInput =
    sourceType === "paste"
      ? Boolean(draft.trim())
      : sourceType === "drive"
        ? Boolean(driveUrl.trim())
        : selectedFiles.length > 0;

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
          <div className="software-search">
            <Search size={16}/>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void searchLibrary();
              }}
              placeholder="Search your study library"
            />
          </div>
          <span className="software-sync"><CheckCircle2 size={14}/> Persistent learning state</span>
        </header>

        {view === "home" && (
          <section className="software-page">
            <div className="software-hero">
              <p>THE FUTURE OF LEARNING</p>
              <h1>What do you want to learn?</h1>
              <span>Turn any material into study guides, flashcards, adaptive Learn, tests and real due review.</span>
              <button onClick={() => setView("create")}><Sparkles size={17}/> Create from your material</button>
            </div>

            <div className="software-section-head"><h2>Continue studying</h2><button onClick={() => setView("library")}>View library</button></div>
            <div className="software-library-grid">
              {filteredLibrary.length ? filteredLibrary.slice(0, 6).map((item) => (
                <button className="software-material-card" key={item.id} onClick={() => openMaterial(item)}>
                  <span><FileText size={18}/></span>
                  <strong>{item.title}</strong>
                  <small>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</small>
                </button>
              )) : (
                <div className="software-empty">
                  <Upload size={24}/>
                  <strong>Your library starts with one source.</strong>
                  <p>Paste text, upload a file, use a public Drive link or record a lecture.</p>
                </div>
              )}
            </div>

            <div className="software-feature-grid">
              <button onClick={() => setView("guide")}><BookOpen/><strong>Study Guide</strong><span>Summary + key ideas</span></button>
              <button onClick={() => setView("flashcards")}><FileText/><strong>Flashcards</strong><span>Semantic active recall</span></button>
              <button onClick={() => setView("learn")}><Brain/><strong>Learn</strong><span>Adaptive questions</span></button>
              <button onClick={() => setView("test")}><GraduationCap/><strong>Practice Test</strong><span>Configurable exam rehearsal</span></button>
            </div>
          </section>
        )}

        {view === "library" && (
          <section className="software-page">
            <div className="software-title-row"><div><p>YOUR MATERIAL</p><h1>Library</h1></div><button onClick={() => setView("create")}>Create</button></div>
            <div className="software-library-list">
              {filteredLibrary.map((item) => (
                <button key={item.id} onClick={() => openMaterial(item)}>
                  <span className="software-file-icon"><FileText size={18}/></span>
                  <span><strong>{item.title}</strong><small>{item.assets.summary.slice(0, 120)}</small></span>
                  <em>{item.sourceType}</em>
                </button>
              ))}
            </div>
          </section>
        )}

        {view === "create" && (
          <section className="software-page software-create-page">
            <div className="software-title-row"><div><p>CREATE</p><h1>Turn material into learning.</h1></div></div>
            <div className="software-import-tabs">
              {(["paste","upload","drive","audio"] as SourceType[]).map((type) => (
                <button
                  key={type}
                  className={sourceType === type ? "active" : ""}
                  onClick={() => {
                    setSourceType(type);
                    setCreateError("");
                  }}
                >
                  {type === "paste" ? "Paste text" : type === "upload" ? "Upload files" : type === "drive" ? "Google Drive" : "Record audio"}
                </button>
              ))}
            </div>
            <div className="software-editor">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />

              {sourceType === "paste" && (
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste notes, a reading, lecture transcript, or anything you need to learn…" />
              )}

              {sourceType === "upload" && (
                <label className="software-upload-control">
                  <Upload size={20}/>
                  <strong>{selectedFiles.length ? selectedFiles.map((file) => file.name).join(", ") : "Choose PDF, DOCX, PPTX or text files"}</strong>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.pptx,.txt,.md,.csv,text/*,application/pdf"
                    onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []).slice(0, 10))}
                  />
                </label>
              )}

              {sourceType === "drive" && (
                <input
                  value={driveUrl}
                  onChange={(event) => setDriveUrl(event.target.value)}
                  placeholder="Paste a public Google Drive file link"
                />
              )}

              {sourceType === "audio" && (
                <div className="software-audio-import">
                  <button type="button" onClick={() => void toggleRecording()}>
                    <Mic size={17}/> {recording ? "Stop recording" : "Record lecture"}
                  </button>
                  <label>
                    Or upload audio
                    <input
                      type="file"
                      accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg"
                      onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []).slice(0, 1))}
                    />
                  </label>
                  {selectedFiles[0] ? <span>{selectedFiles[0].name}</span> : null}
                </div>
              )}

              {createError ? <div className="software-feedback">{createError}</div> : null}
              <div>
                <span>
                  {sourceType === "paste"
                    ? `${draft.length.toLocaleString()} / 200,000 characters`
                    : "Web uploads: up to 2.5 MB per file"}
                </span>
                <button disabled={!hasCreateInput || busy} onClick={() => void createMaterial()}>
                  {busy ? "Building…" : "Generate study material"}
                </button>
              </div>
            </div>
            <div className="software-output-preview">
              <span>FROM ONE SOURCE</span>
              <div><strong>Study Guide</strong><small>Summary + outline + concepts</small></div>
              <div><strong>Flashcards</strong><small>Question/answer active recall</small></div>
              <div><strong>Learn</strong><small>Concrete adaptive questions</small></div>
              <div><strong>Practice Test</strong><small>Question mix + timer + final score</small></div>
            </div>
          </section>
        )}

        {["guide","flashcards","learn","test","ask"].includes(view) && (
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
                    <button onClick={() => { setView("test"); setSession(null); setSummary(null); }}>Test</button>
                    <button onClick={() => setView("ask")}>Ask</button>
                  </div>
                </div>

                {view === "guide" && (
                  <div className="software-guide">
                    <article>
                      <span>SUMMARY</span>
                      <h2>{selected.title}</h2>
                      <p>{selected.assets.summary}</p>
                    </article>
                    <aside>
                      <span>KEY IDEAS</span>
                      {selected.assets.outline.map((idea, index) => (
                        <div key={`${index}-${idea}`}><b>{String(index + 1).padStart(2, "0")}</b><p>{idea}</p></div>
                      ))}
                      <span>KEY CONCEPTS</span>
                      <p>{selected.assets.keyConcepts.join(" · ")}</p>
                    </aside>
                  </div>
                )}

                {view === "flashcards" && (
                  <div className="software-flashcards">
                    {cards.map((card) => (
                      <article
                        key={card.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setFlippedCard(flippedCard === card.id ? null : card.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") setFlippedCard(flippedCard === card.id ? null : card.id);
                        }}
                      >
                        <span>{flippedCard === card.id ? card.concept : card.front}</span>
                        <p>{flippedCard === card.id ? card.back : "Click to reveal"}</p>
                      </article>
                    ))}
                  </div>
                )}

                {view === "test" && !session && !busy && !summary && (
                  <div className="software-test-builder">
                    <h2>Build your practice test</h2>
                    <label>
                      Questions
                      <select value={testQuestions} onChange={(event) => setTestQuestions(Number(event.target.value))}>
                        {[10,20,30,40].map((count) => <option key={count} value={count}>{count}</option>)}
                      </select>
                    </label>
                    <label>
                      Time limit
                      <select value={testDuration} onChange={(event) => setTestDuration(Number(event.target.value))}>
                        {[15,30,45,60,90].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
                      </select>
                    </label>
                    <div className="software-test-types">
                      {(["multiple_choice","true_false","short_answer","free_recall","application"] as TestQuestionType[]).map((type) => (
                        <button
                          key={type}
                          className={testTypes.includes(type) ? "active" : ""}
                          onClick={() => toggleTestType(type)}
                        >
                          {type.replaceAll("_", " ")}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => void startMode("test")}>Start practice test</button>
                  </div>
                )}

                {(view === "learn" || view === "test") && (session || busy || summary) && (
                  <div className="software-study-stage">
                    <aside>
                      <span>STUDY GUIDE</span>
                      <p>{selected.assets.summary}</p>
                    </aside>
                    <article>
                      {busy ? <div className="software-loading">Building your adaptive session…</div> : summary ? (
                        <div className="software-test-result">
                          <span>SESSION COMPLETE</span>
                          <h2>{summary.testResult ? `${summary.testResult.scorePercent ?? 0}%` : "Round complete"}</h2>
                          <p>
                            {summary.testResult
                              ? `${summary.testResult.answered ?? 0} of ${summary.testResult.totalQuestions ?? testQuestions} questions answered.`
                              : `Average mastery: ${Math.round((summary.averageMastery ?? 0) * 100)}%`}
                          </p>
                          {summary.weakConcepts?.length ? (
                            <div>
                              <strong>Review mistakes</strong>
                              {summary.weakConcepts.map((concept) => (
                                <p key={concept.id}>{concept.label} · {Math.round((concept.mastery ?? 0) * 100)}%</p>
                              ))}
                            </div>
                          ) : null}
                          <button onClick={() => { setSession(null); setSummary(null); }}>Start another round</button>
                        </div>
                      ) : session?.next?.concept ? (
                        <>
                          <span className="software-question-type">
                            Question {session.next.questionIndex ?? "–"} of {session.next.totalPlanned ?? "–"} · {session.next.questionPolicy?.type || "adaptive"}
                          </span>
                          <h2>{session.next.question?.prompt || session.next.concept.label}</h2>
                          {feedback ? <div className="software-feedback">{feedback}</div> : null}

                          {session.next.question?.choices?.length ? (
                            <div className="software-question-choices">
                              {session.next.question.choices.map((choice) => (
                                <button
                                  key={`${choice.label}-${choice.value}`}
                                  disabled={busy}
                                  onClick={() => void submitAnswer(choice.value)}
                                >
                                  <b>{choice.label}</b><span>{choice.value}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <>
                              <textarea
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="Type your answer…"
                                disabled={busy}
                              />
                              <button disabled={!answer.trim() || busy} onClick={() => void submitAnswer()}>
                                {busy ? "Evaluating…" : "Submit answer"}
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <h2>Session complete.</h2>
                          <button onClick={() => void startMode(view === "test" ? "test" : "learn")}>Start again</button>
                        </>
                      )}
                    </article>
                  </div>
                )}

                {view === "learn" && !session && !busy && !summary && (
                  <div className="software-study-stage">
                    <aside><span>STUDY GUIDE</span><p>{selected.assets.summary}</p></aside>
                    <article><h2>Ready to study.</h2><p>Questions are generated from your material and adapt after every answer.</p><button onClick={() => void startMode("learn")}>Start Learn</button></article>
                  </div>
                )}

                {view === "ask" && (
                  <div className="software-ask">
                    <div className="software-ask-context"><Sparkles size={18}/><span>Answers stay grounded in <strong>{selected.title}</strong>.</span></div>
                    {askAnswer ? (
                      <div className="software-ask-answer">
                        <span>INSTANTSTUDY</span>
                        <p>{askAnswer}</p>
                        <button onClick={() => { setView("learn"); void startMode("learn"); }}>Quiz me on this</button>
                      </div>
                    ) : (
                      <div className="software-chat-empty"><MessageCircle size={28}/><h2>Ask anything about this material.</h2><p>Explanations stay grounded in your material and can lead directly back into active study.</p></div>
                    )}
                    <div className="software-ask-box">
                      <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !askBusy) void askMaterial();
                        }}
                        placeholder="What would you like to understand?"
                      />
                      <button disabled={!question.trim() || askBusy} onClick={() => void askMaterial()}>
                        {askBusy ? "Thinking…" : "Ask"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {view === "review" && (
          <section className="software-page">
            <div className="software-workspace-head">
              <div><p>RIGHT-TIME RECALL</p><h1>Review</h1></div>
            </div>
            {session?.next?.concept ? (
              <div className="software-study-stage">
                <aside><span>DUE CONCEPT</span><p>{session.next.concept.label}</p></aside>
                <article>
                  <span className="software-question-type">Review</span>
                  <h2>{session.next.question?.prompt || session.next.concept.label}</h2>
                  {feedback ? <div className="software-feedback">{feedback}</div> : null}
                  <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Recall without looking…" />
                  <button disabled={!answer.trim() || busy} onClick={() => void submitAnswer()}>{busy ? "Evaluating…" : "Submit answer"}</button>
                </article>
              </div>
            ) : (
              <div className="software-review-list">
                {reviewBusy ? <div className="software-loading">Loading due concepts…</div> : dueReviews.length ? (
                  dueReviews.map((item) => (
                    <article key={`${item.sessionId}-${item.conceptId}`}>
                      <div><strong>{item.label}</strong><p>{item.title} · mastery {Math.round(item.mastery * 100)}%</p></div>
                      <span>{dueLabel(item.nextReviewAt)}</span>
                      <button onClick={() => void startReview(item)}>Review</button>
                    </article>
                  ))
                ) : (
                  <div className="software-empty"><CheckCircle2 size={24}/><strong>Nothing due right now.</strong><p>Due concepts will appear here from your real review schedule.</p></div>
                )}
              </div>
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
