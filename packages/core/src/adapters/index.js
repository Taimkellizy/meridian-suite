import fs from 'fs';
import path from 'path';
import { NextI18nextAdapter } from './nextI18nextAdapter.js';
import { NextIntlAdapter } from './nextIntlAdapter.js';

export { NextI18nextAdapter, NextIntlAdapter };

/**
 * Instantiates the correct adapter by its name.
 * @param {string} name - 'next-i18next' or 'next-intl'
 * @returns {NextI18nextAdapter | NextIntlAdapter}
 */
export function getAdapter(name) {
  if (name === 'next-i18next') return new NextI18nextAdapter();
  if (name === 'next-intl') return new NextIntlAdapter();
  throw new Error(`Unknown adapter: ${name}`);
}

/**
 * Detects the correct translation adapter for the project based on priority rules.
 * @param {string} projectRoot - The absolute path to the project root.
 * @param {string|null} flagValue - Optional CLI flag value ('pages-router' or 'app-router').
 * @returns {{ name: 'next-i18next' | 'next-intl', reason: string }}
 */
export function detectAdapter(projectRoot, flagValue = null) {
  // Rule 1 - CLI Flag
  if (flagValue) {
    if (flagValue === 'pages-router') {
      return { name: 'next-i18next', reason: 'CLI flag --adapter pages-router was passed' };
    }
    if (flagValue === 'app-router') {
      return { name: 'next-intl', reason: 'CLI flag --adapter app-router was passed' };
    }
    throw new Error(`Invalid --adapter value: ${flagValue}. Must be pages-router or app-router.`);
  }

  // Rule 2 & 3 - package.json dependencies
  const packageJsonPath = path.join(projectRoot, 'package.json');
  let hasNextIntl = false;
  let hasNextI18n = false;
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if ('next-intl' in deps) hasNextIntl = true;
      if ('next-i18next' in deps) hasNextI18n = true;
    } catch (e) {
      // package.json parsing issues are ignored; fallback to filesystem rules
    }
  }

  if (hasNextIntl && !hasNextI18n) {
    return { name: 'next-intl', reason: 'next-intl package is listed in package.json dependencies' };
  }
  if (hasNextI18n && !hasNextIntl) {
    return { name: 'next-i18next', reason: 'next-i18next package is listed in package.json dependencies' };
  }
  if (hasNextIntl && hasNextI18n) {
    throw new Error('Ambiguous project: Both next-intl and next-i18next are listed as dependencies. Please specify the adapter using --adapter.');
  }

  // Rule 4 & 5 - filesystem app/ vs pages/ directories
  const hasAppDir = fs.existsSync(path.join(projectRoot, 'app')) || fs.existsSync(path.join(projectRoot, 'src', 'app'));
  const hasPagesDir = fs.existsSync(path.join(projectRoot, 'pages')) || fs.existsSync(path.join(projectRoot, 'src', 'pages'));

  if (hasAppDir && !hasPagesDir) {
    return { name: 'next-intl', reason: 'app/ directory exists at project root' };
  }
  if (hasPagesDir && !hasAppDir) {
    return { name: 'next-i18next', reason: 'pages/ directory exists at project root' };
  }
  if (hasAppDir && hasPagesDir) {
    throw new Error('Ambiguous project: Both app/ and pages/ directories exist. Please specify the adapter using --adapter.');
  }

  // Rule 6 - next.config.js / next.config.ts experimental.appDir
  let hasAppDirInConfig = false;
  const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  for (const file of configFiles) {
    const configPath = path.join(projectRoot, file);
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        if (/appDir\s*:\s*true/.test(content)) {
          hasAppDirInConfig = true;
          break;
        }
      } catch (e) {
        // next.config read issues are ignored; fallback to filesystem rules
      }
    }
  }

  if (hasAppDirInConfig) {
    return { name: 'next-intl', reason: 'appDir: true is present in experimental config of next config file' };
  }

  // Rule 7 - Failure / Ambiguous
  throw new Error('Detection failed or is ambiguous (no pages/ or app/ directory, no next-intl or next-i18next dependency, and no appDir config found). Please specify the adapter explicitly using --adapter <pages-router|app-router>.');
}
