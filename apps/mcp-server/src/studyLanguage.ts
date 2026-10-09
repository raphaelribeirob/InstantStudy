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

export const supportedStudyLocales=["nl","en","fr","de","id","it","ja","ko","pl","pt-BR","ru","zh-CN","es","tr","uk","vi"] as const;
export type StudyLanguage=(typeof supportedStudyLocales)[number];
export function normalizeStudyLocale(raw?: string): StudyLanguage | undefined {
 if(!raw)return undefined;
 const value=raw.trim().toLowerCase().replace(/_/g,"-");
 if(value.startsWith("zh"))return "zh-CN";
 if(value.startsWith("pt"))return "pt-BR";
 return supportedStudyLocales.find(code=>code.toLowerCase()===value || code.toLowerCase()===value.split("-")[0]);
}
