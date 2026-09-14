import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { 
  TranslatorService, 
  GoogleProvider, 
  DeepLProvider, 
  LibreProvider, 
  MockTranslationAdapter
} from '@meridian/core';
import { getActiveAdapterInstance } from './adapter-utils.js';


export async function runTranslations(cwd, config, spinner = null, explicitLangs = [], deltaKeys = null) {
  if (!config || !config.translation || !config.translation.provider || config.translation.provider === 'manual') {
    return;
  }

  const adapter = getActiveAdapterInstance(cwd);

  // Load .env if it exists
  dotenv.config({ path: path.join(cwd, '.env') });
  const apiKey = process.env.MERIDIAN_API_KEY || '';

  const providerName = config.translation.provider;
  let provider;

  try {
    if (providerName === 'google') {
      if (!apiKey) throw new Error('MERIDIAN_API_KEY is missing for Google Translate.');
      provider = new GoogleProvider(apiKey);
    } else if (providerName === 'deepl') {
      if (!apiKey) throw new Error('MERIDIAN_API_KEY is missing for DeepL.');
      provider = new DeepLProvider(apiKey);
    } else if (providerName === 'libre') {
      const url = config.translation.endpointUrl || 'https://translate.terraprint.co/translate';
      provider = new LibreProvider(apiKey, url);
    } else if (providerName === 'mock') {
      provider = new MockTranslationAdapter(apiKey);
    } else {
      throw new Error(`Unknown translation provider: ${providerName}`);
    }
  } catch (err) {
    if (spinner) spinner.error({ text: 'Failed to initialize translation provider' });
    console.error(chalk.red(`\n❌ Translation Setup Error: ${err.message}`));
    return;
  }

  const translator = new TranslatorService(provider);
  
  const defaultLang = config.defaultLanguage || 'en';
  const sourcePath = path.join(cwd, 'src', 'i18n', 'messages', `${defaultLang}.json`);

  if (!fs.existsSync(sourcePath)) {
    if (spinner) spinner.error({ text: 'Source language file missing' });
    console.error(chalk.red(`\n❌ Translation Error: Could not find source file at ${sourcePath}`));
    return;
  }

  let sourceJSON;
  try {
    sourceJSON = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  } catch (err) {
    if (spinner) spinner.error({ text: 'Failed to parse source keys' });
    console.error(chalk.red(`\n❌ Translation Error: Failed to parse ${sourcePath}. Invalid JSON.`));
    return;
  }

  let targetLanguages = config.languages.filter(lang => lang !== defaultLang);
  
  if (explicitLangs && explicitLangs.length > 0) {
    targetLanguages = explicitLangs.filter(lang => lang !== defaultLang);
  }
  
  if (targetLanguages.length === 0) {
    if (spinner) spinner.info({ text: 'No target languages specified.' });
    return;
  }

  let translationPayload = sourceJSON;
  if (deltaKeys && Array.isArray(deltaKeys)) {
    translationPayload = {};
    for (const key of deltaKeys) {
      // Try the key as a literal top-level lookup first.
      // This is the common case for flat sentence-keys that contain dots.
      if (sourceJSON[key] !== undefined) {
        translationPayload[key] = sourceJSON[key];
        continue;
      }
      // Fallback: dot-notation traversal for genuinely nested structures.
      const parts = key.split('.');
      let currentSrc = sourceJSON;
      let currentDest = translationPayload;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          if (currentSrc && currentSrc[part] !== undefined) {
            currentDest[part] = currentSrc[part];
          }
        } else {
          currentSrc = currentSrc ? currentSrc[part] : undefined;
          if (currentSrc !== undefined) {
            currentDest[part] = currentDest[part] || {};
            currentDest = currentDest[part];
          } else {
            break;
          }
        }
      }
    }
  }

  console.log(chalk.cyan(`\n🌍 Starting Translation Process via ${providerName.toUpperCase()} API...`));

  const mergeDeep = (target, source) => {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  };

  for (const lang of targetLanguages) {
    console.log(chalk.gray(`  Translating into ${lang}...`));
    
    try {
      const translatedObj = await translator.translateObject(translationPayload, lang, defaultLang);
      
      const targetDir = path.join(cwd, 'src', 'i18n', 'messages');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      const targetPath = path.join(targetDir, `${lang}.json`);
      let existingTarget = {};
      if (deltaKeys && fs.existsSync(targetPath)) {
        try {
          existingTarget = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        } catch (e) {
          // ignore
        }
      }
      
      const finalObj = deltaKeys ? mergeDeep(existingTarget, translatedObj) : translatedObj;
      fs.writeFileSync(targetPath, JSON.stringify(finalObj, null, 2), 'utf8');
      
      console.log(chalk.green(`  ✓ Generated: ${path.relative(cwd, targetPath)}`));
    } catch (err) {
      console.error(chalk.red(`  ❌ Failed to translate ${lang}: ${err.message}`));
    }
  }

  // Call adapter writeLocaleFiles
  try {
    await adapter.writeLocaleFiles(null, cwd);
  } catch (err) {
    console.log(chalk.red(`  ❌ Failed to write adapter locale files: ${err.message}`));
  }
}
