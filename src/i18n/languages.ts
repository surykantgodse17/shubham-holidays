export type LocaleCode =
  | "en"
  | "mr"
  | "hi"
  | "gu"
  | "bn"
  | "ta"
  | "te"
  | "kn"
  | "ml"
  | "pa"
  | "or"
  | "as"
  | "ur"
  | "sa"
  | "ne"
  | "kok"
  | "ks"
  | "sd"
  | "mai"
  | "sat"
  | "mni"
  | "doi"
  | "brx"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ar"
  | "zh"
  | "ja"
  | "ko"
  | "ru"
  | "it"
  | "id"
  | "th"
  | "tr";

export type LanguageOption = {
  code: LocaleCode;
  /** Name in its own script */
  nativeLabel: string;
  /** English label for search/accessibility */
  englishLabel: string;
  group: "india" | "world";
  dir?: "ltr" | "rtl";
};

/**
 * Language switcher options — India first (all scheduled languages + English),
 * then common world languages for international travelers.
 */
export const LANGUAGES: LanguageOption[] = [
  { code: "en", nativeLabel: "English", englishLabel: "English", group: "india" },
  { code: "mr", nativeLabel: "मराठी", englishLabel: "Marathi", group: "india" },
  { code: "hi", nativeLabel: "हिन्दी", englishLabel: "Hindi", group: "india" },
  { code: "gu", nativeLabel: "ગુજરાતી", englishLabel: "Gujarati", group: "india" },
  { code: "bn", nativeLabel: "বাংলা", englishLabel: "Bengali", group: "india" },
  { code: "ta", nativeLabel: "தமிழ்", englishLabel: "Tamil", group: "india" },
  { code: "te", nativeLabel: "తెలుగు", englishLabel: "Telugu", group: "india" },
  { code: "kn", nativeLabel: "ಕನ್ನಡ", englishLabel: "Kannada", group: "india" },
  { code: "ml", nativeLabel: "മലയാളം", englishLabel: "Malayalam", group: "india" },
  { code: "pa", nativeLabel: "ਪੰਜਾਬੀ", englishLabel: "Punjabi", group: "india" },
  { code: "or", nativeLabel: "ଓଡ଼ିଆ", englishLabel: "Odia", group: "india" },
  { code: "as", nativeLabel: "অসমীয়া", englishLabel: "Assamese", group: "india" },
  { code: "ur", nativeLabel: "اردو", englishLabel: "Urdu", group: "india", dir: "rtl" },
  { code: "sa", nativeLabel: "संस्कृतम्", englishLabel: "Sanskrit", group: "india" },
  { code: "ne", nativeLabel: "नेपाली", englishLabel: "Nepali", group: "india" },
  { code: "kok", nativeLabel: "कोंकणी", englishLabel: "Konkani", group: "india" },
  { code: "ks", nativeLabel: "کٲشُر", englishLabel: "Kashmiri", group: "india", dir: "rtl" },
  { code: "sd", nativeLabel: "سنڌي", englishLabel: "Sindhi", group: "india", dir: "rtl" },
  { code: "mai", nativeLabel: "मैथिली", englishLabel: "Maithili", group: "india" },
  { code: "sat", nativeLabel: "ᱥᱟᱱᱛᱟᱲᱤ", englishLabel: "Santali", group: "india" },
  { code: "mni", nativeLabel: "ꯃꯤꯇꯩꯂꯣꯟ", englishLabel: "Manipuri", group: "india" },
  { code: "doi", nativeLabel: "डोगरी", englishLabel: "Dogri", group: "india" },
  { code: "brx", nativeLabel: "बर'", englishLabel: "Bodo", group: "india" },
  { code: "es", nativeLabel: "Español", englishLabel: "Spanish", group: "world" },
  { code: "fr", nativeLabel: "Français", englishLabel: "French", group: "world" },
  { code: "de", nativeLabel: "Deutsch", englishLabel: "German", group: "world" },
  { code: "pt", nativeLabel: "Português", englishLabel: "Portuguese", group: "world" },
  { code: "ar", nativeLabel: "العربية", englishLabel: "Arabic", group: "world", dir: "rtl" },
  { code: "zh", nativeLabel: "中文", englishLabel: "Chinese", group: "world" },
  { code: "ja", nativeLabel: "日本語", englishLabel: "Japanese", group: "world" },
  { code: "ko", nativeLabel: "한국어", englishLabel: "Korean", group: "world" },
  { code: "ru", nativeLabel: "Русский", englishLabel: "Russian", group: "world" },
  { code: "it", nativeLabel: "Italiano", englishLabel: "Italian", group: "world" },
  { code: "id", nativeLabel: "Bahasa Indonesia", englishLabel: "Indonesian", group: "world" },
  { code: "th", nativeLabel: "ไทย", englishLabel: "Thai", group: "world" },
  { code: "tr", nativeLabel: "Türkçe", englishLabel: "Turkish", group: "world" },
];

export const DEFAULT_LOCALE: LocaleCode = "en";
export const LOCALE_STORAGE_KEY = "shubham-holidays-locale";

export function isLocaleCode(value: string): value is LocaleCode {
  return LANGUAGES.some((l) => l.code === value);
}

export function getLanguage(code: LocaleCode): LanguageOption {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
