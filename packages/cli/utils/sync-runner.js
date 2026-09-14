import fs from 'fs/promises';
import fsSync, { existsSync } from 'fs';
import path from 'path';
import babel from '@babel/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { scanDataFiles, extractDataPaths } from './scanDataFiles.js';
import { runTranslations } from './translator-runner.js';
import { detectFrameworks } from './runner.js';
import { extractAndTransformJSX, saveKeyMap } from '@meridian/core';
import { getActiveAdapterInstance } from './adapter-utils.js';

function atomicWriteFileSync(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.meridian-tmp`;
  try {
    fsSync.writeFileSync(tmpPath, content, 'utf8');
    fsSync.renameSync(tmpPath, filePath);
  } catch (err) {
    if (fsSync.existsSync(tmpPath)) fsSync.unlinkSync(tmpPath);
    throw err;
  }
}

async function runIncrementalExtraction(projectRoot, config, options) {
  if (options.noExtract || options.check || options.ci) return;
  console.log(chalk.blue('\n🔍 Running Incremental Extraction...'));
  
  const lastSyncPath = path.join(projectRoot, '.meridian', 'last-sync');
  let lastSyncMs = 0;
  if (fsSync.existsSync(lastSyncPath)) {
    try {
      lastSyncMs = Number(fsSync.readFileSync(lastSyncPath, 'utf8').trim());
    } catch (e) {}
  }
  
  const dirsToScan = ['src', 'app', 'pages', 'components'];
  const targetFiles = [];
  for (const dir of dirsToScan) {
    const absolutePath = path.join(projectRoot, dir);
    if (fsSync.existsSync(absolutePath)) {
      await walkSourceFiles(absolutePath, targetFiles);
    }
  }
  
  let modifiedFilesCount = 0;
  let newStringsCount = 0;
  const defaultLang = config.defaultLanguage || 'en';
  const localesDir = path.join(projectRoot, 'src', 'i18n', 'messages');
  
  for (const file of targetFiles) {
    const stat = await fs.stat(file);
    if (stat.mtimeMs > lastSyncMs) {
      const code = await fs.readFile(file, 'utf8');
      const relativePath = path.relative(projectRoot, file);
      const extraction = extractAndTransformJSX(code, { fileName: relativePath, useNextI18next: config.i18next });
      
      if (extraction.modifiedCode !== code) {
        atomicWriteFileSync(file, extraction.modifiedCode);
        modifiedFilesCount++;
        
        if (extraction.extractedStrings && extraction.extractedStrings.size > 0) {
          for (const [key, val] of extraction.extractedStrings.entries()) {
            newStringsCount++;
            
            const defaultNsPath = path.join(localesDir, `${defaultLang}.json`);
            let defaultData = {};
            if (fsSync.existsSync(defaultNsPath)) {
              defaultData = JSON.parse(await fs.readFile(defaultNsPath, 'utf8'));
            } else {
               fsSync.mkdirSync(path.dirname(defaultNsPath), { recursive: true });
            }
            if (defaultData[key] === undefined) {
               defaultData[key] = val;
               atomicWriteFileSync(defaultNsPath, JSON.stringify(defaultData, null, 2));
            }
            
            const availableLocales = config.languages || [defaultLang];
            for (const loc of availableLocales) {
              if (loc === defaultLang) continue;
              const locNsPath = path.join(localesDir, `${loc}.json`);
              let locData = {};
              if (fsSync.existsSync(locNsPath)) {
                 locData = JSON.parse(await fs.readFile(locNsPath, 'utf8'));
              } else {
                 fsSync.mkdirSync(path.dirname(locNsPath), { recursive: true });
              }
              if (locData[key] === undefined) {
                 locData[key] = "";
                 atomicWriteFileSync(locNsPath, JSON.stringify(locData, null, 2));
              }
            }
          }
        }
      }
    }
  }
  
  if (modifiedFilesCount > 0) {
    saveKeyMap();
    console.log(chalk.green(`  ✓ Found ${newStringsCount} new string(s) in ${modifiedFilesCount} file(s) — wrapped and added to locale files. Run 'meridian sync <locales>' to translate.`));
  }
}

/**
 * Recursively walks a JSON tree to extract values whose object keys
 * exist in the translatableKeys array.
 *
 * @param {any} node - The current node in the JSON tree.
 * @param {string[]} translatableKeys - Keys that identify translatable strings.
 * @param {string[]} resultList - Array to accumulate extracted strings.
 * @param {string|null} currentKey - The parent key of the current node.
 */
function walkJson(node, translatableKeys, resultList, currentKey = null) {
  if (typeof node === 'string') {
    if (currentKey && translatableKeys.includes(currentKey)) {
      resultList.push(node);
    }
  } else if (Array.isArray(node)) {
    node.forEach(item => walkJson(item, translatableKeys, resultList, currentKey));
  } else if (node && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => walkJson(value, translatableKeys, resultList, key));
  }
}

/**
 * Extracts string literals and template literals from a JS/TS file
 * if they belong to a translatable object property.
 *
 * @param {string} filePath - Path to the source file.
 * @param {string[]} translatableKeys - Keys to look for.
 * @returns {Promise<string[]>} Array of extracted flat strings.
 */
async function extractDynamicStringsFromJs(filePath, translatableKeys) {
  const code = await fs.readFile(filePath, 'utf8');
  const result = [];
  try {
    const ast = babel.parse(code, {
      filename: filePath,
      sourceType: 'module',
      parserOpts: { plugins: ['jsx', 'typescript'] }
    });

    babel.traverse(ast, {
      StringLiteral(p) {
        const objProp = p.findParent(parent => parent.isObjectProperty());
        if (objProp) {
          const keyNode = objProp.node.key;
          const keyName = keyNode.type === 'Identifier' ? keyNode.name : keyNode.value;
          if (translatableKeys.includes(keyName)) {
            result.push(p.node.value);
          }
        }
      },
      TemplateLiteral(p) {
        if (p.node.expressions.length > 0) return;
        const objProp = p.findParent(parent => parent.isObjectProperty());
        if (objProp) {
          const keyNode = objProp.node.key;
          const keyName = keyNode.type === 'Identifier' ? keyNode.name : keyNode.value;
          if (translatableKeys.includes(keyName)) {
            result.push(p.node.quasis[0].value.raw);
          }
        }
      }
    });
  } catch (err) {
    // Ignore parse errors silently
  }
  return result;
}

/**
 * Recursively walks directory to find JavaScript and TypeScript files.
 *
 * @param {string} dir - Directory to walk.
 * @param {string[]} fileList - Accumulator array.
 * @returns {Promise<string[]>} Array of file paths.
 */
async function walkSourceFiles(dir, fileList = []) {
  if (!existsSync(dir)) return fileList;
  const files = await fs.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'dist', 'build'].includes(file)) {
        await walkSourceFiles(filePath, fileList);
      }
    } else if (['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(file))) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

/**
 * Scans the project source for explicit t('...') calls.
 *
 * @param {string} projectRoot - Root of the project.
 * @returns {Promise<Set<string>>} Set of static flat keys.
 */
async function extractFlatKeysFromSource(projectRoot) {
  const targetFiles = [];
  const dirsToScan = ['src', 'app', 'pages', 'components'];
  let foundTarget = false;
  
  for (const dir of dirsToScan) {
    const absolutePath = path.join(projectRoot, dir);
    if (existsSync(absolutePath)) {
      foundTarget = true;
      await walkSourceFiles(absolutePath, targetFiles);
    }
  }
  
  if (!foundTarget) {
    await walkSourceFiles(projectRoot, targetFiles);
  }

  const activeFlatKeys = new Set();

  for (const file of targetFiles) {
    const code = await fs.readFile(file, 'utf8');
    try {
      const ast = babel.parse(code, {
        filename: file,
        sourceType: 'module',
        parserOpts: { plugins: ['jsx', 'typescript'] }
      });
      
      babel.traverse(ast, {
        CallExpression(p) {
          if (p.node.callee.type === 'Identifier' && p.node.callee.name === 't') {
            const arg = p.node.arguments[0];
            if (arg && arg.type === 'StringLiteral') {
              activeFlatKeys.add(arg.value);
            }
          }
        }
      });
    } catch (e) {
      // skip parse errors
    }
  }
  return activeFlatKeys;
}

/**
 * Extracts dynamic keys from mapped config and data files.
 *
 * @param {string} projectRoot - Root of the project.
 * @returns {Promise<Set<string>>} Set of dynamic flat keys.
 */
async function extractDynamicKeysFromData(projectRoot) {
  const activeDataFlatKeys = new Set();
  const registry = await scanDataFiles(projectRoot);
  
  for (const [relPath, fileInfo] of Object.entries(registry)) {
    if (!fileInfo.translatable || fileInfo.translatable.length === 0) continue;
    const absolutePath = path.join(projectRoot, relPath);
    
    if (absolutePath.endsWith('.js')) {
      const strings = await extractDynamicStringsFromJs(absolutePath, fileInfo.translatable);
      strings.forEach(s => activeDataFlatKeys.add(s));
    } else if (absolutePath.endsWith('.json')) {
      try {
        const code = await fs.readFile(absolutePath, 'utf8');
        const data = JSON.parse(code);
        const strings = [];
        walkJson(data, fileInfo.translatable, strings);
        strings.forEach(s => activeDataFlatKeys.add(s));
      } catch (e) {
        // skip parsing error
      }
    }
  }
  
  return { activeDataFlatKeys, registry };
}

/**
 * Compares valid keys against existing translations to calculate deltas.
 *
 * @param {Set<string>} validKeys - Complete set of valid keys.
 * @param {Object} existingTranslations - Currently parsed en/translation.json.
 * @returns {Object} Deltas including newCount, deprecatedCount, etc.
 */
function computeSyncDeltas(validKeys, existingTranslations) {
  let newCount = 0;
  let deprecatedCount = 0;
  const deltaKeys = [];
  const orphanedKeys = [];

  const existingKeys = Object.keys(existingTranslations).filter(k => k !== '_deprecated');

  for (const key of validKeys) {
    if (existingTranslations[key] === undefined) {
      newCount++;
      deltaKeys.push(key);
    }
  }

  for (const key of existingKeys) {
    if (!validKeys.has(key)) {
      orphanedKeys.push(key);
      deprecatedCount++;
    }
  }

  return { newCount, deprecatedCount, deltaKeys, orphanedKeys };
}

/**
 * Persists new keys and prunes orphaned keys in the default translation file.
 *
 * @param {string} translationPath - Path to en/translation.json.
 * @param {Object} existingTranslations - Object representing translations.
 * @param {Object} deltas - Precomputed deltas object.
 * @param {Object} options - CLI options.
 */
async function writeTranslations(translationPath, existingTranslations, deltas, options) {
  let fileMutated = false;
  
  if (deltas.newCount > 0) {
    for (const key of deltas.deltaKeys) {
      existingTranslations[key] = key; 
    }
    fileMutated = true;
  }
  
  if (options.prune && deltas.orphanedKeys.length > 0) {
    for (const key of deltas.orphanedKeys) {
      delete existingTranslations[key];
    }
    fileMutated = true;
  }

  if (fileMutated) {
    await fs.writeFile(translationPath, JSON.stringify(existingTranslations, null, 2), 'utf8');
  }
}

/**
 * Reads existing translations from the default locale file.
 *
 * @param {string} translationPath - Path to the default translation JSON.
 * @returns {Promise<Object|null>} Parsed JSON or null on failure.
 */
async function loadExistingTranslations(translationPath) {
  if (!existsSync(translationPath)) return {};
  
  try {
    return JSON.parse(await fs.readFile(translationPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Runs the read-only reconciliation check across all locales.
 *
 * @param {string} projectRoot - Root of the project.
 * @param {string} defaultLang - Default locale language.
 * @param {Set<string>} validKeys - The union of valid keys.
 * @param {Object} options - CLI options.
 * @param {Object} config - Project configuration.
 */
async function runReconciliationCheck(projectRoot, defaultLang, validKeys, options, config) {
  console.log(chalk.blue('\n🔍 Running Translation Reconciliation Check...'));
  
  const localesDir = path.join(projectRoot, 'src', 'i18n', 'messages');
  if (!existsSync(localesDir)) {
    console.log(chalk.red('  ❌ Locales directory not found.'));
    if (options.ci) process.exit(1);
    return;
  }

  const availableLocales = fsSync.readdirSync(localesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.basename(f, '.json'));

  if (!availableLocales.includes(defaultLang)) {
    console.log(chalk.red(`  ❌ Default locale '${defaultLang}' not found.`));
    if (options.ci) process.exit(1);
    return;
  }

  const namespaces = [defaultLang];

  const orphanedKeysByNamespace = {};
  const missingKeysByLocaleAndNamespace = {};
  let totalKeys = 0;
  let totalCoveredKeys = 0;
  let hasOrphans = false;

  for (const ns of namespaces) {
    const defaultNsPath = path.join(localesDir, `${ns}.json`);
    const defaultNsData = JSON.parse(await fs.readFile(defaultNsPath, 'utf8'));
    
    const defaultKeys = Object.keys(defaultNsData).filter(k => k !== '_deprecated');
    orphanedKeysByNamespace[ns] = [];
    
    for (const key of defaultKeys) {
      if (!validKeys.has(key)) {
        orphanedKeysByNamespace[ns].push(key);
        hasOrphans = true;
      }
    }

    for (const loc of availableLocales) {
      if (loc === defaultLang) continue;
      const locNsPath = path.join(localesDir, `${loc}.json`);
      let locKeys = [];
      
      if (existsSync(locNsPath)) {
        const locNsData = JSON.parse(await fs.readFile(locNsPath, 'utf8'));
        locKeys = Object.keys(locNsData).filter(k => k !== '_deprecated');
      }
      
      const missing = defaultKeys.filter(k => validKeys.has(k) && !locKeys.includes(k));
      
      if (!missingKeysByLocaleAndNamespace[loc]) missingKeysByLocaleAndNamespace[loc] = {};
      missingKeysByLocaleAndNamespace[loc][ns] = missing;
      
      const validDefaultKeys = defaultKeys.filter(k => validKeys.has(k));
      totalKeys += validDefaultKeys.length;
      totalCoveredKeys += (validDefaultKeys.length - missing.length);
    }
  }

  console.log(chalk.bold('\n📊 Reconciliation Report'));
  console.log('----------------------------------------------------');
  for (const ns of namespaces) {
    if (orphanedKeysByNamespace[ns].length > 0 && !options.prune) {
      console.log(chalk.yellow(`Locale '${ns}' has ${orphanedKeysByNamespace[ns].length} orphaned keys (run with --prune to remove)`));
    }
    
    for (const loc of availableLocales) {
      if (loc === defaultLang) continue;
      const missingCount = missingKeysByLocaleAndNamespace[loc][ns].length;
      if (missingCount > 0) {
        console.log(chalk.red(`  [${loc}] Missing ${missingCount} translations`));
      } else {
        console.log(chalk.green(`  [${loc}] 100% coverage`));
      }
    }
  }
  console.log('----------------------------------------------------');

  const coveragePct = totalKeys === 0 ? 100 : (totalCoveredKeys / totalKeys) * 100;
  const threshold = config.translationCoverageThreshold || 100;
  
  console.log(chalk.cyan(`Overall Coverage: ${coveragePct.toFixed(2)}% (Target: ${threshold}%)`));

  if (options.ci) {
    if (coveragePct < threshold) {
      console.log(chalk.red(`\n❌ CI Check Failed: Coverage (${coveragePct.toFixed(2)}%) is below threshold (${threshold}%).`));
      process.exit(1);
    } else if (hasOrphans && !options.prune) {
      console.log(chalk.red(`\n❌ CI Check Failed: Orphaned keys exist. Please run 'meridian sync --prune' to clean them up.`));
      process.exit(1);
    } else {
      console.log(chalk.green(`\n✅ CI Check Passed!`));
    }
  }
}

/**
 * Main orchestration function for Meridian Sync.
 * Coordinates detection, extraction, syncing, and reconciliation.
 *
 * @param {string} projectRoot - Root of the project.
 * @param {Object} config - Configuration object.
 * @param {Object} spinner - Ora spinner instance.
 * @param {string[]} cliLanguages - Languages specified in the CLI.
 * @param {Object} options - Sync CLI flags.
 */


/**
 * Main orchestration function for Meridian Sync.
 * Coordinates detection, extraction, syncing, and reconciliation.
 *
 * @param {string} projectRoot - Root of the project.
 * @param {Object} config - Configuration object.
 * @param {Object} spinner - Ora spinner instance.
 * @param {string[]} cliLanguages - Languages specified in the CLI.
 * @param {Object} options - Sync CLI flags.
 */
export async function runSync(projectRoot, config, spinner, cliLanguages, options = {}) {
  const adapter = getActiveAdapterInstance(projectRoot);

  detectFrameworks(projectRoot, config);

  await runIncrementalExtraction(projectRoot, config, options);

  const defaultLang = config.defaultLanguage || 'en';
  const translationPath = path.join(projectRoot, 'src', 'i18n', 'messages', `${defaultLang}.json`);

  const existingTranslations = await loadExistingTranslations(translationPath);
  if (!existingTranslations) {
    spinner.fail({ text: 'Failed to parse canonical default language JSON file' });
    return;
  }

  const activeFlatKeys = await extractFlatKeysFromSource(projectRoot);
  const { activeDataFlatKeys, registry: dataRegistry } = await extractDynamicKeysFromData(projectRoot);
  const validKeys = new Set([...activeFlatKeys, ...activeDataFlatKeys]);

  const currentDataScan = await extractDataPaths(projectRoot, dataRegistry);
  const lastDataScanPath = path.join(projectRoot, '.meridian', 'last-data-scan.json');
  let previousDataScan = {};
  if (fsSync.existsSync(lastDataScanPath)) {
    try {
      previousDataScan = JSON.parse(fsSync.readFileSync(lastDataScanPath, 'utf8'));
    } catch (e) {}
  }

  const allCurrentKeys = new Set(
    Object.values(currentDataScan).flatMap(paths => Object.values(paths))
  );
  const allPreviousKeys = new Set(
    Object.values(previousDataScan).flatMap(paths => Object.values(paths))
  );

  const valueEdits = [];
  for (const [file, currentPaths] of Object.entries(currentDataScan)) {
    const prevPaths = previousDataScan[file] || {};
    for (const [dotPath, newKey] of Object.entries(currentPaths)) {
      const oldKey = prevPaths[dotPath];
      if (
        oldKey && 
        oldKey !== newKey && 
        !allCurrentKeys.has(oldKey) && 
        !allPreviousKeys.has(newKey)
      ) {
        valueEdits.push({ file, dotPath, oldKey, newKey });
      }
    }
  }

  if (valueEdits.length > 0) {
    if (!options.migrateValue) {
      spinner.stop();
      for (const edit of valueEdits) {
        console.log(chalk.yellow(`⚠ Detected a likely value edit: '${edit.oldKey}' → '${edit.newKey}' in ${edit.file}. Existing translations will be carried forward. Run with --migrate-value to apply, or --prune to discard them.`));
      }
      spinner.start('Syncing data files...');
    } else {
      spinner.stop();
      console.log(chalk.blue('\n🔄 Migrating value edits across locales...'));
      const localesDir = path.join(projectRoot, 'src', 'i18n', 'messages');
      const availableLocales = fsSync.existsSync(localesDir) ? fsSync.readdirSync(localesDir).filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json')) : [];
      
      for (const edit of valueEdits) {
        validKeys.add(edit.newKey);

        for (const loc of availableLocales) {
          const locNsPath = path.join(localesDir, `${loc}.json`);
          if (fsSync.existsSync(locNsPath)) {
            const locData = JSON.parse(fsSync.readFileSync(locNsPath, 'utf8'));
            if (locData[edit.oldKey] !== undefined) {
              if (loc === defaultLang) {
                locData[edit.newKey] = edit.newKey;
              } else {
                locData[edit.newKey] = locData[edit.oldKey];
              }
              delete locData[edit.oldKey];
              atomicWriteFileSync(locNsPath, JSON.stringify(locData, null, 2));
            }
          }
        }
        
        if (existingTranslations[edit.oldKey] !== undefined) {
           existingTranslations[edit.newKey] = existingTranslations[edit.oldKey];
           delete existingTranslations[edit.oldKey];
        } else {
           existingTranslations[edit.newKey] = edit.newKey;
        }
      }
      console.log(chalk.green(`  ✓ Migrated ${valueEdits.length} string value(s).`));
      spinner.start('Syncing data files...');
    }
  }

  const deltas = computeSyncDeltas(validKeys, existingTranslations);
  const isReadOnly = options.check || options.ci;

  if (isReadOnly) {
    spinner.stop();
    await runReconciliationCheck(projectRoot, defaultLang, validKeys, options, config);
    return;
  }

  await writeTranslations(translationPath, existingTranslations, deltas, options);

  if (deltas.newCount === 0 && deltas.deprecatedCount === 0) {
    spinner.success({ text: 'Nothing to sync. All strings are up to date.' });
  } else {
    spinner.success({ text: 'Sync extraction complete.' });
    console.log();
    if (deltas.newCount > 0) {
      console.log(chalk.green(`  ✓ ${deltas.newCount} new strings extracted`));
    }
    if (deltas.deprecatedCount > 0 && !options.prune) {
      console.log(chalk.yellow(`  ⚠ ${deltas.deprecatedCount} orphaned strings flagged (run with --prune to remove)`));
    }
    if (deltas.deprecatedCount > 0 && options.prune) {
      console.log(chalk.green(`  ✓ ${deltas.deprecatedCount} orphaned strings pruned`));
    }
  }

  if (deltas.deltaKeys.length > 0) {
    await runTranslations(projectRoot, config, spinner, cliLanguages, deltas.deltaKeys);
  }
  
  if (options.prune) {
    await runReconciliationCheck(projectRoot, defaultLang, validKeys, options, config);
  }

  // Write state files only on full successful completion
  atomicWriteFileSync(lastDataScanPath, JSON.stringify(currentDataScan, null, 2));
  const lastSyncPath = path.join(projectRoot, '.meridian', 'last-sync');
  atomicWriteFileSync(lastSyncPath, Date.now().toString());

  // Call adapter's writeLocaleFiles
  try {
    await adapter.writeLocaleFiles(null, projectRoot);
  } catch (err) {
    console.log(chalk.red(`  ❌ Failed to write adapter locale files: ${err.message}`));
  }
}
