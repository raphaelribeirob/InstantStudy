import { useTranslation } from "react-i18next";
import { languageOptions } from "./languageCatalog";
import { currentInstantStudyLanguage, setInstantStudyLanguage, type SupportedLanguage } from "./i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const current = currentInstantStudyLanguage();
  return (
    <label className={compact ? "language-switcher compact" : "language-switcher"}>
      <span className="sr-only">{t("common.language")}</span>
      <select
        aria-label={t("common.language")}
        value={current}
        onChange={event => { void setInstantStudyLanguage(event.currentTarget.value as SupportedLanguage); }}
      >
        {languageOptions.map(({code,english,native}) => (
          <option key={code} value={code} lang={code} title={english}>{native}</option>
        ))}
      </select>
      <span className="sr-only">{i18n.language}</span>
    </label>
  );
}
