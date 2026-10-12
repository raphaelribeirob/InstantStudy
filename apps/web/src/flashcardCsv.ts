/** RFC 4180-style CSV import for learner-authored flashcards (no HTML or formulas executed). */
export type CsvCard = { front: string; back: string; concept: string };

export function parseFlashcardCsv(raw: string): CsvCard[] {
  if (raw.length > 1_000_000) throw new Error("flashcards_csv_too_large");
  const content = raw.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;
  const commitRow = () => {
    row.push(field);
    if (row.some(value => value.trim())) rows.push(row);
    row = [];
    field = "";
    afterQuote = false;
  };
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (quoted) {
      if (ch === '"' && content[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; afterQuote = true; }
      else field += ch;
    } else if (afterQuote) {
      if (ch === ",") { row.push(field); field = ""; afterQuote = false; }
      else if (ch === "\n" || ch === "\r") {
        commitRow();
        if (ch === "\r" && content[i + 1] === "\n") i++;
      } else if (ch !== " " && ch !== "\t") throw new Error("flashcards_csv_invalid_quotes");
    } else if (ch === '"' && !field) {
      quoted = true;
    } else if (ch === '"') {
      throw new Error("flashcards_csv_invalid_quotes");
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      commitRow();
      if (ch === "\r" && content[i + 1] === "\n") i++;
    } else {
      field += ch;
    }
  }
  if (quoted) throw new Error("flashcards_csv_unclosed_quote");
  if (field || row.length || afterQuote) commitRow();
  if (!rows.length) throw new Error("flashcards_csv_empty");
  const normalized = (s: string) => s.trim().toLowerCase();
  const header = rows[0].length >= 2 && [
    "question", "term", "pergunta", "termo", "front",
  ].includes(normalized(rows[0][0])) && [
    "answer", "definition", "resposta", "definição", "back",
  ].includes(normalized(rows[0][1]));
  const values = header ? rows.slice(1) : rows;
  if (values.length === 0) throw new Error("flashcards_csv_empty");
  if (values.length > 100) throw new Error("flashcards_csv_max_100");
  return values.map((columns) => {
    if (columns.length < 2 || columns.length > 3) throw new Error("flashcards_csv_columns");
    const [front, back, concept] = columns.map(value => value.trim());
    if (front.length < 5 || front.length > 1000 || !back || back.length > 2000 ||
      (concept?.length ?? 0) > 200) throw new Error("flashcards_csv_invalid_card");
    return { front, back, concept: concept || front.slice(0, 200) };
  });
}
