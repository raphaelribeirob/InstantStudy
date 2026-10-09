import assert from "node:assert/strict";
import test from "node:test";
import { generateStudyAssets } from "./studyAssets.js";

test("study assets produce semantic flashcards and structured guide", () => {
  const assets = generateStudyAssets(
    "Photosynthesis converts light energy into chemical energy in chloroplasts. Chlorophyll absorbs light used by the reactions. ATP and NADPH support carbon fixation in the Calvin cycle. Carbon dioxide is incorporated into organic molecules.",
  );

  assert.ok(assets.summary.includes("Photosynthesis"));
  assert.ok(assets.outline.length >= 2);
  assert.ok(assets.keyConcepts.length >= 3);
  assert.ok(assets.flashcards.length >= 3);
  assert.ok(assets.flashcards.every((card) => !/^Concept \d+$/i.test(card.front)));
  assert.ok(assets.flashcards.every((card) => card.front.endsWith("?")));
});

test("study assets are deterministic for identical input", () => {
  const text =
    "Mitochondria generate ATP during cellular respiration. The electron transport chain creates a proton gradient. ATP synthase uses that gradient to synthesize ATP.";
  assert.deepEqual(generateStudyAssets(text), generateStudyAssets(text));
});

test("generated flashcards require recall of a hidden source concept", () => {
  const assets = generateStudyAssets("Photosynthesis converts light energy into chemical energy in chloroplasts. Chlorophyll absorbs photons in the thylakoid membranes. Carbon dioxide fixation occurs during the Calvin cycle.");
  assert.ok(assets.flashcards.some(card => card.front.includes("_____")));
  assert.ok(assets.flashcards.every(card => !card.front.includes("What should you remember about")));
});
