import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { 
  checkIsESM, 
  readLocalesFromTs, 
  findPagesAppFile, 
  wrapAppWithTranslation, 
  findPageFiles, 
  injectServerSideTranslationsToPage,
  ensureSkipLibCheck
} from './helpers.js';
import { mergeI18nBlock } from './shared/nextConfigHelper.js';
import { hasImport, parseSource } from './shared/recastUtils.js';

const execAsync = promisify(exec);

export class NextI18nextAdapter {
  constructor() {
    this.name = 'next-i18next';
  }

  detect(projectRoot) {
    // Shared detection resides in index.js, but implement basic checks here as well
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if ('next-i18next' in deps) return true;
      } catch (e) {}
    }
    const hasPagesDir = fs.existsSync(path.join(projectRoot, 'pages')) || fs.existsSync(path.join(projectRoot, 'src', 'pages'));
    return hasPagesDir;
  }

  async install(projectRoot) {
    let pm = 'npm';
    if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
      pm = 'yarn';
    } else if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
      pm = 'pnpm';
    } else if (fs.existsSync(path.join(projectRoot, 'bun.lockb'))) {
      pm = 'bun';
    }

    const command = pm === 'npm'
      ? 'npm install --save next-i18next@^15 i18next@^23 react-i18next@^13'
      : `${pm} add next-i18next@^15 i18next@^23 react-i18next@^13`;

    console.log(`[next-i18next] Installing dependencies using ${pm}...`);
    await execAsync(command, { cwd: projectRoot });
  }

  async injectRuntime(projectRoot, locales) {
    const isESM = checkIsESM(projectRoot);
    const localesData = readLocalesFromTs(projectRoot);
    const configPath = path.join(projectRoot, 'next-i18next.config.js');

    // Step 1 - Generate or update next-i18next.config.js at project root
    if (fs.existsSync(configPath)) {
      let content = fs.readFileSync(configPath, 'utf8');
      const localesList = JSON.stringify(localesData.locales);
      const localesRegex = /locales:\s*\[[\s\S]*?\]/;
      if (localesRegex.test(content)) {
        content = content.replace(localesRegex, `locales: ${localesList}`);
        fs.writeFileSync(configPath, content, 'utf8');
        console.log(`✓ Updated locales in next-i18next.config.js`);
      }
    } else {
      let configContent = '';
      const localesList = JSON.stringify(localesData.locales);
      if (isESM) {
        configContent = `export default {
  i18n: {
    defaultLocale: '${localesData.defaultLocale}',
    locales: ${localesList},
  },
  defaultNS: 'common',
};
`;
      } else {
        configContent = `module.exports = {
  i18n: {
    defaultLocale: '${localesData.defaultLocale}',
    locales: ${localesList},
  },
  defaultNS: 'common',
};
`;
      }
      fs.writeFileSync(configPath, configContent, 'utf8');
      console.log(`✓ Generated next-i18next.config.js`);
    }

    // Step 2 - Modify next.config.js / next.config.ts
    mergeI18nBlock(projectRoot, localesData);

    // Step 3 - Modify pages/_app.tsx
    const appFile = findPagesAppFile(projectRoot);
    if (appFile) {
      const sourceCode = fs.readFileSync(appFile, 'utf8');
      // Parse to check for existing import
      const ast = parseSource(sourceCode);

      if (hasImport(ast, 'next-i18next')) {
        console.log(`- next-i18next wrapper already present in ${path.basename(appFile)}, skipping wrapper injection.`);
      } else {
        const updated = wrapAppWithTranslation(sourceCode);
        if (updated !== sourceCode) {
          fs.writeFileSync(appFile, updated, 'utf8');
          console.log(`✓ Wrapped Pages Router custom App file with appWithTranslation: ${path.relative(projectRoot, appFile)}`);
        }
      }
    } else {
      console.log(`- No custom App file (_app.tsx/jsx/js) found to wrap.`);
    }

    // Step 4 - Inject serverSideTranslations into page files
    const pages = findPageFiles(projectRoot);
    for (const page of pages) {
      const sourceCode = fs.readFileSync(page, 'utf8');
      const ast = parseSource(sourceCode);

      if (hasImport(ast, 'next-i18next/serverSideTranslations')) {
        console.log(`- serverSideTranslations already imported in ${path.relative(projectRoot, page)}, skipping.`);
      } else {
        const result = injectServerSideTranslationsToPage(sourceCode);
        if (result.touched && result.code !== sourceCode) {
          fs.writeFileSync(page, result.code, 'utf8');
          console.log(`✓ Injected serverSideTranslations into page: ${path.relative(projectRoot, page)}`);
        }
      }
    }
    
    // Ensure skipLibCheck is enabled in tsconfig.json to prevent node_modules compilation errors in older TS versions.
    ensureSkipLibCheck(projectRoot);
  }

  async writeLocaleFiles(store, projectRoot) {
    const srcMessagesDir = path.join(projectRoot, 'src', 'i18n', 'messages');
    const destLocalesDir = path.join(projectRoot, 'public', 'locales');

    if (!fs.existsSync(srcMessagesDir)) {
      return;
    }

    const files = fs.readdirSync(srcMessagesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const locale = path.basename(file, '.json');
        const srcFile = path.join(srcMessagesDir, file);
        const destDir = path.join(destLocalesDir, locale);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        const destFile = path.join(destDir, 'common.json');
        fs.copyFileSync(srcFile, destFile);
      }
    }
    console.log(`✓ Copied translation store files into next-i18next public/locales path structure.`);
  }
}
