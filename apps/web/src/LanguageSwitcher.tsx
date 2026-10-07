import { useTranslation } from "react-i18next";
import {
  currentInstantStudyLanguage,
  setInstantStudyLanguage,
  type SupportedLanguage,
} from "./i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const current = currentInstantStudyLanguage();

  function change(language: SupportedLanguage) {
    void setInstantStudyLanguage(language);
  }

  return (
    <div className={compact ? "language-switcher compact" : "language-switcher"} aria-label={t("common.language")}>
      <button
        type="button"
        className={current === "en" ? "active" : ""}
        onClick={() => change("en")}
        aria-pressed={current === "en"}
      >
        EN
      </button>
      <button
        type="button"
        className={current === "pt-BR" ? "active" : ""}
        onClick={() => change("pt-BR")}
        aria-pressed={current === "pt-BR"}
      >
        PT
      </button>
      <span className="sr-only">{i18n.language}</span>
    </div>
  );
}
