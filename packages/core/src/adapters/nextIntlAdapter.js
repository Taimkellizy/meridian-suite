import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { 
  readLocalesFromTs, 
  findAppLayoutFile, 
  injectSetRequestLocaleToLayout,
  ensureSkipLibCheck
} from './helpers.js';
import { wrapWithPlugin } from './shared/nextConfigHelper.js';
import { hasImport, hasJSXAttribute, parseSource } from './shared/recastUtils.js';
import { nextLayoutFixer } from '../utils/nextLayoutFixer.js';

const NEXT_INTL_PLUGIN_SOURCE = 'next-intl/plugin';

const execAsync = promisify(exec);

export class NextIntlAdapter {
  constructor() {
    this.name = 'next-intl';
  }

  detect(projectRoot) {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if ('next-intl' in deps) return true;
      } catch (e) {}
    }
    const hasAppDir = fs.existsSync(path.join(projectRoot, 'app')) || fs.existsSync(path.join(projectRoot, 'src', 'app'));
    return hasAppDir;
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
      ? 'npm install --save next-intl@^3'
      : `${pm} add next-intl@^3`;

    console.log(`[next-intl] Installing dependencies using ${pm}...`);
    await execAsync(command, { cwd: projectRoot });
  }

  async injectRuntime(projectRoot, locales) {
    const isTS = fs.existsSync(path.join(projectRoot, 'tsconfig.json'));
    const i18nDir = path.join(projectRoot, 'src', 'i18n');
    if (!fs.existsSync(i18nDir)) {
      fs.mkdirSync(i18nDir, { recursive: true });
    }

    // Step 1 - Generate src/i18n/request.ts
    const reqFile = path.join(i18nDir, isTS ? 'request.ts' : 'request.js');
    if (fs.existsSync(reqFile)) {
      const content = fs.readFileSync(reqFile, 'utf8');
      if (content.includes('getRequestConfig')) {
        console.log(`- request-scoped config already has getRequestConfig in ${path.basename(reqFile)}, skipping.`);
      } else {
        const injectContent = `\nimport { getRequestConfig } from 'next-intl/server';
import { locales } from './locales';

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(\`./messages/\${locale}.json\`)).default
  };
});
`;
        fs.appendFileSync(reqFile, injectContent, 'utf8');
        console.log(`✓ Injected getRequestConfig into ${path.basename(reqFile)}`);
      }
    } else {
      const reqContent = `import { getRequestConfig } from 'next-intl/server';
import { locales } from './locales';

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(\`./messages/\${locale}.json\`)).default
  };
});
`;
      fs.writeFileSync(reqFile, reqContent, 'utf8');
      console.log(`✓ Generated ${path.relative(projectRoot, reqFile)}`);
    }

    // Step 2 - Generate middleware.ts at project root
    const midFile = path.join(projectRoot, isTS ? 'middleware.ts' : 'middleware.js');
    const localesData = readLocalesFromTs(projectRoot);
    const matcherStr = `['/', '/(${localesData.locales.join('|')})/:path*']`;

    if (fs.existsSync(midFile)) {
      const sourceCode = fs.readFileSync(midFile, 'utf8');
      const ast = parseSource(sourceCode);

      if (hasImport(ast, 'next-intl/middleware')) {
        console.log(`- middleware already has next-intl import in ${path.basename(midFile)}, skipping.`);
      } else {
        const injectContent = `\nimport createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n/locales';

export default createMiddleware({
  locales: locales.map(l => l.code),
  defaultLocale
});

export const config = {
  matcher: ${matcherStr}
};
`;
        fs.appendFileSync(midFile, injectContent, 'utf8');
        console.log(`✓ Injected next-intl middleware into existing ${path.basename(midFile)}`);
      }
    } else {
      const midContent = `import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n/locales';

export default createMiddleware({
  locales: locales.map(l => l.code),
  defaultLocale
});

export const config = {
  matcher: ${matcherStr}
};
`;
      fs.writeFileSync(midFile, midContent, 'utf8');
      console.log(`✓ Generated ${path.basename(midFile)}`);
    }

    // Step 3 - Modify next.config.js / next.config.ts
    wrapWithPlugin(projectRoot, NEXT_INTL_PLUGIN_SOURCE, 'withNextIntl');

    // Step 4 - Modify root layout file
    const layoutInfo = findAppLayoutFile(projectRoot);
    if (layoutInfo) {
      const sourceCode = fs.readFileSync(layoutInfo.filePath, 'utf8');
      const ast = parseSource(sourceCode);

      if (hasJSXAttribute(ast, 'html', 'lang')) {
        console.log(`- layout file ${path.basename(layoutInfo.filePath)} already has lang attribute, skipping.`);
      } else {
        // Run Next.js layout fixer first
        try {
          nextLayoutFixer(layoutInfo.filePath);
        } catch (err) {
          console.warn(`[next-intl] nextLayoutFixer error: ${err.message}`);
        }

        // Add setRequestLocale
        const updatedSource = fs.readFileSync(layoutInfo.filePath, 'utf8');
        const finalSource = injectSetRequestLocaleToLayout(updatedSource, layoutInfo.segmentName);
        if (finalSource !== updatedSource) {
          fs.writeFileSync(layoutInfo.filePath, finalSource, 'utf8');
          console.log(`✓ Injected lang/dir and setRequestLocale into root layout: ${path.relative(projectRoot, layoutInfo.filePath)}`);
        }
      }
    } else {
      console.log(`- Root layout file not found or segment detection failed.`);
    }

    // Ensure skipLibCheck is enabled in tsconfig.json to prevent node_modules compilation errors in older TS versions.
    ensureSkipLibCheck(projectRoot);
  }

  async writeLocaleFiles(store, projectRoot) {
    // next-intl uses the canonical store directly (src/i18n/messages/{locale}.json)
    const messagesDir = path.join(projectRoot, 'src', 'i18n', 'messages');
    if (!fs.existsSync(messagesDir)) {
      console.warn(`⚠ Warning: Locale messages directory does not exist at ${messagesDir}`);
    } else {
      // Log warning for missing locale files
      const localesData = readLocalesFromTs(projectRoot);
      for (const loc of localesData.locales) {
        const file = path.join(messagesDir, `${loc}.json`);
        if (!fs.existsSync(file)) {
          console.warn(`⚠ Warning: Canonical locale file is missing: ${path.relative(projectRoot, file)}`);
        }
      }
    }
  }
}
