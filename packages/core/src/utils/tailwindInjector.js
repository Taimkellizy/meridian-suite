import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { applyEdits } from './i18n/applyEdits.js';

const traverse = _traverse.default || _traverse;

const TAILWIND_LOGICAL_PLUGIN = 'tailwindcss-logical';
const TAILWIND_LOGICAL_VARIANTS = "['responsive', 'hover', 'focus', 'dark']";
const CSS_ENTRY_CANDIDATES = [
  'src/index.css',
  'src/app.css',
  'src/global.css',
  'src/main.css',
  'app/globals.css',
  'src/styles/globals.css',
  'src/styles/main.css'
];

/**
 * Selects the tailwindcss-logical package version compatible with Tailwind.
 *
 * @param {2 | 3 | 4} tailwindVersion - Detected Tailwind major version.
 * @returns {string} npm package spec to install.
 */
function getTailwindLogicalPackageSpec(tailwindVersion) {
  if (tailwindVersion === 2) {
    return `${TAILWIND_LOGICAL_PLUGIN}@2.0.0`;
  }

  if (tailwindVersion === 3) {
    return `${TAILWIND_LOGICAL_PLUGIN}@3.0.1`;
  }

  return `${TAILWIND_LOGICAL_PLUGIN}@4.0.0`;
}

/**
 * Writes file contents through Meridian's temp-file swap pattern.
 *
 * @param {string} filePath - Absolute path to write.
 * @param {string} content - New file contents.
 * @returns {void}
 * @throws {Error} If the temporary write or rename fails.
 */
function atomicWriteFile(filePath, content) {
  const temporaryPath = `${filePath}.meridian-tmp`;

  try {
    fs.writeFileSync(temporaryPath, content, 'utf8');
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) {
      fs.unlinkSync(temporaryPath);
    }
    throw error;
  }
}

/**
 * Finds the Tailwind v2/v3 config file in the project root.
 *
 * @param {string} projectRoot - Absolute project root.
 * @returns {string | null} Absolute config path when present.
 */
function findTailwindConfigPath(projectRoot) {
  const configCandidates = ['tailwind.config.js', 'tailwind.config.ts'];

  for (const configFileName of configCandidates) {
    const configPath = path.join(projectRoot, configFileName);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

/**
 * Finds the Tailwind v4 CSS entry file by checking standard app paths.
 *
 * @param {string} projectRoot - Absolute project root.
 * @returns {string | null} Absolute CSS entry path when detected.
 */
function findCssEntryPath(projectRoot) {
  for (const relativePath of CSS_ENTRY_CANDIDATES) {
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
 * Finds the root Tailwind config object in common config export styles.
 *
 * @param {import('@babel/parser').ParseResult} ast - Parsed Tailwind config AST.
 * @returns {import('@babel/types').ObjectExpression | null} Root config object when found.
 */
function findRootConfigObject(ast) {
  let configObject = null;

  traverse(ast, {
    AssignmentExpression(path) {
      if (configObject) {
        return;
      }

      const { node } = path;
      const leftSource = path.get('left').toString();
      if (leftSource === 'module.exports' && node.right.type === 'ObjectExpression') {
        configObject = node.right;
      }
    },
    ExportDefaultDeclaration(path) {
      if (!configObject && path.node.declaration.type === 'ObjectExpression') {
        configObject = path.node.declaration;
      }
    }
  });

  return configObject;
}

/**
 * Finds a direct object property by key name.
 *
 * @param {import('@babel/types').ObjectExpression} objectNode - Object node to inspect.
 * @param {string} propertyName - Property key to find.
 * @returns {import('@babel/types').ObjectProperty | null} Matching property node.
 */
function findObjectProperty(objectNode, propertyName) {
  return objectNode.properties.find((property) => {
    if (property.type !== 'ObjectProperty') {
      return false;
    }

    const keyName = property.key.name || property.key.value;
    return keyName === propertyName;
  }) || null;
}

/**
 * Checks whether an AST node already references tailwindcss-logical.
 *
 * @param {import('@babel/types').Node} node - Plugin array element.
 * @param {string} source - Full config source text.
 * @returns {boolean} True when the node source contains the logical plugin package.
 */
function isTailwindLogicalPluginNode(node, source) {
  return source.slice(node.start, node.end).includes(TAILWIND_LOGICAL_PLUGIN);
}

/**
 * Finds the plugins array from an exported Tailwind config object.
 *
 * @param {import('@babel/parser').ParseResult} ast - Parsed Tailwind config AST.
 * @param {string} source - Full config source text.
 * @returns {import('@babel/types').ArrayExpression | null} Plugins array node when present.
 */
function findPluginsArray(ast, source) {
  let pluginsArray = null;

  traverse(ast, {
    ObjectProperty(path) {
      if (pluginsArray) {
        return;
      }

      const { node } = path;
      const keyName = node.key.name || node.key.value;
      if (keyName === 'plugins' && node.value.type === 'ArrayExpression') {
        pluginsArray = node.value;
      }
    },
    ObjectMethod(path) {
      if (pluginsArray) {
        return;
      }

      const keyName = path.node.key.name || path.node.key.value;
      if (keyName === 'plugins') {
        const methodSource = source.slice(path.node.start, path.node.end);
        if (methodSource.includes('[') && methodSource.includes(']')) {
          console.log(chalk.yellow('  ⚠ Tailwind plugins is a method and was skipped. Please add tailwindcss-logical manually.'));
        }
      }
    }
  });

  return pluginsArray;
}

/**
 * Injects tailwindcss-logical into a Tailwind v2/v3 config plugins array.
 *
 * @param {string} configPath - Absolute path to tailwind.config.js or tailwind.config.ts.
 * @returns {boolean} True when the config file contains the plugin.
 */
function injectV3Config(configPath) {
  const source = fs.readFileSync(configPath, 'utf8');
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript']
  });
  const pluginsArray = findPluginsArray(ast, source);

  if (!pluginsArray) {
    console.log(chalk.yellow('  ⚠ Tailwind plugins array not found. Please add tailwindcss-logical manually.'));
    return false;
  }

  if (pluginsArray.elements.some((element) => element && isTailwindLogicalPluginNode(element, source))) {
    return true;
  }

  const beforeClosingBracket = source.slice(0, pluginsArray.end - 1).trimEnd();
  const hasTrailingComma = beforeClosingBracket.endsWith(',');
  const insertionText = pluginsArray.elements.length === 0 || hasTrailingComma
    ? `require('${TAILWIND_LOGICAL_PLUGIN}')`
    : `, require('${TAILWIND_LOGICAL_PLUGIN}')`;
  const updatedSource = applyEdits(source, [{
    start: pluginsArray.end - 1,
    end: pluginsArray.end - 1,
    replacement: insertionText
  }]);

  atomicWriteFile(configPath, updatedSource);
  return fs.readFileSync(configPath, 'utf8').includes(TAILWIND_LOGICAL_PLUGIN);
}

/**
 * Ensures Tailwind v2 enables responsive/state variants for logical utilities.
 *
 * tailwindcss-logical v2 requires variants.logical to be configured, unlike
 * newer Tailwind/plugin combinations where variants are generated automatically.
 *
 * @param {string} configPath - Absolute Tailwind config path.
 * @returns {boolean} True when the config contains a logical variants entry.
 */
function ensureV2LogicalVariants(configPath) {
  const source = fs.readFileSync(configPath, 'utf8');
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript']
  });
  const configObject = findRootConfigObject(ast);

  if (!configObject) {
    console.log(chalk.yellow('  ⚠ Tailwind config object not found. Please add variants.logical manually.'));
    return false;
  }

  const variantsProperty = findObjectProperty(configObject, 'variants');
  if (!variantsProperty) {
    const beforeClosingBrace = source.slice(0, configObject.end - 1).trimEnd();
    const needsComma = !beforeClosingBrace.endsWith('{') && !beforeClosingBrace.endsWith(',');
    const insertionText = beforeClosingBrace.endsWith('{')
      ? `variants: { logical: ${TAILWIND_LOGICAL_VARIANTS} }`
      : `${needsComma ? ',' : ''}\n  variants: { logical: ${TAILWIND_LOGICAL_VARIANTS} }`;
    const updatedSource = applyEdits(source, [{
      start: configObject.end - 1,
      end: configObject.end - 1,
      replacement: insertionText
    }]);

    atomicWriteFile(configPath, updatedSource);
    return fs.readFileSync(configPath, 'utf8').includes('logical');
  }

  if (variantsProperty.value.type !== 'ObjectExpression') {
    console.log(chalk.yellow('  ⚠ Tailwind variants is not an object. Please add variants.logical manually.'));
    return false;
  }

  const logicalProperty = findObjectProperty(variantsProperty.value, 'logical');
  if (logicalProperty) {
    return true;
  }

  const beforeClosingBrace = source.slice(0, variantsProperty.value.end - 1).trimEnd();
  const needsComma = !beforeClosingBrace.endsWith('{') && !beforeClosingBrace.endsWith(',');
  const insertionText = beforeClosingBrace.endsWith('{')
    ? `logical: ${TAILWIND_LOGICAL_VARIANTS}`
    : `${needsComma ? ',' : ''}\n    logical: ${TAILWIND_LOGICAL_VARIANTS}`;
  const updatedSource = applyEdits(source, [{
    start: variantsProperty.value.end - 1,
    end: variantsProperty.value.end - 1,
    replacement: insertionText
  }]);

  atomicWriteFile(configPath, updatedSource);
  return fs.readFileSync(configPath, 'utf8').includes('logical');
}

/**
 * Finds the insertion point after the last Tailwind CSS directive.
 *
 * @param {string} source - CSS source text.
 * @returns {number} Character offset for plugin insertion.
 */
function findCssPluginInsertionPoint(source) {
  const directivePattern = /^[ \t]*@(import|tailwind)\b.*;?[ \t]*$/gm;
  let insertionPoint = 0;
  let match;

  while ((match = directivePattern.exec(source)) !== null) {
    insertionPoint = match.index + match[0].length;
  }

  return insertionPoint;
}

/**
 * Injects tailwindcss-logical into a Tailwind v4 CSS entry file.
 *
 * @param {string} cssEntryPath - Absolute path to the Tailwind CSS entry file.
 * @returns {boolean} True when the CSS file contains the plugin.
 */
function injectV4Css(cssEntryPath) {
  const source = fs.readFileSync(cssEntryPath, 'utf8');
  const existingPluginPattern = new RegExp(`@plugin\\s+["']${TAILWIND_LOGICAL_PLUGIN}["']`);
  if (existingPluginPattern.test(source)) {
    return true;
  }

  const insertionPoint = findCssPluginInsertionPoint(source);
  const prefix = insertionPoint > 0 && source[insertionPoint] !== '\n' ? '\n' : '';
  const suffix = insertionPoint > 0 ? '\n' : '';
  const updatedSource = applyEdits(source, [{
    start: insertionPoint,
    end: insertionPoint,
    replacement: `${prefix}${suffix}@plugin "${TAILWIND_LOGICAL_PLUGIN}";`
  }]);

  atomicWriteFile(cssEntryPath, updatedSource);
  return fs.readFileSync(cssEntryPath, 'utf8').includes(TAILWIND_LOGICAL_PLUGIN);
}

/**
 * Injects the Meridian RTL mirror utility into the global CSS file.
 *
 * @param {string} cssEntryPath - Absolute path to the Tailwind CSS entry file.
 */
function injectRtlMirrorCss(cssEntryPath) {
  const source = fs.readFileSync(cssEntryPath, 'utf8');
  if (source.includes('.meridian-rtl-mirror')) {
    return;
  }

  const cssToInject = `
/* Meridian RTL Injection */
[dir="rtl"] .meridian-rtl-translate-reverse {
  transform: translate(calc(var(--tw-translate-x, 0) * -1), var(--tw-translate-y, 0)) rotate(var(--tw-rotate, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1)) !important;
}

[dir="rtl"] .meridian-rtl-mirror {
  transform: translate(calc(var(--tw-translate-x, 0) * -1), var(--tw-translate-y, 0)) rotate(var(--tw-rotate, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(-1) scaleY(var(--tw-scale-y, 1)) !important;
}
`;

  atomicWriteFile(cssEntryPath, source + cssToInject);
}

/**
 * Installs tailwindcss-logical and injects it into the detected Tailwind setup.
 *
 * The package installation and source edits are intentionally non-fatal for
 * Meridian init. Every failure is caught, logged, and reflected in the result
 * object so callers can safely skip Tailwind class rewrites.
 *
 * @param {string} projectRoot - Absolute project root.
 * @param {{ detected?: boolean, version?: 2 | 3 | 4 | null, install?: boolean }} tailwindConfig - Tailwind settings from Meridian config.
 * @returns {{ success: true } | { success: false, reason: string }} Installation and verified injection result.
 */
export function injectTailwindLogical(projectRoot, tailwindConfig) {
  if (!tailwindConfig?.install || !tailwindConfig?.detected) {
    return { success: false, reason: 'Tailwind logical support is not enabled' };
  }

  if (![2, 3, 4].includes(tailwindConfig.version)) {
    console.log(chalk.yellow('  ⚠ Unsupported Tailwind version for logical plugin setup.'));
    return { success: false, reason: 'unsupported Tailwind version' };
  }

  try {
    const packageSpec = getTailwindLogicalPackageSpec(tailwindConfig.version);
    execSync(`npm install --save-dev ${packageSpec} --legacy-peer-deps`, {
      cwd: projectRoot,
      stdio: 'ignore'
    });
  } catch (error) {
    console.log(chalk.red(`  ✗ Failed to install tailwindcss-logical: ${error.message}`));
    return { success: false, reason: 'npm install failed' };
  }

  let targetPath;
  try {
    targetPath = tailwindConfig.version === 4
      ? findCssEntryPath(projectRoot)
      : findTailwindConfigPath(projectRoot);
  } catch (error) {
    console.log(chalk.yellow(`  ⚠ Tailwind entry file detection failed: ${error.message}`));
    return { success: false, reason: 'Tailwind entry file detection failed' };
  }

  if (!targetPath) {
    console.log(chalk.yellow('  ⚠ Tailwind entry file not found. Please add tailwindcss-logical manually.'));
    return { success: false, reason: 'Tailwind entry file not found' };
  }

  try {
    const verified = tailwindConfig.version === 4
      ? injectV4Css(targetPath)
      : injectV3Config(targetPath);

    if (!verified) {
      console.log(chalk.yellow('  ⚠ Tailwind config injection could not be verified.'));
      return { success: false, reason: 'config injection could not be verified' };
    }

    if (tailwindConfig.version === 2 && !ensureV2LogicalVariants(targetPath)) {
      return { success: false, reason: 'Tailwind v2 logical variants could not be verified' };
    }

    const cssEntryPath = findCssEntryPath(projectRoot);
    if (cssEntryPath) {
      injectRtlMirrorCss(cssEntryPath);
    }
  } catch (error) {
    console.log(chalk.yellow(`  ⚠ Tailwind config injection failed: ${error.message}`));
    return { success: false, reason: 'config injection failed' };
  }

  return { success: true };
}
