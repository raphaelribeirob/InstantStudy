/**
 * InstantStudy editorial motion language.
 * Inspired by ElevenLabs' restrained product choreography; this is not a
 * proprietary ElevenLabs animation asset.
 *
 * Only opacity and transform animate in navigational transitions.
 * Avoid loops, parallax and animated layout on learning text and inputs.
 */
export const studyMotion = {
  instant: 0.12,
  fast: 0.16,
  standard: 0.24,
  deliberate: 0.34,
  reveal: 0.42,
  distance: 12,
  exitDistance: 5,
} as const;

export const studyEase = [0.22, 1, 0.36, 1] as const;

export function studyEntry(reduced: boolean, distance = studyMotion.distance) {
  return reduced ? { opacity: 0 } : { opacity: 0, y: distance };
}

export function studyExit(reduced: boolean) {
  return reduced ? { opacity: 0 } : { opacity: 0, y: -studyMotion.exitDistance };
}

export function studyTransition(reduced: boolean, kind: "fast" | "standard" | "reveal" = "standard") {
  return {
    duration: reduced ? 0.01 : studyMotion[kind],
    ease: studyEase,
  };
}
