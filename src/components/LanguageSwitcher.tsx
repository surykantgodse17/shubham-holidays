import { useEffect, useId, useRef, useState } from "react";
import { LANGUAGES } from "../i18n/languages";
import { useI18n } from "../i18n/I18nProvider";

type LanguageSwitcherProps = {
  /** Lighter chrome when sitting on the hero photo */
  overHero?: boolean;
};

export function LanguageSwitcher({ overHero = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];
  const india = LANGUAGES.filter((l) => l.group === "india");
  const world = LANGUAGES.filter((l) => l.group === "world");

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function renderGroup(title: string, langs: typeof LANGUAGES) {
    return (
      <div className="lang-switcher-group" key={title}>
        <p className="lang-switcher-group-title">{title}</p>
        <ul className="lang-switcher-list">
          {langs.map((lang) => {
            const selected = lang.code === locale;
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`lang-option${selected ? " selected" : ""}`}
                  onClick={() => {
                    setLocale(lang.code);
                    setOpen(false);
                  }}
                >
                  <span className="lang-option-native">{lang.nativeLabel}</span>
                  <span className="lang-option-en">{lang.englishLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className={`lang-switcher${overHero ? " lang-switcher-over-hero" : ""}${open ? " open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="lang-switcher-btn"
        aria-label={t("lang.switcher")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title={`${t("lang.switcher")}: ${current.nativeLabel}`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="lang-switcher-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M3.5 12h17M12 3.5c2.4 2.6 3.6 5.4 3.6 8.5s-1.2 5.9-3.6 8.5c-2.4-2.6-3.6-5.4-3.6-8.5s1.2-5.9 3.6-8.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
        <span className="lang-switcher-code">{locale.toUpperCase()}</span>
      </button>

      {open ? (
        <div className="lang-switcher-panel" role="listbox" id={listId} aria-label={t("lang.choose")}>
          <p className="lang-switcher-heading">{t("lang.choose")}</p>
          {renderGroup(t("lang.groupIndia"), india)}
          {renderGroup(t("lang.groupWorld"), world)}
        </div>
      ) : null}
    </div>
  );
}
