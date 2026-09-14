import recast from 'recast';
import babelParser from '@babel/parser';

const b = recast.types.builders;
const n = recast.types.namedTypes;

/**
 * Parses the raw Next.js configuration code into a Recast AST.
 */
function parseNextConfig(sourceCode) {
  return recast.parse(sourceCode, {
    parser: {
      parse(source) {
        return babelParser.parse(source, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
      }
    }
  });
}

/**
 * Safely resolves a variable name to its ObjectExpression initialization.
 */
function resolveVariableToObject(astRoot, varName) {
  let resolved = null;
  let reason = '';
  
  recast.visit(astRoot, {
    visitVariableDeclarator(path) {
      this.traverse(path);
      const node = path.node;
      if (n.Identifier.check(node.id) && node.id.name === varName) {
        if (n.ObjectExpression.check(node.init)) {
          resolved = node.init;
        } else {
          reason = `Variable '${varName}' is assigned to a complex expression, not a plain object.`;
        }
      }
    }
  });
  
  return { resolved, reason };
}

/**
 * Locates the configuration object export in the AST.
 */
function findConfigExportNode(ast) {
  let configObject = null;
  let reason = '';

  recast.visit(ast, {
    visitAssignmentExpression(path) {
      this.traverse(path);
      const node = path.node;
      
      // Look for module.exports = ...
      if (
        n.MemberExpression.check(node.left) &&
        n.Identifier.check(node.left.object) &&
        node.left.object.name === 'module' &&
        n.Identifier.check(node.left.property) &&
        node.left.property.name === 'exports'
      ) {
        if (n.ObjectExpression.check(node.right)) {
          configObject = node.right;
        } else if (n.Identifier.check(node.right)) {
          const res = resolveVariableToObject(ast, node.right.name);
          configObject = res.resolved;
          reason = res.reason;
        } else if (n.CallExpression.check(node.right)) {
          // If wrapped in a call expression like withBundleAnalyzer({ ... })
          // The first argument is typically the config object
          const arg = node.right.arguments[0];
          if (n.ObjectExpression.check(arg)) {
            configObject = arg;
          } else if (n.Identifier.check(arg)) {
            const res = resolveVariableToObject(ast, arg.name);
            configObject = res.resolved;
            reason = res.reason;
          } else {
            reason = 'module.exports is assigned to a CallExpression with a complex argument.';
          }
        } else {
          reason = 'module.exports is assigned to a complex expression (wrapped or conditional).';
        }
      }
    },
    visitExportDefaultDeclaration(path) {
      this.traverse(path);
      const node = path.node;
      
      if (n.ObjectExpression.check(node.declaration)) {
        configObject = node.declaration;
      } else if (n.Identifier.check(node.declaration)) {
        const res = resolveVariableToObject(ast, node.declaration.name);
        configObject = res.resolved;
        reason = res.reason;
      } else if (n.CallExpression.check(node.declaration)) {
        // If wrapped in export default withBundleAnalyzer({ ... })
        const arg = node.declaration.arguments[0];
        if (n.ObjectExpression.check(arg)) {
          configObject = arg;
        } else if (n.Identifier.check(arg)) {
          const res = resolveVariableToObject(ast, arg.name);
          configObject = res.resolved;
          reason = res.reason;
        } else {
          reason = 'export default is a CallExpression with a complex argument.';
        }
      } else {
        reason = 'export default is assigned to a complex expression (wrapped or conditional).';
      }
    }
  });

  return { configObject, reason };
}

/**
 * Finds a property node within an ObjectExpression by name.
 */
function findProperty(objNode, propName) {
  return objNode.properties.find(p => 
    (p.type === 'ObjectProperty' || p.type === 'Property') && 
    ((n.Identifier.check(p.key) && p.key.name === propName) || 
     (n.StringLiteral.check(p.key) && p.key.value === propName) ||
     (n.Literal.check(p.key) && p.key.value === propName))
  );
}

/**
 * Injects or updates the `i18n.locales` array.
 */
function injectLocales(i18nObj, locales) {
  let modified = false;
  const localesProp = findProperty(i18nObj, 'locales');

  if (localesProp) {
    if (n.ArrayExpression.check(localesProp.value)) {
      const existingLocales = localesProp.value.elements
        .filter(e => n.Literal.check(e) || n.StringLiteral.check(e))
        .map(e => e.value);

      for (const loc of locales) {
        if (!existingLocales.includes(loc)) {
          localesProp.value.elements.push(b.stringLiteral(loc));
          modified = true;
        }
      }
    } else {
      throw new Error('Existing i18n.locales is not an array.');
    }
  } else {
    i18nObj.properties.push(
      b.objectProperty(b.identifier('locales'), b.arrayExpression(locales.map(l => b.stringLiteral(l))))
    );
    modified = true;
  }
  return modified;
}

/**
 * Injects or updates the `i18n.defaultLocale` string.
 */
function injectDefaultLocale(i18nObj, defaultLocale) {
  let modified = false;
  const defaultLocaleProp = findProperty(i18nObj, 'defaultLocale');

  if (defaultLocaleProp) {
    if (n.Literal.check(defaultLocaleProp.value) || n.StringLiteral.check(defaultLocaleProp.value)) {
      if (defaultLocaleProp.value.value !== defaultLocale) {
        defaultLocaleProp.value = b.stringLiteral(defaultLocale);
        modified = true;
      }
    } else {
      throw new Error('Existing i18n.defaultLocale is not a string.');
    }
  } else {
    i18nObj.properties.push(
      b.objectProperty(b.identifier('defaultLocale'), b.stringLiteral(defaultLocale))
    );
    modified = true;
  }
  return modified;
}

/**
 * Injects the i18n configuration directly into the AST config object.
 */
function injectI18nProperty(configObject, { locales, defaultLocale }) {
  let modified = false;
  
  let i18nProperty = findProperty(configObject, 'i18n');

  if (i18nProperty) {
    if (!n.ObjectExpression.check(i18nProperty.value)) {
      throw new Error('Existing i18n property is not a plain object.');
    }

    const i18nObj = i18nProperty.value;
    const localesModified = injectLocales(i18nObj, locales);
    const defaultLocaleModified = injectDefaultLocale(i18nObj, defaultLocale);
    
    modified = localesModified || defaultLocaleModified;
  } else {
    // i18n property does not exist, build and inject it cleanly
    const newI18n = b.objectProperty(
      b.identifier('i18n'),
      b.objectExpression([
        b.objectProperty(b.identifier('locales'), b.arrayExpression(locales.map(l => b.stringLiteral(l)))),
        b.objectProperty(b.identifier('defaultLocale'), b.stringLiteral(defaultLocale))
      ])
    );
    configObject.properties.push(newI18n);
    modified = true;
  }

  return modified;
}

/**
 * Parses and injects the i18n routing configuration into a next.config.js AST using Recast.
 * Ensures the original file formatting is strictly preserved.
 *
 * @param {string} sourceCode - The raw contents of next.config.js
 * @param {Object} config - Configuration object containing { locales: string[], defaultLocale: string }
 * @returns {Object} - { success: boolean, modified: boolean, reason?: string, code?: string }
 */
export function nextConfigFixer(sourceCode, { locales, defaultLocale }) {
  try {
    const ast = parseNextConfig(sourceCode);
    const { configObject, reason } = findConfigExportNode(ast);

    if (!configObject) {
      return { 
        success: false, 
        modified: false, 
        reason: reason || 'Could not find a standard Next.js configuration object export.' 
      };
    }

    const modified = injectI18nProperty(configObject, { locales, defaultLocale });

    if (modified) {
      const generatedCode = recast.print(ast).code;
      return { success: true, modified: true, code: generatedCode };
    }

    return { success: true, modified: false, code: sourceCode };
  } catch (err) {
    return { success: false, modified: false, reason: `Fixer encountered an error: ${err.message}` };
  }
}
