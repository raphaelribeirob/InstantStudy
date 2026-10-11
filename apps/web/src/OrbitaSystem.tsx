import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity, ArrowRight, AudioLines, BookOpen, BookOpenCheck, Brain,
  CheckCircle2, FilePlus2, FileText, GraduationCap, Headphones,
  Layers3, Library, MessageCircle, Mic, MicOff, Orbit, Plug, Puzzle,
  RotateCcw, Sparkles, Users, type LucideIcon,
} from "lucide-react";
import SiriOrb from "./components/smoothui/SiriOrb";
import { getDueReviews, getRetentionInsights, type DueReview, type RetentionInsights, type StudyMaterial } from "./study";
import type { AIState } from "./components/smoothui/ai-core";
import "./orbita-system.css";

/** The orbit is a navigation surface. It reuses existing study workspaces and endpoints. */
export type OrbitalAction =
  | "learn" | "quiz" | "test" | "orbita" | "ask"
  | "create" | "library" | "guide" | "flashcards" | "audio"
  | "insights" | "game" | "friends" | "family" | "plugin";

type Module = {
  id: OrbitalAction;
  icon: LucideIcon;
  titlePt: string;
  titleEn: string;
  descriptionPt: string;
  descriptionEn: string;
  group: "practice" | "material" | "more";
  orbit?: number;
};

const MODULES: Module[] = [
  { id: "orbita", icon: Orbit, titlePt: "Revisar", titleEn: "Review", descriptionPt: "Memória e revisão no momento certo", descriptionEn: "Recall due concepts at the right time", group: "practice", orbit: -90 },
  { id: "learn", icon: Brain, titlePt: "Aprender", titleEn: "Learn", descriptionPt: "Perguntas adaptativas sobre seu material", descriptionEn: "Adaptive practice from your own material", group: "practice", orbit: -45 },
  { id: "quiz", icon: BookOpenCheck, titlePt: "Quiz", titleEn: "Quiz", descriptionPt: "Perguntas rápidas com correção", descriptionEn: "Quick questions with feedback", group: "practice", orbit: 0 },
  { id: "test", icon: GraduationCap, titlePt: "Simulado", titleEn: "Practice test", descriptionPt: "Questões, cronômetro e resultado", descriptionEn: "Timed assessment and final score", group: "practice", orbit: 45 },
  { id: "audio", icon: Headphones, titlePt: "Podcast", titleEn: "Podcast", descriptionPt: "Revisão em áudio usando suas anotações", descriptionEn: "Audio review from your notes", group: "more", orbit: 90 },
  { id: "insights", icon: Activity, titlePt: "Memória", titleEn: "Insights", descriptionPt: "Domínio estimado, pendências e histórico", descriptionEn: "Estimated mastery, due queue and history", group: "more", orbit: 135 },
  { id: "library", icon: Library, titlePt: "Biblioteca", titleEn: "Library", descriptionPt: "Todos os materiais importados", descriptionEn: "Your saved materials", group: "material", orbit: 180 },
  { id: "ask", icon: MessageCircle, titlePt: "Perguntar", titleEn: "Ask", descriptionPt: "Tire dúvidas fundamentadas no conteúdo", descriptionEn: "Ask questions grounded in your material", group: "practice", orbit: 225 },
  { id: "create", icon: FilePlus2, titlePt: "Importar", titleEn: "Import", descriptionPt: "PDF, texto, áudio e arquivos", descriptionEn: "PDF, notes, audio and documents", group: "material" },
  { id: "guide", icon: BookOpen, titlePt: "Guia", titleEn: "Study guide", descriptionPt: "Resumo estruturado do material", descriptionEn: "Structured summary and key ideas", group: "material" },
  { id: "flashcards", icon: FileText, titlePt: "Flashcards", titleEn: "Flashcards", descriptionPt: "Recordação ativa com cartões", descriptionEn: "Active recall using cards", group: "material" },
  { id: "game", icon: Puzzle, titlePt: "Jogo", titleEn: "Study game", descriptionPt: "Pares e desafios de conceitos", descriptionEn: "Concept matching and challenges", group: "more" },
  { id: "friends", icon: Users, titlePt: "Amigos", titleEn: "Friends", descriptionPt: "Estude e acompanhe uma turma", descriptionEn: "Study with friends", group: "more" },
  { id: "family", icon: Layers3, titlePt: "Família", titleEn: "Family", descriptionPt: "Contas e progresso independentes", descriptionEn: "Separate accounts and learning progress", group: "more" },
  { id: "plugin", icon: Plug, titlePt: "Conectar IA", titleEn: "Connect AI", descriptionPt: "Ferramentas e integração MCP", descriptionEn: "MCP tools and AI integration", group: "more" },
];

type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechListener = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SpeechBrowser = Window & {
  SpeechRecognition?: new () => SpeechListener;
  webkitSpeechRecognition?: new () => SpeechListener;
};

/** Explicit, deterministic navigation commands; never execute arbitrary spoken instructions. */
export function resolveOrbitalCommand(input: string): OrbitalAction | null {
  const text = input.toLocaleLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").trim();
  if (!text) return null;
  const phrases: Array<[RegExp, OrbitalAction]> = [
    [/\b(simulado|prova|practice test|test|exam)\b/, "test"],
    [/\b(flashcards?|cartoes|cartas)\b/, "flashcards"],
    [/\b(podcast|ouvir podcast|listen to podcast)\b/, "audio"],
    [/\b(revis(a|ar|ao|e)|revision|review|recordar|repeticao|spaced repetition)\b/, "orbita"],
    [/\b(quiz|questionario)\b/, "quiz"],
    [/\b(pergunt(a|ar|e)|duvida|ask|question)\b/, "ask"],
    [/\b(aprend(er|a|izado)|learn|estudar|study|praticar)\b/, "learn"],
    [/\b(importar|adicionar|enviar|upload|criar|create|add material)\b/, "create"],
    [/\b(biblioteca|library|materiais|materials)\b/, "library"],
    [/\b(guia|resumo|study guide|summary)\b/, "guide"],
    [/\b(memoria|progresso|retencao|insights|estatisticas|progress)\b/, "insights"],
    [/\b(jog(o|ar)|game|charms|quebra.cabeca)\b/, "game"],
    [/\b(amigos|colegas|friends|grupo|study group)\b/, "friends"],
    [/\b(familia|family|assinatura|subscription)\b/, "family"],
    [/\b(plugin|conectar|integracao|mcp|connect)\b/, "plugin"],
  ];
  return phrases.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

type Props = {
  materials: StudyMaterial[];
  selected: StudyMaterial | null;
  onAction: (id: OrbitalAction) => void;
  onSelectMaterial: (material: StudyMaterial) => void;
};

export function OrbitaSystem({ materials, selected, onAction, onSelectMaterial }: Props) {
  const { i18n } = useTranslation();
  const pt = i18n.language.toLowerCase().startsWith("pt");
  const tr = (ptValue: string, enValue: string) => pt ? ptValue : enValue;
  const [due, setDue] = useState<DueReview[]>([]);
  const [insights, setInsights] = useState<RetentionInsights | null>(null);
  const [pending, setPending] = useState(true);
  const [dataError, setDataError] = useState("");
  const [command, setCommand] = useState("");
  const [commandStatus, setCommandStatus] = useState("");
  const [listening, setListening] = useState(false);
  const [highlight, setHighlight] = useState<OrbitalAction>("orbita");
  const recognitionRef = useRef<SpeechListener | null>(null);
  const speechWindow = window as SpeechBrowser;
  const canRecognize = Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
  const orbState: AIState = listening ? "listening" : "idle";

  async function refresh() {
    setPending(true);
    setDataError("");
    const [dueResult, insightsResult] = await Promise.allSettled([
      getDueReviews(30), getRetentionInsights(),
    ]);
    if (dueResult.status === "fulfilled") {
      setDue(dueResult.value);
      setHighlight(dueResult.value.length ? "orbita" : materials.length ? "learn" : "create");
    } else {
      setDataError(tr("Não foi possível carregar as revisões. Tente atualizar.", "Could not load due reviews. Try again."));
    }
    if (insightsResult.status === "fulfilled") setInsights(insightsResult.value);
    setPending(false);
  }

  useEffect(() => {
    void refresh();
    return () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      }
    };
  }, []);

  function open(id: OrbitalAction) {
    setHighlight(id);
    onAction(id);
  }

  function runCommand(value: string) {
    const action = resolveOrbitalCommand(value);
    if (action) {
      setCommandStatus(tr("Abrindo ", "Opening ") + (pt ? MODULES.find(x => x.id === action)?.titlePt : MODULES.find(x => x.id === action)?.titleEn));
      open(action);
    } else {
      setCommandStatus(tr("Comando não reconhecido. Escolha uma ferramenta abaixo.", "Command not recognized. Select one of the tools below."));
    }
  }

  function listen() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }
    const Engine = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Engine) return;
    const recognition = new Engine();
    recognition.lang = pt ? "pt-BR" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = event => {
      const text = event.results[0]?.[0]?.transcript?.trim() ?? "";
      setCommand(text);
      runCommand(text);
    };
    recognition.onerror = () => {
      setListening(false);
      setCommandStatus(tr("Microfone indisponível; use os botões ou digite.", "Microphone unavailable. Use the buttons or type."));
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setCommandStatus("");
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setCommandStatus(tr("Não foi possível iniciar o microfone.", "Could not start microphone."));
    }
  }

  const title = (module: Module) => pt ? module.titlePt : module.titleEn;
  const description = (module: Module) => pt ? module.descriptionPt : module.descriptionEn;
  const recommendation: OrbitalAction = !pending && due.length ? "orbita" : materials.length ? "learn" : "create";
  const dueCount = pending ? "—" : dataError ? "—" : String(due.length);
  const moduleGroups: Array<{ id: Module["group"]; title: string; detail: string }> = [
    { id: "practice", title: tr("Praticar", "Practice"), detail: tr("Aprenda conversando, responda e teste seus conhecimentos.", "Learn, recall and test your knowledge.") },
    { id: "material", title: tr("Construir conhecimento", "Build knowledge"), detail: tr("Transforme seus próprios materiais em ferramentas de estudo.", "Turn your material into study tools.") },
    { id: "more", title: tr("Evoluir", "Grow"), detail: tr("Áudio, acompanhamento, jogos e aprendizagem em grupo.", "Audio, insights, games and learning together.") },
  ];

  return (
    <div className="orbital-system" data-orbital-shell="true">
      <header className="orbital-system-head">
        <p>INSTANTSTUDY™ / {tr("SISTEMA DE APRENDIZAGEM", "LEARNING SYSTEM")}</p>
        <h1>{tr("Sua mente, em órbita.", "Put your mind in orbit.")}</h1>
        <span>{tr("Qualquer material se transforma em aprendizado, prática e memória.", "Turn any material into learning, practice and lasting recall.")}</span>
      </header>

      <div className="orbital-system-grid">
        <section className="orbital-system-galaxy" aria-label={tr("Navegação orbital", "Orbital navigation")}>
          <span className="orbital-system-corner">THE FUTURE OF LEARNING.</span>
          <div className="orbital-system-ring orbital-system-ring-outer" aria-hidden="true" />
          <div className="orbital-system-ring orbital-system-ring-mid" aria-hidden="true" />
          <div className="orbital-system-ring orbital-system-ring-inner" aria-hidden="true" />

          <div className="orbital-system-core" aria-hidden="true">
            <SiriOrb size="204px" state={orbState} />
          </div>
          {MODULES.filter(x => typeof x.orbit === "number").map(module => {
            const angle = (module.orbit ?? 0) * Math.PI / 180;
            const style = {
              "--orbital-x": (50 + Math.cos(angle) * 37).toFixed(3) + "%",
              "--orbital-y": (50 + Math.sin(angle) * 37).toFixed(3) + "%",
            } as CSSProperties;
            const Icon = module.icon;
            return (
              <button type="button" className={"orbital-system-node" + (highlight === module.id ? " is-highlighted" : "")}
                style={style} onClick={() => open(module.id)} aria-label={description(module)} title={description(module)}
                key={module.id}>
                <Icon size={17} aria-hidden="true" />
                <span>{title(module)}</span>
                {module.id === "orbita" && !pending && due.length > 0 && <b>{due.length}</b>}
              </button>
            );
          })}
          <div className="orbital-system-core-caption">
            <span className={"orbital-system-pulse" + (listening ? " is-live" : "")} />
            {listening ? tr("Ouvindo comando", "Listening for a command") : tr("Selecione uma ferramenta para começar", "Choose a tool to begin")}
          </div>
          <span className="orbital-system-footnote">{tr("Um motor de estudo. Várias maneiras de aprender.", "One study engine. Multiple ways to learn.")}</span>
        </section>

        <aside className="orbital-system-console">
          <div className="orbital-system-section-label">{tr("SEU DIA DE ESTUDO", "YOUR STUDY DAY")}</div>
          <div className="orbital-system-metrics">
            <div><strong>{dueCount}</strong><span>{tr("revisões pendentes", "concepts due")}</span></div>
            <div><strong>{materials.length}</strong><span>{tr("materiais na biblioteca", "library materials")}</span></div>
            <div><strong>{insights ? Math.round(insights.averageMastery * 100) + "%" : "—"}</strong><span>{tr("domínio estimado", "estimated mastery")}</span></div>
          </div>
          {dataError && <div className="orbital-system-warning" role="alert">{dataError} <button type="button" onClick={() => void refresh()}><RotateCcw size={13} />{tr("Atualizar", "Retry")}</button></div>}

          <div className="orbital-system-today">
            <span>{tr("PRÓXIMO PASSO", "RECOMMENDED NEXT")}</span>
            <h2>{recommendation === "orbita"
              ? tr("Reforce o que está esquecendo.", "Revisit what is fading.")
              : recommendation === "create" ? tr("Tudo começa com um material.", "Start with any material.")
              : tr("Continue de onde parou.", "Continue where you left off.")}</h2>
            <p>{recommendation === "orbita"
              ? tr("Os conceitos vencidos estão prontos para recuperação ativa.", "Your due concepts are ready for active recall.")
              : recommendation === "create" ? tr("Importe um PDF, grave uma aula ou cole suas anotações.", "Import a PDF, record a lecture or paste your notes.")
              : tr("Retome o estudo do seu último material com perguntas adaptativas.", "Resume your latest material with adaptive questions.")}</p>
            <button type="button" onClick={() => open(recommendation)}>
              {recommendation === "orbita" ? tr("Revisar agora", "Review now") : recommendation === "create" ? tr("Adicionar material", "Add material") : tr("Continuar aprendendo", "Keep learning")}
              <ArrowRight size={18} />
            </button>
          </div>

          <form className="orbital-system-command" onSubmit={e => { e.preventDefault(); runCommand(command); }}>
            <label htmlFor="orbital-command">{tr("NAVEGAR POR VOZ OU TEXTO", "NAVIGATE BY VOICE OR TEXT")}</label>
            <div>
              <input id="orbital-command" type="text" value={command} onChange={e => setCommand(e.target.value)}
                placeholder={tr("Ex.: revisar, fazer simulado, podcast…", "e.g. review, take a test, podcast…")} />
              {canRecognize && <button type="button" className="orbital-system-mic" onClick={listen}
                aria-pressed={listening} title={listening ? tr("Parar", "Stop") : tr("Falar comando", "Speak command")}>
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>}
              <button type="submit" className="orbital-system-go" aria-label={tr("Abrir ferramenta", "Open tool")}><ArrowRight size={18} /></button>
            </div>
            <small>{tr("Os comandos abrem ferramentas, não iniciam uma conversa com IA. O reconhecimento de voz pode usar o serviço do navegador.", "Commands open tools; this is not a general AI conversation. Speech recognition may use your browser's speech provider.")}</small>
            <span role="status" aria-live="polite">{commandStatus}</span>
          </form>

          <div className="orbital-system-section-label">{tr("RETOMAR UM MATERIAL", "CONTINUE A MATERIAL")}</div>
          {materials.length ? (
            <div className="orbital-system-recent">
              {materials.slice(0, 3).map(item => (
                <button type="button" key={item.id} onClick={() => onSelectMaterial(item)}>
                  <FileText size={16} /><span><strong>{item.title}</strong><small>{item.sourceNames?.[0] || item.sourceType}</small></span><ArrowRight size={14} />
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="orbital-system-empty" onClick={() => open("create")}>
              <FilePlus2 size={20} /> {tr("Importe seu primeiro material", "Import your first material")}
            </button>
          )}
          <div className="orbital-system-quick">
            <button type="button" onClick={() => open("create")}><FilePlus2 size={16} />{tr("Importar arquivo", "Import file")}</button>
            <button type="button" onClick={() => open("insights")}><Activity size={16} />{tr("Ver memória", "View memory")}</button>
          </div>
        </aside>
      </div>

      <div className="orbital-system-section-heading">
        <div><span>{tr("FERRAMENTAS DE APRENDIZAGEM", "YOUR LEARNING TOOLS")}</span><h2>{tr("Todas as possibilidades. Uma interface.", "Every study mode. One interface.")}</h2></div>
        <button type="button" onClick={() => void refresh()} disabled={pending}><RotateCcw size={15} /> {tr("Sincronizar", "Refresh")}</button>
      </div>
      <div className="orbital-system-groups">
        {moduleGroups.map(group => (
          <section className="orbital-system-group" key={group.id}>
            <div className="orbital-system-group-head"><strong>{group.title}</strong><span>{group.detail}</span></div>
            <div className="orbital-system-modules">
              {MODULES.filter(module => module.group === group.id).map(module => {
                const Icon = module.icon;
                return <button type="button" key={module.id} onClick={() => open(module.id)}>
                  <Icon size={21} /><span><strong>{title(module)}</strong><small>{description(module)}</small></span><ArrowRight size={15} />
                </button>;
              })}
            </div>
          </section>
        ))}
      </div>
      <footer className="orbital-system-footer">
        <div><Sparkles size={17} /> {tr("Seus materiais alimentam o motor de estudo; a Órbita é a interface.", "Your material powers the study engine; Órbita is the interface.")}</div>
        <span><CheckCircle2 size={14} /> {tr("Aprendizagem adaptativa e revisão registradas no InstantStudy", "Adaptive practice and review tracked in InstantStudy")}</span>
      </footer>
    </div>
  );
}
