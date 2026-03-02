import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations, defaultLanguage, getTranslation, formatTranslation, type Language, type TranslationKeys } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationKeys;
  getText: (path: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first for immediate loading
    const stored = localStorage.getItem('app_language');
    if (stored === 'fr' || stored === 'en' || stored === 'ar') {
      return stored;
    }
    return defaultLanguage;
  });

  // Apply language direction and load from database
  useEffect(() => {
    const root = document.documentElement;
    const isRTL = language === 'ar';
    root.dir = isRTL ? 'rtl' : 'ltr';
    root.lang = language;
    localStorage.setItem('app_language', language);
  }, [language]);

  // Load language from database on auth state change
  useEffect(() => {
    let mounted = true;
    
    const loadLanguageFromDB = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        
        const { data } = await supabase
          .from('user_settings')
          .select('language')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!mounted) return;
        
        if (data?.language && (data.language === 'fr' || data.language === 'en' || data.language === 'ar')) {
          // Only update if DB has a value AND it differs from current
          const stored = localStorage.getItem('app_language');
          if (!stored || stored !== data.language) {
            setLanguageState(data.language as Language);
            localStorage.setItem('app_language', data.language);
          }
        } else if (!data) {
          // No settings row yet — save current language to DB
          const currentLang = localStorage.getItem('app_language') || defaultLanguage;
          await supabase.from('user_settings').insert({
            user_id: user.id,
            language: currentLang,
          });
        }
      } catch (e) {
        console.error('Error loading language:', e);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadLanguageFromDB();
      }
    });

    // Only load from DB on first mount if no localStorage value
    const stored = localStorage.getItem('app_language');
    if (!stored) {
      loadLanguageFromDB();
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    
    // Save to database if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          language: lang,
          updated_at: new Date().toISOString(),
        });
    }
  }, []);

  const getText = useCallback((path: string, params?: Record<string, string | number>): string => {
    const text = getTranslation(translations[language], path);
    if (params) {
      return formatTranslation(text, params);
    }
    return text;
  }, [language]);

  const isRTL = language === 'ar';

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: translations[language],
    getText,
    isRTL,
  }), [language, setLanguage, getText, isRTL]);

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

