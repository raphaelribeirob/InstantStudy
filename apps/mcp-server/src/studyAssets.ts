export type StudyFlashcard = {
  id: string;
  front: string;
  back: string;
  concept: string;
};

export type StudyAssets = {
  summary: string;
  outline: string[];
  keyConcepts: string[];
  flashcards: StudyFlashcard[];
  generatedBy: "deterministic";
};

const STOPWORDS = new Set([
  "this","that","with","from","have","were","what","when","where","which","will",
  "would","there","their","about","into","because","while","then","than","also",
  "para","com","que","uma","como","por","dos","das","mais","isso","essa","esse",
  "the","and","for","are","but","not","you","your","has","had","was","can","its",
  "our","their","they","them","these","those","over","under","between","through",
]);

function normalizedWords(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]{4,}/g) ?? [];
}

function sentences(value: string) {
  return value
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 28)
    .slice(0, 300);
}

function keywords(value: string, limit = 16) {
  const counts = new Map<string, number>();
  for (const word of normalizedWords(value)) {
    if (STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function generateStudyAssets(contentText: string): StudyAssets {
  const clean = contentText.replace(/\s+/g, " ").trim().slice(0, 200000);
  const sourceSentences = sentences(clean);
  const keyConcepts = keywords(clean, 12);

  const scored = sourceSentences.map((sentence, index) => {
    const bag = new Set(normalizedWords(sentence));
    const hits = keyConcepts.filter((word) => bag.has(word)).length;
    const score = hits * 3 + Math.min(sentence.length / 180, 1);
    return { sentence, index, score };
  });

  const summarySentences = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(5, scored.length))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);

  const outline = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(7, scored.length))
    .map((item) => item.sentence);

  const flashcards: StudyFlashcard[] = [];
  const used = new Set<string>();

  for (const concept of keyConcepts) {
    const sentence = sourceSentences.find((item) =>
      normalizedWords(item).includes(concept),
    );
    if (!sentence || used.has(sentence)) continue;
    used.add(sentence);

    flashcards.push({
      id: `card-${flashcards.length + 1}-${concept}`,
      front: `What should you remember about ${titleCase(concept)}?`,
      back: sentence,
      concept: titleCase(concept),
    });

    if (flashcards.length >= 12) break;
  }

  if (!flashcards.length) {
    for (const [index, sentence] of sourceSentences.slice(0, 8).entries()) {
      flashcards.push({
        id: `card-${index + 1}`,
        front: `Explain this idea in your own words: ${sentence.slice(0, 90)}${sentence.length > 90 ? "…" : ""}`,
        back: sentence,
        concept: `Idea ${index + 1}`,
      });
    }
  }

  return {
    summary:
      summarySentences.join(" ") ||
      clean.slice(0, 1000) ||
      "No study content was available.",
    outline,
    keyConcepts: keyConcepts.map(titleCase),
    flashcards,
    generatedBy: "deterministic",
  };
}
