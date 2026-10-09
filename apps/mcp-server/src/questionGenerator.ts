import { studyLanguage, type StudyLanguage } from "./studyLanguage.js";
import { studyPrompt } from "./questionLocalizations.js";

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
  type: "multiple_choice" | "true_false" | "short_answer" | "free_recall" | "application" | "explain_why";
  concept: ConceptLike;
  alternatives?: ConceptLike[];
  questionIndex?: number;
  difficulty?: number;
  locale?: StudyLanguage;
}): GeneratedQuestion {
  const concept = clean(input.concept.label);
  const source = clean(input.concept.sourceExcerpt);
  const index = Math.max(0, input.questionIndex ?? 0);
  const locale = input.locale ?? studyLanguage(source);

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
      prompt: studyPrompt(locale,"multiple_choice",{concept}),
      choices: values.map((value, choiceIndex) => ({
        label: String.fromCharCode(65 + choiceIndex),
        value,
      })),
      answerMode: "choice",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "true_false") {
    const supported = index % 2 === 0;
    // The false statement is provably false: this concept is in the source.
    const statement = supported ? source : studyPrompt(locale,"false_statement",{concept});
    return {
      prompt: studyPrompt(locale,"true_false",{statement}),
      choices: [
        { label: studyPrompt(locale,"true"), value: "true" },
        { label: studyPrompt(locale,"false"), value: "false" },
      ],
      answerMode: "choice",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "application") {
    return {
      prompt: studyPrompt(locale,"application",{concept}),
      answerMode: "text",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "free_recall") {
    return {
      prompt: studyPrompt(locale,"free_recall",{concept}),
      answerMode: "text",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "explain_why") {
    return {
      prompt: studyPrompt(locale,"explain_why",{concept}),
      answerMode: "text",
      generatedBy: "deterministic",
    };
  }

  return {
    prompt: studyPrompt(locale,"short_answer",{concept}),
    answerMode: "text",
    generatedBy: "deterministic",
  };
}

/** Kept on the server: no objective answer key is returned to the student. */
export function evaluateObjectiveChoice(input: {
  type: "multiple_choice" | "true_false";
  selected: string;
  sourceExcerpt: string;
  questionIndex: number;
}): boolean {
  const selected = clean(input.selected).toLocaleLowerCase();
  const expected = input.type === "true_false"
    ? (input.questionIndex % 2 === 0 ? "true" : "false")
    : clean(input.sourceExcerpt).toLocaleLowerCase();
  return selected === expected;
}
