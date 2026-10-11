import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import SiriOrb from "./components/smoothui/SiriOrb";
import { useRealtimeTutor } from "./useRealtimeTutor";
import { useAudioAmplitude, type AIState } from "./components/smoothui/ai-core";
import { ArrowRight, AudioLines, BookOpen, Check, Mic, MicOff, RotateCcw, Volume2, VolumeX } from "lucide-react";
import {
  getDueReviews,
  prepareStudy,
  submitStudyAnswer,
  type DueReview,
  type PreparedStudy,
  type StudyMaterial,
  type StudyQuestion,
  type StudySummary,
} from "./study";
import "./orbita.css";

type OrbState = "ready" | "thinking" | "speaking" | "listening" | "success" | "repair";
type RecognitionResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

type Props = {
  material: StudyMaterial | null;
  onCreateMaterial: () => void;
};

export function OrbitaReview({ material, onCreateMaterial }: Props) {
  const { i18n } = useTranslation();
  const pt = i18n.language.toLowerCase().startsWith("pt");
  const locale = pt ? "pt-BR" : "en-US";
  const copy = (portuguese: string, english: string) => (pt ? portuguese : english);
  const [due, setDue] = useState<DueReview[]>([]);
  const realtimeTutor = useRealtimeTutor();
  const [dueLoading, setDueLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<OrbState>("ready");
  const [session, setSession] = useState<PreparedStudy | null>(null);
  const [question, setQuestion] = useState<StudyQuestion | null>(null);
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [activeTitle, setActiveTitle] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const requestRef = useRef(false);
  const { amplitude, start: startAudioMeter, stop: stopAudioMeter } = useAudioAmplitude();
  const speechAvailable = typeof window !== "undefined" && "speechSynthesis" in window;
  const speechWindow = typeof window !== "undefined" ? (window as SpeechWindow) : null;
  const recognitionAvailable = Boolean(speechWindow?.SpeechRecognition || speechWindow?.webkitSpeechRecognition);

  async function refreshDue() {
    setDueLoading(true);
    try {
      setDue(await getDueReviews(24));
    } catch (e) {
      setError(e instanceof Error ? e.message : copy("Falha ao carregar revisões.", "Could not load reviews."));
    } finally {
      setDueLoading(false);
    }
  }

  useEffect(() => {
    void refreshDue();
    return () => {
      recognitionRef.current?.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function stopVoice() {
    if (speechAvailable) window.speechSynthesis.cancel();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopAudioMeter();
    setState("ready");
  }

  useEffect(() => {
    if (!voiceEnabled || !question?.question?.prompt || !speechAvailable) return;
    const utterance = new SpeechSynthesisUtterance(question.question.prompt);
    utterance.lang = locale;
    utterance.rate = 0.95;
    utterance.onstart = () => setState("speaking");
    utterance.onend = () => setState("ready");
    utterance.onerror = () => setState("ready");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [question?.question?.prompt, voiceEnabled, locale]);

  async function begin(item?: DueReview) {
    if (requestRef.current) return;
    if (!item && !material) return;
    stopVoice();
    realtimeTutor.stop();
    requestRef.current = true;
    setBusy(true);
    setState("thinking");
    setError("");
    setFeedback("");
    setAnswer("");
    setSummary(null);
    setQuestion(null);
    setSession(null);
    setActiveTitle(item?.title || material?.title || "");
    try {
      const prepared = await prepareStudy({
        contentText: item?.sourceExcerpt || material?.content || "",
        title: item?.title || material?.title,
        mode: "review",
        maxQuestions: item ? 4 : 8,
        concepts: item ? [{ label: item.label, sourceExcerpt: item.sourceExcerpt }] : undefined,
      });
      if (prepared.localFallback || !prepared.studySessionId || !prepared.next || prepared.next.done) {
        throw new Error(copy("Motor de revisão indisponível. Tente novamente.", "Review engine unavailable. Please try again."));
      }
      setSession(prepared);
      setQuestion(prepared.next);
      setState("ready");
    } catch (e) {
      setState("ready");
      setError(e instanceof Error ? e.message : copy("Não foi possível iniciar.", "Could not start review."));
    } finally {
      requestRef.current = false;
      setBusy(false);
    }
  }

  async function submit(value = answer) {
    if (requestRef.current || !value.trim() || !session?.studySessionId || !question?.concept?.id) return;
    stopVoice();
    realtimeTutor.stop();
    requestRef.current = true;
    setBusy(true);
    setState("thinking");
    setError("");
    try {
      const result = await submitStudyAnswer({
        studySessionId: session.studySessionId,
        conceptId: question.concept.id,
        userAnswer: value.trim(),
      });
      const score = result.grade?.correctness ?? 0;
      setFeedback(result.grade?.feedback || copy("Resposta registrada.", "Answer recorded."));
      setAnswer("");
      const done = result.submission?.done || !result.next || result.next.done;
      if (done) {
        setSummary(result.submission?.summary || { sessionId: session.studySessionId });
        setQuestion(null);
        void refreshDue();
      } else {
        setQuestion(result.next || null);
      }
      setState(score >= 0.85 ? "success" : "repair");
    } catch (e) {
      setState("ready");
      setError(e instanceof Error ? e.message : copy("Falha ao avaliar resposta.", "Could not evaluate the answer."));
    } finally {
      requestRef.current = false;
      setBusy(false);
    }
  }

  function toggleNarration() {
    if (voiceEnabled) stopVoice();
    setVoiceEnabled(!voiceEnabled);
  }

  function toggleDictation() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setState("ready");
      return;
    }
    if (realtimeTutor.active) return;
    const SpeechConstructor = speechWindow?.SpeechRecognition || speechWindow?.webkitSpeechRecognition;
    if (!SpeechConstructor || busy || !question) return;
    if (speechAvailable) window.speechSynthesis.cancel();
    const recognition = new SpeechConstructor();
    recognition.lang = locale;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      if (transcript.trim()) setAnswer(transcript.trim());
    };
    recognition.onerror = () => {
      stopAudioMeter();
      setState("ready");
      setError(copy("Microfone indisponível. Digite sua resposta.", "Microphone unavailable. Type your answer."));
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      stopAudioMeter();
      setState("ready");
    };
    recognitionRef.current = recognition;
    setError("");
    try {
      recognition.start();
      void startAudioMeter().then(() => {
        // If recognition was stopped during the permission prompt, release the microphone.
        if (recognitionRef.current !== recognition) stopAudioMeter();
      });
      setState("listening");
    } catch {
      recognitionRef.current = null;
      stopAudioMeter();
      setState("ready");
      setError(copy("Microfone indisponível neste navegador.", "Microphone unavailable in this browser."));
    }
  }

  const smoothState: AIState = realtimeTutor.state === "connecting" || realtimeTutor.state === "thinking" ? "thinking" : realtimeTutor.state === "speaking" ? "streaming" : realtimeTutor.state === "listening" ? "listening" : realtimeTutor.state === "error" ? "error" : state === "ready" ? "idle" : state === "speaking" ? "streaming" : state === "success" ? "done" : state === "repair" ? "error" : state;
  const currentLabel = question?.concept?.label || "";
  const showIntro = !session && !summary;
  const dots = due.slice(0, 6);
  const stateLabel: Record<OrbState, string> = {
    ready: copy("Pronta para revisar", "Ready to review"),
    thinking: copy("Analisando", "Evaluating"),
    speaking: copy("Falando", "Speaking"),
    listening: copy("Ouvindo", "Listening"),
    success: copy("Memória fortalecida", "Memory strengthened"),
    repair: copy("Reforço necessário", "Needs reinforcement"),
  };

  return (
    <section className="orbita-page">
      <header className="orbita-heading">
        <div>
          <p>INSTANTSTUDY / {copy("REVISÃO ATIVA", "ACTIVE RECALL")}</p>
          <h1>Órbita<span className="orbita-heading-dot">.</span></h1>
          <span>{copy(
            "Seu conhecimento em movimento. Revise o que está enfraquecendo — conversando ou escrevendo.",
            "Knowledge in motion. Recall what is fading, by speaking or typing.",
          )}</span>
        </div>
        <div className="orbita-count"><strong>{dueLoading ? "—" : due.length}</strong><span>{copy("conceitos para revisar", "concepts due")}</span></div>
      </header>

      <div className="orbita-layout">
        <div className={"orbita-stage orbita-state-" + state}>
          <div className="orbita-galaxy" role="img" aria-label={copy("Órbita de memória com conceitos a revisar", "Memory orbit with due concepts")}>
            <div className="orbita-ring orbita-ring-outer" />
            <div className="orbita-ring orbita-ring-middle" />
            <div className="orbita-ring orbita-ring-inner" />
            {dots.map((item, index) => (
              <button
                className={"orbita-satellite" + (currentLabel === item.label ? " orbita-satellite-active" : "")}
                style={{ "--angle": String(index * 60 - 90) + "deg" } as CSSProperties}
                type="button"
                title={item.label}
                aria-label={copy("Revisar: ", "Review: ") + item.label}
                key={item.sessionId + item.conceptId}
                onClick={() => void begin(item)}
                disabled={busy}
              ><span /></button>
            ))}
            <div className="orbita-siri-wrap" aria-hidden="true">
              <SiriOrb size="205px" state={smoothState} amplitude={realtimeTutor.active ? realtimeTutor.amplitude : amplitude} colors={{ bg: "#fdfcfc", c1: "#0447ff", c2: "#ff4704", c3: "#bda9d8", c4: "#f7baa4" }} />
            </div>
          </div>
          <div className="orbita-status" role="status" aria-live="polite"><span className="orbita-status-indicator" /> {stateLabel[state]}</div>
          <p className="orbita-stage-note">{copy("Cada ponto representa um conceito pendente.", "Each point represents a concept due for recall.")}</p>
          <div className="orbita-legend">
            <span><i className="orbita-key-due" />{copy("Revisar", "Due")}</span>
            <span><i className="orbita-key-focus" />{copy("Em foco", "In focus")}</span>
            <span><i className="orbita-key-strong" />{copy("Memória forte", "Strong memory")}</span>
          </div>
        </div>

        <div className="orbita-content">
          {showIntro ? (
            <div className="orbita-card">
              <span className="orbita-eyebrow">{copy("COMECE SUA SESSÃO", "START YOUR SESSION")}</span>
              <h2>{copy("Lembrar é praticar.", "Remember by retrieving.")}</h2>
              <p>{copy(
                "A Órbita escolhe conceitos para revisão e pergunta um de cada vez. Suas respostas alimentam o motor de aprendizagem do InstantStudy.",
                "Órbita selects concepts for review and asks one at a time. Your answers feed the InstantStudy learning engine.",
              )}</p>
              {due.length > 0 ? (
                <button className="orbita-primary" type="button" onClick={() => void begin(due[0])} disabled={busy}>
                  {copy("Revisar agora", "Review now")} <ArrowRight size={18} />
                </button>
              ) : material ? (
                <button className="orbita-primary" type="button" onClick={() => void begin()} disabled={busy}>
                  {copy("Praticar ", "Practice ") + material.title} <ArrowRight size={18} />
                </button>
              ) : (
                <button className="orbita-primary" type="button" onClick={onCreateMaterial}>
                  {copy("Adicionar material", "Add material")} <BookOpen size={18} />
                </button>
              )}
              {due.length === 0 && !dueLoading && (
                <p className="orbita-note">{copy(
                  "Nenhuma revisão programada para agora. Você ainda pode praticar um material da biblioteca.",
                  "Nothing scheduled right now. You can still practice material from your library.",
                )}</p>
              )}
              <div className="orbita-features">
                <span><Check size={15} /> {copy("Recuperação ativa", "Active recall")}</span>
                <span><Check size={15} /> {copy("Perguntas adaptativas", "Adaptive questions")}</span>
                <span><Check size={15} /> {copy("Histórico persistente", "Persistent history")}</span>
              </div>
            </div>
          ) : summary && !question ? (
            <div className="orbita-card">
              <span className="orbita-eyebrow">{copy("SESSÃO CONCLUÍDA", "SESSION COMPLETE")}</span>
              <h2>{copy("Você fortaleceu sua memória.", "You strengthened your memory.")}</h2>
              <p>{copy("Sua revisão foi registrada. O próximo intervalo é calculado pelo motor de estudo.", "Your answers were recorded. The study engine calculates your next interval.")}</p>
              {typeof summary.averageMastery === "number" && <div className="orbita-score"><strong>{Math.round(summary.averageMastery * 100)}%</strong><span>{copy("domínio médio", "average mastery")}</span></div>}
              {feedback && <div className="orbita-feedback" role="status">{feedback}</div>}
              <button className="orbita-primary" type="button" onClick={() => { setSession(null); setSummary(null); setFeedback(""); setState("ready"); }}>
                <RotateCcw size={17} /> {copy("Próxima revisão", "Next review")}
              </button>
            </div>
          ) : question ? (
            <div className="orbita-card orbita-question-card">
              <span className="orbita-eyebrow">{activeTitle} · {copy("PERGUNTA", "QUESTION")} {question.questionIndex || 1}/{question.totalPlanned || 4}</span>
              <span className="orbita-topic">{currentLabel}</span>
              <h2>{question.question?.prompt || currentLabel}</h2>
              {feedback && <div className="orbita-feedback" role="status">{feedback}</div>}
              {question.question?.choices?.length ? (
                <div className="orbita-options">{question.question.choices.map((choice) =>
                  <button type="button" key={choice.label + choice.value} onClick={() => void submit(choice.value)} disabled={busy}>{choice.label}. {choice.value}</button>,
                )}</div>
              ) : (
                <label className="orbita-answer-label">
                  {copy("Sua resposta (sem consultar o material)", "Your answer (without looking up the material)")}
                  <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={busy} rows={4}
                    placeholder={copy("Explique com suas palavras…", "Explain in your own words…")} />
                </label>
              )}
              <div className="orbita-controls">
                {recognitionAvailable && !question.question?.choices?.length && (
                  <button className="orbita-secondary" type="button" onClick={toggleDictation} disabled={busy} aria-pressed={state === "listening"}>
                    {state === "listening" ? <MicOff size={17} /> : <Mic size={17} />}
                    {state === "listening" ? copy("Parar", "Stop") : copy("Responder por voz", "Speak answer")}
                  </button>
                )}
                {speechAvailable && (
                  <button className="orbita-secondary" type="button" onClick={toggleNarration} aria-pressed={voiceEnabled}>
                    {voiceEnabled ? <VolumeX size={17} /> : <Volume2 size={17} />}
                    {voiceEnabled ? copy("Desligar voz", "Mute") : copy("Ouvir perguntas", "Read aloud")}
                  </button>
                )}
                {!question.question?.choices?.length && (
                  <button className="orbita-primary" type="button" onClick={() => void submit()} disabled={busy || !answer.trim()}>
                    {busy ? copy("Avaliando…", "Evaluating…") : copy("Enviar resposta", "Submit answer")} <ArrowRight size={17} />
                  </button>
                )}
              </div>
              {recognitionAvailable && <p className="orbita-privacy"><AudioLines size={14} /> {copy(
                "A transcrição de voz depende do serviço do navegador. Nada é gravado automaticamente pelo InstantStudy.",
                "Speech transcription depends on your browser's service. InstantStudy does not automatically record audio.",
              )}</p>}
            </div>
          ) : (
            <div className="orbita-card"><p>{copy("Preparando revisão…", "Preparing review…")}</p></div>
          )}

          <section className="orbital-realtime" aria-label={copy("Tutora OpenAI", "OpenAI tutor")}>
            <div className="orbital-realtime-head"><span>OPENAI / REALTIME</span>
              <strong>{copy("Estude conversando.", "Learn through conversation.")}</strong>
            </div>
            <p>{copy(
              "Converse sobre o conceito atual com a OpenAI. Para registrar domínio, continue respondendo às perguntas do InstantStudy acima.",
              "Discuss the current concept with OpenAI. To record mastery, continue answering InstantStudy questions above."
            )}</p>
            <button className={realtimeTutor.active ? "orbital-realtime-stop" : "orbital-realtime-start"}
              type="button" disabled={realtimeTutor.state === "connecting"}
              onClick={() => {
                if (realtimeTutor.active) { realtimeTutor.stop(); return; }
                stopVoice();
                void realtimeTutor.start({
                  title: activeTitle || material?.title || "Study session",
                  sourceExcerpt: question?.concept?.sourceExcerpt || material?.content || "",
                  locale: pt ? "pt-BR" : "en-US",
                });
              }}>
              {realtimeTutor.active ? <MicOff size={16}/> : <Mic size={16}/>}
              {realtimeTutor.state === "connecting" ? copy("Conectando…", "Connecting…") : realtimeTutor.active
                ? copy("Encerrar conversa", "End conversation") : copy("Conversar com OpenAI", "Talk with OpenAI")}
            </button>
            {realtimeTutor.error && <small role="alert" className="orbital-realtime-error">{realtimeTutor.error}</small>}
            {realtimeTutor.transcript && <div className="orbital-realtime-caption" role="status">{realtimeTutor.transcript}</div>}
            <small>{copy(
              "Requer conta Plus/Unlimited. 3 minutos por sessão, com cota diária. A OpenAI processa o áudio. Esta conversa não altera notas.",
              "Plus/Unlimited required; 3 minutes per session with daily limits. OpenAI processes audio. This conversation does not change grades."
            )}</small>
          </section>
          {error && <div className="orbita-error" role="alert">{error}</div>}
          <div className="orbita-due">
            <div className="orbita-due-title"><strong>{copy("Na sua órbita", "In your orbit")}</strong>
              <button type="button" onClick={() => void refreshDue()} disabled={dueLoading}><RotateCcw size={14} /> {copy("Atualizar", "Refresh")}</button>
            </div>
            {dueLoading ? <p>{copy("Buscando revisões…", "Loading reviews…")}</p> : dots.length ? (
              dots.map((item) => (
                <button className="orbita-due-item" key={item.sessionId + item.conceptId} onClick={() => void begin(item)} disabled={busy}>
                  <span className="orbita-due-dot" /><span><strong>{item.label}</strong><small>{item.title}</small></span>
                  <em>{Math.round(item.mastery * 100)}%</em>
                </button>
              ))
            ) : <p>{copy("Nenhum conceito pendente.", "No concepts due.")}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
