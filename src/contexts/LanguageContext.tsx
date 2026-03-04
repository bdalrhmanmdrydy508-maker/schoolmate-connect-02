import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { translations, getTranslation, formatTranslation, type Language, type TranslationKeys } from '@/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationKeys;
  getText: (path: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Arabic is the only language - always RTL
  React.useEffect(() => {
    const root = document.documentElement;
    root.dir = 'rtl';
    root.lang = 'ar';
    localStorage.setItem('app_language', 'ar');
  }, []);

  const setLanguage = useCallback(async (_lang: Language) => {
    // No-op: Arabic is the only language
  }, []);

  const getText = useCallback((path: string, params?: Record<string, string | number>): string => {
    const text = getTranslation(translations.ar, path);
    if (params) {
      return formatTranslation(text, params);
    }
    return text;
  }, []);

  const value = useMemo(() => ({
    language: 'ar' as Language,
    setLanguage,
    t: translations.ar,
    getText,
    isRTL: true,
  }), [setLanguage, getText]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
