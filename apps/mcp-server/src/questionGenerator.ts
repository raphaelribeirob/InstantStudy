export type GeneratedChoice = {
  label: string;
  value: string;
};

export type GeneratedQuestion = {
  prompt: string;
  choices?: GeneratedChoice[];
  answerMode: "choice" | "text";
  generatedBy: "deterministic";
};

type ConceptLike = {
  label: string;
  sourceExcerpt: string;
  studyPrompt?: string;
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function distinctAlternativeStatements(
  current: ConceptLike,
  alternatives: ConceptLike[],
) {
  const canonical = (value: string) => clean(value).toLocaleLowerCase()
    .normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9 ]/g, "");
  const seen = new Set([canonical(current.sourceExcerpt)]);
  const currentLabel = canonical(current.label);
  const values: Array<{text: string; overlap: number; position: number}> = [];
  const topicWords = new Set(canonical(current.sourceExcerpt).split(" ")
    .filter(word => word.length >= 5 && !["which","there","their","other","these","those"].includes(word)));

  for (const item of alternatives) {
    const value = clean(item.sourceExcerpt);
    const key = canonical(value);
    if (!value || seen.has(key) || canonical(item.label) === currentLabel) continue;
    seen.add(key);
    const alternativeWords = new Set(canonical(value).split(" ").filter(Boolean));
    const overlap = [...topicWords].filter(word => alternativeWords.has(word)).length;
    values.push({text:value,overlap,position:values.length});
  }

  // Prefer alternatives from the same topic before clearly unrelated ones.
  // When too few safe candidates exist, the question generator falls back
  // to written recall rather than inventing unsupported false claims.
  return values.sort((a,b) => b.overlap - a.overlap || a.position - b.position)
    .slice(0,3).map(row => row.text);
}

function rotate<T>(items: T[], shift: number) {
  if (!items.length) return items;
  const offset = ((shift % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export function generateQuestion(input: {
  type: "multiple_choice" | "true_false" | "short_answer" | "free_recall" | "application" | "explain_why";
  concept: ConceptLike;
  alternatives?: ConceptLike[];
  questionIndex?: number;
  difficulty?: number;
  testDifficulty?: "foundation" | "standard" | "advanced";
}): GeneratedQuestion {
  const concept = clean(input.concept.label);
  const source = clean(input.concept.sourceExcerpt);
  const index = Math.max(0, input.questionIndex ?? 0);
  const authoredPrompt = clean(input.concept.studyPrompt || "");

  if (input.type === "multiple_choice") {
    const distractors = distinctAlternativeStatements(
      input.concept,
      input.alternatives ?? [],
    );

    // No fabricated wrong statements. Fall back to written recall unless
    // three distinct source-grounded alternative statements are available.
    if (distractors.length < 3) {
      return { prompt: authoredPrompt || `Explain ${concept} according to the source.`,
        answerMode: "text", generatedBy: "deterministic" };
    }

    const values = rotate([source, ...distractors.slice(0, 3)], index);
    return {
      prompt: input.testDifficulty === "advanced"
        ? `Which source-supported statement explains ${concept} most accurately in context?`
        : `Which statement best describes ${concept} according to the study material?`,
      choices: values.map((value, choiceIndex) => ({
        label: String.fromCharCode(65 + choiceIndex),
        value,
      })),
      answerMode: "choice",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "true_false") {
    const distractors = distinctAlternativeStatements(
      input.concept, input.alternatives ?? [],
    );
    const useDifferentSource = index % 2 === 1 && distractors.length > 0;
    const statement = useDifferentSource ? distractors[0] : source;
    // If we lack a verifiable alternative, we cannot honestly construct a
    // false statement; ask a written question instead of fabricating one.
    if (index % 2 === 1 && distractors.length === 0) {
      return {
        prompt: authoredPrompt || `Explain ${concept} using the study material.`,
        answerMode: "text",
        generatedBy: "deterministic",
      };
    }
    return {
      prompt: `Does this statement match the studied source for ${concept}? ${statement}`,
      choices: [
        { label: "True", value: "True" },
        { label: "False", value: "False" },
      ],
      answerMode: "choice",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "application") {
    return {
      prompt: `Apply ${concept} to a new example. Explain how your example follows the idea in the source.`,
      answerMode: "text",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "free_recall") {
    return {
      prompt: input.testDifficulty === "advanced"
        ? `Explain ${concept}, identify the source evidence, and relate its mechanism to the broader topic.`
        : authoredPrompt || `Without looking back, explain ${concept} in your own words and include the most important detail.`, 
      answerMode: "text",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "explain_why") {
    return {
      prompt: `Why does ${concept} matter in this material? Explain the relationship, not just the definition.`,
      answerMode: "text",
      generatedBy: "deterministic",
    };
  }

  return {
    prompt: authoredPrompt || `What is ${concept}, and what does the source say about it?`, 
    answerMode: "text",
    generatedBy: "deterministic",
  };
}

/**
 * The answer key is computed on the trusted service only; never place it in
 * the serialized question sent to a learner.
 */
export function correctChoiceForQuestion(input: Parameters<typeof generateQuestion>[0]) {
  if (input.type === "true_false") {
    const alternatives = distinctAlternativeStatements(
      input.concept, input.alternatives ?? [],
    );
    const index = Math.max(0, input.questionIndex ?? 0);
    if (index % 2 === 1 && !alternatives.length) return null;
    return index % 2 === 1 ? "False" : "True";
  }
  if (input.type === "multiple_choice") {
    if (distinctAlternativeStatements(input.concept, input.alternatives ?? []).length < 3) return null;
    return clean(input.concept.sourceExcerpt);
  }
  return null;
}
