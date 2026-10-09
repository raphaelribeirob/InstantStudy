import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  BookOpen,
  Brain,
  BarChart3,
  Camera,
  CheckCircle2,
  FilePlus2,
  FileText,
  GraduationCap,
  Headphones,
  Home,
  Library,
  MessageCircle,
  Mic,
  Plug,
  Puzzle,
  Search,
  Sparkles,
  Trophy,
  Upload,
  UserRoundPlus,
  Users,
} from "lucide-react";
import {
  askStudyMaterial,
  fileToStudyInput,
  getAudioStudy,
  getDueReviews,
  getRetentionInsights,
  getStudyRoom,
  getStudyGame,
  googleDriveStudyInput,
  importPrivateDriveMaterial,
  importStudyMaterial,
  joinStudyRoom,
  listStudyMaterials,
  prepareStudy,
  createStudyRoom,
  submitStudyAnswer,
  updateStudyRoomProgress,
  type AudioStudy,
  type DueReview,
  type RetentionInsights,
  type StudyGame,
  type StudyMaterial,
  type StudyRoom,
  type StudyMode,
  type StudySummary,
  type TestQuestionType,
} from "./study";
import { agentPresets, mcpUrl } from "./connection";
import { LanguageSwitcher } from "./LanguageSwitcher";
import {
  googleDrivePrivateConfigured,
  pickPrivateGoogleDriveFile,
} from "./googleDrivePicker";
import {
  addInstantStudyFamilyMember,
  getInstantStudyFamily,
  openInstantStudyCheckout,
  removeInstantStudyFamilyMember,
  type InstantStudyFamily,
} from "./instantBilling";
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
  | "insights"
  | "audio"
  | "game"
  | "friends"
  | "family"
  | "plugin";

type SourceType = "paste" | "upload" | "drive" | "audio" | "scan";

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

function dueLabel(value: string, t: TFunction) {
  const date = new Date(value);
  const delta = date.getTime() - Date.now();
  if (delta <= 0) return t("software.dueNow");
  const days = Math.ceil(delta / 86_400_000);
  if (days <= 1) return t("software.dueTomorrow");
  return t("software.dueInDays", { count: days });
}

export function SoftwareApp() {
  const { t, i18n } = useTranslation();
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
  const [insights, setInsights] = useState<RetentionInsights | null>(null);
  const [insightsBusy, setInsightsBusy] = useState(false);
  const [audioStudy, setAudioStudy] = useState<AudioStudy | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("instantstudy.display_name") || "Learner",
  );
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomMessage, setRoomMessage] = useState("");
  const podcastStopRef = useRef(false);
  const [studyGame, setStudyGame] = useState<StudyGame | null>(null);
  const [gameOpenIds, setGameOpenIds] = useState<string[]>([]);
  const [gameMatchedPairs, setGameMatchedPairs] = useState<string[]>([]);
  const [gameMoves, setGameMoves] = useState(0);
  const [gameLocked, setGameLocked] = useState(false);
  const [family, setFamily] = useState<InstantStudyFamily | null>(null);
  const [familyEmail, setFamilyEmail] = useState("");
  const [familyBusy, setFamilyBusy] = useState(false);
  const [familyMessage, setFamilyMessage] = useState("");



  const selected = useMemo(
    () => library.find((item) => item.id === selectedId) ?? library[0] ?? null,
    [library, selectedId],
  );

  function materialFromRoom(value: StudyRoom): StudyMaterial {
    const now = new Date().toISOString();
    return {
      id: `room-${value.code}`,
      learnerId: "",
      title: value.title,
      content: [value.summary, ...value.concepts].join("\n\n"),
      sourceType: "paste",
      sourceNames: [],
      assets: {
        summary: value.summary,
        outline: value.concepts,
        keyConcepts: value.concepts,
        flashcards: [],
        generatedBy: "study-room",
      },
      createdAt: now,
      updatedAt: now,
    };
  }

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

  useEffect(() => {
    if (view !== "insights") return;
    setInsightsBusy(true);
    void getRetentionInsights()
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setInsightsBusy(false));
  }, [view]);

  useEffect(() => {
    if (view !== "audio" || !selected) return;
    setAudioStudy(null);
    void getAudioStudy(selected.id)
      .then(setAudioStudy)
      .catch(() => setAudioStudy(null));
  }, [view, selectedId]);

  useEffect(() => {
    if (view !== "game" || !selected) return;
    setStudyGame(null);
    setGameOpenIds([]);
    setGameMatchedPairs([]);
    setGameMoves(0);
    void getStudyGame(selected.id)
      .then(setStudyGame)
      .catch(() => setStudyGame(null));
  }, [view, selectedId]);

  useEffect(() => {
    if (view !== "family") return;
    setFamilyBusy(true);
    setFamilyMessage("");
    void getInstantStudyFamily()
      .then(setFamily)
      .catch((error) => {
        setFamily(null);
        setFamilyMessage(
          error instanceof Error && error.message === "family_plan_required"
            ? t("software.familyPlanRequired")
            : t("software.signInFamily"),
        );
      })
      .finally(() => setFamilyBusy(false));
  }, [view]);

  useEffect(() => {
    if (view !== "friends" || !room?.code) return;
    const timer = window.setInterval(() => {
      void getStudyRoom(room.code)
        .then(({ room: next }) => setRoom(next))
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [view, room?.code]);

  useEffect(() => {
    return () => {
      podcastStopRef.current = true;
      window.speechSynthesis?.cancel();
    };
  }, []);


  async function createMaterial() {
    setBusy(true);
    setCreateError("");

    try {
      const files =
        sourceType === "upload" || sourceType === "audio" || sourceType === "scan"
          ? await Promise.all(selectedFiles.map(fileToStudyInput))
          : sourceType === "drive"
            ? [googleDriveStudyInput(driveUrl)]
            : [];

      const result = await importStudyMaterial({
        title: title.trim() || undefined,
        sourceType: sourceType === "scan" ? "upload" : sourceType,
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
            ? t("software.testComplete")
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

      if (room?.code) {
        const nextIndex = result.next?.questionIndex ?? session.next?.questionIndex ?? 1;
        const total = result.next?.totalPlanned ?? session.next?.totalPlanned ?? 1;
        void updateStudyRoomProgress({
          code: room.code,
          progress: result.submission?.done ? 1 : Math.min(1, nextIndex / Math.max(1, total)),
          attempts: nextIndex,
        })
          .then(({ room: updated }) => setRoom(updated))
          .catch(() => undefined);
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
    setView("review");
    setBusy(true);
    setFeedback("");
    setAnswer("");
    setSummary(null);
    try {
      setSession(await prepareStudy({
        contentText: item.sourceExcerpt,
        title: item.title,
        mode: "review",
        maxQuestions: 4,
        concepts: [{ label: item.label, sourceExcerpt: item.sourceExcerpt }],
      }));
    } finally {
      setBusy(false);
    }
  }


  function toggleAudioStudy() {
    if (!audioStudy || !("speechSynthesis" in window)) return;
    if (audioPlaying) {
      podcastStopRef.current = true;
      window.speechSynthesis.cancel();
      setAudioPlaying(false);
      return;
    }

    podcastStopRef.current = false;
    setAudioPlaying(true);
    const voices = window.speechSynthesis.getVoices();
    const portuguese = /^Bem-vindo/.test(audioStudy.segments[0]?.text ?? "");
    const localeVoices = voices.filter((voice) => (portuguese ? /^pt(-|_)/i : /^en(-|_)/i).test(voice.lang));
    const hostVoice = localeVoices[0] ?? voices[0];
    const coachVoice =
      localeVoices.find((voice) => voice.name !== hostVoice?.name) ??
      voices.find((voice) => voice.name !== hostVoice?.name) ?? hostVoice;

    const speakAt = (index: number) => {
      if (podcastStopRef.current || !audioStudy.segments[index]) {
        setAudioPlaying(false);
        return;
      }
      const segment = audioStudy.segments[index];
      const utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.rate = segment.speaker === "Host" ? 0.98 : 0.94;
      utterance.pitch = segment.speaker === "Host" ? 1.02 : 0.94;
      utterance.voice = segment.speaker === "Host" ? hostVoice ?? null : coachVoice ?? null;
      utterance.onend = () => speakAt(index + 1);
      utterance.onerror = () => {
        setAudioPlaying(false);
      };
      window.speechSynthesis.speak(utterance);
    };

    speakAt(0);
  }

  async function importPrivateDrive() {
    setBusy(true);
    setCreateError("");
    try {
      const picked = await pickPrivateGoogleDriveFile();
      const result = await importPrivateDriveMaterial({
        fileId: picked.fileId,
        googleAccessToken: picked.accessToken,
        title: title.trim() || picked.name,
      });
      const item = result.material;
      setLibrary((current) => [item, ...current.filter((row) => row.id !== item.id)]);
      setSelectedId(item.id);
      setDriveUrl("");
      setTitle("");
      setView("learn");
      await startMode("learn", item);
    } catch (error) {
      const message = error instanceof Error ? error.message : "google_drive_import_failed";
      if (message !== "google_drive_picker_cancelled") {
        setCreateError(message.replaceAll("_", " "));
      }
    } finally {
      setBusy(false);
    }
  }

  function chooseGameCard(cardId: string) {
    if (!studyGame || gameLocked || gameOpenIds.includes(cardId)) return;
    const card = studyGame.cards.find((item) => item.id === cardId);
    if (!card || gameMatchedPairs.includes(card.pairId)) return;

    const next = [...gameOpenIds, cardId];
    setGameOpenIds(next);
    if (next.length < 2) return;

    setGameMoves((value) => value + 1);
    const [first, second] = next
      .map((id) => studyGame.cards.find((item) => item.id === id))
      .filter(Boolean);
    if (
      first &&
      second &&
      first.pairId === second.pairId &&
      first.kind !== second.kind
    ) {
      setGameMatchedPairs((current) => [...current, first.pairId]);
      setGameOpenIds([]);
      return;
    }

    setGameLocked(true);
    window.setTimeout(() => {
      setGameOpenIds([]);
      setGameLocked(false);
    }, 650);
  }

  async function addFamilyMember() {
    if (!familyEmail.trim()) return;
    setFamilyBusy(true);
    setFamilyMessage("");
    try {
      const next = await addInstantStudyFamilyMember(familyEmail.trim());
      setFamily(next);
      setFamilyEmail("");
      setFamilyMessage(t("software.familyAdded"));
    } catch (error) {
      setFamilyMessage(error instanceof Error ? error.message.replaceAll("_", " ") : t("software.familyAddFailed"));
    } finally {
      setFamilyBusy(false);
    }
  }

  async function removeFamilyMember(email: string) {
    setFamilyBusy(true);
    setFamilyMessage("");
    try {
      setFamily(await removeInstantStudyFamilyMember(email));
    } catch (error) {
      setFamilyMessage(error instanceof Error ? error.message.replaceAll("_", " ") : t("software.familyRemoveFailed"));
    } finally {
      setFamilyBusy(false);
    }
  }

  async function createRoom() {
    if (!selected || !displayName.trim()) return;
    setRoomBusy(true);
    setRoomMessage("");
    localStorage.setItem("instantstudy.display_name", displayName.trim());
    try {
      const result = await createStudyRoom({
        materialId: selected.id,
        displayName: displayName.trim(),
      });
      setRoom(result.room);
      setRoomCode(result.room.code);
      setRoomMessage(t("software.roomCreated"));
    } catch (error) {
      setRoomMessage(error instanceof Error ? error.message : t("software.roomCreateFailed"));
    } finally {
      setRoomBusy(false);
    }
  }

  async function joinRoom() {
    if (!roomCode.trim() || !displayName.trim()) return;
    setRoomBusy(true);
    setRoomMessage("");
    localStorage.setItem("instantstudy.display_name", displayName.trim());
    try {
      const result = await joinStudyRoom({
        code: roomCode.trim(),
        displayName: displayName.trim(),
      });
      setRoom(result.room);
      setRoomCode(result.room.code);
      const shared = materialFromRoom(result.room);
      setLibrary((current) => [shared, ...current.filter((item) => item.id !== shared.id)]);
      setSelectedId(shared.id);
      setRoomMessage(t("software.roomJoined", { title: result.room.title }));
    } catch (error) {
      setRoomMessage(error instanceof Error ? error.message : t("software.roomJoinFailed"));
    } finally {
      setRoomBusy(false);
    }
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
      setCreateError(t("software.microphoneUnavailable"));
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
    <div className={`software-shell software-view-${view}`}>
      <aside className="software-sidebar">
        <a className="software-brand" href="/">
          <span className="software-mark"><i /></span>
          <strong>InstantStudy<span>™</span></strong>
        </a>

        <button className="software-create" onClick={() => setView("create")}>
          <FilePlus2 size={17}/> {t("common.create")}
        </button>

        <nav>
          {navItem("home", view, <Home size={17}/>, t("common.home"), setView)}
          {navItem("library", view, <Library size={17}/>, t("common.library"), setView)}
          <div className="software-nav-label">{t("software.study")}</div>
          {navItem("guide", view, <BookOpen size={17}/>, t("common.guide"), setView)}
          {navItem("flashcards", view, <FileText size={17}/>, t("common.flashcards"), setView)}
          {navItem("learn", view, <Brain size={17}/>, t("common.learn"), setView)}
          {navItem("test", view, <GraduationCap size={17}/>, t("common.test"), setView)}
          {navItem("ask", view, <MessageCircle size={17}/>, t("common.ask"), setView)}
          {navItem("review", view, <BookOpen size={17}/>, t("common.review"), setView)}
          {navItem("insights", view, <BarChart3 size={17}/>, t("common.insights"), setView)}
          {navItem("audio", view, <Headphones size={17}/>, t("common.podcast"), setView)}
          {navItem("game", view, <Puzzle size={17}/>, t("common.studyGame"), setView)}
          {navItem("friends", view, <Users size={17}/>, t("common.friends"), setView)}
          {navItem("family", view, <UserRoundPlus size={17}/>, t("common.family"), setView)}
          <div className="software-nav-label">{t("software.ai")}</div>
          {navItem("plugin", view, <Plug size={17}/>, t("common.plugin"), setView)}
        </nav>

        <div className="software-plan">
          <span>{t("software.freePlan")}</span>
          <small>{t("software.upgradeLimits")}</small>
          <a href="/#pricing">{t("software.viewPlans")}</a>
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
              placeholder={t("software.searchLibrary")}
            />
          </div>
          <LanguageSwitcher compact />
          <span className="software-sync"><CheckCircle2 size={14}/> {t("software.persistentState")}</span>
        </header>

        {view === "home" && (
          <section className="software-page">
            <div className="software-hero">
              <p>{t("software.futureLearning")}</p>
              <h1>{t("software.homeTitle")}</h1>
              <span>{t("software.homeBody")}</span>
              <button onClick={() => setView("create")}><Sparkles size={17}/> {t("software.createMaterial")}</button>
            </div>

            <div className="software-section-head"><h2>{t("software.continueStudying")}</h2><button onClick={() => setView("library")}>{t("software.viewLibrary")}</button></div>
            <div className="software-library-grid">
              {filteredLibrary.length ? filteredLibrary.slice(0, 6).map((item) => (
                <button className="software-material-card" key={item.id} onClick={() => openMaterial(item)}>
                  <span><FileText size={18}/></span>
                  <strong>{item.title}</strong>
                  <small>{new Date(item.updatedAt || item.createdAt).toLocaleDateString(i18n.language)}</small>
                </button>
              )) : (
                <div className="software-empty">
                  <Upload size={24}/>
                  <strong>{t("software.libraryEmptyTitle")}</strong>
                  <p>{t("software.libraryEmptyBody")}</p>
                </div>
              )}
            </div>

            <div className="software-feature-grid">
              <button onClick={() => setView("guide")}><BookOpen/><strong>{t("common.guide")}</strong><span>{t("software.guideDetail")}</span></button>
              <button onClick={() => setView("flashcards")}><FileText/><strong>{t("common.flashcards")}</strong><span>{t("software.flashcardsDetail")}</span></button>
              <button onClick={() => setView("learn")}><Brain/><strong>{t("common.learn")}</strong><span>{t("software.learnDetail")}</span></button>
              <button onClick={() => setView("test")}><GraduationCap/><strong>{t("common.test")}</strong><span>{t("software.testDetail")}</span></button>
              <button onClick={() => setView("insights")}><BarChart3/><strong>Retention Insights</strong><span>Mastery, streaks and weak concepts</span></button>
              <button onClick={() => setView("audio")}><Headphones/><strong>{t("common.podcast")}</strong><span>{t("software.podcastBody")}</span></button>
              <button onClick={() => setView("game")}><Puzzle/><strong>{t("common.studyGame")}</strong><span>{t("software.matchKnowledge")}</span></button>
              <button onClick={() => setView("friends")}><Users/><strong>{t("common.friends")}</strong><span>{t("software.studyTogether")}</span></button>
              <button onClick={() => setView("family")}><UserRoundPlus/><strong>{t("common.family")}</strong><span>{t("software.familyKicker")}</span></button>
            </div>
          </section>
        )}

        {view === "library" && (
          <section className="software-page">
            <div className="software-title-row"><div><p>{t("software.yourMaterial")}</p><h1>{t("software.titleLibrary")}</h1></div><button onClick={() => setView("create")}>{t("common.create")}</button></div>
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
            <div className="software-title-row"><div><p>{t("software.createKicker")}</p><h1>{t("software.createTitle")}</h1></div></div>
            <div className="software-import-tabs">
              {(["paste","upload","drive","audio","scan"] as SourceType[]).map((type) => (
                <button
                  key={type}
                  className={sourceType === type ? "active" : ""}
                  onClick={() => {
                    setSourceType(type);
                    setCreateError("");
                  }}
                >
                  {type === "paste" ? t("landing.paste") : type === "upload" ? t("landing.upload") : type === "drive" ? t("landing.drive") : type === "audio" ? t("landing.audio") : t("landing.scan")}
                </button>
              ))}
            </div>
            <div className="software-editor">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("software.titleOptional")} />

              {sourceType === "paste" && (
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("software.pastePlaceholder")} />
              )}

              {sourceType === "upload" && (
                <label className="software-upload-control">
                  <Upload size={20}/>
                  <strong>{selectedFiles.length ? selectedFiles.map((file) => file.name).join(", ") : t("software.chooseUpload")}</strong>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.pptx,.txt,.md,.csv,text/*,application/pdf"
                    onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []).slice(0, 10))}
                  />
                </label>
              )}

              {sourceType === "drive" && (
                <div className="software-drive-import">
                  <button
                    type="button"
                    disabled={!googleDrivePrivateConfigured() || busy}
                    onClick={() => void importPrivateDrive()}
                  >
                    <Upload size={17}/> {t("software.privateDrive")}
                  </button>
                  <span>
                    {googleDrivePrivateConfigured()
                      ? t("software.driveScoped")
                      : t("software.driveConfig")}
                  </span>
                  <div className="software-drive-divider">{t("software.publicLink")}</div>
                  <input
                    value={driveUrl}
                    onChange={(event) => setDriveUrl(event.target.value)}
                    placeholder={t("software.publicDrivePlaceholder")}
                  />
                </div>
              )}

              {sourceType === "scan" && (
                <label className="software-upload-control">
                  <Camera size={20}/>
                  <strong>{selectedFiles[0]?.name || t("software.scanPrompt")}</strong>
                  <span>{t("software.scanDetail")}</span>
                  <input
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.webp"
                    capture="environment"
                    onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []).slice(0, 1))}
                  />
                </label>
              )}

              {sourceType === "audio" && (
                <div className="software-audio-import">
                  <button type="button" onClick={() => void toggleRecording()}>
                    <Mic size={17}/> {recording ? t("software.stopRecording") : t("software.recordLecture")}
                  </button>
                  <label>
                    {t("software.uploadAudio")}
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
                    ? t("software.characters", { value: draft.length.toLocaleString(i18n.language) })
                    : t("software.webUploadLimit")}
                </span>
                <button disabled={!hasCreateInput || busy} onClick={() => void createMaterial()}>
                  {busy ? t("software.building") : t("software.generateMaterial")}
                </button>
              </div>
            </div>
            <div className="software-output-preview">
              <span>{t("software.fromOneSource")}</span>
              <div><strong>{t("common.guide")}</strong><small>{t("software.guideDetail")}</small></div>
              <div><strong>{t("common.flashcards")}</strong><small>{t("software.flashcardsDetail")}</small></div>
              <div><strong>{t("common.learn")}</strong><small>{t("software.learnDetail")}</small></div>
              <div><strong>{t("common.test")}</strong><small>{t("software.testDetail")}</small></div>
            </div>
          </section>
        )}

        {["guide","flashcards","learn","test","ask"].includes(view) && (
          <section className="software-page">
            {!selected ? (
              <div className="software-empty large"><Brain size={28}/><h2>{t("software.addMaterialFirst")}</h2><button onClick={() => setView("create")}>{t("software.createMaterial")}</button></div>
            ) : (
              <>
                <div className="software-workspace-head">
                  <div><p>{selected.title}</p><h1>{view === "test" ? t("common.test") : view === "guide" ? t("common.guide") : view === "flashcards" ? t("common.flashcards") : view === "learn" ? t("common.learn") : t("common.ask")}</h1></div>
                  <div className="software-mode-switch">
                    <button onClick={() => setView("guide")}>{t("common.guide")}</button>
                    <button onClick={() => setView("flashcards")}>{t("common.flashcards")}</button>
                    <button onClick={() => { setView("learn"); void startMode("learn"); }}>{t("common.learn")}</button>
                    <button onClick={() => { setView("test"); setSession(null); setSummary(null); }}>{t("common.test")}</button>
                    <button onClick={() => setView("ask")}>{t("common.ask")}</button>
                  </div>
                </div>

                {view === "guide" && (
                  <div className="software-guide">
                    <article>
                      <span>{t("software.summary")}</span>
                      <h2>{selected.title}</h2>
                      <p>{selected.assets.summary}</p>
                    </article>
                    <aside>
                      <span>{t("software.keyIdeas")}</span>
                      {selected.assets.outline.map((idea, index) => (
                        <div key={`${index}-${idea}`}><b>{String(index + 1).padStart(2, "0")}</b><p>{idea}</p></div>
                      ))}
                      <span>{t("software.keyConcepts")}</span>
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
                        <p>{flippedCard === card.id ? card.back : t("software.clickReveal")}</p>
                      </article>
                    ))}
                  </div>
                )}

                {view === "test" && !session && !busy && !summary && (
                  <div className="software-test-builder">
                    <h2>{t("software.buildTest")}</h2>
                    <label>
                      {t("software.questions")}
                      <select value={testQuestions} onChange={(event) => setTestQuestions(Number(event.target.value))}>
                        {[10,20,30,40].map((count) => <option key={count} value={count}>{count}</option>)}
                      </select>
                    </label>
                    <label>
                      {t("software.timeLimit")}
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
                    <button onClick={() => void startMode("test")}>{t("software.startTest")}</button>
                  </div>
                )}

                {(view === "learn" || view === "test") && (session || busy || summary) && (
                  <div className="software-study-stage">
                    <aside>
                      <span>{t("software.studyGuide")}</span>
                      <p>{selected.assets.summary}</p>
                    </aside>
                    <article>
                      {busy ? <div className="software-loading">{t("software.buildingSession")}</div> : summary ? (
                        <div className="software-test-result">
                          <span>{t("software.sessionComplete")}</span>
                          <h2>{summary.testResult ? `${summary.testResult.scorePercent ?? 0}%` : t("software.roundComplete")}</h2>
                          <p>
                            {summary.testResult
                              ? `${summary.testResult.answered ?? 0} of ${summary.testResult.totalQuestions ?? testQuestions} questions answered.`
                              : t("software.averageMastery", { value: Math.round((summary.averageMastery ?? 0) * 100) })}
                          </p>
                          {summary.weakConcepts?.length ? (
                            <div>
                              <strong>{t("software.reviewMistakes")}</strong>
                              {summary.weakConcepts.map((concept) => (
                                <p key={concept.id}>{concept.label} · {Math.round((concept.mastery ?? 0) * 100)}%</p>
                              ))}
                            </div>
                          ) : null}
                          <button onClick={() => { setSession(null); setSummary(null); }}>{t("software.startAnother")}</button>
                        </div>
                      ) : session?.next?.concept ? (
                        <>
                          <span className="software-question-type">
                            {t("software.questionProgress", { current: session.next.questionIndex ?? "–", total: session.next.totalPlanned ?? "–" })} · {session.next.questionPolicy?.type || "adaptive"}
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
                                placeholder={t("software.typeAnswer")}
                                disabled={busy}
                              />
                              <button disabled={!answer.trim() || busy} onClick={() => void submitAnswer()}>
                                {busy ? t("software.evaluating") : t("software.submitAnswer")}
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <h2>{t("software.sessionDone")}</h2>
                          <button onClick={() => void startMode(view === "test" ? "test" : "learn")}>{t("software.startAgain")}</button>
                        </>
                      )}
                    </article>
                  </div>
                )}

                {view === "learn" && !session && !busy && !summary && (
                  <div className="software-study-stage">
                    <aside><span>{t("software.studyGuide")}</span><p>{selected.assets.summary}</p></aside>
                    <article><h2>{t("software.readyStudy")}</h2><p>{t("software.readyStudyBody")}</p><button onClick={() => void startMode("learn")}>{t("software.startLearn")}</button></article>
                  </div>
                )}

                {view === "ask" && (
                  <div className="software-ask">
                    <div className="software-ask-context"><Sparkles size={18}/><span>{t("software.groundedIn", { title: selected.title })}</span></div>
                    {askAnswer ? (
                      <div className="software-ask-answer">
                        <span>INSTANTSTUDY</span>
                        <p>{askAnswer}</p>
                        <button onClick={() => { setView("learn"); void startMode("learn"); }}>{t("software.quizMe")}</button>
                      </div>
                    ) : (
                      <div className="software-chat-empty"><MessageCircle size={28}/><h2>{t("software.askAnything")}</h2><p>{t("software.askBody")}</p></div>
                    )}
                    <div className="software-ask-box">
                      <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !askBusy) void askMaterial();
                        }}
                        placeholder={t("software.askPlaceholder")}
                      />
                      <button disabled={!question.trim() || askBusy} onClick={() => void askMaterial()}>
                        {askBusy ? t("software.thinking") : t("common.ask")}
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
              <div><p>{t("software.rightTimeRecall")}</p><h1>{t("common.review")}</h1></div>
            </div>
            {session?.next?.concept ? (
              <div className="software-study-stage">
                <aside><span>{t("software.dueConcept")}</span><p>{session.next.concept.label}</p></aside>
                <article>
                  <span className="software-question-type">{t("common.review")}</span>
                  <h2>{session.next.question?.prompt || session.next.concept.label}</h2>
                  {feedback ? <div className="software-feedback">{feedback}</div> : null}
                  <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={t("software.recallPlaceholder")} />
                  <button disabled={!answer.trim() || busy} onClick={() => void submitAnswer()}>{busy ? t("software.evaluating") : t("software.submitAnswer")}</button>
                </article>
              </div>
            ) : (
              <div className="software-review-list">
                {reviewBusy ? <div className="software-loading">{t("software.loadingDue")}</div> : dueReviews.length ? (
                  dueReviews.map((item) => (
                    <article key={`${item.sessionId}-${item.conceptId}`}>
                      <div><strong>{item.label}</strong><p>{item.title} · mastery {Math.round(item.mastery * 100)}%</p></div>
                      <span>{dueLabel(item.nextReviewAt, t)}</span>
                      <button onClick={() => void startReview(item)}>{t("common.review")}</button>
                    </article>
                  ))
                ) : (
                  <div className="software-empty"><CheckCircle2 size={24}/><strong>{t("software.nothingDue")}</strong><p>{t("software.nothingDueBody")}</p></div>
                )}
              </div>
            )}
          </section>
        )}

        {view === "insights" && (
          <section className="software-page">
            <div className="software-title-row">
              <div><p>{t("software.retentionKicker")}</p><h1>{t("common.insights")}</h1></div>
            </div>
            {insightsBusy ? (
              <div className="software-loading">{t("software.calculatingRetention")}</div>
            ) : insights ? (
              <>
                <div className="software-insight-grid">
                  <article><span>{t("software.mastery")}</span><strong>{Math.round(insights.averageMastery * 100)}%</strong><small>{t("software.currentAverage")}</small></article>
                  <article><span>{t("software.retention")}</span><strong>{insights.retentionScore == null ? "—" : `${Math.round(insights.retentionScore * 100)}%`}</strong><small>{t("software.conceptsAbove", { count: insights.delayedReviewAttempts })}</small></article>
                  <article><span>{t("software.streak")}</span><strong>{insights.streakDays}</strong><small>{t("software.studyDays")}</small></article>
                  <article><span>{t("software.dueNow")}</span><strong>{insights.dueNow}</strong><small>{t("software.conceptsReview")}</small></article>
                  <article><span>{t("software.answers")}</span><strong>{insights.attempts}</strong><small>{t("software.activeRecallAttempts")}</small></article>
                  <article><span>{t("software.studyTime")}</span><strong>{insights.minutesStudied}m</strong><small>{t("software.acrossSessions", { count: insights.sessions })}</small></article>
                </div>

                <div className="software-insight-columns">
                  <article>
                    <span>{t("software.weakConcepts")}</span>
                    {insights.weakConcepts.length ? insights.weakConcepts.map((concept) => (
                      <div key={concept.label}>
                        <strong>{concept.label}</strong>
                        <b>{Math.round(concept.mastery * 100)}%</b>
                      </div>
                    )) : <p>{t("software.noWeak")}</p>}
                  </article>
                  <article>
                    <span>{t("software.achievements")}</span>
                    {insights.charms.map((charm) => (
                      <div key={charm.id} className={charm.unlocked ? "unlocked" : ""}>
                        <Trophy size={18}/>
                        <span><strong>{charm.title}</strong><small>{charm.description}</small></span>
                      </div>
                    ))}
                  </article>
                </div>

                <div className="software-activity-strip">
                  {insights.activity7d.map((day) => (
                    <div key={day.date}>
                      <span>{new Date(day.date + "T00:00:00Z").toLocaleDateString(undefined,{weekday:"short"})}</span>
                      <i style={{height: Math.max(6, Math.min(80, day.attempts * 7))}} />
                      <small>{day.attempts}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="software-empty"><BarChart3/><strong>{t("software.noHistory")}</strong><p>{t("software.noHistoryBody")}</p></div>
            )}
          </section>
        )}

        {view === "audio" && (
          <section className="software-page">
            <div className="software-title-row">
              <div><p>{t("software.listenRecall")}</p><h1>{t("common.podcast")}</h1></div>
            </div>
            {!selected ? (
              <div className="software-empty"><Headphones/><strong>{t("software.selectMaterial")}</strong><button onClick={() => setView("library")}>{t("software.openLibrary")}</button></div>
            ) : audioStudy ? (
              <div className="software-audio-study">
                <aside>
                  <Headphones size={28}/>
                  <strong>{audioStudy.title}</strong>
                  <span>~{audioStudy.estimatedMinutes} min · {t("software.podcastBody")}</span>
                  <button onClick={toggleAudioStudy}>{audioPlaying ? t("software.stopPodcast") : t("software.playPodcast")}</button>
                </aside>
                <article>
                  {audioStudy.segments.map((segment, index) => (
                    <div key={`${index}-${segment.speaker}`} className={segment.speaker === "Coach" ? "recall" : ""}>
                      <span>{segment.speaker}</span>
                      <p>{segment.text}</p>
                    </div>
                  ))}
                </article>
              </div>
            ) : (
              <div className="software-loading">{t("software.buildingPodcast", { title: selected.title })}</div>
            )}
          </section>
        )}

        {view === "game" && (
          <section className="software-page">
            <div className="software-title-row">
              <div><p>{t("software.activeRecallGame")}</p><h1>{t("software.matchKnowledge")}</h1></div>
            </div>
            {!selected ? (
              <div className="software-empty"><Puzzle/><strong>{t("software.selectMaterial")}</strong><button onClick={() => setView("library")}>{t("software.openLibrary")}</button></div>
            ) : studyGame ? (
              <>
                <div className="software-game-status">
                  <span>{t("software.pairs", { matched: gameMatchedPairs.length, total: studyGame.pairCount })}</span>
                  <strong>{gameMatchedPairs.length === studyGame.pairCount ? t("software.completeMoves", { count: gameMoves }) : t("software.moves", { count: gameMoves })}</strong>
                  <button onClick={() => { setGameOpenIds([]); setGameMatchedPairs([]); setGameMoves(0); }}>{t("software.reset")}</button>
                </div>
                <div className="software-game-grid">
                  {studyGame.cards.map((card) => {
                    const matched = gameMatchedPairs.includes(card.pairId);
                    const open = matched || gameOpenIds.includes(card.id);
                    return (
                      <button
                        key={card.id}
                        className={matched ? "matched" : open ? "open" : ""}
                        disabled={matched || gameLocked}
                        onClick={() => chooseGameCard(card.id)}
                      >
                        <span>{open ? (card.kind === "prompt" ? t("software.questionCard") : t("software.answerCard")) : t("software.recall")}</span>
                        <strong>{open ? card.text : t("software.reveal")}</strong>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="software-loading">{t("software.buildingGame", { title: selected.title })}</div>
            )}
          </section>
        )}

        {view === "friends" && (
          <section className="software-page">
            <div className="software-title-row">
              <div><p>{t("software.studyTogether")}</p><h1>{t("common.friends")}</h1></div>
            </div>

            {!room ? (
              <div className="software-room-setup">
                <article>
                  <Users size={26}/>
                  <h2>{t("software.createRoom")}</h2>
                  <p>Share the current material and compare study progress without exposing your account credentials.</p>
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={t("software.yourName")} />
                  <button disabled={!selected || roomBusy || !displayName.trim()} onClick={() => void createRoom()}>
                    {roomBusy ? t("software.creating") : selected ? t("software.createRoomFor", { title: selected.title }) : t("software.selectMaterialFirst")}
                  </button>
                </article>
                <article>
                  <Users size={26}/>
                  <h2>{t("software.joinRoom")}</h2>
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" />
                  <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder={t("software.roomCode")} />
                  <button disabled={!roomCode.trim() || roomBusy || !displayName.trim()} onClick={() => void joinRoom()}>
                    {roomBusy ? t("software.joining") : t("software.joinRoom")}
                  </button>
                </article>
              </div>
            ) : (
              <div className="software-room">
                <div className="software-room-head">
                  <div><span>{t("software.room")}</span><strong>{room.code}</strong><small>{room.title}</small></div>
                  <button onClick={() => navigator.clipboard?.writeText(room.code)}>{t("software.copyCode")}</button>
                </div>
                <p>{room.summary}</p>
                <div className="software-room-members">
                  {room.members.map((member) => (
                    <article key={member.learnerId}>
                      <div><strong>{member.displayName}</strong><small>{member.attempts} answers</small></div>
                      <div className="software-room-progress"><i style={{width:`${Math.round(member.progress * 100)}%`}} /></div>
                      <b>{Math.round(member.progress * 100)}%</b>
                    </article>
                  ))}
                </div>
                <button className="software-room-study" onClick={() => {
                  const shared = materialFromRoom(room);
                  setLibrary((current) => [shared, ...current.filter((item) => item.id !== shared.id)]);
                  setSelectedId(shared.id);
                  setView("learn");
                  void startMode("learn", shared);
                }}>
                  {t("software.studyTogetherAction")}
                </button>
              </div>
            )}
            {roomMessage ? <div className="software-feedback">{roomMessage}</div> : null}
          </section>
        )}

        {view === "family" && (
          <section className="software-page">
            <div className="software-title-row">
              <div><p>{t("software.familyKicker")}</p><h1>{t("common.family")}</h1></div>
            </div>
            {familyBusy && !family ? (
              <div className="software-loading">{t("software.familyLoading")}</div>
            ) : family ? (
              <div className="software-family">
                <div className="software-family-head">
                  <div><span>{t("software.seats")}</span><strong>{family.seats.used} / {family.seats.total}</strong><small>{t("software.separateProgress")}</small></div>
                </div>
                <div className="software-family-add">
                  <input
                    value={familyEmail}
                    onChange={(event) => setFamilyEmail(event.target.value)}
                    placeholder="family.member@example.com"
                    type="email"
                  />
                  <button disabled={familyBusy || !familyEmail.trim() || family.seats.remaining <= 0} onClick={() => void addFamilyMember()}>
                    Add member
                  </button>
                </div>
                <div className="software-family-members">
                  <article><strong>{family.owner}</strong><span>{t("software.ownerUnlimited")}</span></article>
                  {family.members.map((member) => (
                    <article key={member.member_email}>
                      <strong>{member.member_email}</strong>
                      <span>{t("software.memberUnlimited")}</span>
                      <button disabled={familyBusy} onClick={() => void removeFamilyMember(member.member_email)}>{t("software.remove")}</button>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="software-family-upgrade">
                <UserRoundPlus size={32}/>
                <h2>{t("software.familyUpgradeTitle")}</h2>
                <p>{t("software.familyUpgradeBody")}</p>
                <button onClick={() => void openInstantStudyCheckout("family", true)}>{t("software.chooseFamily")}</button>
              </div>
            )}
            {familyMessage ? <div className="software-feedback">{familyMessage}</div> : null}
          </section>
        )}

        {view === "plugin" && (
          <section className="software-page">
            <div className="software-title-row"><div><p>{t("software.pluginKicker")}</p><h1>{t("software.pluginTitle")}</h1></div></div>
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
