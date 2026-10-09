import { normalizeStudyLocale, type StudyLanguage } from "./studyLanguage.js";
export type StudyPromptKey="multiple_choice"|"true_false"|"false_statement"|"true"|"false"|"application"|"free_recall"|"explain_why"|"short_answer";
const keys=["multiple_choice","true_false","false_statement","true","false","application","free_recall","explain_why","short_answer"] as const;
const data: Record<StudyLanguage, readonly string[]>={
  "nl": [
    "Welke uitspraak beschrijft {concept} volgens het studiemateriaal?",
    "Waar of niet waar volgens de tekst? {statement}",
    "Het studiemateriaal noemt {concept} nergens.",
    "Waar",
    "Niet waar",
    "Pas {concept} toe op een nieuw voorbeeld en leg het verband uit.",
    "Leg {concept} zonder spieken in je eigen woorden uit.",
    "Waarom is {concept} belangrijk volgens dit materiaal?",
    "Wat is {concept} volgens de tekst?"
  ],
  "en": [
    "Which statement best describes {concept} according to the study material?",
    "True or false according to the study material? {statement}",
    "The study material never mentions {concept}.",
    "True",
    "False",
    "Apply {concept} to a new example. Explain how your example follows the idea in the source.",
    "Without looking back, explain {concept} in your own words and include the most important detail.",
    "Why does {concept} matter in this material? Explain the relationship, not just the definition.",
    "What is {concept}, and what does the source say about it?"
  ],
  "fr": [
    "Quelle affirmation décrit le mieux {concept} selon le document étudié ?",
    "Vrai ou faux selon le document ? {statement}",
    "Le document étudié ne mentionne jamais {concept}.",
    "Vrai",
    "Faux",
    "Appliquez {concept} à un nouvel exemple et expliquez le lien.",
    "Sans consulter vos notes, expliquez {concept} avec vos propres mots.",
    "Pourquoi {concept} est-il important dans ce document ?",
    "Qu’est-ce que {concept} selon le document ?"
  ],
  "de": [
    "Welche Aussage beschreibt {concept} laut Lernmaterial am besten?",
    "Richtig oder falsch laut Lernmaterial? {statement}",
    "Das Lernmaterial erwähnt {concept} niemals.",
    "Richtig",
    "Falsch",
    "Wende {concept} auf ein neues Beispiel an und erkläre den Zusammenhang.",
    "Erkläre {concept} ohne Nachschlagen in deinen eigenen Worten.",
    "Warum ist {concept} in diesem Material wichtig?",
    "Was ist {concept} laut Lernmaterial?"
  ],
  "id": [
    "Pernyataan mana yang paling tepat menjelaskan {concept} berdasarkan materi?",
    "Benar atau salah menurut materi? {statement}",
    "Materi tidak pernah menyebutkan {concept}.",
    "Benar",
    "Salah",
    "Terapkan {concept} pada contoh baru dan jelaskan hubungannya.",
    "Tanpa melihat catatan, jelaskan {concept} dengan kata-katamu sendiri.",
    "Mengapa {concept} penting dalam materi ini?",
    "Apa itu {concept} menurut materi?"
  ],
  "it": [
    "Quale affermazione descrive meglio {concept} secondo il materiale?",
    "Vero o falso secondo il materiale? {statement}",
    "Il materiale di studio non menziona mai {concept}.",
    "Vero",
    "Falso",
    "Applica {concept} a un nuovo esempio e spiega il collegamento.",
    "Senza consultare gli appunti, spiega {concept} con parole tue.",
    "Perché {concept} è importante in questo materiale?",
    "Che cos’è {concept} secondo il materiale?"
  ],
  "ja": [
    "教材によると、{concept}を最もよく説明しているのはどれですか？",
    "教材に照らして正しいですか？ {statement}",
    "教材には{concept}について一切書かれていません。",
    "正しい",
    "誤り",
    "{concept}を新しい例に応用し、その関係を説明してください。",
    "ノートを見ずに{concept}を自分の言葉で説明してください。",
    "この教材で{concept}が重要なのはなぜですか？",
    "教材によると{concept}とは何ですか？"
  ],
  "ko": [
    "학습 자료에 따르면 {concept}을 가장 잘 설명하는 문장은 무엇인가요?",
    "학습 자료에 따르면 참인가요, 거짓인가요? {statement}",
    "학습 자료에는 {concept}에 대한 언급이 전혀 없습니다.",
    "참",
    "거짓",
    "{concept}을 새로운 사례에 적용하고 그 관계를 설명하세요.",
    "노트를 보지 않고 {concept}을 자신의 말로 설명하세요.",
    "이 자료에서 {concept}이 중요한 이유는 무엇인가요?",
    "자료에 따르면 {concept}은 무엇인가요?"
  ],
  "pl": [
    "Które stwierdzenie najlepiej opisuje {concept} według materiału?",
    "Prawda czy fałsz według materiału? {statement}",
    "Materiał w ogóle nie wspomina o {concept}.",
    "Prawda",
    "Fałsz",
    "Zastosuj {concept} w nowym przykładzie i wyjaśnij powiązanie.",
    "Bez zaglądania do notatek wyjaśnij {concept} własnymi słowami.",
    "Dlaczego {concept} jest ważny w tym materiale?",
    "Czym jest {concept} według materiału?"
  ],
  "pt-BR": [
    "Qual afirmação descreve corretamente {concept} de acordo com o material?",
    "Verdadeiro ou falso de acordo com o material? {statement}",
    "O material nunca menciona {concept}.",
    "Verdadeiro",
    "Falso",
    "Aplique {concept} a um novo exemplo e explique a relação com a fonte.",
    "Sem consultar as anotações, explique {concept} com suas palavras e inclua o detalhe mais importante.",
    "Por que {concept} é importante neste material? Explique a relação, não apenas a definição.",
    "O que é {concept} e como aparece no material?"
  ],
  "ru": [
    "Какое утверждение лучше всего описывает {concept} согласно материалу?",
    "Верно или неверно согласно материалу? {statement}",
    "В материале ни разу не упоминается {concept}.",
    "Верно",
    "Неверно",
    "Примените {concept} к новому примеру и объясните связь.",
    "Не заглядывая в записи, объясните {concept} своими словами.",
    "Почему {concept} важно в этом материале?",
    "Что такое {concept} согласно материалу?"
  ],
  "zh-CN": [
    "根据学习资料，哪项陈述最准确地描述了{concept}？",
    "根据资料判断对错：{statement}",
    "学习资料中从未提到{concept}。",
    "正确",
    "错误",
    "将{concept}应用于新例子并解释其中的联系。",
    "不看笔记，用自己的话解释{concept}。",
    "为什么{concept}在这份资料中很重要？",
    "根据资料，{concept}是什么？"
  ],
  "es": [
    "¿Qué afirmación describe mejor {concept} según el material?",
    "¿Verdadero o falso según el material? {statement}",
    "El material de estudio nunca menciona {concept}.",
    "Verdadero",
    "Falso",
    "Aplica {concept} a un ejemplo nuevo y explica la relación.",
    "Sin mirar tus apuntes, explica {concept} con tus propias palabras.",
    "¿Por qué es importante {concept} en este material?",
    "¿Qué es {concept} según el material?"
  ],
  "tr": [
    "Çalışma materyaline göre {concept} kavramını en iyi hangi ifade açıklar?",
    "Materyale göre doğru mu, yanlış mı? {statement}",
    "Materyalde {concept} hiç geçmiyor.",
    "Doğru",
    "Yanlış",
    "{concept} kavramını yeni bir örneğe uygula ve ilişkiyi açıkla.",
    "Notlarına bakmadan {concept} kavramını kendi sözlerinle açıkla.",
    "Bu materyalde {concept} neden önemlidir?",
    "Materyale göre {concept} nedir?"
  ],
  "uk": [
    "Яке твердження найкраще описує {concept} за матеріалом?",
    "Правда чи неправда за матеріалом? {statement}",
    "У матеріалі взагалі не згадується {concept}.",
    "Правда",
    "Неправда",
    "Застосуйте {concept} до нового прикладу та поясніть зв’язок.",
    "Не дивлячись у нотатки, поясніть {concept} своїми словами.",
    "Чому {concept} важливе в цьому матеріалі?",
    "Що таке {concept} за матеріалом?"
  ],
  "vi": [
    "Phát biểu nào mô tả đúng nhất {concept} theo tài liệu?",
    "Đúng hay sai theo tài liệu? {statement}",
    "Tài liệu học tập hoàn toàn không đề cập đến {concept}.",
    "Đúng",
    "Sai",
    "Áp dụng {concept} vào ví dụ mới và giải thích mối liên hệ.",
    "Không xem ghi chú, hãy giải thích {concept} bằng lời của bạn.",
    "Vì sao {concept} quan trọng trong tài liệu này?",
    "Theo tài liệu, {concept} là gì?"
  ]
};
export function studyPrompt(locale: string | undefined, kind: StudyPromptKey, values: Record<string,string>={}): string {
 const language=normalizeStudyLocale(locale)??"en";
 const pattern=data[language][keys.indexOf(kind)];
 return pattern.replace(/\{(concept|statement)\}/g,(_,key:string)=>values[key]??"");
}
