import fs from 'fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { applyEdits } from './i18n/applyEdits.js';
import { atomicWriteFile, computeRelativeImport } from './fileUtils.js';

const traverse = _traverse.default || _traverse;

function parseSource(source) {
  const plugins = ['typescript', 'decorators-legacy', 'classProperties', 'jsx'];
  return parse(source, { sourceType: 'module', plugins });
}

function findLayoutNodes(ast) {
  let htmlOpeningElement = null;
  let componentParams = null;
  let componentNode = null;

  traverse(ast, {
    JSXOpeningElement(path) {
      const name = path.node.name?.name;
      if (name === 'html' && !htmlOpeningElement) {
        htmlOpeningElement = path.node;
      }
    },
    ExportDefaultDeclaration(path) {
      const declaration = path.node.declaration;
      if (declaration.type === 'FunctionDeclaration' || declaration.type === 'ArrowFunctionExpression') {
        componentNode = declaration;
        componentParams = declaration.params;
      }
    }
  });

  return { htmlOpeningElement, componentParams, componentNode };
}

function getParamsInjectionEdits(componentNode, componentParams) {
  const edits = [];
  if (componentNode && componentParams) {
    if (componentParams.length === 1 && componentParams[0].type === 'ObjectPattern') {
      const hasParams = componentParams[0].properties.some(p => p.key && p.key.name === 'params');
      if (!hasParams) {
        const start = componentParams[0].start + 1; // inside '{'
        edits.push({ start, end: start, replacement: ` params,` });
      }
    } else if (componentParams.length === 0) {
      throw new Error(
        'The default exported layout component has no parameters. ' +
        'Please manually update it to accept `({ children, params })` so Meridian can inject dynamic routing attributes.'
      );
    }
  }
  return edits;
}

function getHtmlAttributesEdits(htmlOpeningElement, segmentName) {
  const edits = [];
  for (const attr of htmlOpeningElement.attributes) {
    if (attr.name && (attr.name.name === 'lang' || attr.name.name === 'dir')) {
      edits.push({ start: attr.start, end: attr.end, replacement: '' });
    }
  }
  const insertAfterName = htmlOpeningElement.name.end;
  edits.push({
    start: insertAfterName,
    end: insertAfterName,
    replacement: ` lang={params.${segmentName}} dir={dirFromLocale(params.${segmentName})}`
  });
  return edits;
}

function getImportsEdits(ast, filePath) {
  const edits = [];
  let hasImport = false;
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value.includes('locales')) {
        hasImport = true;
      }
    }
  });

  if (!hasImport) {
    let lastImportEnd = 0;
    for (const node of ast.program.body) {
      if (node.type === 'ImportDeclaration') lastImportEnd = node.end;
      else break;
    }
    const relPath = computeRelativeImport(filePath, 'i18n/locales');
    edits.push({
      start: lastImportEnd,
      end: lastImportEnd,
      replacement: `\nimport { dirFromLocale } from '${relPath}';\n`
    });
  }
  return edits;
}

/**
 * Modifies the Next.js App Router layout.tsx file to support dynamic HTML lang and dir attributes.
 */
export function nextLayoutFixer(filePath) {
  const normalisedPath = filePath.replace(/\\/g, '/');
  const match = normalisedPath.match(/\/app\/.*?\[([^\]]+)\].*?\/layout\.tsx?$/);
  
  if (!match) {
    throw new Error('No locale segment found in App Router project. Ensure you have adopted segment-based routing (e.g., app/[lang]/layout.tsx).');
  }

  const segmentName = match[1];
  
  const source = fs.readFileSync(filePath, 'utf8');
  const ast = parseSource(source);

  const { htmlOpeningElement, componentParams, componentNode } = findLayoutNodes(ast);

  if (!htmlOpeningElement) {
    throw new Error('No <html> tag found in layout file. Meridian cannot inject lang/dir attributes safely.');
  }

  const edits = [
    ...getParamsInjectionEdits(componentNode, componentParams),
    ...getHtmlAttributesEdits(htmlOpeningElement, segmentName),
    ...getImportsEdits(ast, filePath)
  ];

  if (edits.length > 0) {
    const updated = applyEdits(source, edits);
    atomicWriteFile(filePath, updated);
    return true;
  }
  return false;
}
