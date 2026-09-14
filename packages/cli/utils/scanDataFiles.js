import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import babel from '@babel/core';
import chalk from 'chalk';

/**
 * Classifies a string value based on heuristic rules.
 * @param {string} value - The string to classify.
 * @returns {'skip'|'translatable'|'identifier'} The classification.
 */
function classifyString(value) {
  if (value === '' || value.trim() === '') return 'skip';
  if (!isNaN(Number(value))) return 'skip';
  if (value === 'true' || value === 'false') return 'skip';

  // Skip URLs
  if (/^https?:\/\//i.test(value)) return 'skip';
  // Skip email addresses
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'skip';
  // Skip phone numbers (digits, spaces, +, -, parentheses only)
  if (/^[\d\s()\-+.]+$/.test(value) && value.replace(/\D/g, '').length >= 4) return 'skip';
  // Skip CSS / icon class strings. Keep ordinary lowercase prose like
  // "for one user" translatable; class lists usually include hyphens/digits.
  if (/^\s*[a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]+)+\s*$/.test(value)) {
    const tokens = value.trim().split(/\s+/);
    if (tokens.some(token => /[-\d]/.test(token))) return 'identifier';
  }
  // Skip file-path-like strings
  if (/(\/|\\|\.[a-z]{2,4}$)/i.test(value) && !value.includes(' ')) return 'skip';

  // Multi-word strings are translatable
  if (value.includes(' ')) return 'translatable';

  // Currency-like display values (e.g. "$0", "$15", "€20")
  if (/^[$€£¥]\s?\d+(?:\.\d+)?$/.test(value)) return 'translatable';

  // Single-word Title Case (e.g. "Free", "Pro", "Enterprise", "Basic")
  // These are display labels in JSON config, not code identifiers.
  if (/^[A-Z][a-z]+$/.test(value)) return 'translatable';

  // ALL-CAPS acronyms (e.g. "USD", "RTL", "API") → identifier
  if (/^[A-Z]+$/.test(value)) return 'identifier';

  const isAllLowercase = value.toLowerCase() === value;
  if (value.includes('-') || value.includes('_') || isAllLowercase) {
    return 'identifier';
  }

  return 'identifier';
}

/**
 * Recursively retrieves all files in a directory.
 * @param {string} dir - Directory to scan.
 * @param {string[]} [fileList] - Accumulated list of files.
 * @returns {Promise<string[]>} - List of absolute file paths.
 */
async function getAllFiles(dir, fileList = []) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await getAllFiles(fullPath, fileList);
      } else {
        fileList.push(fullPath);
      }
    }
  } catch (err) {
    // If directory doesn't exist or is inaccessible, ignore and return empty
  }
  return fileList;
}

/**
 * Checks if a file path matches the data files heuristic.
 * @param {string} filePath - Absolute path to the file.
 * @param {string} projectRoot - Absolute path to the project root.
 * @param {string[]} extraDataFiles - Explicit files from meridianrc.json.
 * @returns {boolean} - True if it qualifies as a data file.
 */
function isDataFile(filePath, projectRoot, extraDataFiles) {
  const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
  
  if (extraDataFiles.includes(relativePath)) return true;
  
  if (relativePath.startsWith('src/') && (relativePath.endsWith('.js') || relativePath.endsWith('.json'))) {
    if (
      relativePath.includes('/data/') ||
      relativePath.includes('/content/') ||
      relativePath.includes('/constants/') ||
      relativePath.includes('/config/') ||
      relativePath.includes('/lib/')
    ) {
      return true;
    }
  }
  
  return false;
}

/**
 * Scans for data files in the project.
 * @param {string} projectRoot - The root directory of the project.
 * @returns {Promise<string[]>} - Array of matching absolute file paths.
 */
async function findDataFiles(projectRoot) {
  let extraDataFiles = [];
  try {
    const rcPath = existsSync(path.join(projectRoot, '.meridianrc.json'))
      ? path.join(projectRoot, '.meridianrc.json')
      : path.join(projectRoot, 'meridianrc.json');
    if (existsSync(rcPath)) {
      const rcContent = await fs.readFile(rcPath, 'utf8');
      const rcJson = JSON.parse(rcContent);
      if (Array.isArray(rcJson.dataFiles)) {
        extraDataFiles = rcJson.dataFiles;
      }
    }
  } catch (err) {
    // Gracefully ignore reading/parsing errors for the config
  }

  const srcDir = path.join(projectRoot, 'src');
  const allSrcFiles = await getAllFiles(srcDir);
  
  const matchedFiles = allSrcFiles.filter(file => isDataFile(file, projectRoot, extraDataFiles));
  
  for (const extra of extraDataFiles) {
    const extraPath = path.join(projectRoot, extra);
    if (existsSync(extraPath) && !matchedFiles.includes(extraPath)) {
      if (extraPath.endsWith('.js') || extraPath.endsWith('.json')) {
        matchedFiles.push(extraPath);
      }
    }
  }
  
  return matchedFiles;
}

/**
 * Recursively walks an object or array to extract string leaf values and their keys.
 * @param {any} node - The current node in the tree.
 * @param {Object} registry - The registry for the current file.
 * @param {string} [currentKey] - The object key that holds the current node.
 */
function walkTree(node, registry, currentKey = null) {
  if (typeof node === 'string') {
    if (currentKey) {
      const cls = classifyString(node);
      if (cls && !registry[cls].includes(currentKey)) {
        registry[cls].push(currentKey);
      }
    }
  } else if (Array.isArray(node)) {
    node.forEach(item => walkTree(item, registry, currentKey));
  } else if (node && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => walkTree(value, registry, key));
  }
}

/**
 * Parses a JSON file and extracts string leaf values.
 * @param {string} filePath - Absolute path to the JSON file.
 * @returns {Promise<Object>} - The categorized registry for the file.
 */
async function parseJsonFile(filePath) {
  const code = await fs.readFile(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(code);
  } catch (err) {
    console.warn(chalk.yellow(`Warning: Failed to parse JSON file ${filePath}: ${err.message}`));
    return null;
  }
  
  const registry = { translatable: [], identifier: [], skip: [] };
  
  walkTree(data, registry);
  
  if (registry.translatable.length === 0) delete registry.translatable;
  if (registry.identifier.length === 0) delete registry.identifier;
  if (registry.skip.length === 0) delete registry.skip;
  
  return Object.keys(registry).length > 0 ? registry : null;
}

/**
 * Parses a JS file and extracts string leaf values from exports.
 * @param {string} filePath - Absolute path to the JS file.
 * @returns {Promise<Object>} - The categorized registry for the file.
 */
async function parseJsFile(filePath) {
  const code = await fs.readFile(filePath, 'utf8');
  
  const registry = { translatable: [], identifier: [], skip: [] };
  
  try {
    const ast = babel.parse(code, {
      filename: filePath,
      sourceType: 'module',
      parserOpts: {
        plugins: ['jsx', 'typescript']
      }
    });

    babel.traverse(ast, {
      StringLiteral(p) {
        const exportParent = p.findParent(parent => parent.isExportDeclaration());
        if (!exportParent) return;

        const objProp = p.findParent(parent => parent.isObjectProperty());
        if (objProp) {
          const keyNode = objProp.node.key;
          const keyName = keyNode.type === 'Identifier' ? keyNode.name : keyNode.value;
          if (typeof keyName === 'string') {
            const cls = classifyString(p.node.value);
            if (cls && !registry[cls].includes(keyName)) {
              registry[cls].push(keyName);
            }
          }
        }
      },
      TemplateLiteral(p) {
        const exportParent = p.findParent(parent => parent.isExportDeclaration());
        if (!exportParent || p.node.expressions.length > 0) return;

        const objProp = p.findParent(parent => parent.isObjectProperty());
        if (objProp) {
          const keyNode = objProp.node.key;
          const keyName = keyNode.type === 'Identifier' ? keyNode.name : keyNode.value;
          if (typeof keyName === 'string') {
            const value = p.node.quasis[0].value.raw;
            const cls = classifyString(value);
            if (cls && !registry[cls].includes(keyName)) {
              registry[cls].push(keyName);
            }
          }
        }
      }
    });
  } catch (err) {
    console.warn(chalk.yellow(`Warning: Failed to parse JS file ${filePath}: ${err.message}`));
    return null;
  }
  
  if (registry.translatable.length === 0) delete registry.translatable;
  if (registry.identifier.length === 0) delete registry.identifier;
  if (registry.skip.length === 0) delete registry.skip;
  
  return Object.keys(registry).length > 0 ? registry : null;
}

/**
 * Scans project for data files and classifies their string leaf values.
 * @param {string} projectRoot - Absolute path to the project root.
 * @returns {Promise<Object>} - The global registry of classified strings.
 */
export async function scanDataFiles(projectRoot) {
  const files = await findDataFiles(projectRoot);
  const globalRegistry = {};
  
  for (const file of files) {
    const relativePath = path.relative(projectRoot, file).replace(/\\/g, '/');
    let fileRegistry = null;
    
    if (file.endsWith('.js')) {
      fileRegistry = await parseJsFile(file);
    } else if (file.endsWith('.json')) {
      fileRegistry = await parseJsonFile(file);
    }
    
    if (fileRegistry) {
      globalRegistry[relativePath] = fileRegistry;
    }
  }
  
  return globalRegistry;
}

/**
 * Walks a plain JS/JSON value tree and collects every string leaf mapped to
 * its dot-notation path.  Only keys whose last segment is in `translatableKeys`
 * are included.
 * @param {any} node - Current value in the tree.
 * @param {string[]} pathParts - Accumulated path segments.
 * @param {string[]} translatableKeys - Keys recognised as translatable.
 * @param {Object} result - Accumulator: { dotPath → rawString }.
 */
function walkValueTree(node, pathParts, translatableKeys, result) {
  if (typeof node === 'string') {
    const leafKey = pathParts[pathParts.length - 1];
    if (leafKey !== undefined && translatableKeys.includes(String(leafKey))) {
      result[pathParts.join('.')] = node;
    }
  } else if (Array.isArray(node)) {
    node.forEach((item, idx) =>
      walkValueTree(item, [...pathParts, idx], translatableKeys, result)
    );
  } else if (node && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) =>
      walkValueTree(value, [...pathParts, key], translatableKeys, result)
    );
  }
}

/**
 * Promotes translatable strings from a single scanned data file into the
 * provided `translations` object as **flat top-level keys**.
 *
 * Key scheme: the English string value is its own key, identical to how i18next
 * `t()` calls work when the JSX extractor wraps dynamic member expressions such
 * as `t(d.name)` — the runtime value of `d.name` is the key.  Writing flat
 * keys here means:
 *   - `t("Lorem ipsum dolor")` → finds the key → returns the translation ✓
 *   - No path-based nesting needed in runtime locale files
 *
 * The `_data.*` nested structure is intentionally left to `runSync` only,
 * which uses it for offline change tracking and is never consumed by `t()`.
 *
 * Duplicate values across entries are deduplicated naturally by using the
 * string itself as the object key.  Existing keys are never overwritten so
 * this function is safe to call repeatedly.
 *
 * @param {string}   filePath     - Absolute path to the data file.
 * @param {string}   projectRoot  - Absolute path to the project root.
 * @param {Object}   fileRegistry - Registry entry produced by {@link scanDataFiles};
 *                                   must contain a `translatable` string array.
 * @param {Object}   translations - Mutable en/translation.json object that will
 *                                   receive the new flat keys.
 * @returns {Promise<number>} Number of keys newly added (0 when all already present).
 */
export async function promoteDataFileKeys(filePath, projectRoot, fileRegistry, translations) {
  const translatableKeys = fileRegistry.translatable || [];
  if (translatableKeys.length === 0) return 0;

  /**
   * All unique translatable string values found in the data file.
   * @type {Set<string>}
   */
  const uniqueValues = new Set();

  if (filePath.endsWith('.json')) {
    // --- JSON data file ---
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);
      collectValues(data, translatableKeys, uniqueValues);
    } catch (err) {
      console.warn(chalk.yellow(`  ⚠️  Could not read JSON for promotion: ${filePath} — ${err.message}`));
      return 0;
    }
  } else if (filePath.endsWith('.js')) {
    // --- JS data file (Babel AST extraction) ---
    try {
      const code = await fs.readFile(filePath, 'utf8');
      const ast = babel.parse(code, {
        filename: filePath,
        sourceType: 'module',
        parserOpts: { plugins: ['jsx', 'typescript'] },
      });

      babel.traverse(ast, {
        StringLiteral(p) {
          const objProp = p.findParent(par => par.isObjectProperty());
          if (!objProp) return;
          const keyNode = objProp.node.key;
          const keyName = keyNode.type === 'Identifier' ? keyNode.name : keyNode.value;
          if (translatableKeys.includes(keyName)) {
            uniqueValues.add(p.node.value);
          }
        },
        TemplateLiteral(p) {
          if (p.node.expressions.length > 0) return;
          const objProp = p.findParent(par => par.isObjectProperty());
          if (!objProp) return;
          const keyNode = objProp.node.key;
          const keyName = keyNode.type === 'Identifier' ? keyNode.name : keyNode.value;
          if (translatableKeys.includes(keyName)) {
            uniqueValues.add(p.node.quasis[0].value.raw);
          }
        },
      });
    } catch (err) {
      console.warn(chalk.yellow(`  ⚠️  Could not parse JS for promotion: ${filePath} — ${err.message}`));
      return 0;
    }
  }

  if (uniqueValues.size === 0) return 0;

  let promotedCount = 0;

  for (const value of uniqueValues) {
    // Final guard: re-classify with the stricter classifier before writing
    if (classifyString(value) !== 'translatable') continue;
    // Flat key: the English string is both the key and the default value.
    // i18next returns the key when no translation exists, so this is safe.
    if (translations[value] === undefined) {
      translations[value] = value;
      promotedCount++;
    }
  }

  return promotedCount;
}

/**
 * Recursively collects string leaf values whose parent key is in
 * `translatableKeys` into a flat Set.
 * Used internally by {@link promoteDataFileKeys} for JSON files.
 *
 * @param {any}      node            - Current tree node.
 * @param {string[]} translatableKeys - Allowed field names.
 * @param {Set<string>} out          - Accumulator.
 */
function collectValues(node, translatableKeys, out, isParentTranslatable = false) {
  if (typeof node === 'string') {
    if (isParentTranslatable) {
      out.add(node);
    }
    return;
  }

  if (Array.isArray(node)) {
    node.forEach(item => collectValues(item, translatableKeys, out, isParentTranslatable));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      const isCurrentTranslatable = translatableKeys.includes(key);
      if (typeof value === 'string' && isCurrentTranslatable) {
        out.add(value);
      } else {
        collectValues(value, translatableKeys, out, isCurrentTranslatable);
      }
    }
  }
}

/**
 * Extracts a map of { file: { dotPath: stringValue } } for all data files.
 * @param {string} projectRoot - Absolute path to project root.
 * @param {Object} dataRegistry - Registry produced by scanDataFiles.
 * @returns {Promise<Object>} The dot-path map.
 */
export async function extractDataPaths(projectRoot, dataRegistry) {
  const result = {};
  
  for (const [relPath, fileRegistry] of Object.entries(dataRegistry)) {
    const translatableKeys = fileRegistry.translatable || [];
    if (translatableKeys.length === 0) continue;

    const absoluteFilePath = path.join(projectRoot, relPath);
    const fileResult = {};
    
    if (absoluteFilePath.endsWith('.json')) {
      try {
        const raw = await fs.readFile(absoluteFilePath, 'utf8');
        const data = JSON.parse(raw);
        walkValueTree(data, [], translatableKeys, fileResult);
      } catch (err) {}
    } else if (absoluteFilePath.endsWith('.js')) {
      // For JS data files we dynamically import to get the value tree
      // Using a timestamp to bypass module cache
      try {
        const fileUrl = `file://${absoluteFilePath.replace(/\\/g, '/')}`;
        const mod = await import(`${fileUrl}?t=${Date.now()}`);
        const exportsObj = { ...mod };
        walkValueTree(exportsObj, [], translatableKeys, fileResult);
      } catch (err) {}
    }
    
    if (Object.keys(fileResult).length > 0) {
      result[relPath] = fileResult;
    }
  }
  
  return result;
}
