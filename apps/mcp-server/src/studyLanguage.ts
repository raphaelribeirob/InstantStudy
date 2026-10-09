/** Lightweight deterministic detection for Portuguese vs English study text. */
export function studyLanguage(text: string): "pt-BR" | "en" {
  const words = text.toLocaleLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").match(/[a-z]+/g) ?? [];
  const pt = new Set(["que","para","com","uma","das","dos","nao","sao","como","sobre",
    "pela","quando","isso","essa","essas","onde","tambem","porque","energia",
    "celulas","processo","durante","fotossintese","transforma","quimica","luminosa"]);
  const en = new Set(["the","this","that","with","from","into","which","during",
    "energy","cells","because","about","through","these","photosynthesis"]);
  const ptCount = words.filter(w=>pt.has(w)).length;
  const enCount = words.filter(w=>en.has(w)).length;
  return ptCount >= 2 && ptCount >= enCount ? "pt-BR" : "en";
}
