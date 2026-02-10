import fr from './translations/fr';
import en from './translations/en';
import ar from './translations/ar';

export type Language = 'fr' | 'en' | 'ar';
export type TranslationKeys = typeof fr;

export const translations: Record<Language, TranslationKeys> = {
  fr,
  en,
  ar: ar as unknown as TranslationKeys,
};

export const defaultLanguage: Language = 'fr';

// Get nested translation value
export function getTranslation(
  translations: TranslationKeys,
  path: string
): string {
  const keys = path.split('.');
  let result: any = translations;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path; // Return path if translation not found
    }
  }
  
  return typeof result === 'string' ? result : path;
}

// Replace placeholders in translation strings
export function formatTranslation(str: string, params: Record<string, string | number>): string {
  let result = str;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

export { fr, en };
