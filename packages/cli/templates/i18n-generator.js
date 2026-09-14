import fs from 'fs/promises';
import path from 'path';

/**
 * Generates and writes the i18n.js configuration file to the src/ directory.
 * @param {string} cwd - Current working directory
 * @param {Array<string>} languages - Array of supported language codes (e.g., ['en', 'ar'])
 * @param {boolean} isNextJs - Whether the project is Next.js (disables Suspense for SSR)
 * @returns {Promise<void>}
 */
export async function generateI18nConfig(cwd, languages, isNextJs = false) {
  const fallbackLng = languages.length > 0 ? languages[0] : 'en';

  // Next.js Pages Router does not support Suspense during SSR (ReactDOMServer).
  // We always disable useSuspense since our LanguageProvider manages state independently.
  const nextjsOptions = `
    // Required for Next.js SSR: prevents Suspense usage during server-side rendering
    initImmediate: false,
    react: {
      useSuspense: false,
    },`;

  const content = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';
import { locales, defaultLocale } from './i18n/locales';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({${isNextJs ? nextjsOptions : ''}
    fallbackLng: defaultLocale,
    supportedLngs: locales.map(l => l.code),
    interpolation: {
      escapeValue: false, // React already protects from XSS
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    }
  });

export default i18n;
`;

  const srcDir = path.join(cwd, 'src');
  try {
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(path.join(srcDir, 'i18n.js'), content, 'utf8');
  } catch (err) {
    throw new Error(`Failed to generate i18n.js: ${err.message}`);
  }
}
