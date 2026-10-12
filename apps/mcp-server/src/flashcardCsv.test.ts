import assert from "node:assert/strict";
import test from "node:test";
import { parseFlashcardCsv } from "../../web/src/flashcardCsv.js";

test("CSV import round-trips quoted commas, quotes and line breaks", () => {
  const input = '\uFEFF"Question","Answer","Concept"\r\n"What, exactly?","A ""double"" quote,\nand newline","Grammar"';
  assert.deepEqual(parseFlashcardCsv(input), [{
    front: "What, exactly?", back: 'A "double" quote,\nand newline', concept: "Grammar",
  }]);
});
test("CSV import recognizes multilingual headers and two-column sets", () => {
  assert.deepEqual(parseFlashcardCsv("Pergunta,Resposta\r\nWhat is ATP?,Energy"), [{
    front:"What is ATP?",back:"Energy",concept:"What is ATP?",
  }]);
});
test("CSV import enforces quote, field and row limits", () => {
  assert.throws(() => parseFlashcardCsv('"question","unclosed'), /unclosed_quote/);
  assert.throws(() => parseFlashcardCsv('Where?,Yep,extra,field'), /columns/);
  assert.throws(() => parseFlashcardCsv("q,A"), /invalid_card/);
  assert.throws(() => parseFlashcardCsv("Question,Answer\n" + Array.from({length:101}, (_,i) =>
    "What is item "+i+"?,Answer "+i).join("\n")), /max_100/);
});
