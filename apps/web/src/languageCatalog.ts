/**
 * InstantStudy's 16-language locale catalog.
 * This first expansion translates key controls and navigation. Untranslated
 * explanatory copy falls back to vetted English until native review.
 */

export const supportedLanguages = ["nl","en","fr","de","id","it","ja","ko","pl","pt-BR","ru","zh-CN","es","tr","uk","vi"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
export const languageOptions = [
  {
    "code": "nl",
    "english": "Dutch",
    "native": "Nederlands"
  },
  {
    "code": "en",
    "english": "English",
    "native": "English"
  },
  {
    "code": "fr",
    "english": "French",
    "native": "Français"
  },
  {
    "code": "de",
    "english": "German",
    "native": "Deutsch"
  },
  {
    "code": "id",
    "english": "Indonesian",
    "native": "Bahasa Indonesia"
  },
  {
    "code": "it",
    "english": "Italian",
    "native": "Italiano"
  },
  {
    "code": "ja",
    "english": "Japanese",
    "native": "日本語"
  },
  {
    "code": "ko",
    "english": "Korean",
    "native": "한국어"
  },
  {
    "code": "pl",
    "english": "Polish",
    "native": "Polski"
  },
  {
    "code": "pt-BR",
    "english": "Portuguese",
    "native": "Português"
  },
  {
    "code": "ru",
    "english": "Russian",
    "native": "Русский"
  },
  {
    "code": "zh-CN",
    "english": "Simplified Chinese",
    "native": "简体中文"
  },
  {
    "code": "es",
    "english": "Spanish",
    "native": "Español"
  },
  {
    "code": "tr",
    "english": "Turkish",
    "native": "Türkçe"
  },
  {
    "code": "uk",
    "english": "Ukrainian",
    "native": "Українська"
  },
  {
    "code": "vi",
    "english": "Vietnamese",
    "native": "Tiếng Việt"
  }
] as const;
export function normalizeLanguage(raw?: string): SupportedLanguage {
  const value=String(raw??"").trim().toLowerCase().replace(/_/g,"-");
  if(value.startsWith("zh")) return "zh-CN";
  if(value.startsWith("pt")) return "pt-BR";
  const match=supportedLanguages.find(lang=>lang.toLowerCase()===value||lang.toLowerCase()===value.split("-")[0]);
  return match??"en";
}
