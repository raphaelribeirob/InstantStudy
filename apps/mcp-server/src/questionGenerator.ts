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
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function distinctAlternativeStatements(
  current: ConceptLike,
  alternatives: ConceptLike[],
) {
  const seen = new Set([clean(current.sourceExcerpt).toLocaleLowerCase()]);
  const values: string[] = [];

  for (const item of alternatives) {
    const value = clean(item.sourceExcerpt);
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    values.push(value);
    if (values.length >= 3) break;
  }

  return values;
}

function rotate<T>(items: T[], shift: number) {
  if (!items.length) return items;
  const offset = ((shift % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export function generateQuestion(input: {
  type: "multiple_choice" | "true_false" | "short_answer" | "free_recall" | "application";
  concept: ConceptLike;
  alternatives?: ConceptLike[];
  questionIndex?: number;
  difficulty?: number;
}): GeneratedQuestion {
  const concept = clean(input.concept.label);
  const source = clean(input.concept.sourceExcerpt);
  const index = Math.max(0, input.questionIndex ?? 0);

  if (input.type === "multiple_choice") {
    const distractors = distinctAlternativeStatements(
      input.concept,
      input.alternatives ?? [],
    );

    while (distractors.length < 3) {
      const fallback = [
        `The source does not connect ${concept} to the mechanism being studied.`,
        `${concept} is described as unrelated to the surrounding process.`,
        `The source states that ${concept} has no role in this topic.`,
      ][distractors.length];
      distractors.push(fallback);
    }

    const values = rotate([source, ...distractors.slice(0, 3)], index);
    return {
      prompt: `Which statement best describes ${concept} according to the study material?`,
      choices: values.map((value, choiceIndex) => ({
        label: String.fromCharCode(65 + choiceIndex),
        value,
      })),
      answerMode: "choice",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "true_false") {
    const trueFirst = index % 2 === 0;
    const falseValue = `The material does not support this statement: ${source}`;
    return {
      prompt: `Which option matches the source about ${concept}?`,
      choices: trueFirst
        ? [
            { label: "True", value: source },
            { label: "False", value: falseValue },
          ]
        : [
            { label: "False", value: falseValue },
            { label: "True", value: source },
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
      prompt: `Without looking back, explain ${concept} in your own words and include the most important detail.`,
      answerMode: "text",
      generatedBy: "deterministic",
    };
  }

  return {
    prompt: `What is ${concept}, and what does the source say about it?`,
    answerMode: "text",
    generatedBy: "deterministic",
  };
}
