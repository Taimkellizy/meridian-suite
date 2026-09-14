import fs from 'fs';
import recast from 'recast';
import { parse } from '@babel/parser';

const n = recast.types.namedTypes;

/**
 * Parses raw source code into a Recast AST.
 * @param {string} sourceCode - The source code to parse.
 * @returns {import('recast').AST} The parsed AST.
 */
export function parseSource(sourceCode) {
  return recast.parse(sourceCode, {
    parser: {
      parse(source) {
        return parse(source, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
          tokens: true
        });
      }
    }
  });
}

/**
 * Parses the raw source file into a Recast AST.
 * @param {string} filePath - Absolute path to the file.
 * @returns {import('recast').AST} The parsed AST.
 */
export function parseFile(filePath) {
  const sourceCode = fs.readFileSync(filePath, 'utf8');
  return parseSource(sourceCode);
}

/**
 * Prints the Recast AST back to the source file.
 * @param {import('recast').AST} ast - The modified AST.
 * @param {string} filePath - Absolute path to the file.
 */
export function printFile(ast, filePath) {
  const printed = recast.print(ast).code;
  fs.writeFileSync(filePath, printed, 'utf8');
}

/**
 * Checks if a given module is imported in the AST.
 * @param {import('recast').AST} ast - The AST to inspect.
 * @param {string} moduleName - The module name/source value.
 * @returns {boolean} True if the module is imported.
 */
export function hasImport(ast, moduleName) {
  let found = false;
  recast.visit(ast, {
    visitImportDeclaration(path) {
      if (path.node.source.value === moduleName) {
        found = true;
      }
      return false; // stop nested traversal for this import
    }
  });
  return found;
}

/**
 * Checks if a JSX element has a given attribute.
 * @param {import('recast').AST} ast - The AST to inspect.
 * @param {string} elementName - The element name (e.g., 'html').
 * @param {string} attributeName - The attribute name.
 * @returns {boolean} True if the element exists and contains the attribute.
 */
export function hasJSXAttribute(ast, elementName, attributeName) {
  let found = false;
  recast.visit(ast, {
    visitJSXOpeningElement(path) {
      const name = path.node.name?.name;
      if (name === elementName) {
        const hasAttr = path.node.attributes.some(attr => 
          attr.type === 'JSXAttribute' && attr.name?.name === attributeName
        );
        if (hasAttr) {
          found = true;
        }
      }
      this.traverse(path);
    }
  });
  return found;
}
