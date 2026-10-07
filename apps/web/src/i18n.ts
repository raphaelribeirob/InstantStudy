import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const supportedLanguages = ["en", "pt-BR"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const STORAGE_KEY = "instantstudy.locale";

const resources = {
  en: {
    translation: {
      common: {
        product: "InstantStudy™",
        insights: "Insights",
        podcast: "Podcast",
        studyGame: "Study Game",
        family: "Family",
        home: "Home",
        library: "Library",
        create: "Create",
        guide: "Study Guide",
        flashcards: "Flashcards",
        learn: "Learn",
        test: "Practice Test",
        ask: "Ask",
        review: "Review",
        friends: "Study With Friends",
        plugin: "Plugin",
        loading: "Loading…",
        language: "Language",
        english: "English",
        portuguese: "Português",
      },
      landing: {
        kicker: "THE FUTURE OF LEARNING",
        heroTitle: "Learn from anything.",
        heroBody:
          "Turn any material into a living knowledge state: active practice, testing, mastery and right-time review.",
        startOwn: "Start with your own material",
        generatorTitle: "Turn one source into a complete study loop.",
        generatorBody:
          "Bring the material once. InstantStudy™ structures it into active practice instead of making you rebuild the same content in separate tools.",
        paste: "Paste text",
        upload: "Upload files",
        drive: "Google Drive",
        audio: "Record audio",
        scan: "Scan notes",
        pastePrompt: "Paste the material you need to learn",
        uploadPrompt: "Drop notes, readings or lecture slides",
        drivePrompt: "Choose a document from your Drive",
        audioPrompt: "Record or add lecture material",
        scanPrompt: "Photograph handwritten notes",
        supportedSources:
          "PDF, DOCX, PPTX, text, audio and photographed notes enter the same learning system.",
        chooseFile: "Choose file",
        browseFiles: "Browse files",
        fromMaterial: "From this material",
        learnDetail: "Adaptive questions that get harder with mastery",
        quizDetail: "Fast recall with immediate feedback",
        testDetail: "Exam-style questions, timer and final score",
        reviewDetail: "Return to weak concepts when they are due",
        retention: "Retention",
        retentionDetail: "See what is strong, fading and due next",
        pricingKicker: "Upgrade after you feel the value",
        pricingTitle: "Start free. Pay when you want the limits gone.",
        monthly: "Monthly",
        annual: "Annual",
        trial7: "7-day trial",
        free: "Free",
        plus: "Plus",
        unlimited: "Unlimited",
        mostPopular: "Most popular",
        chooseFamily: "Choose Family",
      },
      software: {
        searchLibrary: "Search your study library",
        persistentState: "Persistent learning state",
        futureLearning: "THE FUTURE OF LEARNING",
        homeTitle: "What do you want to learn?",
        homeBody:
          "Turn any material into study guides, flashcards, adaptive Learn, tests and real due review.",
        createMaterial: "Create from your material",
        continueStudying: "Continue studying",
        viewLibrary: "View library",
        libraryEmptyTitle: "Your library starts with one source.",
        libraryEmptyBody:
          "Paste text, upload a file, use Google Drive or record a lecture.",
        titleLibrary: "Library",
        yourMaterial: "YOUR MATERIAL",
        createKicker: "CREATE",
        createTitle: "Turn material into learning.",
        titleOptional: "Title",
        pastePlaceholder:
          "Paste notes, a reading, lecture transcript, or anything you need to learn…",
        chooseUpload: "Choose PDF, DOCX, PPTX or text files",
        privateDrive: "Choose private Drive file",
        driveScoped: "Google Picker uses file-scoped OAuth access.",
        driveConfig: "Private Drive needs Google Picker environment configuration.",
        publicLink: "OR PUBLIC LINK",
        publicDrivePlaceholder: "Paste a public Google Drive file link",
        scanPrompt: "Take a photo or choose handwritten notes",
        scanDetail:
          "Image text is transcribed, then converted into the same study system.",
        recordLecture: "Record lecture",
        stopRecording: "Stop recording",
        uploadAudio: "Or upload audio",
        generateMaterial: "Generate study material",
        building: "Building…",
        fromOneSource: "FROM ONE SOURCE",
        guideDetail: "Summary + outline + concepts",
        flashcardsDetail: "Question/answer active recall",
        learnDetail: "Concrete adaptive questions",
        testDetail: "Question mix + timer + final score",
        addMaterialFirst: "Add study material first.",
        readyStudy: "Ready to study.",
        readyStudyBody:
          "Questions are generated from your material and adapt after every answer.",
        startLearn: "Start Learn",
        typeAnswer: "Type your answer…",
        submitAnswer: "Submit answer",
        evaluating: "Evaluating…",
        sessionComplete: "SESSION COMPLETE",
        roundComplete: "Round complete",
        startAnother: "Start another round",
        askAnything: "Ask anything about this material.",
        askBody:
          "Explanations stay grounded in your material and can lead directly back into active study.",
        askPlaceholder: "What would you like to understand?",
        thinking: "Thinking…",
        quizMe: "Quiz me on this",
        rightTimeRecall: "RIGHT-TIME RECALL",
        dueConcept: "DUE CONCEPT",
        recallPlaceholder: "Recall without looking…",
        nothingDue: "Nothing due right now.",
        nothingDueBody:
          "Due concepts will appear here from your real review schedule.",
        retentionKicker: "RETENTION",
        noHistory: "No learning history yet.",
        noHistoryBody:
          "Complete a Learn, Test or Review session to populate retention insights.",
        mastery: "Mastery",
        retention: "Retention",
        streak: "Streak",
        dueNow: "Due now",
        answers: "Answers",
        studyTime: "Study time",
        weakConcepts: "WEAK CONCEPTS",
        achievements: "ACHIEVEMENTS",
        noWeak: "No weak concepts yet.",
        listenRecall: "LISTEN & RECALL",
        podcastBody: "two voices · grounded in your material",
        playPodcast: "Play podcast",
        stopPodcast: "Stop podcast",
        selectMaterial: "Select study material first.",
        openLibrary: "Open library",
        activeRecallGame: "ACTIVE RECALL GAME",
        matchKnowledge: "Match the knowledge.",
        pairs: "{{matched}} / {{total}} pairs",
        moves: "{{count}} moves",
        completeMoves: "Complete in {{count}} moves",
        reset: "Reset",
        reveal: "Reveal",
        recall: "RECALL",
        studyTogether: "STUDY TOGETHER",
        createRoom: "Create a room",
        joinRoom: "Join a room",
        yourName: "Your name",
        roomCode: "ROOM CODE",
        familyKicker: "FIVE INDEPENDENT LEARNERS",
        familyUpgradeTitle: "One plan. Five separate learning states.",
        familyUpgradeBody:
          "Family includes the owner plus four invited members. Everyone gets Unlimited while keeping independent progress.",
        chooseFamily: "Choose Family",
        seats: "SEATS",
        separateProgress:
          "Each account keeps its own library, mastery and review schedule.",
        addMember: "Add member",
        ownerUnlimited: "Owner · Unlimited",
        memberUnlimited: "Member · Unlimited",
        remove: "Remove",
        pluginKicker: "PLUGIN",
        pluginTitle: "Take InstantStudy into your AI.",
      },
    },
  },
  "pt-BR": {
    translation: {
      common: {
        product: "InstantStudy™",
        insights: "Insights",
        podcast: "Podcast",
        studyGame: "Jogo de Estudo",
        family: "Família",
        home: "Início",
        library: "Biblioteca",
        create: "Criar",
        guide: "Guia de Estudo",
        flashcards: "Flashcards",
        learn: "Aprender",
        test: "Simulado",
        ask: "Perguntar",
        review: "Revisar",
        friends: "Estudar com Amigos",
        plugin: "Plugin",
        loading: "Carregando…",
        language: "Idioma",
        english: "English",
        portuguese: "Português",
      },
      landing: {
        kicker: "O FUTURO DO APRENDIZADO",
        heroTitle: "Aprenda com qualquer coisa.",
        heroBody:
          "Transforme qualquer material em um estado vivo de conhecimento: prática ativa, testes, domínio e revisão no momento certo.",
        startOwn: "Comece com seu próprio material",
        generatorTitle: "Transforme uma fonte em um ciclo completo de estudo.",
        generatorBody:
          "Envie o material uma vez. O InstantStudy™ o transforma em prática ativa sem obrigar você a reconstruir o mesmo conteúdo em ferramentas diferentes.",
        paste: "Colar texto",
        upload: "Enviar arquivos",
        drive: "Google Drive",
        audio: "Gravar áudio",
        scan: "Escanear notas",
        pastePrompt: "Cole o material que você precisa aprender",
        uploadPrompt: "Envie notas, leituras ou slides de aula",
        drivePrompt: "Escolha um documento do seu Drive",
        audioPrompt: "Grave ou adicione material de aula",
        scanPrompt: "Fotografe anotações manuscritas",
        supportedSources:
          "PDF, DOCX, PPTX, texto, áudio e fotos de anotações entram no mesmo sistema de aprendizado.",
        chooseFile: "Escolher arquivo",
        browseFiles: "Procurar arquivos",
        fromMaterial: "A partir deste material",
        learnDetail: "Perguntas adaptativas ficam mais difíceis conforme seu domínio",
        quizDetail: "Recordação rápida com feedback imediato",
        testDetail: "Questões de prova, cronômetro e resultado final",
        reviewDetail: "Retorne aos conceitos fracos quando estiverem no momento de revisão",
        retention: "Retenção",
        retentionDetail: "Veja o que está forte, enfraquecendo e deve ser revisado",
        pricingKicker: "Faça upgrade depois de perceber o valor",
        pricingTitle: "Comece grátis. Pague quando quiser remover os limites.",
        monthly: "Mensal",
        annual: "Anual",
        trial7: "7 dias grátis",
        free: "Grátis",
        plus: "Plus",
        unlimited: "Unlimited",
        mostPopular: "Mais popular",
        chooseFamily: "Escolher Família",
      },
      software: {
        searchLibrary: "Buscar na sua biblioteca de estudos",
        persistentState: "Estado de aprendizado persistente",
        futureLearning: "O FUTURO DO APRENDIZADO",
        homeTitle: "O que você quer aprender?",
        homeBody:
          "Transforme qualquer material em guias, flashcards, Aprender adaptativo, simulados e revisão real.",
        createMaterial: "Criar a partir do seu material",
        continueStudying: "Continuar estudando",
        viewLibrary: "Ver biblioteca",
        libraryEmptyTitle: "Sua biblioteca começa com uma fonte.",
        libraryEmptyBody:
          "Cole texto, envie um arquivo, use o Google Drive ou grave uma aula.",
        titleLibrary: "Biblioteca",
        yourMaterial: "SEU MATERIAL",
        createKicker: "CRIAR",
        createTitle: "Transforme material em aprendizado.",
        titleOptional: "Título",
        pastePlaceholder:
          "Cole notas, uma leitura, transcrição de aula ou qualquer coisa que você precise aprender…",
        chooseUpload: "Escolha arquivos PDF, DOCX, PPTX ou texto",
        privateDrive: "Escolher arquivo privado do Drive",
        driveScoped: "O Google Picker usa acesso OAuth limitado ao arquivo.",
        driveConfig: "O Drive privado precisa da configuração do Google Picker.",
        publicLink: "OU LINK PÚBLICO",
        publicDrivePlaceholder: "Cole um link público de arquivo do Google Drive",
        scanPrompt: "Tire uma foto ou escolha anotações manuscritas",
        scanDetail:
          "O texto da imagem é transcrito e convertido no mesmo sistema de estudo.",
        recordLecture: "Gravar aula",
        stopRecording: "Parar gravação",
        uploadAudio: "Ou enviar áudio",
        generateMaterial: "Gerar material de estudo",
        building: "Criando…",
        fromOneSource: "DE UMA ÚNICA FONTE",
        guideDetail: "Resumo + estrutura + conceitos",
        flashcardsDetail: "Recordação ativa em pergunta/resposta",
        learnDetail: "Perguntas adaptativas concretas",
        testDetail: "Tipos de questão + tempo + nota final",
        addMaterialFirst: "Adicione material de estudo primeiro.",
        readyStudy: "Pronto para estudar.",
        readyStudyBody:
          "As perguntas são geradas a partir do seu material e se adaptam depois de cada resposta.",
        startLearn: "Começar Aprender",
        typeAnswer: "Digite sua resposta…",
        submitAnswer: "Enviar resposta",
        evaluating: "Avaliando…",
        sessionComplete: "SESSÃO CONCLUÍDA",
        roundComplete: "Rodada concluída",
        startAnother: "Começar outra rodada",
        askAnything: "Pergunte qualquer coisa sobre este material.",
        askBody:
          "As explicações permanecem baseadas no seu material e podem levar diretamente à prática ativa.",
        askPlaceholder: "O que você gostaria de entender?",
        thinking: "Pensando…",
        quizMe: "Teste-me sobre isso",
        rightTimeRecall: "REVISÃO NO MOMENTO CERTO",
        dueConcept: "CONCEITO PARA REVISAR",
        recallPlaceholder: "Lembre sem olhar…",
        nothingDue: "Nada para revisar agora.",
        nothingDueBody:
          "Os conceitos aparecerão aqui de acordo com seu cronograma real de revisão.",
        retentionKicker: "RETENÇÃO",
        noHistory: "Ainda não há histórico de aprendizado.",
        noHistoryBody:
          "Conclua uma sessão de Aprender, Simulado ou Revisão para preencher os insights de retenção.",
        mastery: "Domínio",
        retention: "Retenção",
        streak: "Sequência",
        dueNow: "Para revisar",
        answers: "Respostas",
        studyTime: "Tempo de estudo",
        weakConcepts: "CONCEITOS FRACOS",
        achievements: "CONQUISTAS",
        noWeak: "Ainda não há conceitos fracos.",
        listenRecall: "OUÇA E RECORDE",
        podcastBody: "duas vozes · baseado no seu material",
        playPodcast: "Reproduzir podcast",
        stopPodcast: "Parar podcast",
        selectMaterial: "Selecione um material de estudo primeiro.",
        openLibrary: "Abrir biblioteca",
        activeRecallGame: "JOGO DE RECORDAÇÃO ATIVA",
        matchKnowledge: "Combine o conhecimento.",
        pairs: "{{matched}} / {{total}} pares",
        moves: "{{count}} movimentos",
        completeMoves: "Concluído em {{count}} movimentos",
        reset: "Reiniciar",
        reveal: "Revelar",
        recall: "RECORDAR",
        studyTogether: "ESTUDAR JUNTOS",
        createRoom: "Criar uma sala",
        joinRoom: "Entrar em uma sala",
        yourName: "Seu nome",
        roomCode: "CÓDIGO DA SALA",
        familyKicker: "CINCO ALUNOS INDEPENDENTES",
        familyUpgradeTitle: "Um plano. Cinco estados de aprendizado separados.",
        familyUpgradeBody:
          "O Família inclui o titular e mais quatro membros convidados. Todos recebem Unlimited mantendo progresso independente.",
        chooseFamily: "Escolher Família",
        seats: "VAGAS",
        separateProgress:
          "Cada conta mantém sua própria biblioteca, domínio e fila de revisão.",
        addMember: "Adicionar membro",
        ownerUnlimited: "Titular · Unlimited",
        memberUnlimited: "Membro · Unlimited",
        remove: "Remover",
        pluginKicker: "PLUGIN",
        pluginTitle: "Leve o InstantStudy para a sua IA.",
      },
    },
  },
} as const;

function normalizeLanguage(raw: string | undefined): SupportedLanguage {
  const value = String(raw || "").toLowerCase();
  if (value.startsWith("pt")) return "pt-BR";
  return "en";
}

function initialLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeLanguage(stored);
  } catch {
    // Storage can be unavailable in strict privacy modes.
  }
  return normalizeLanguage(navigator.language);
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: "en",
  supportedLngs: [...supportedLanguages],
  interpolation: { escapeValue: false },
  returnNull: false,
});

i18n.on("languageChanged", (language) => {
  const normalized = normalizeLanguage(language);
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // Keep runtime locale even if storage is unavailable.
  }
  document.documentElement.lang = normalized;
});

document.documentElement.lang = normalizeLanguage(i18n.language);

export function setInstantStudyLanguage(language: SupportedLanguage) {
  return i18n.changeLanguage(language);
}

export function currentInstantStudyLanguage(): SupportedLanguage {
  return normalizeLanguage(i18n.language);
}

export default i18n;
