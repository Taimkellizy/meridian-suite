import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'node:assert/strict';
import test from 'node:test';
import { detectAdapter, NextI18nextAdapter, NextIntlAdapter } from '@meridian/core';

// Helper to create a temporary project structure
function createTempProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-adapter-test-'));
  return tempDir;
}

function cleanupProject(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {}
}

test('Meridian Runtime Adapters - Test Suite', async (t) => {

  await t.test('Scenario 1: Fresh CRA or Vite React project (should fail detection)', () => {
    const dir = createTempProject();
    try {
      // Setup typical Vite / CRA package.json
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        name: 'vite-project',
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        }
      }));

      // No app/ or pages/ directories
      assert.throws(() => {
        detectAdapter(dir);
      }, /Detection failed or is ambiguous/);

    } finally {
      cleanupProject(dir);
    }
  });

  await t.test('Scenario 2: Fresh Next.js Pages Router project detection & injection', async () => {
    const dir = createTempProject();
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        dependencies: {
          next: '^14.0.0'
        }
      }));

      const pagesDir = path.join(dir, 'pages');
      fs.mkdirSync(pagesDir);
      fs.writeFileSync(path.join(pagesDir, '_app.tsx'), `
export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
      `);

      fs.writeFileSync(path.join(pagesDir, 'index.tsx'), `
export default function HomePage() {
  return <div>Welcome</div>;
}
      `);

      fs.writeFileSync(path.join(pagesDir, '_document.tsx'), `
import Document, { Html, Head, Main, NextScript } from 'next/document';
export default class MyDocument extends Document {
  render() {
    return (
      <Html><Head /><body><Main /><NextScript /></body></Html>
    );
  }
}
      `);

      // Write mock src/i18n/locales.ts
      const i18nDir = path.join(dir, 'src', 'i18n');
      fs.mkdirSync(i18nDir, { recursive: true });
      fs.writeFileSync(path.join(i18nDir, 'locales.ts'), `
export const locales = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', dir: 'rtl' }
] as const;
export const defaultLocale = 'en';
      `);

      fs.writeFileSync(path.join(dir, 'next.config.js'), `
module.exports = {
  reactStrictMode: true
};
      `);

      // 1. Detect
      const detection = detectAdapter(dir);
      assert.equal(detection.name, 'next-i18next');
      assert.match(detection.reason, /pages\/ directory exists/);

      // 2. Inject
      const adapter = new NextI18nextAdapter();
      // Stub install to avoid network call in tests
      adapter.install = async () => {};
      
      await adapter.injectRuntime(dir, { languages: ['en', 'ar'], defaultLanguage: 'en' });

      // Verify next-i18next.config.js is generated
      const configExists = fs.existsSync(path.join(dir, 'next-i18next.config.js'));
      assert.ok(configExists, 'next-i18next.config.js should be generated');

      // Verify next.config.js contains i18n block
      const nextConfigContent = fs.readFileSync(path.join(dir, 'next.config.js'), 'utf8');
      assert.match(nextConfigContent, /defaultLocale:\s*['"]en['"]/);
      assert.match(nextConfigContent, /locales:\s*\[\s*['"]en['"],\s*['"]ar['"]\s*\]/);

      // Verify _app.tsx is wrapped
      const appContent = fs.readFileSync(path.join(pagesDir, '_app.tsx'), 'utf8');
      assert.match(appContent, /appWithTranslation/);

      // Verify index.tsx gets serverSideTranslations
      const indexContent = fs.readFileSync(path.join(pagesDir, 'index.tsx'), 'utf8');
      assert.match(indexContent, /serverSideTranslations/);
      assert.match(indexContent, /export async function getStaticProps/);

      // Verify _document.tsx is untouched
      const docContent = fs.readFileSync(path.join(pagesDir, '_document.tsx'), 'utf8');
      assert.ok(!docContent.includes('serverSideTranslations'));

    } finally {
      cleanupProject(dir);
    }
  });

  await t.test('Scenario 3: Fresh Next.js App Router project detection & injection', async () => {
    const dir = createTempProject();
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        dependencies: {
          next: '^14.0.0'
        }
      }));
      fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({}));

      const appLocaleDir = path.join(dir, 'app', '[locale]');
      fs.mkdirSync(appLocaleDir, { recursive: true });
      fs.writeFileSync(path.join(appLocaleDir, 'layout.tsx'), `
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
      `);

      // Write mock src/i18n/locales.ts
      const i18nDir = path.join(dir, 'src', 'i18n');
      fs.mkdirSync(i18nDir, { recursive: true });
      fs.writeFileSync(path.join(i18nDir, 'locales.ts'), `
export const locales = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', dir: 'rtl' }
] as const;
export const defaultLocale = 'en';
      `);

      fs.writeFileSync(path.join(dir, 'next.config.js'), `
module.exports = {
  reactStrictMode: true
};
      `);

      // 1. Detect
      const detection = detectAdapter(dir);
      assert.equal(detection.name, 'next-intl');
      assert.match(detection.reason, /app\/ directory exists/);

      // 2. Inject
      const adapter = new NextIntlAdapter();
      adapter.install = async () => {};

      await adapter.injectRuntime(dir, { languages: ['en', 'ar'], defaultLanguage: 'en' });

      // Verify src/i18n/request.ts generated
      const reqExists = fs.existsSync(path.join(i18nDir, 'request.ts'));
      assert.ok(reqExists, 'request.ts should be generated');

      // Verify middleware.ts generated
      const midExists = fs.existsSync(path.join(dir, 'middleware.ts'));
      assert.ok(midExists, 'middleware.ts should be generated');
      const midContent = fs.readFileSync(path.join(dir, 'middleware.ts'), 'utf8');
      assert.match(midContent, /matcher:\s*\[\s*['"]\/['"],\s*['"]\/(\(en\|ar\))\/:path\*['"]\s*\]/);

      // Verify next.config.js is wrapped with withNextIntl
      const configContent = fs.readFileSync(path.join(dir, 'next.config.js'), 'utf8');
      assert.match(configContent, /withNextIntl/);

      // Verify Root Layout has lang/dir and setRequestLocale
      const layoutContent = fs.readFileSync(path.join(appLocaleDir, 'layout.tsx'), 'utf8');
      assert.match(layoutContent, /lang=\{params\.locale\}/);
      assert.match(layoutContent, /dir=\{dirFromLocale\(params\.locale\)\}/);
      assert.match(layoutContent, /setRequestLocale\(params\.locale\)/);

    } finally {
      cleanupProject(dir);
    }
  });

  await t.test('Scenario 4: Project with pre-existing next-i18next setup (idempotency)', async () => {
    const dir = createTempProject();
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        dependencies: {
          'next-i18next': '^15.0.0'
        }
      }));

      const pagesDir = path.join(dir, 'pages');
      fs.mkdirSync(pagesDir);
      fs.writeFileSync(path.join(pagesDir, '_app.tsx'), `
import { appWithTranslation } from 'next-i18next';
function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
export default appWithTranslation(MyApp);
      `);

      fs.writeFileSync(path.join(pagesDir, 'index.tsx'), `
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
export default function HomePage() {
  return <div>Welcome</div>;
}
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common']))
    }
  };
}
      `);

      const i18nDir = path.join(dir, 'src', 'i18n');
      fs.mkdirSync(i18nDir, { recursive: true });
      fs.writeFileSync(path.join(i18nDir, 'locales.ts'), `
export const locales = [
  { code: 'en', label: 'English', dir: 'ltr' }
];
export const defaultLocale = 'en';
      `);

      fs.writeFileSync(path.join(dir, 'next-i18next.config.js'), `
module.exports = {
  i18n: { defaultLocale: 'en', locales: ['en'] }
};
      `);

      fs.writeFileSync(path.join(dir, 'next.config.js'), `
module.exports = {
  i18n: { defaultLocale: 'en', locales: ['en'] }
};
      `);

      // Run inject twice
      const adapter = new NextI18nextAdapter();
      adapter.install = async () => {};

      await adapter.injectRuntime(dir, { languages: ['en'], defaultLanguage: 'en' });
      await adapter.injectRuntime(dir, { languages: ['en'], defaultLanguage: 'en' });

      // Verify no duplicates in config
      const nextConfigContent = fs.readFileSync(path.join(dir, 'next.config.js'), 'utf8');
      const i18nOccurrences = (nextConfigContent.match(/i18n/g) || []).length;
      assert.ok(i18nOccurrences <= 1, 'Should not duplicate i18n block in next.config.js');

      // Verify _app.tsx has only one appWithTranslation wrapper
      const appContent = fs.readFileSync(path.join(pagesDir, '_app.tsx'), 'utf8');
      const wrapOccurrences = (appContent.match(/appWithTranslation/g) || []).length;
      assert.ok(wrapOccurrences <= 2, 'Should not duplicate wrapper imports and calls in _app.tsx'); // 1 import + 1 call

      // Verify index.tsx has only one serverSideTranslations call
      const indexContent = fs.readFileSync(path.join(pagesDir, 'index.tsx'), 'utf8');
      const sstOccurrences = (indexContent.match(/serverSideTranslations\(/g) || []).length;
      assert.equal(sstOccurrences, 1, 'Should have exactly one serverSideTranslations call in index.tsx');

    } finally {
      cleanupProject(dir);
    }
  });

  await t.test('Scenario 5: Project with pre-existing next-intl setup (idempotency)', async () => {
    const dir = createTempProject();
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        dependencies: {
          'next-intl': '^3.0.0'
        }
      }));

      const appLocaleDir = path.join(dir, 'app', '[locale]');
      fs.mkdirSync(appLocaleDir, { recursive: true });
      fs.writeFileSync(path.join(appLocaleDir, 'layout.tsx'), `
import { setRequestLocale } from 'next-intl/server';
import { dirFromLocale } from '@/src/i18n/locales';
export default function RootLayout({ children, params }) {
  setRequestLocale(params.locale);
  return (
    <html lang={params.locale} dir={dirFromLocale(params.locale)}>
      <body>{children}</body>
    </html>
  );
}
      `);

      const i18nDir = path.join(dir, 'src', 'i18n');
      fs.mkdirSync(i18nDir, { recursive: true });
      fs.writeFileSync(path.join(i18nDir, 'locales.ts'), `
export const locales = [
  { code: 'en', label: 'English', dir: 'ltr' }
];
export const defaultLocale = 'en';
      `);

      fs.writeFileSync(path.join(dir, 'next.config.js'), `
const withNextIntl = require('next-intl/plugin')();
module.exports = withNextIntl({
  reactStrictMode: true
});
      `);

      // Run inject twice
      const adapter = new NextIntlAdapter();
      adapter.install = async () => {};

      await adapter.injectRuntime(dir, { languages: ['en'], defaultLanguage: 'en' });
      await adapter.injectRuntime(dir, { languages: ['en'], defaultLanguage: 'en' });

      // Verify no duplicates in config
      const configContent = fs.readFileSync(path.join(dir, 'next.config.js'), 'utf8');
      const pluginOccurrences = (configContent.match(/withNextIntl/g) || []).length;
      assert.ok(pluginOccurrences <= 2, 'Should not duplicate withNextIntl in next.config.js');

      // Verify Layout layout.tsx
      const layoutContent = fs.readFileSync(path.join(appLocaleDir, 'layout.tsx'), 'utf8');
      const setLocaleOccurrences = (layoutContent.match(/setRequestLocale/g) || []).length;
      assert.ok(setLocaleOccurrences <= 2, 'Should not duplicate setRequestLocale in layout.tsx');

    } finally {
      cleanupProject(dir);
    }
  });

  await t.test('Scenario 6: Ambiguous project (pages/ and app/ both present, no dependencies)', () => {
    const dir = createTempProject();
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({}));
      fs.mkdirSync(path.join(dir, 'pages'));
      fs.mkdirSync(path.join(dir, 'app'));

      assert.throws(() => {
        detectAdapter(dir);
      }, /Ambiguous project: Both app\/ and pages\/ directories exist/);

    } finally {
      cleanupProject(dir);
    }
  });

  await t.test('CLI Flag Override detection test', () => {
    const dir = createTempProject();
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({}));

      const res1 = detectAdapter(dir, 'pages-router');
      assert.equal(res1.name, 'next-i18next');
      assert.match(res1.reason, /CLI flag --adapter pages-router/);

      const res2 = detectAdapter(dir, 'app-router');
      assert.equal(res2.name, 'next-intl');
      assert.match(res2.reason, /CLI flag --adapter app-router/);

    } finally {
      cleanupProject(dir);
    }
  });

  await t.test('Scenario 7: Project with next-i18next in package.json (even with both app/ and pages/ present)', () => {
    const dir = createTempProject();
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        dependencies: {
          'next-i18next': '^15.0.0'
        }
      }));
      fs.mkdirSync(path.join(dir, 'pages'));
      fs.mkdirSync(path.join(dir, 'app'));

      const detection = detectAdapter(dir);
      assert.equal(detection.name, 'next-i18next');
      assert.match(detection.reason, /next-i18next package is listed/);

    } finally {
      cleanupProject(dir);
    }
  });
});
