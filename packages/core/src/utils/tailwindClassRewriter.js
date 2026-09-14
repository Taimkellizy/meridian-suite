import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { applyEdits } from './i18n/applyEdits.js';

const traverse = _traverse.default || _traverse;
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.next', 'dist', 'build']);
const JSX_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const SUPPORTED_PREFIXES = new Set(['sm', 'md', 'lg', 'xl', '2xl', 'hover', 'focus', 'dark']);
const EXACT_CLASS_MAP = new Map([
  ['text-left', 'text-start'],
  ['text-right', 'text-end']
]);
const V3_PREFIX_CLASS_MAP = [
  ['rounded-tl-', 'rounded-ss-'],
  ['rounded-tr-', 'rounded-se-'],
  ['rounded-bl-', 'rounded-es-'],
  ['rounded-br-', 'rounded-ee-'],
  ['rounded-l-', 'rounded-is-'],
  ['rounded-r-', 'rounded-ie-'],
  ['border-l-', 'border-is-'],
  ['border-r-', 'border-ie-'],
  ['-left-', '-start-'],
  ['-right-', '-end-'],
  ['left-', 'start-'],
  ['right-', 'end-'],
  ['-ml-', '-ms-'],
  ['-mr-', '-me-'],
  ['ml-', 'ms-'],
  ['mr-', 'me-'],
  ['pl-', 'ps-'],
  ['pr-', 'pe-']
];

const V2_PREFIX_CLASS_MAP = [
  ['rounded-tl-', 'rounded-ss-'],
  ['rounded-tr-', 'rounded-se-'],
  ['rounded-bl-', 'rounded-es-'],
  ['rounded-br-', 'rounded-ee-'],
  ['rounded-l-', 'rounded-is-'],
  ['rounded-r-', 'rounded-ie-'],
  ['border-l-', 'border-is-'],
  ['border-r-', 'border-ie-'],
  ['-left-', '-inline-start-'],
  ['-right-', '-inline-end-'],
  ['left-', 'inline-start-'],
  ['right-', 'inline-end-'],
  ['-ml-', '-mis-'],
  ['-mr-', '-mie-'],
  ['ml-', 'mis-'],
  ['mr-', 'mie-'],
  ['pl-', 'pis-'],
  ['pr-', 'pie-']
];

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
 * Recursively collects JSX-capable source files from a directory.
 *
 * @param {string} directoryPath - Absolute directory path to scan.
 * @param {string[]} filePaths - Mutable accumulator for discovered files.
 * @returns {string[]} Absolute JSX-capable file paths.
 */
function collectJsxFiles(directoryPath, filePaths = []) {
  if (!fs.existsSync(directoryPath)) {
    return filePaths;
  }

  for (const entryName of fs.readdirSync(directoryPath)) {
    if (SKIPPED_DIRECTORIES.has(entryName)) {
      continue;
    }

    const entryPath = path.join(directoryPath, entryName);
    const stat = fs.statSync(entryPath);

    if (stat.isDirectory()) {
      collectJsxFiles(entryPath, filePaths);
    } else if (JSX_EXTENSIONS.has(path.extname(entryPath))) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}

/**
 * Splits supported Tailwind variants from the base utility token.
 *
 * @param {string} classToken - A single className token.
 * @returns {{ variants: string[], utility: string }} Supported variants and utility name.
 */
function splitSupportedVariants(classToken) {
  const parts = classToken.split(':');
  const variants = [];

  while (parts.length > 1 && SUPPORTED_PREFIXES.has(parts[0])) {
    variants.push(parts.shift());
  }

  return {
    variants,
    utility: parts.join(':')
  };
}

/**
 * Rewrites one Tailwind physical-direction token to its logical equivalent.
 *
 * @param {string} classToken - A single className token.
 * @returns {{ token: string, changed: boolean }} Rewritten token and change state.
 */
/**
 * Rewrites one Tailwind physical-direction token to its logical equivalent.
 *
 * @param {string} classToken - A single className token.
 * @param {{ isV2: boolean }} config - Tailwind version config.
 * @returns {{ token: string, changed: boolean }} Rewritten token and change state.
 */
function rewriteClassToken(classToken, config) {
  const { variants, utility } = splitSupportedVariants(classToken);
  let rewrittenUtility = EXACT_CLASS_MAP.get(utility) || utility;

  if (rewrittenUtility === utility) {
    const prefixMap = config.isV2 ? V2_PREFIX_CLASS_MAP : V3_PREFIX_CLASS_MAP;
    const prefixMatch = prefixMap.find(([physicalPrefix]) => utility.startsWith(physicalPrefix));
    if (prefixMatch) {
      const [physicalPrefix, logicalPrefix] = prefixMatch;
      rewrittenUtility = `${logicalPrefix}${utility.slice(physicalPrefix.length)}`;
    }
  }

  if (rewrittenUtility === utility) {
    return { token: classToken, changed: false };
  }

  return {
    token: [...variants, rewrittenUtility].join(':'),
    changed: true
  };
}

/**
 * Rewrites a static className string while preserving whitespace-separated tokens.
 *
 *  Pass 2 — Absolute icon anchor:
 *   When `absolute` but no explicit inset class (`start-`, `end-`, `left-`, `right-`, `inset-`),
 *   `start-0 top-0` (or `inset-inline-start-0`) is appended.
 *
 * @param {string} classNameValue - Raw className string literal value.
 * @param {{ isV2: boolean }} config - Tailwind config context.
 * @returns {{ value: string, replacements: number, needsMirror: boolean }} Rewritten value and metadata.
 */
function rewriteClassNameValue(classNameValue, config) {
  let replacements = 0;
  let hadInsetConversion = false;
  let hasTranslateX = false;

  // ── Per-token rewrite ────────────────────────────────────────────────────
  const tokens = classNameValue.split(/(\s+)/);
  const rewrittenTokens = tokens.map((part) => {
    if (/^\s*$/.test(part)) return part;

    const result = rewriteClassToken(part, config);
    if (result.changed) {
      replacements++;
      // Detect right-/left- → logical inset conversions.
      const { utility: afterUtility } = splitSupportedVariants(result.token);
      if (
        afterUtility.startsWith('inline-end-') ||
        afterUtility.startsWith('inline-start-') ||
        afterUtility.startsWith('-inline-end-') ||
        afterUtility.startsWith('-inline-start-') ||
        afterUtility.startsWith('inset-inline-') ||
        afterUtility.startsWith('-inset-inline-') ||
        afterUtility.startsWith('start-') ||
        afterUtility.startsWith('-start-') ||
        afterUtility.startsWith('end-') ||
        afterUtility.startsWith('-end-')
      ) {
        hadInsetConversion = true;
      }
    } else {
      // Check if original token has translate-x
      const { utility } = splitSupportedVariants(part);
      if (utility.startsWith('translate-x-') || utility.startsWith('-translate-x-')) {
        hasTranslateX = true;
      }
    }
    return result.token;
  });

  let rewrittenValue = rewrittenTokens.join('');

  // ── Pass 2: anchor un-positioned absolute elements to logical inline-start ─
  const classList = rewrittenValue.trim().split(/\s+/);
  const hasAbsolute = classList.includes('absolute');
  const hasExplicitInset = classList.some(c =>
    /^-?(start-|end-|left-|right-|inset-|inline-start-|inline-end-)/.test(c)
  );

  if (hasAbsolute && !hasExplicitInset) {
    const startClass = config.isV2 ? 'inline-start-0' : 'start-0';
    rewrittenValue = rewrittenValue.trimEnd() + ` ${startClass} top-0`;
    replacements += 2;
  }

  return {
    value: rewrittenValue,
    replacements,
    needsMirror: hadInsetConversion && hasTranslateX
  };
}


/**
 * Checks if a JSX element is safe to auto-apply meridian-rtl-mirror.
 *
 * @param {import('@babel/types').JSXElement} jsxElement - The element to check.
 * @returns {boolean} True if safe.
 */
function isSafeToAutoMirror(jsxElement) {
  if (jsxElement.type !== 'JSXElement') return false;

  const openingElement = jsxElement.openingElement;
  if (openingElement.name.type !== 'JSXIdentifier') return false;
  const tagName = openingElement.name.name;

  const SAFE_TAGS = new Set([
    'svg', 'img', 'picture', 'canvas', 'video', 'path',
    'circle', 'rect', 'polygon', 'polyline', 'line', 'g',
    'defs', 'use', 'symbol', 'clipPath', 'mask'
  ]);
  const TEXT_CONTAINER_TAGS = new Set([
    'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'li', 'td', 'th', 'label', 'button', 'a'
  ]);

  if (TEXT_CONTAINER_TAGS.has(tagName)) return false;

  for (const child of jsxElement.children) {
    if (child.type === 'JSXText') {
      if (child.value.trim() !== '') return false; // Contains non-whitespace text
    } else if (child.type === 'JSXElement') {
      const childTagNameNode = child.openingElement.name;
      if (childTagNameNode.type === 'JSXIdentifier') {
        const childTagName = childTagNameNode.name;
        // Check if child is a component (starts with uppercase)
        if (/^[A-Z]/.test(childTagName)) return false;
        if (!SAFE_TAGS.has(childTagName)) return false;
        // Recursively check children
        if (!isSafeToAutoMirror(child)) return false;
      } else {
        return false; // Complex tags like MemberExpression (e.g. MyContext.Provider)
      }
    } else if (child.type === 'JSXExpressionContainer') {
      // Any expression container could render text or complex components
      return false;
    }
  }

  return SAFE_TAGS.has(tagName);
}

/**
 * Parses JSX/TSX source for className analysis.
 *
 * @param {string} source - File source text.
 * @param {string} filePath - Absolute file path for parser context.
 * @returns {import('@babel/parser').ParseResult} Parsed AST.
 */
function parseJsxSource(source, filePath) {
  const isTypeScriptOnly = filePath.endsWith('.ts') && !filePath.endsWith('.tsx');
  const plugins = ['typescript', 'decorators-legacy', 'classProperties'];

  if (!isTypeScriptOnly) {
    plugins.push('jsx');
  }

  return parse(source, {
    sourceType: 'module',
    plugins
  });
}

/**
 * Determines whether a JSX expression node is genuinely dynamic — i.e., cannot
 * be statically analyzed and must be skipped with a warning.
 *
 * A template literal is only genuinely dynamic when it contains expression
 * slots with non-trivial content (function calls, identifiers, etc.).
 * A pure binary-addition string concatenation is considered dynamic.
 *
 * @param {import('@babel/types').Node} expression - JSX expression container's inner expression.
 * @returns {boolean} True only when the expression cannot be handled by any pattern.
 */
function isGenuinelyDynamic(expression) {
  if (expression.type === 'BinaryExpression' && expression.operator === '+') {
    return true;
  }
  // TemplateLiteral with expressions is handled by Pattern B — not genuinely dynamic.
  // ConditionalExpression and LogicalExpression are handled by C/D.
  return false;
}

/**
 * Builds edits for a TemplateLiteral className node (Patterns A and B).
 *
 * Pattern A — zero expressions: the entire cooked value is static and safe to
 * rewrite as a whole. A single edit replaces the template body in-source.
 *
 * Pattern B — one or more expressions: only TemplateElement (quasi) segments
 * are rewritten. Expression slots are never touched.
 *
 * @param {import('@babel/types').TemplateLiteral} templateNode - The TemplateLiteral AST node.
 * @param {string} source - Full file source text.
 * @returns {{ edits: Array<{start:number,end:number,replacement:string}>, replacements: number }}
 *   Collected edits and total replacement count.
 */
function rewriteTemplateLiteralClassName(templateNode, source, config) {
  const edits = [];
  let replacements = 0;
  let needsMirror = false;

  for (const quasi of templateNode.quasis) {
    const rawSegment = quasi.value.cooked ?? quasi.value.raw;
    if (!rawSegment) continue;

    const rewritten = rewriteClassNameValue(rawSegment, config);
    if (rewritten.replacements === 0) continue;

    if (rewritten.needsMirror) needsMirror = true;

    const quasiSource = source.slice(quasi.start, quasi.end);
    const segmentIndex = quasiSource.indexOf(quasi.value.raw);
    if (segmentIndex === -1) continue;

    const absoluteStart = quasi.start + segmentIndex;
    const absoluteEnd = absoluteStart + quasi.value.raw.length;

    edits.push({
      start: absoluteStart,
      end: absoluteEnd,
      replacement: rewritten.value
    });
    replacements += rewritten.replacements;
  }

  return { edits, replacements, needsMirror };
}

function rewriteStringLiteralNode(strNode, source, config) {
  const rewritten = rewriteClassNameValue(strNode.value, config);
  if (rewritten.replacements === 0) {
    return { edit: null, replacements: 0, needsMirror: false };
  }

  const quote = source[strNode.start] || "'";
  return {
    edit: {
      start: strNode.start,
      end: strNode.end,
      replacement: `${quote}${rewritten.value}${quote}`
    },
    replacements: rewritten.replacements,
    needsMirror: rewritten.needsMirror
  };
}

/**
 * Rewrites JSX className attributes from Tailwind physical-direction utilities
 * to logical-direction utilities.
 *
 * Handles four patterns inside JSXExpressionContainer values:
 *   A) Template literal with zero expressions — fully static, rewrite whole body.
 *   B) Template literal with expressions — rewrite only TemplateElement quasis.
 *   C) Conditional expression with both string branches — rewrite each branch.
 *   D) Logical expression (&&, ||) with StringLiteral right-hand side — rewrite it.
 *
 * The genuinely-dynamic warning fires only for BinaryExpression (+) string
 * concatenation and other unrecognized patterns that cannot be safely handled.
 *
 * @param {string} projectRoot - Absolute project root.
 * @returns {{
 *   filesModified: number,
 *   classesReplaced: number,
 *   staticExpanded: number,
 *   skipped: number,
 *   failed: number
 * }} Rewrite summary.
 */
export function rewriteTailwindClasses(projectRoot) {
  let isV2 = false;
  try {
    const pkgJsonPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
      if (deps['tailwindcss-logical']) {
        isV2 = true;
      }
    }
  } catch (e) {
    // Ignore and default to V3
  }
  const config = { isV2 };

  const sourceRoots = ['src', 'app']
    .map((directoryName) => path.join(projectRoot, directoryName))
    .filter((directoryPath) => fs.existsSync(directoryPath));
  const filePaths = sourceRoots.flatMap((sourceRoot) => collectJsxFiles(sourceRoot));
  const report = {
    filesModified: 0,
    classesReplaced: 0,
    staticExpanded: 0,
    skipped: 0,
    failed: 0,
    autoMirroredCount: 0,
    unsafeMirrorWarnings: []
  };

  for (const filePath of filePaths) {
    const original = fs.readFileSync(filePath, 'utf8');
    let ast;

    try {
      ast = parseJsxSource(original, filePath);
    } catch (error) {
      continue;
    }

    const edits = [];
    let fileReplacementCount = 0;
    let fileExpandedCount = 0;

    traverse(ast, {
      JSXAttribute(attributePath) {
        const { node } = attributePath;
        if (node.name?.name !== 'className' || !node.value) {
          return;
        }

        const jsxElement = attributePath.parentPath.parentPath.node;

        // ── Plain string literal (original behaviour) ──────────────────────
        if (node.value.type === 'StringLiteral') {
          const rewritten = rewriteClassNameValue(node.value.value, config);
          if (rewritten.replacements === 0) return;

          let rewrittenValue = rewritten.value;
          if (rewritten.needsMirror) {
            if (isSafeToAutoMirror(jsxElement)) {
              rewrittenValue = rewrittenValue.trimEnd() + ' meridian-rtl-mirror';
              report.autoMirroredCount++;
            } else {
              rewrittenValue = rewrittenValue.trimEnd() + ' meridian-rtl-translate-reverse';
              const line = jsxElement.loc?.start?.line || 1;
              const relativePath = path.relative(projectRoot, filePath);
              report.unsafeMirrorWarnings.push(`${relativePath}:${line}`);
            }
          }

          const quote = original[node.value.start] || '"';
          edits.push({
            start: node.value.start,
            end: node.value.end,
            replacement: `${quote}${rewritten.value}${quote}`
          });
          fileReplacementCount += rewritten.replacements;
          return;
        }

        if (node.value.type !== 'JSXExpressionContainer') return;

        const expression = node.value.expression;

        // ── Patterns A & B — TemplateLiteral ──────────────────────────────
        if (expression.type === 'TemplateLiteral') {
          const { edits: templateEdits, replacements, needsMirror } =
            rewriteTemplateLiteralClassName(expression, original, config);
          
          if (needsMirror) {
            if (isSafeToAutoMirror(jsxElement)) {
              templateEdits.push({
                start: expression.end - 1,
                end: expression.end - 1,
                replacement: ' meridian-rtl-mirror'
              });
              report.autoMirroredCount++;
            } else {
              templateEdits.push({
                start: expression.end - 1,
                end: expression.end - 1,
                replacement: ' meridian-rtl-translate-reverse'
              });
              const line = jsxElement.loc?.start?.line || 1;
              const relativePath = path.relative(projectRoot, filePath);
              report.unsafeMirrorWarnings.push(`${relativePath}:${line}`);
            }
          }

          if (replacements > 0) {
            edits.push(...templateEdits);
            fileReplacementCount += replacements;
            fileExpandedCount += replacements;
          }
          return;
        }

        // ── Pattern C — ConditionalExpression with string branches ─────────
        if (expression.type === 'ConditionalExpression') {
          const { consequent, alternate } = expression;

          if (
            consequent.type === 'StringLiteral' &&
            alternate.type === 'StringLiteral'
          ) {
            const conResult = rewriteStringLiteralNode(consequent, original, config);
            const altResult = rewriteStringLiteralNode(alternate, original, config);

            let didMirror = false;
            if (conResult.needsMirror || altResult.needsMirror) {
              if (isSafeToAutoMirror(jsxElement)) {
                didMirror = true;
                report.autoMirroredCount++;
              } else {
                const line = jsxElement.loc?.start?.line || 1;
                const relativePath = path.relative(projectRoot, filePath);
                report.unsafeMirrorWarnings.push(`${relativePath}:${line}`);
              }
            }

            if (conResult.replacements > 0 && conResult.edit) {
              if (didMirror && conResult.needsMirror) {
                conResult.edit.replacement = conResult.edit.replacement.slice(0, -1) + ' meridian-rtl-mirror' + conResult.edit.replacement.slice(-1);
              }
              edits.push(conResult.edit);
              fileReplacementCount += conResult.replacements;
              fileExpandedCount += conResult.replacements;
            }
            if (altResult.replacements > 0 && altResult.edit) {
              if (didMirror && altResult.needsMirror) {
                altResult.edit.replacement = altResult.edit.replacement.slice(0, -1) + ' meridian-rtl-mirror' + altResult.edit.replacement.slice(-1);
              }
              edits.push(altResult.edit);
              fileReplacementCount += altResult.replacements;
              fileExpandedCount += altResult.replacements;
            }
            return;
          }

          // At least one branch is not a plain string — skip with warning.
          const line = node.loc?.start?.line || 1;
          const relativePath = path.relative(projectRoot, filePath);
          console.log(
            chalk.yellow(
              `⚠ Skipped dynamic className in ${relativePath}:${line} — conditional branch is not a static string.`
            )
          );
          report.skipped++;
          return;
        }

        // ── Pattern D — LogicalExpression with StringLiteral right side ────
        if (
          expression.type === 'LogicalExpression' &&
          (expression.operator === '&&' || expression.operator === '||')
        ) {
          if (expression.right.type === 'StringLiteral') {
            const result = rewriteStringLiteralNode(expression.right, original, config);

            if (result.replacements > 0 && result.edit) {
              if (result.needsMirror) {
                if (isSafeToAutoMirror(jsxElement)) {
                  result.edit.replacement = result.edit.replacement.slice(0, -1) + ' meridian-rtl-mirror' + result.edit.replacement.slice(-1);
                  report.autoMirroredCount++;
                } else {
                  const line = jsxElement.loc?.start?.line || 1;
                  const relativePath = path.relative(projectRoot, filePath);
                  report.unsafeMirrorWarnings.push(`${relativePath}:${line}`);
                }
              }

              edits.push(result.edit);
              fileReplacementCount += result.replacements;
              fileExpandedCount += result.replacements;
            }
            return;
          }
          // Right side is not a string literal — fall through to dynamic check.
        }

        // ── Genuinely dynamic: emit warning ───────────────────────────────
        if (isGenuinelyDynamic(expression)) {
          const line = node.loc?.start?.line || 1;
          const relativePath = path.relative(projectRoot, filePath);
          console.log(
            chalk.yellow(
              `⚠ Skipped dynamic className in ${relativePath}:${line} — review manually.`
            )
          );
          report.skipped++;
        }
      }
    });

    if (edits.length === 0) {
      continue;
    }

    const updatedSource = applyEdits(original, edits);
    atomicWriteFile(filePath, updatedSource);

    try {
      parseJsxSource(fs.readFileSync(filePath, 'utf8'), filePath);
    } catch (error) {
      atomicWriteFile(filePath, original);
      const relativePath = path.relative(projectRoot, filePath);
      console.log(
        chalk.red(
          `✗ Class rewrite produced invalid JSX in ${relativePath}. Original restored. Please report this bug.`
        )
      );
      report.failed++;
      continue;
    }

    report.classesReplaced += fileReplacementCount;
    report.staticExpanded += fileExpandedCount;
    report.filesModified++;
  }

  return report;
}
