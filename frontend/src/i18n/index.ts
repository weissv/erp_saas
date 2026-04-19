import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  MARKETING_SUPPORTED_LANGUAGES,
  resolveMarketingLanguage,
  type MarketingLanguage,
} from "../features/marketing/content";

export const MARKETING_LANGUAGE_STORAGE_KEY = "miraiEdu.language";

function getBrowserLanguageCandidates() {
  if (typeof navigator === "undefined") {
    return [];
  }

  return [...(navigator.languages ?? []), navigator.language].filter(Boolean);
}

export function detectPreferredMarketingLanguage(): MarketingLanguage {
  if (typeof window !== "undefined") {
    const storedLanguage = window.localStorage.getItem(MARKETING_LANGUAGE_STORAGE_KEY);
    const resolvedStoredLanguage = resolveMarketingLanguage(storedLanguage);

    if (storedLanguage && storedLanguage === resolvedStoredLanguage) {
      return resolvedStoredLanguage;
    }
  }

  for (const candidate of getBrowserLanguageCandidates()) {
    const resolvedLanguage = resolveMarketingLanguage(candidate);

    if (candidate && resolvedLanguage === candidate.toLowerCase().split(/[-_]/)[0]) {
      return resolvedLanguage;
    }
  }

  if (typeof document !== "undefined") {
    const documentLanguage = document.documentElement.lang;
    const resolvedDocumentLanguage = resolveMarketingLanguage(documentLanguage);

    if (
      documentLanguage &&
      resolvedDocumentLanguage === documentLanguage.toLowerCase().split(/[-_]/)[0]
    ) {
      return resolvedDocumentLanguage;
    }
  }

  return "ru";
}

function updateDocumentLanguage(language: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = resolveMarketingLanguage(language);
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: detectPreferredMarketingLanguage(),
    fallbackLng: "ru",
    supportedLngs: MARKETING_SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      ru: { translation: {} },
      en: { translation: {} },
      ja: { translation: {} },
    },
    initImmediate: false,
  });
}

updateDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
i18n.on("languageChanged", updateDocumentLanguage);

export async function setMarketingLanguage(language: MarketingLanguage) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MARKETING_LANGUAGE_STORAGE_KEY, language);
  }

  await i18n.changeLanguage(language);
}

export async function syncMarketingLanguage() {
  const detectedLanguage = detectPreferredMarketingLanguage();
  await i18n.changeLanguage(detectedLanguage);
  return detectedLanguage;
}

export default i18n;
