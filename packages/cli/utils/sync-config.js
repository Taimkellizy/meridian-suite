import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const RTL_LANGUAGE_CODES = new Set([
  'ar', 'he', 'fa', 'ur', 'ku', 'dv', 'ps', 'sd', 'ug', 'yi'
]);

function getLanguageLabel(code) {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const name = displayNames.of(code);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : code.toUpperCase();
  } catch (e) {
    return code.toUpperCase();
  }
}

export function runSyncConfig(cwd, config, isTypeScript = null) {
  if (isTypeScript === null) {
    isTypeScript = fs.existsSync(path.join(cwd, 'tsconfig.json'));
  }

  const defaultLocale = config.defaultLanguage || 'en';
  const languages = config.languages || ['en'];

  const localesObjects = languages.map(code => {
    return {
      code,
      label: getLanguageLabel(code),
      dir: RTL_LANGUAGE_CODES.has(code) ? 'rtl' : 'ltr'
    };
  });

  const ext = isTypeScript ? 'ts' : 'js';
  const outPath = path.join(cwd, 'src', 'i18n', `locales.${ext}`);
  
  // Create dir if not exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  let content = '';

  if (isTypeScript) {
    content = `export const locales = [
${localesObjects.map(l => `  { code: '${l.code}', label: '${l.label}', dir: '${l.dir}' },`).join('\n')}
] as const;

export const defaultLocale = '${defaultLocale}';
export type Locale = typeof locales[number]['code'];

export function dirFromLocale(locale: string) {
  const found = locales.find(l => l.code === locale);
  return found ? found.dir : 'ltr';
}
`;
  } else {
    content = `export const locales = [
${localesObjects.map(l => `  { code: '${l.code}', label: '${l.label}', dir: '${l.dir}' },`).join('\n')}
];

export const defaultLocale = '${defaultLocale}';

export function dirFromLocale(locale) {
  const found = locales.find(l => l.code === locale);
  return found ? found.dir : 'ltr';
}
`;
  }

  fs.writeFileSync(outPath, content, 'utf8');
  console.log(chalk.green(`✓ Generated single source of truth at src/i18n/locales.${ext}`));
  return outPath;
}
