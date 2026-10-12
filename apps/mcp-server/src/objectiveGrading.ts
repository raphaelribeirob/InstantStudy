/**
 * Grade only the choice that the engine actually displayed.
 *
 * This deliberately never uses a language model or fuzzy scoring. Otherwise a
 * client could submit off-list prose and obtain objective-question credit.
 */
export function gradeObjectiveChoice(input: {
  choices: ReadonlyArray<{ value: string }>;
  userAnswer: string;
  expectedValue: string;
  conceptLabel: string;
}) {
  const answer = input.userAnswer.trim();
  const accepted = input.choices.some((choice) => choice.value.trim() === answer);
  const correct = accepted && answer === input.expectedValue.trim();
  return {
    correctness: correct ? 1 : 0,
    completeness: correct ? 1 : 0,
    confidence: 1,
    missingConcepts: correct ? [] : [input.conceptLabel],
    feedback: correct
      ? "Correct. This answer is directly supported by the source."
      : "Not quite. Review the source-backed correct statement.",
    provider: "deterministic" as const,
  };
}
