import { studyLanguage } from "./studyLanguage.js";

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
}): GeneratedQuestion {
  const concept = clean(input.concept.label);
  const source = clean(input.concept.sourceExcerpt);
  const index = Math.max(0, input.questionIndex ?? 0);
  const pt = studyLanguage(source) === "pt-BR";

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
      prompt: pt ? `Qual afirmação descreve corretamente ${concept} de acordo com o material?` : `Which statement best describes ${concept} according to the study material?`,
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
    const statement = supported ? source :
      pt ? `O material nunca menciona ${concept}.` :
      `The study material never mentions ${concept}.`;
    return {
      prompt: pt ? `Verdadeiro ou falso de acordo com o material? ${statement}` :
        `True or false according to the study material? ${statement}`,
      choices: [
        { label: pt ? "Verdadeiro" : "True", value: "true" },
        { label: pt ? "Falso" : "False", value: "false" },
      ],
      answerMode: "choice",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "application") {
    return {
      prompt: pt ? `Aplique ${concept} a um novo exemplo e explique a relação com a fonte.` : `Apply ${concept} to a new example. Explain how your example follows the idea in the source.`,
      answerMode: "text",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "free_recall") {
    return {
      prompt: pt ? `Sem consultar as anotações, explique ${concept} com suas palavras e inclua o detalhe mais importante.` : `Without looking back, explain ${concept} in your own words and include the most important detail.`,
      answerMode: "text",
      generatedBy: "deterministic",
    };
  }

  if (input.type === "explain_why") {
    return {
      prompt: pt ? `Por que ${concept} é importante neste material? Explique a relação, não apenas a definição.` : `Why does ${concept} matter in this material? Explain the relationship, not just the definition.`,
      answerMode: "text",
      generatedBy: "deterministic",
    };
  }

  return {
    prompt: pt ? `O que é ${concept} e como aparece no material?` : `What is ${concept}, and what does the source say about it?`,
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
