export const getContextTemplate = (defaultLang = 'en', isNextJs = false, isTs = false) => {
  const useClient = isNextJs ? '"use client";\n\n' : '';
  const tsInterface = isTs ? `\nexport interface LanguageContextType {\n  lang: string;\n  text?: any;\n  toggleLanguage: () => void;\n  changeLanguage: (lang: string) => void;\n}\n` : '';
  const tsType = isTs ? '<LanguageContextType | null>' : '';

  return `${useClient}import React, { createContext, useState, useEffect } from 'react';
import { content } from '../utils/content';
import { locales, defaultLocale } from '../i18n/locales';
${tsInterface}
export const LanguageContext = createContext${tsType}(null);

export const LanguageProvider = ({ children }${isTs ? ': { children: React.ReactNode }' : ''}) => {
  // 1. Initialize logic
  const [lang, setLang] = useState${isTs ? '<string>' : ''}(() => (typeof window !== 'undefined' ? localStorage.getItem('appLang') : null) || defaultLocale);
  const [text, setText] = useState(content[lang]);
  
  // 2. Control Logic
  const _languages = locales.map(l => l.code);
  const toggleLanguage = () => {
    const currentIdx = _languages.indexOf(lang);
    const nextIdx = (currentIdx + 1) % _languages.length;
    setLang(_languages[nextIdx]);
  };

  const changeLanguage = (newLang${isTs ? ': string' : ''}) => {
    setLang(newLang);
  };

  // 3. Side Effects (Update Dir, Storage, and Text)
  useEffect(() => {
    document.documentElement.lang = lang;
    const localeObj = locales.find(l => l.code === lang);
    document.documentElement.dir = localeObj ? localeObj.dir : 'ltr';
    localStorage.setItem('appLang', lang);
    if(content[lang]) setText(content[lang]);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, text, toggleLanguage, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
`;
};

export const getNextJsI18nContextTemplate = (defaultLang = 'en', isTs = false) => {
  const tsInterface = isTs ? `\nexport interface LanguageContextType {\n  lang: string;\n  toggleLanguage: () => void;\n  changeLanguage: (lang: string) => void;\n}\n` : '';
  const tsType = isTs ? '<LanguageContextType | null>' : '';

  return `"use client";\n\nimport React, { createContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { locales, defaultLocale } from '../i18n/locales';
${tsInterface}
export const LanguageContext = createContext${tsType}(null);
 
export const LanguageProvider = ({ children }${isTs ? ': { children: React.ReactNode }' : ''}) => {
  const router = useRouter();
  const currentLocale = router?.locale || defaultLocale;
  const [lang, setLang] = useState${isTs ? '<string>' : ''}(currentLocale);
  
  useEffect(() => {
    if (router?.locale && router.locale !== lang) {
      setLang(router.locale);
    }
  }, [router?.locale]);

  const _languages = locales.map(l => l.code);
  const toggleLanguage = () => {
    const currentIdx = _languages.indexOf(lang${isTs ? ' as any' : ''});
    const nextIdx = (currentIdx + 1) % _languages.length;
    const newLang = _languages[nextIdx];
    changeLanguage(newLang || defaultLocale);
  };

  const changeLanguage = (newLang${isTs ? ': string' : ''}) => {
    setLang(newLang);
    if (router) {
      router.push(router.pathname, router.asPath, { locale: newLang });
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    const localeObj = locales.find(l => l.code === lang);
    document.documentElement.dir = localeObj ? localeObj.dir : 'ltr';
    localStorage.setItem('appLang', lang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
`;
};

export const getReactI18nContextTemplate = (defaultLang = 'en', isTs = false) => {
  const tsInterface = isTs ? `\nexport interface LanguageContextType {\n  lang: string;\n  toggleLanguage: () => void;\n  changeLanguage: (lang: string) => void;\n}\n` : '';
  const tsType = isTs ? '<LanguageContextType | null>' : '';

  return `import React, { createContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { locales, defaultLocale } from '../i18n/locales';
${tsInterface}
export const LanguageContext = createContext${tsType}(null);

export const LanguageProvider = ({ children }${isTs ? ': { children: React.ReactNode }' : ''}) => {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState${isTs ? '<string>' : ''}(() => (typeof window !== 'undefined' ? localStorage.getItem('appLang') : null) || i18n.language || defaultLocale);
  
  const _languages = locales.map(l => l.code);
  const toggleLanguage = () => {
    const currentIdx = _languages.indexOf(lang);
    const nextIdx = (currentIdx + 1) % _languages.length;
    const newLang = _languages[nextIdx];
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };

  const changeLanguage = (newLang${isTs ? ': string' : ''}) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    const localeObj = locales.find(l => l.code === lang);
    document.documentElement.dir = localeObj ? localeObj.dir : 'ltr';
    localStorage.setItem('appLang', lang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
`;
};

export const getI18nContextTemplate = (defaultLang = 'en', isNextJs = false, isTs = false) => {
  if (isNextJs) {
    return getNextJsI18nContextTemplate(defaultLang, isTs);
  }
  return getReactI18nContextTemplate(defaultLang, isTs);
};

export const getToggleTemplate = (languages, isNextJs = false, isTs = false) => {
  const useClient = isNextJs ? '"use client";\n\n' : '';
  if (languages.length > 2) {
    return `${useClient}import React, { useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';
import { locales } from '../i18n/locales';

const LanguageToggle = () => {
    const context = useContext(LanguageContext);
    const lang = context?.lang || locales[0].code;
    const changeLanguage = context?.changeLanguage || ((${isTs ? 'l: string' : 'l'}) => console.warn('LanguageContext missing'));

    return (
        <select value={lang} onChange={(e) => changeLanguage(e.target.value)}>
            {locales.map(l => (
                <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>
            ))}
        </select>
    );
}

export default LanguageToggle;
`;
  } else {
    // 2 or fewer languages, default dual-button
    return `${useClient}import React, { useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';
import { locales } from '../i18n/locales';

const LanguageToggle = () => {
    const context = useContext(LanguageContext);
    const lang = context?.lang || locales[0].code;
    const toggleLanguage = context?.toggleLanguage || (() => console.warn('LanguageContext missing'));

    return (
        <button onClick={toggleLanguage}>
            <span>{lang === locales[0].code ? locales[0].code.toUpperCase() : (locales[1] || locales[0]).code.toUpperCase()}</span>
        </button>
    );
}

export default LanguageToggle;
`;
  }
};
