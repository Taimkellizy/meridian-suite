import fs from 'fs';
import path from 'path';
import recast from 'recast';
import { parse } from '@babel/parser';
import { nextConfigFixer } from '../../utils/nextConfigFixer.js';

const b = recast.types.builders;
const n = recast.types.namedTypes;

function parseNextConfig(sourceCode) {
  return recast.parse(sourceCode, {
    parser: {
      parse(source) {
        return parse(source, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
          tokens: true
        });
      }
    }
  });
}

/**
 * Merges the i18n property block into next.config.js/ts.
 * @param {string} projectRoot - Root of the project.
 * @param {Object} localesConfig - { locales: string[], defaultLocale: string }
 */
export function mergeI18nBlock(projectRoot, localesConfig) {
  const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  let configPath = null;
  for (const file of configFiles) {
    const p = path.join(projectRoot, file);
    if (fs.existsSync(p)) {
      configPath = p;
      break;
    }
  }

  if (!configPath) {
    // If no config exists, we don't crash, but we can return
    return;
  }

  const sourceCode = fs.readFileSync(configPath, 'utf8');
  const result = nextConfigFixer(sourceCode, {
    locales: localesConfig.locales,
    defaultLocale: localesConfig.defaultLocale
  });

  if (result.success && result.modified) {
    fs.writeFileSync(configPath, result.code, 'utf8');
    console.log(`✓ Merged i18n block into config file: ${path.relative(projectRoot, configPath)}`);
  }
}

/**
 * Wraps the next.config default export with a plugin call using Recast.
 * Checks if the wrapper already exists before injecting.
 * @param {string} projectRoot - Root of the project.
 * @param {string} pluginImport - The plugin import source.
 * @param {string} pluginCall - The wrapper function name.
 */
export function wrapWithPlugin(projectRoot, pluginImport, pluginCall) {
  const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  let configPath = null;
  for (const file of configFiles) {
    const p = path.join(projectRoot, file);
    if (fs.existsSync(p)) {
      configPath = p;
      break;
    }
  }

  if (!configPath) return;

  const sourceCode = fs.readFileSync(configPath, 'utf8');
  const ast = parseNextConfig(sourceCode);
  let isESM = configPath.endsWith('.mjs') || configPath.endsWith('.ts');
  let configExported = false;
  let alreadyWrapped = false;

  // Detect ESM if import/export statements are present
  recast.visit(ast, {
    visitImportDeclaration(pathNode) {
      isESM = true;
      if (pathNode.node.source.value === pluginImport) {
        alreadyWrapped = true;
      }
      return false;
    },
    visitExportDefaultDeclaration(pathNode) {
      isESM = true;
      this.traverse(pathNode);
    },
    visitCallExpression(pathNode) {
      const callee = pathNode.node.callee;
      if (callee.type === 'Identifier' && callee.name === pluginCall) {
        alreadyWrapped = true;
      }
      this.traverse(pathNode);
    }
  });

  // Also check package.json for "type": "module"
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.type === 'module') isESM = true;
    } catch (e) {}
  }

  if (alreadyWrapped) {
    console.log(`- Config already wrapped with ${pluginCall}, skipping.`);
    return;
  }

  // Wrap the exported config
  recast.visit(ast, {
    visitAssignmentExpression(pathNode) {
      const node = pathNode.node;
      if (
        n.MemberExpression.check(node.left) &&
        n.Identifier.check(node.left.object) &&
        node.left.object.name === 'module' &&
        n.Identifier.check(node.left.property) &&
        node.left.property.name === 'exports'
      ) {
        const right = node.right;
        node.right = b.callExpression(b.identifier(pluginCall), [right]);
        configExported = true;
      }
      this.traverse(pathNode);
    },
    visitExportDefaultDeclaration(pathNode) {
      const decl = pathNode.node.declaration;
      pathNode.node.declaration = b.callExpression(b.identifier(pluginCall), [decl]);
      configExported = true;
      return false;
    }
  });

  if (!configExported) {
    throw new Error(`Could not find export declaration in config file ${configPath} to wrap.`);
  }

  // Add the imports/requires at the top
  if (isESM) {
    const importNode = b.importDeclaration([
      b.importDefaultSpecifier(b.identifier('createNextIntlPlugin'))
    ], b.stringLiteral(pluginImport));
    const initNode = b.variableDeclaration('const', [
      b.variableDeclarator(
        b.identifier(pluginCall),
        b.callExpression(b.identifier('createNextIntlPlugin'), [])
      )
    ]);
    ast.program.body.unshift(initNode);
    ast.program.body.unshift(importNode);
  } else {
    const requireNode = b.variableDeclaration('const', [
      b.variableDeclarator(
        b.identifier(pluginCall),
        b.callExpression(
          b.callExpression(b.identifier('require'), [b.stringLiteral(pluginImport)]),
          []
        )
      )
    ]);
    ast.program.body.unshift(requireNode);
  }

  const printed = recast.print(ast).code;
  fs.writeFileSync(configPath, printed, 'utf8');
  console.log(`✓ Config file successfully wrapped with ${pluginCall}: ${path.relative(projectRoot, configPath)}`);
}
