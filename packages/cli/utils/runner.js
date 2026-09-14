import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { analyzeCSS, analyzeJSX, extractAndTransformJSX, saveKeyMap, getContextTemplate, getI18nContextTemplate, getToggleTemplate, injectTailwindLogical, rewriteTailwindClasses, injectDirAttribute, injectDirToHtml, getAdapter, detectAdapter, nextDocumentFixer, nextLayoutFixer, nextConfigFixer } from '@meridian/core';
import { installI18nDependencies } from './installer.js';
import { generateI18nConfig } from '../templates/i18n-generator.js';
import { injectI18nImport } from './ast-injector.js';
import { runTranslations } from './translator-runner.js';
import { scanDataFiles, promoteDataFileKeys } from './scanDataFiles.js';
import { runSyncConfig } from './sync-config.js';
import { getActiveAdapterInstance } from './adapter-utils.js';

const TAILWIND_CSS_ENTRY_CANDIDATES = [
  'src/index.css',
  'src/app.css',
  'src/global.css',
  'app/globals.css',
  'src/styles/globals.css'
];

/**
 * Extracts the Tailwind major version from a package.json dependency range.
 *
 * @param {string} versionRange - Dependency version range from package.json.
 * @returns {2 | 3 | 4 | null} Tailwind major version when it can be determined.
 */
function parseTailwindMajorVersion(versionRange) {
  const match = versionRange.match(/\d+/);
  if (!match) {
    return null;
  }

  const majorVersion = Number(match[0]);
  if (majorVersion === 2 || majorVersion === 3 || majorVersion === 4) {
    return majorVersion;
  }

  return null;
}

/**
 * Finds the Tailwind v4 CSS entry file by checking common framework paths.
 *
 * @param {string} projectRoot - Absolute project root.
 * @returns {string | null} Absolute CSS entry path when detected.
 */
function findTailwindCssEntryPath(projectRoot) {
  for (const relativePath of TAILWIND_CSS_ENTRY_CANDIDATES) {
    const cssPath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(cssPath)) {
      continue;
    }

    const cssSource = fs.readFileSync(cssPath, 'utf8');
    if (cssSource.includes('@import "tailwindcss"') || cssSource.includes('@tailwind base')) {
      return cssPath;
    }
  }

  return null;
}

/**
 * Detects whether a project uses Tailwind CSS and identifies the integration
 * point needed for logical property support.
 *
 * Detection is intentionally package.json-led so Meridian only prompts for
 * Tailwind projects that have an explicit Tailwind dependency.
 *
 * @param {string} projectRoot - Absolute project root.
 * @returns {{ hasTailwind: boolean, version: 2 | 3 | 4 | null, configPath: string | null, cssEntryPath: string | null }} Tailwind detection result.
 */
export function detectTailwind(projectRoot) {
  const emptyResult = {
    hasTailwind: false,
    version: null,
    configPath: null,
    cssEntryPath: null
  };
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return emptyResult;
  }

  let packageJson;
  try {
    const packageJsonSource = fs.readFileSync(packageJsonPath, 'utf8').replace(/^\uFEFF/, '');
    packageJson = JSON.parse(packageJsonSource);
  } catch (error) {
    return emptyResult;
  }

  const dependencyVersion = packageJson.dependencies?.tailwindcss
    || packageJson.devDependencies?.tailwindcss;
  if (!dependencyVersion) {
    return emptyResult;
  }

  const version = parseTailwindMajorVersion(dependencyVersion);
  if (!version) {
    console.log(chalk.yellow('⚠ Tailwind detected but version could not be determined.\n Skipping Tailwind logical support. Configure manually if needed.'));
    return emptyResult;
  }

  const configPath = version === 2 || version === 3
    ? ['tailwind.config.js', 'tailwind.config.ts']
      .map((fileName) => path.join(projectRoot, fileName))
      .find((candidatePath) => fs.existsSync(candidatePath)) || null
    : null;
  const cssEntryPath = version === 4 ? findTailwindCssEntryPath(projectRoot) : null;

  return {
    hasTailwind: true,
    version,
    configPath,
    cssEntryPath
  };
}

/**
 * Recursively finds source files that Meridian can analyze.
 *
 * @param {string} dir - Directory to scan.
 * @param {string[]} fileList - Accumulator for discovered source file paths.
 * @returns {string[]} Absolute file paths discovered under the directory.
 */
function walkFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Ignore common non-source directories
      if (!['node_modules', '.git', 'build', 'dist', '.next'].includes(file)) {
        fileList = walkFiles(fullPath, fileList);
      }
    } else {
      if (['.js', '.jsx', '.ts', '.tsx', '.css'].includes(path.extname(fullPath))) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}



/**
 * Runs Meridian's project modernization pipeline.
 *
 * Tailwind class rewriting is gated behind a verified successful
 * tailwindcss-logical installation and config injection so physical classes
 * are never replaced unless the project can understand the logical utilities.
 *
 * @param {string} cwd - Project root to modify.
 * @param {Object} config - Meridian configuration collected from init.
 * @param {Object} [dependencies={}] - Specific dependency versions from environment checker.
 * @returns {Promise<void>} Resolves after all enabled modification phases finish.
 */
export async function runModifications(cwd, config, dependencies = {}) {
  console.log(chalk.blue('\n🔍 Scanning project files for RTL issues...'));

  const adapter = getActiveAdapterInstance(cwd);

  // 1. Git Safety Check
  const isGitRepo = await verifyGitSafety(cwd);

  // 2. Next.js Triple-Signal Detection
  const isNextJs = detectFrameworks(cwd, config);

  // 2.5 Generate locales.ts (Single source of truth)
  console.log(chalk.blue('\n⚙️  Generating locales configuration...'));
  try {
    runSyncConfig(cwd, config);
  } catch (err) {
    console.log(chalk.red(`  ❌ Failed to generate locales.ts: ${err.message}`));
  }

  // 3. Initial Setup via Adapter
  console.log(chalk.blue(`\n📦 Setting up runtime adapter: ${adapter.name}...`));
  try {
    await adapter.install(cwd);
    await adapter.injectRuntime(cwd, config);
    console.log(chalk.green(`  ✓ Adapter runtime injected successfully.`));
  } catch (err) {
    console.log(chalk.red(`  ❌ Error during adapter setup: ${err.message}`));
  }

  // 4. Find targeting files
  const targetFiles = discoverSourceFiles(cwd);
  if (targetFiles.length === 0) {
    console.log(chalk.yellow('No target files found to analyze.'));
    return;
  }

  console.log(chalk.gray(`Found ${targetFiles.length} files. Applying fixes...`));

  const allExtractedStrings = {};

  // 5. Data File Scan & Promotion
  const { dataRegistry, dataFilesScanned, dataKeysPromoted } = await scanAndPromoteDataFiles(cwd, config, allExtractedStrings);

  // 6. Process JSX/TSX and CSS source files
  const { fixedCssCount, fixedJsxCount, wasSwitcherInjected } = await processSourceFiles(
    targetFiles,
    cwd,
    config,
    allExtractedStrings,
    dataRegistry
  );

  // 7. Tailwind logical utilities support
  const { tailwindPluginReady, tailwindClassesRewritten, tailwindClassRewriteFailures } = await applyTailwindLogicalSupport(cwd, config);

  // 8. Write Translations JSON
  writeTranslationJson(cwd, config, allExtractedStrings);

  // 9. Create Support Files (Context & Toggle & content.js)
  createSupportTemplates(cwd, config, targetFiles, isNextJs);

  // 10. Print Success Statistics
  printSuccessStatistics({
    fixedCssCount,
    fixedJsxCount,
    dataFilesScanned,
    dataKeysPromoted,
    tailwindPluginReady,
    tailwindClassesRewritten,
    tailwindClassRewriteFailures,
    isGitRepo,
    config,
    wasSwitcherInjected
  });

  // 11. RTL dir attribute injection
  const dirInjected = injectRtlDirAttribute(cwd, config);
  if (dirInjected) {
    console.log(chalk.green('   - RTL dir attribute: injected'));
  }

  // 12. Automatic Translation Step
  if (config.translation) {
    await runTranslations(cwd, config);
  }

  // 13. Write adapter locale files
  try {
    await adapter.writeLocaleFiles(null, cwd);
  } catch (err) {
    console.log(chalk.red(`  ❌ Failed to write adapter locale files: ${err.message}`));
  }
}

/**
 * Verifies Git repository status and prompts user if uncommitted changes exist.
 *
 * @param {string} cwd - The project root directory.
 * @returns {Promise<boolean>} True if the directory is a Git repository.
 */
async function verifyGitSafety(cwd) {
  let isGitRepo = false;
  try {
    // Check if git is initialized
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore', cwd });
    isGitRepo = true;
    
    // Check for uncommitted changes
    const status = execSync('git status --porcelain', { cwd }).toString();
    if (status.length > 0) {
      console.log(chalk.red('\n⚠️  CRITICAL: You have uncommitted Git changes.'));
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'It is highly recommended to commit before running Meridian so you can undo changes if needed. Do you want to continue anyway?',
        default: false
      }]);
      
      if (!proceed) {
        console.log(chalk.yellow('Operation cancelled. Please commit your changes and run `meridian init` again.'));
        process.exit(0);
      }
    }
  } catch (error) {
    console.log(chalk.red('\n⚠️  CRITICAL: Not a Git repository. Meridian will overwrite files permanently without an undo option.'));
    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Do you want to continue anyway without a Git repository undo option?',
      default: false
    }]);
    
    if (!proceed) {
      console.log(chalk.yellow('Operation cancelled. Please run `git init` and try again.'));
      process.exit(0);
    }
  }
  return isGitRepo;
}


/**
 * Recursively find a file by name within a directory.
 */
function findFileInDir(dir, fileName) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFileInDir(filePath, fileName));
    } else if (file === fileName) {
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Detects whether the project uses Next.js using a triple-signal approach.
 * Also triggers Next.js specific layout/document fixers.
 *
 * @param {string} cwd - The project root directory.
 * @param {Object} config - Meridian configuration.
 * @returns {boolean} True if a Next.js project is detected.
 */
export function detectFrameworks(cwd, config) {
  const hasNextConfig = fs.existsSync(path.join(cwd, 'next.config.js')) || fs.existsSync(path.join(cwd, 'next.config.mjs'));
  let hasNextDep = false;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    if ((pkg.dependencies && pkg.dependencies.next) || (pkg.devDependencies && pkg.devDependencies.next)) {
      hasNextDep = true;
    }
  } catch (e) {}
  
  const appDir = fs.existsSync(path.join(cwd, 'src', 'app')) ? path.join(cwd, 'src', 'app') : (fs.existsSync(path.join(cwd, 'app')) ? path.join(cwd, 'app') : null);
  const pagesDir = fs.existsSync(path.join(cwd, 'src', 'pages')) ? path.join(cwd, 'src', 'pages') : (fs.existsSync(path.join(cwd, 'pages')) ? path.join(cwd, 'pages') : null);

  let hasAppLayout = false;
  let hasPagesApp = false;

  if (appDir) {
    const layouts = findFileInDir(appDir, 'layout.tsx').concat(findFileInDir(appDir, 'layout.jsx'));
    if (layouts.length > 0) hasAppLayout = true;
    
    // Apply layout fixers
    for (const layoutPath of layouts) {
      try {
        nextLayoutFixer(layoutPath);
      } catch (err) {
        console.warn(chalk.yellow(`  ⚠️  Next.js Layout Fixer: ${err.message}`));
      }
    }
  }

  if (pagesDir) {
    hasPagesApp = fs.existsSync(path.join(pagesDir, '_app.jsx')) || fs.existsSync(path.join(pagesDir, '_app.tsx'));
    
    // Check for _document and fallback if needed
    const docCandidates = [path.join(pagesDir, '_document.tsx'), path.join(pagesDir, '_document.jsx')];
    let docExists = false;
    for (const doc of docCandidates) {
      if (fs.existsSync(doc)) {
        docExists = true;
        try {
          nextDocumentFixer(doc);
        } catch (err) {
          console.warn(chalk.yellow(`  ⚠️  Next.js Document Fixer: ${err.message}`));
        }
        break;
      }
    }

    if (!docExists && hasPagesApp) {
      // Create fallback _document.tsx
      const fallbackDest = path.join(pagesDir, '_document.tsx');
      const fallbackSrc = path.join(__dirname, '../templates/nextjs/_document.tsx');
      if (fs.existsSync(fallbackSrc)) {
        fs.copyFileSync(fallbackSrc, fallbackDest);
        console.log(chalk.green(`  ✓ Created fallback _document.tsx at ${path.relative(cwd, fallbackDest)}`));
      }
    }

    if (hasPagesApp && hasNextConfig) {
      const configCandidates = [path.join(cwd, 'next.config.js'), path.join(cwd, 'next.config.mjs')];
      for (const configPath of configCandidates) {
        if (fs.existsSync(configPath)) {
          try {
            const src = fs.readFileSync(configPath, 'utf8');
            const result = nextConfigFixer(src, {
              locales: config.languages,
              defaultLocale: config.defaultLanguage || 'en'
            });
            if (result.success && result.modified) {
              fs.writeFileSync(configPath, result.code, 'utf8');
              console.log(chalk.green(`  ✓ Injected Next.js SSR i18n routing into ${path.basename(configPath)}`));
            } else if (!result.success) {
              console.warn(chalk.yellow(`  ⚠️  Next.js Config Fixer Bailout: ${result.reason}`));
            }
          } catch (err) {
            console.warn(chalk.yellow(`  ⚠️  Next.js Config Fixer Failed: ${err.message}`));
          }
          break;
        }
      }
    }
  }

  const isNextJs = hasNextConfig && hasNextDep && (hasAppLayout || hasPagesApp);
  config.isNextJs = isNextJs; // Pass down to analyzers
  return isNextJs;
}

/**
 * Sets up i18next dependencies, generates configurations, and injects imports.
 *
 * @param {string} cwd - The project root directory.
 * @param {Object} config - Meridian configuration.
 * @param {boolean} isNextJs - Next.js detection flag.
 * @param {Object} dependencies - Dictionary of dependency versions to install.
 * @returns {Promise<void>}
 */
async function initializeI18n(cwd, config, isNextJs, dependencies = {}) {
  if (config.i18next) {
    console.log(chalk.blue('\n📦 Setting up i18next...'));
    try {
      console.log(chalk.gray('  Installing dependencies (this may take a minute)...'));
      await installI18nDependencies(cwd, dependencies);
      console.log(chalk.green('  ✓ Dependencies installed.'));

      console.log(chalk.gray('  Generating i18n configurations...'));
      await generateI18nConfig(cwd, config.languages, isNextJs);
      console.log(chalk.green('  ✓ i18n.js configuration created.'));

      console.log(chalk.gray('  Injecting i18n into entry point...'));
      const injectionWarn = await injectI18nImport(cwd, isNextJs);
      if (injectionWarn) {
        console.log(chalk.yellow(`  ⚠️  ${injectionWarn}`));
      } else {
        console.log(chalk.green('  ✓ i18n imported successfully into entry point.'));
      }
    } catch (err) {
      console.log(chalk.red(`  ❌ Error during i18next setup: ${err.message}`));
    }
  }
}

/**
 * Scans directories for React and CSS source files that Meridian can analyze.
 *
 * @param {string} cwd - The project root directory.
 * @returns {string[]} An array of absolute file paths.
 */
function discoverSourceFiles(cwd) {
  let targetFiles = [];
  const dirsToScan = ['src', 'app', 'pages', 'components'];
  let foundTarget = false;
  
  for (const dir of dirsToScan) {
    const absolutePath = path.join(cwd, dir);
    if (fs.existsSync(absolutePath)) {
      foundTarget = true;
      targetFiles = walkFiles(absolutePath, targetFiles);
    }
  }
  
  if (!foundTarget) {
    console.log(chalk.gray(`Warning: Standard source directories not found. Falling back to specific root scans...`));
    // Scan root, but explicitly ignore lots to avoid touching configs
    targetFiles = walkFiles(cwd).filter(file => {
      return !file.includes('node_modules') 
          && !file.includes('.git')
          && !file.includes('packages') // Safety for monorepo development
          && !file.includes('config')
    });
  }
  return targetFiles;
}

/**
 * Scans static data files and promotes their translatable keys into the shared storage.
 *
 * @param {string} cwd - The project root directory.
 * @param {Object} config - Meridian configuration.
 * @param {Object} allExtractedStrings - Accumulator for extracted translation strings.
 * @returns {Promise<{ dataRegistry: Object, dataFilesScanned: number, dataKeysPromoted: number }>}
 */
async function scanAndPromoteDataFiles(cwd, config, allExtractedStrings) {
  let dataRegistry = {};
  let dataFilesScanned = 0;
  console.log(chalk.blue('\n📂 Scanning data files...'));
  try {
    dataRegistry = await scanDataFiles(cwd);
    dataFilesScanned = Object.keys(dataRegistry).length;
    if (dataFilesScanned > 0) {
      console.log(chalk.green(`  ✓ Found ${dataFilesScanned} data file(s).`));
    } else {
      console.log(chalk.gray('  No data files found (src/data, src/content, src/constants).'));
    }
  } catch (err) {
    console.log(chalk.yellow(`  ⚠️  Data file scan failed and will be skipped: ${err.message}`));
  }

  let dataKeysPromoted = 0;
  if (dataFilesScanned > 0 && (config.i18next || config.translation)) {
    console.log(chalk.blue('\n🔑 Promoting data file keys...'));
    try {
      for (const [relPath, fileRegistry] of Object.entries(dataRegistry)) {
        const absoluteFilePath = path.join(cwd, relPath);
        const promoted = await promoteDataFileKeys(
          absoluteFilePath,
          cwd,
          fileRegistry,
          allExtractedStrings
        );
        dataKeysPromoted += promoted;
      }
      if (dataKeysPromoted > 0) {
        console.log(chalk.green(`  ✓ Promoted ${dataKeysPromoted} new data key(s).`));
      } else {
        console.log(chalk.gray('  All data keys already present — nothing to promote.'));
      }
    } catch (err) {
      console.log(chalk.yellow(`  ⚠️  Key promotion failed and will be skipped: ${err.message}`));
    }
  }

  return { dataRegistry, dataFilesScanned, dataKeysPromoted };
}

/**
 * Processes JSX, TSX, and CSS files to inject logical layout models and translation wrappers.
 *
 * @param {string[]} targetFiles - List of absolute file paths to modify.
 * @param {string} cwd - The project root directory.
 * @param {Object} config - Meridian configuration.
 * @param {Object} allExtractedStrings - Accumulator for extracted translation strings.
 * @param {Object} dataRegistry - Registry of static data structures.
 * @returns {Promise<{ fixedCssCount: number, fixedJsxCount: number, wasSwitcherInjected: boolean }>}
 */
async function processSourceFiles(targetFiles, cwd, config, allExtractedStrings, dataRegistry) {
  let fixedCssCount = 0;
  let fixedJsxCount = 0;
  let wasSwitcherInjected = false;

  try {
    for (const fullPath of targetFiles) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const ext = path.extname(fullPath);
      const relativePath = path.relative(cwd, fullPath);

      try {
        if (ext === '.css') {
          const result = await analyzeCSS(content, {}, { isMainFile: true });
          if (result.fixedCSS && result.fixedCSS !== content) {
            fs.writeFileSync(fullPath, result.fixedCSS, 'utf8');
            fixedCssCount++;
            console.log(chalk.green(`  Fixed CSS: ${relativePath}`));
          }
        } else if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
           
           const isAppFile = ['App.js', 'App.jsx', 'App.ts', 'App.tsx', '_app.js', '_app.jsx', '_app.ts', '_app.tsx', 'main.tsx', 'main.jsx', 'main.ts', 'index.js', 'index.jsx', 'index.tsx'].some(name => relativePath.endsWith(name));
           
           const result = await analyzeJSX(content, {}, { isMainFile: true, isReact: true, mode: 'fix-all', isAppFile, config, fileName: relativePath, dataRegistry });
           if (result.switcherInjected) wasSwitcherInjected = true;
           
           let finalCode = result.fixedCode || content;
           let isModified = finalCode !== content;

           if (config.i18next || config.translation) {
               const extraction = extractAndTransformJSX(finalCode, { fileName: relativePath, registry: dataRegistry, useNextI18next: config.i18next });
               if (extraction.modifiedCode !== finalCode) {
                   finalCode = extraction.modifiedCode;
                   isModified = true;
               }
               if (extraction.extractedStrings && extraction.extractedStrings.size > 0) {
                   extraction.extractedStrings.forEach((val, key) => {
                       allExtractedStrings[key] = val;
                   });
               }
           }
           
           if (isModified) {
              fs.writeFileSync(fullPath, finalCode, 'utf8');
              fixedJsxCount++;
              console.log(chalk.green(`  Fixed JSX: ${relativePath}`));
           }
        }
      } catch (err) {
        // suppress parse errors during scanning
      }
    }
  } finally {
    saveKeyMap();
  }

  return { fixedCssCount, fixedJsxCount, wasSwitcherInjected };
}

/**
 * Installs tailwindcss-logical plugin and rewrites legacy physical Tailwind classes.
 *
 * @param {string} cwd - The project root directory.
 * @param {Object} config - Meridian configuration.
 * @returns {Promise<{ tailwindPluginReady: boolean, tailwindClassesRewritten: number, tailwindClassRewriteFailures: number }>}
 */
async function applyTailwindLogicalSupport(cwd, config) {
  let tailwindPluginReady = false;
  let tailwindClassesRewritten = 0;
  let tailwindClassRewriteFailures = 0;

  if (config.tailwind?.install) {
    console.log(chalk.blue('\n🎨 Applying Tailwind logical utilities...'));

    try {
      const result = await injectTailwindLogical(cwd, config.tailwind);
      tailwindPluginReady = Boolean(result?.success);
      if (tailwindPluginReady) {
        console.log(chalk.green('  ✓ tailwindcss-logical installed and verified.'));
      } else {
        console.warn(chalk.yellow(`⚠ Tailwind plugin setup failed: ${result?.reason || 'unknown error'}`));
        console.warn(chalk.yellow('  Skipping class rewrite to avoid breaking your project.'));
      }
    } catch (err) {
      console.warn(chalk.yellow(`⚠ Tailwind plugin setup failed: ${err.message}`));
      console.warn(chalk.yellow('  Skipping class rewrite to avoid breaking your project.'));
      tailwindPluginReady = false;
    }

    if (tailwindPluginReady) {
      try {
        const rewriteReport = await rewriteTailwindClasses(cwd);
        tailwindClassesRewritten = rewriteReport.classesReplaced;
        tailwindClassRewriteFailures = rewriteReport.failed;
        if (rewriteReport.classesReplaced > 0) {
          console.log(chalk.green(`  ✓ Rewrote ${rewriteReport.classesReplaced} Tailwind class(es).`));
        } else {
          console.log(chalk.gray('  No Tailwind class rewrites needed.'));
        }

        if (rewriteReport.autoMirroredCount > 0) {
          console.log(chalk.green(`  ✓ Auto-applied RTL mirror to ${rewriteReport.autoMirroredCount} graphical element(s).`));
        }

        if (rewriteReport.unsafeMirrorWarnings && rewriteReport.unsafeMirrorWarnings.length > 0) {
          console.log(chalk.yellow(`  ⚠ ${rewriteReport.unsafeMirrorWarnings.length} element(s) could not be auto-mirrored — review manually:`));
          rewriteReport.unsafeMirrorWarnings.forEach(warn => {
            console.log(chalk.yellow(`      ${warn}`));
          });
        }
      } catch (err) {
        console.warn(chalk.yellow(`⚠ Tailwind class rewrite failed: ${err.message}`));
      }
    }
  }

  return { tailwindPluginReady, tailwindClassesRewritten, tailwindClassRewriteFailures };
}

/**
 * Saves extracted translation strings to translation.json inside the locale directory.
 *
 * @param {string} cwd - The project root directory.
 * @param {Object} config - Meridian configuration.
 * @param {Object} allExtractedStrings - Extracted translation keys.
 * @returns {void}
 */
function writeTranslationJson(cwd, config, allExtractedStrings) {
  if (Object.keys(allExtractedStrings).length > 0) {
    const defaultLanguage = config.defaultLanguage || 'en';
    const localesFolder = path.join(cwd, 'src', 'i18n', 'messages');
    if (!fs.existsSync(localesFolder)) {
      fs.mkdirSync(localesFolder, { recursive: true });
    }
    
    const sortedKeys = Object.keys(allExtractedStrings).sort();
    const sortedStrings = {};
    sortedKeys.forEach(key => {
      sortedStrings[key] = allExtractedStrings[key];
    });

    const translationPath = path.join(localesFolder, `${defaultLanguage}.json`);
    fs.writeFileSync(translationPath, JSON.stringify(sortedStrings, null, 2), 'utf8');
    console.log(chalk.green(`  Created: ${path.relative(cwd, translationPath)}`));
  }
}

/**
 * Creates LanguageContext, LanguageToggle, and local mock dictionary files.
 *
 * @param {string} cwd - The project root directory.
 * @param {Object} config - Meridian configuration.
 * @param {string[]} targetFiles - Discovered source files.
 * @param {boolean} isNextJs - Next.js detection flag.
 * @returns {void}
 */
function createSupportTemplates(cwd, config, targetFiles, isNextJs) {
  const dirsToScan = ['src', 'app', 'pages', 'components'];
  if (config.languageSwitcher || config.translation) {
    if (dirsToScan.length > 0 && targetFiles.length > 0) {
      let baseSrcDir = cwd;
      const validRootSrc = targetFiles[0].split(path.sep).find(p => dirsToScan.includes(p));
      if (validRootSrc) {
        baseSrcDir = targetFiles[0].substring(0, targetFiles[0].indexOf(validRootSrc)) + validRootSrc;
      } else {
        baseSrcDir = path.join(cwd, 'src');
      }
      
      const contextDir = path.join(baseSrcDir, 'contexts');
      if (!fs.existsSync(contextDir)) fs.mkdirSync(contextDir, { recursive: true });
      
      const isTs = fs.existsSync(path.join(cwd, 'tsconfig.json'));
      const ext = isTs ? '.tsx' : '.jsx';
      const jsExt = isTs ? '.ts' : '.js';
      
      const contextPath = path.join(contextDir, `LanguageContext${ext}`);
      if (!fs.existsSync(contextPath)) {
        const templateToUse = config.i18next 
          ? getI18nContextTemplate(config.defaultLanguage, isNextJs, isTs) 
          : getContextTemplate(config.defaultLanguage, isNextJs, isTs);
        fs.writeFileSync(contextPath, templateToUse, 'utf8');
        console.log(chalk.green(`  Created: ${path.relative(cwd, contextPath)}`));
      }

      if (config.languageSwitcher) {
        const compDir = path.join(baseSrcDir, 'components');
        if (!fs.existsSync(compDir)) fs.mkdirSync(compDir, { recursive: true });
        
        const togglePath = path.join(compDir, `LanguageToggle${ext}`);
        if (!fs.existsSync(togglePath)) {
          const generatedToggleTemplate = getToggleTemplate(config.languages, isNextJs);
          fs.writeFileSync(togglePath, generatedToggleTemplate, 'utf8');
          console.log(chalk.green(`  Created: ${path.relative(cwd, togglePath)}`));
        }
      }
      
      if (!config.i18next) {
        const utilsDir = path.join(baseSrcDir, 'utils');
        if (!fs.existsSync(utilsDir)) fs.mkdirSync(utilsDir, { recursive: true });
        const contentPath = path.join(utilsDir, `content${jsExt}`);
        if (!fs.existsSync(contentPath)) {
          // Need a dummy dictionary so the app doesn't crash on boot before manual trans
          const dummyEntries = config.languages.map(lang => {
            if (lang === (config.defaultLanguage || 'en')) {
              return `    ${lang}: { title: "Hello World", welcome: "Welcome" }`;
            }
            return `    ${lang}: { title: "Title placeholder", welcome: "Welcome placeholder" }`;
          }).join(',\n');
          
          const dummyDict = `export const content = {\n${dummyEntries}\n};`;
          fs.writeFileSync(contentPath, dummyDict, 'utf8');
          console.log(chalk.green(`  Created: ${path.relative(cwd, contentPath)}`));
        }
      }
    }
  }
}

/**
 * Injects direction (dir="ltr" / dir="rtl") toggling attribute into index.html or Next.js _document.
 *
 * @param {string} cwd - The project root directory.
 * @param {Object} config - Meridian configuration.
 * @returns {boolean} True if direction attribute was successfully injected.
 */
function injectRtlDirAttribute(cwd, config) {
  let dirInjected = false;
  try {
    const hasRTL = Array.isArray(config.languages) && config.languages.some(l =>
      ['ar', 'he', 'fa', 'ur', 'ku', 'dv', 'ps', 'sd', 'ug', 'yi'].includes(l)
    );
    if (hasRTL) {
      // Next.js Pages Router — _document file.
      const documentCandidates = [
        'src/pages/_document.tsx', 'src/pages/_document.jsx',
        'pages/_document.tsx',     'pages/_document.jsx'
      ];
      for (const relDoc of documentCandidates) {
        const absDoc = path.join(cwd, relDoc);
        if (fs.existsSync(absDoc)) {
          dirInjected = injectDirAttribute(absDoc, config.languages);
          break;
        }
      }
      // Standard React — public/index.html.
      const htmlInjected = injectDirToHtml(cwd, config.languages);
      dirInjected = dirInjected || htmlInjected;
    }
  } catch (err) {
    console.warn(chalk.yellow(`⚠ Dir attribute injection failed: ${err.message}`));
  }
  return dirInjected;
}

/**
 * Checks for common ESLint config files that use tsconfig "project" paths but lack "tsconfigRootDir".
 *
 * @param {string} projectRoot - Absolute project root.
 * @returns {boolean} True if a potential issue is detected.
 */
function checkEslintConfigDiagnostics(projectRoot) {
  const eslintFiles = [
    '.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml'
  ];
  for (const file of eslintFiles) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('"project"') || content.includes("'project'")) {
          if (!content.includes('tsconfigRootDir')) {
            return true;
          }
        }
      } catch (e) {
        // Safe to ignore
      }
    }
  }
  return false;
}

/**
 * Prints the results summary and modernizer statistics to console.
 *
 * @param {Object} stats - Collected metrics for printing.
 * @returns {void}
 */
function printSuccessStatistics(stats) {
  const {
    fixedCssCount,
    fixedJsxCount,
    dataFilesScanned,
    dataKeysPromoted,
    tailwindPluginReady,
    tailwindClassesRewritten,
    tailwindClassRewriteFailures,
    isGitRepo,
    config,
    wasSwitcherInjected
  } = stats;

  console.log(chalk.green(`\n✅ Modification complete:`));
  console.log(chalk.green(`   - Fixed ${fixedCssCount} CSS files`));
  console.log(chalk.green(`   - Fixed ${fixedJsxCount} JS/JSX files`));
  console.log(chalk.green(`   - Data files scanned: ${dataFilesScanned}`));
  console.log(chalk.green(`   - Data keys promoted: ${dataKeysPromoted}`));
  if (tailwindPluginReady) {
    console.log(chalk.green('   - Tailwind logical plugin: installed'));
  }
  console.log(chalk.green(`   - Tailwind classes rewritten: ${tailwindClassesRewritten}`));
  if (tailwindClassRewriteFailures > 0) {
    console.log(chalk.yellow(`   - Tailwind class rewrite failures restored: ${tailwindClassRewriteFailures}`));
  }
  console.log('');
  
  if (isGitRepo) {
    console.log(chalk.magenta(`To undo these changes at any time, run: `) + chalk.white.bold(`git checkout .\n`));
  }

  if (config.languageSwitcher && config.languageSwitcher.position && config.languageSwitcher.position.tag !== 'skip' && !wasSwitcherInjected) {
    console.log(chalk.yellow(`⚠️  Warning: Could not automatically inject the Language Switcher.`));
    console.log(chalk.yellow(`   Please check your file path or HTML ID targeting options, or manually add <LanguageToggle />\n`));
  }

  const hasEslintTsconfigIssue = checkEslintConfigDiagnostics(process.cwd());
  if (hasEslintTsconfigIssue) {
    console.log(chalk.yellow(`⚠️  ESLint Tip: If you open a parent directory of this project in your editor, ESLint might fail to resolve your tsconfig.json.`));
    console.log(chalk.yellow(`   Consider setting "tsconfigRootDir": __dirname inside your ESLint overrides block to prevent relative path parsing errors.\n`));
  }
}
