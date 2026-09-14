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

function findDocumentNodes(ast) {
  let htmlOpeningElement = null;
  let documentClass = null;
  let getInitialPropsMethod = null;

  traverse(ast, {
    JSXOpeningElement(path) {
      const name = path.node.name?.name;
      if (name === 'Html' && !htmlOpeningElement) {
        htmlOpeningElement = path.node;
      }
    },
    ClassDeclaration(path) {
      if (path.node.superClass && path.node.superClass.name === 'Document') {
        documentClass = path.node;
      }
    },
    ClassMethod(path) {
      if (path.node.key.name === 'getInitialProps' && path.node.static) {
        getInitialPropsMethod = path.node;
      }
    }
  });

  return { htmlOpeningElement, documentClass, getInitialPropsMethod };
}

function getInitialPropsEdits(ast, documentClass, getInitialPropsMethod) {
  const edits = [];
  if (documentClass && !getInitialPropsMethod) {
    const insertPos = documentClass.body.start + 1;
    const gipCode = `\n  static async getInitialProps(ctx) {\n    const initialProps = await Document.getInitialProps(ctx);\n    return { ...initialProps, locale: ctx.locale || defaultLocale };\n  }\n`;
    edits.push({ start: insertPos, end: insertPos, replacement: gipCode });
  } else if (getInitialPropsMethod) {
    let returnStmt = null;
    traverse(ast, {
      ReturnStatement(path) {
        if (path.findParent(p => p.node === getInitialPropsMethod)) {
           returnStmt = path.node;
        }
      }
    });

    if (returnStmt && returnStmt.argument && returnStmt.argument.type === 'ObjectExpression') {
        const ctxParamName = getInitialPropsMethod.params[0] ? getInitialPropsMethod.params[0].name : 'ctx';
        const hasLocale = returnStmt.argument.properties.some(p => p.key && p.key.name === 'locale');
        if (!hasLocale) {
            const insertPos = returnStmt.argument.start + 1;
            edits.push({ start: insertPos, end: insertPos, replacement: ` locale: ${ctxParamName}.locale || defaultLocale, ` });
        }
    }
  }
  return edits;
}

function getHtmlAttributesEdits(htmlOpeningElement) {
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
    replacement: ` lang={this.props.locale} dir={dirFromLocale(this.props.locale)}`
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
      replacement: `\nimport { locales, dirFromLocale, defaultLocale } from '${relPath}';\n`
    });
  }
  return edits;
}

/**
 * Modifies the Next.js _document.tsx file to support dynamic HTML lang and dir attributes.
 * Throws an Error if the file lacks an <Html> tag or cannot be modified.
 */
export function nextDocumentFixer(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const ast = parseSource(source);

  const { htmlOpeningElement, documentClass, getInitialPropsMethod } = findDocumentNodes(ast);

  if (!htmlOpeningElement) {
    throw new Error('No <Html> tag found in _document file. Meridian cannot inject lang/dir attributes safely.');
  }

  const edits = [
    ...getInitialPropsEdits(ast, documentClass, getInitialPropsMethod),
    ...getHtmlAttributesEdits(htmlOpeningElement),
    ...getImportsEdits(ast, filePath)
  ];

  if (edits.length > 0) {
    const updated = applyEdits(source, edits);
    atomicWriteFile(filePath, updated);
    return true;
  }
  return false;
}
