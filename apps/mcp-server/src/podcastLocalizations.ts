import { normalizeStudyLocale, type StudyLanguage } from "./studyLanguage.js";
export type PodcastScriptPart="intro"|"summary"|"idea"|"recall"|"finish";
const keys=["intro","summary","idea","recall","finish"] as const;
const scripts: Record<StudyLanguage, readonly string[]>={
  "nl": [
    "Welkom bij InstantStudy Podcast. Vandaag bestuderen we {title}.",
    "Het grote geheel: {summary}",
    "Belangrijk idee {index}: {outline}",
    "Wat is het belangrijkste aan {concept}? Pauzeer en antwoord hardop.",
    "Leg het onderwerp zonder notities in je eigen woorden uit. Herhaal wat nog niet duidelijk is."
  ],
  "en": [
    "Welcome to InstantStudy Podcast. Today we are unpacking {title} into the ideas you need to remember.",
    "Start with the big picture: {summary}",
    "Key idea {index}: {outline}",
    "Let me challenge that. Before we move on, what would you say is the essential point about {concept}? Pause and answer it out loud.",
    "Finish by explaining the topic in your own words without looking at your notes. Anything you cannot explain should go back into Review."
  ],
  "fr": [
    "Bienvenue dans le podcast InstantStudy. Aujourd’hui, nous étudions {title}.",
    "Commençons par l’essentiel : {summary}",
    "Idée clé {index} : {outline}",
    "Quel est le point essentiel concernant {concept} ? Faites une pause et répondez à voix haute.",
    "Terminez en expliquant le sujet avec vos propres mots, sans notes. Révisez ce qui reste difficile."
  ],
  "de": [
    "Willkommen beim InstantStudy-Podcast. Heute geht es um {title}.",
    "Beginnen wir mit dem Überblick: {summary}",
    "Wichtige Idee {index}: {outline}",
    "Was ist das Wichtigste an {concept}? Halte an und antworte laut.",
    "Erkläre das Thema abschließend ohne Notizen mit eigenen Worten. Wiederhole, was noch unklar ist."
  ],
  "id": [
    "Selamat datang di Podcast InstantStudy. Hari ini kita mempelajari {title}.",
    "Mulai dari gambaran besarnya: {summary}",
    "Ide utama {index}: {outline}",
    "Apa hal terpenting tentang {concept}? Jeda dan jawab dengan suara keras.",
    "Akhiri dengan menjelaskan topik menggunakan kata-katamu sendiri tanpa catatan. Ulangi hal yang belum jelas."
  ],
  "it": [
    "Benvenuto nel podcast InstantStudy. Oggi studiamo {title}.",
    "Partiamo dal quadro generale: {summary}",
    "Idea chiave {index}: {outline}",
    "Qual è il punto essenziale di {concept}? Metti in pausa e rispondi ad alta voce.",
    "Concludi spiegando l'argomento con parole tue senza appunti. Ripassa ciò che non sai ancora spiegare."
  ],
  "ja": [
    "InstantStudy ポッドキャストへようこそ。今日は{title}を学びます。",
    "まず全体像を確認しましょう。{summary}",
    "重要なポイント{index}：{outline}",
    "{concept}について最も重要な点は何ですか？一時停止して声に出して答えましょう。",
    "最後に、ノートを見ずに自分の言葉で説明しましょう。説明できない内容は復習してください。"
  ],
  "ko": [
    "InstantStudy 팟캐스트에 오신 것을 환영합니다. 오늘은 {title}을 공부합니다.",
    "먼저 전체 내용을 살펴보겠습니다. {summary}",
    "핵심 내용 {index}: {outline}",
    "{concept}에서 가장 중요한 점은 무엇인가요? 잠시 멈추고 소리 내어 답해 보세요.",
    "마지막으로 노트를 보지 않고 자신의 말로 설명하세요. 설명하기 어려운 부분은 다시 복습하세요."
  ],
  "pl": [
    "Witamy w podcaście InstantStudy. Dzisiaj omawiamy {title}.",
    "Zacznijmy od ogólnego obrazu: {summary}",
    "Kluczowa myśl {index}: {outline}",
    "Co jest najważniejsze w {concept}? Zatrzymaj odtwarzanie i odpowiedz na głos.",
    "Na koniec wyjaśnij temat własnymi słowami, bez notatek. Powtórz to, czego jeszcze nie rozumiesz."
  ],
  "pt-BR": [
    "Bem-vindo ao podcast do InstantStudy. Hoje vamos estudar {title} e recordar os conceitos essenciais.",
    "Comece pela visão geral: {summary}",
    "Ideia principal {index}: {outline}",
    "Vamos praticar. Antes de continuar, qual é a ideia essencial sobre {concept}? Pause e responda em voz alta.",
    "Para terminar, explique o tema com suas palavras, sem consultar as anotações. Tudo que não conseguir explicar deve voltar para Revisão."
  ],
  "ru": [
    "Добро пожаловать в подкаст InstantStudy. Сегодня мы изучаем {title}.",
    "Начнём с общей картины: {summary}",
    "Ключевая мысль {index}: {outline}",
    "Что самое важное в теме {concept}? Сделайте паузу и ответьте вслух.",
    "В конце объясните тему своими словами без конспекта. Повторите то, что ещё не можете объяснить."
  ],
  "zh-CN": [
    "欢迎收听 InstantStudy 播客。今天我们学习{title}。",
    "先了解整体内容：{summary}",
    "关键知识点{index}：{outline}",
    "关于{concept}，最重要的是什么？暂停并大声回答。",
    "最后，不看笔记，用自己的话解释这个主题。对无法解释的内容进行复习。"
  ],
  "es": [
    "Bienvenido al podcast de InstantStudy. Hoy estudiaremos {title}.",
    "Empecemos con la idea general: {summary}",
    "Idea clave {index}: {outline}",
    "¿Qué es lo más importante de {concept}? Haz una pausa y responde en voz alta.",
    "Para terminar, explica el tema con tus propias palabras sin mirar apuntes. Repasa lo que aún no puedas explicar."
  ],
  "tr": [
    "InstantStudy Podcast'e hoş geldiniz. Bugün {title} konusunu çalışacağız.",
    "Önce genel bakış: {summary}",
    "Temel fikir {index}: {outline}",
    "{concept} ile ilgili en önemli nokta nedir? Duraklat ve sesli yanıtla.",
    "Son olarak notlarına bakmadan konuyu kendi sözlerinle açıkla. Açıklayamadığın kısımları tekrar et."
  ],
  "uk": [
    "Вітаємо у подкасті InstantStudy. Сьогодні вивчаємо {title}.",
    "Почнімо із загальної картини: {summary}",
    "Ключова думка {index}: {outline}",
    "Що найважливіше в темі {concept}? Зробіть паузу та дайте відповідь уголос.",
    "На завершення поясніть тему своїми словами без нотаток. Повторіть усе, що поки складно пояснити."
  ],
  "vi": [
    "Chào mừng đến với podcast InstantStudy. Hôm nay chúng ta học {title}.",
    "Bắt đầu với bức tranh tổng quan: {summary}",
    "Ý chính {index}: {outline}",
    "Điều quan trọng nhất về {concept} là gì? Hãy tạm dừng và trả lời thành tiếng.",
    "Cuối cùng, hãy giải thích chủ đề bằng lời của bạn mà không nhìn ghi chú. Ôn lại những phần bạn chưa thể giải thích."
  ]
};
export function podcastScript(locale:string|undefined,part:PodcastScriptPart,vars:Record<string,string|number>={}):string {
 const code=normalizeStudyLocale(locale)??"en";
 return scripts[code][keys.indexOf(part)].replace(/\{(title|summary|index|outline|concept)\}/g,(_,key:string)=>String(vars[key]??""));
}
