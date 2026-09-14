import fs from 'fs';
import path from 'path';
import recast from 'recast';
import { parse } from '@babel/parser';

const b = recast.types.builders;
const n = recast.types.namedTypes;

export function parseNextConfig(sourceCode) {
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
 * Checks if the project uses ES modules in package.json.
 */
export function checkIsESM(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return pkg.type === 'module';
    } catch (e) {}
  }
  return false;
}

/**
 * Reads supported languages and default locale from src/i18n/locales.ts (or locales.js).
 */
export function readLocalesFromTs(projectRoot) {
  const tsPath = path.join(projectRoot, 'src', 'i18n', 'locales.ts');
  const jsPath = path.join(projectRoot, 'src', 'i18n', 'locales.js');
  const localesPath = fs.existsSync(tsPath) ? tsPath : (fs.existsSync(jsPath) ? jsPath : null);

  if (!localesPath) {
    throw new Error('src/i18n/locales.ts or locales.js not found.');
  }

  const content = fs.readFileSync(localesPath, 'utf8');
  const ast = parseNextConfig(content);

  let defaultLocale = 'en';
  const locales = [];

  recast.visit(ast, {
    visitVariableDeclarator(pathNode) {
      const id = pathNode.node.id.name;
      if (id === 'defaultLocale') {
        if (n.Literal.check(pathNode.node.init) || n.StringLiteral.check(pathNode.node.init)) {
          defaultLocale = pathNode.node.init.value;
        }
      } else if (id === 'locales') {
        let arrayExpr = pathNode.node.init;
        if (arrayExpr && arrayExpr.type === 'TSAsExpression') {
          arrayExpr = arrayExpr.expression;
        }
        if (arrayExpr && arrayExpr.type === 'ArrayExpression') {
          for (const elem of arrayExpr.elements) {
            if (elem.type === 'ObjectExpression') {
              const codeProp = elem.properties.find(p => p.key?.name === 'code' || p.key?.value === 'code');
              if (codeProp && (n.Literal.check(codeProp.value) || n.StringLiteral.check(codeProp.value))) {
                locales.push(codeProp.value.value);
              }
            }
          }
        }
      }
      this.traverse(pathNode);
    }
  });

  return { locales, defaultLocale };
}

/**
 * Finds the Pages Router custom App file (_app.tsx, _app.jsx, _app.js).
 */
export function findPagesAppFile(projectRoot) {
  const candidates = [
    path.join(projectRoot, 'pages', '_app.tsx'),
    path.join(projectRoot, 'pages', '_app.jsx'),
    path.join(projectRoot, 'pages', '_app.js'),
    path.join(projectRoot, 'src', 'pages', '_app.tsx'),
    path.join(projectRoot, 'src', 'pages', '_app.jsx'),
    path.join(projectRoot, 'src', 'pages', '_app.js')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Wraps the default exported React component in pages/_app with appWithTranslation.
 */
export function wrapAppWithTranslation(sourceCode) {
  const ast = parseNextConfig(sourceCode);
  let alreadyHasImport = false;
  let alreadyHasWrap = false;

  recast.visit(ast, {
    visitImportDeclaration(pathNode) {
      if (pathNode.node.source.value === 'next-i18next') {
        const spec = pathNode.node.specifiers.find(s => s.type === 'ImportSpecifier' && s.imported.name === 'appWithTranslation');
        if (spec) {
          alreadyHasImport = true;
        }
      }
      this.traverse(pathNode);
    },
    visitCallExpression(pathNode) {
      if (pathNode.node.callee.name === 'appWithTranslation') {
        alreadyHasWrap = true;
      }
      this.traverse(pathNode);
    }
  });

  if (alreadyHasWrap) {
    return sourceCode;
  }

  let defaultExportFound = false;
  recast.visit(ast, {
    visitExportDefaultDeclaration(pathNode) {
      defaultExportFound = true;
      const decl = pathNode.node.declaration;
      if (decl.type === 'Identifier') {
        pathNode.node.declaration = b.callExpression(b.identifier('appWithTranslation'), [decl]);
      } else if (decl.type === 'FunctionDeclaration') {
        const name = decl.id ? decl.id.name : '_app_component';
        const funcDecl = b.functionDeclaration(
          b.identifier(name),
          decl.params,
          decl.body,
          decl.generator,
          decl.expression
        );
        pathNode.replace(
          funcDecl,
          b.exportDefaultDeclaration(
            b.callExpression(b.identifier('appWithTranslation'), [b.identifier(name)])
          )
        );
      } else if (decl.type === 'CallExpression') {
        pathNode.node.declaration = b.callExpression(b.identifier('appWithTranslation'), [decl]);
      }
      return false; // stop default export traversal
    }
  });

  if (!defaultExportFound) {
    throw new Error('No default export found in pages/_app file.');
  }

  if (!alreadyHasImport) {
    const importNode = b.importDeclaration([
      b.importSpecifier(b.identifier('appWithTranslation'))
    ], b.stringLiteral('next-i18next'));
    ast.program.body.unshift(importNode);
  }

  return recast.print(ast).code;
}

function walkFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.git', 'build', 'dist', '.next'].includes(file)) {
        walkFiles(fullPath, fileList);
      }
    } else {
      if (['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(fullPath))) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

/**
 * Finds all page files in the pages/ directory.
 */
export function findPageFiles(projectRoot) {
  const pagesDirs = [path.join(projectRoot, 'pages'), path.join(projectRoot, 'src', 'pages')];
  const filesList = [];
  for (const dir of pagesDirs) {
    if (fs.existsSync(dir)) {
      const files = walkFiles(dir);
      for (const file of files) {
        const rel = path.relative(dir, file).replace(/\\/g, '/');
        if (
          !rel.startsWith('api/') &&
          !['_app.tsx', '_app.jsx', '_app.js', '_app.ts',
            '_document.tsx', '_document.jsx', '_document.js', '_document.ts',
            '404.tsx', '404.jsx', '404.js', '404.ts',
            '500.tsx', '500.jsx', '500.js', '500.ts'].includes(path.basename(file))
        ) {
          filesList.push(file);
        }
      }
    }
  }
  return filesList;
}

function findProperty(objNode, propName) {
  return objNode.properties.find(p => 
    (p.type === 'ObjectProperty' || p.type === 'Property') && 
    ((n.Identifier.check(p.key) && p.key.name === propName) || 
     (n.StringLiteral.check(p.key) && p.key.value === propName) ||
     (n.Literal.check(p.key) && p.key.value === propName))
  );
}

const buildLocaleNode = (name) => {
  if (name.includes('.')) {
    const parts = name.split('.');
    return b.memberExpression(b.identifier(parts[0]), b.identifier(parts[1]));
  }
  return b.identifier(name);
};

function modifyPropsFunction(funcDecl) {
  funcDecl.async = true;

  let localeVarName = 'locale';
  if (funcDecl.params.length === 0) {
    funcDecl.params.push(
      b.objectPattern([
        b.objectProperty(b.identifier('locale'), b.identifier('locale'))
      ])
    );
  } else {
    const firstParam = funcDecl.params[0];
    if (firstParam.type === 'Identifier') {
      localeVarName = `${firstParam.name}.locale`;
    } else if (firstParam.type === 'ObjectPattern') {
      const hasLocale = firstParam.properties.some(p => p.key && p.key.name === 'locale');
      if (!hasLocale) {
        firstParam.properties.push(
          b.objectProperty(b.identifier('locale'), b.identifier('locale'))
        );
      }
    }
  }

  let returnStmt = null;
  recast.visit(funcDecl.body, {
    visitReturnStatement(pathNode) {
      returnStmt = pathNode.node;
      return false;
    }
  });

  const spreadNode = b.spreadElement(
    b.awaitExpression(
      b.callExpression(
        b.identifier('serverSideTranslations'),
        [
          b.logicalExpression('??', buildLocaleNode(localeVarName), b.stringLiteral('en')),
          b.arrayExpression([b.stringLiteral('common')])
        ]
      )
    )
  );

  if (returnStmt && returnStmt.argument && returnStmt.argument.type === 'ObjectExpression') {
    let propsProp = findProperty(returnStmt.argument, 'props');
    if (propsProp) {
      if (propsProp.value.type === 'ObjectExpression') {
        propsProp.value.properties.push(spreadNode);
      }
    } else {
      returnStmt.argument.properties.push(
        b.objectProperty(b.identifier('props'), b.objectExpression([spreadNode]))
      );
    }
  } else {
    const newReturn = b.returnStatement(
      b.objectExpression([
        b.objectProperty(b.identifier('props'), b.objectExpression([spreadNode]))
      ])
    );
    if (returnStmt) {
      // replace
      recast.visit(funcDecl.body, {
        visitReturnStatement(pathNode) {
          pathNode.replace(newReturn);
          return false;
        }
      });
    } else {
      funcDecl.body.body.push(newReturn);
    }
  }
}

function modifyPropsVar(initDecl) {
  let funcNode = initDecl.init;
  if (funcNode.type === 'ArrowFunctionExpression' || funcNode.type === 'FunctionExpression') {
    funcNode.async = true;
    
    let localeVarName = 'locale';
    if (funcNode.params.length === 0) {
      funcNode.params.push(
        b.objectPattern([
          b.objectProperty(b.identifier('locale'), b.identifier('locale'))
        ])
      );
    } else {
      const firstParam = funcNode.params[0];
      if (firstParam.type === 'Identifier') {
        localeVarName = `${firstParam.name}.locale`;
      } else if (firstParam.type === 'ObjectPattern') {
        const hasLocale = firstParam.properties.some(p => p.key && p.key.name === 'locale');
        if (!hasLocale) {
          firstParam.properties.push(
            b.objectProperty(b.identifier('locale'), b.identifier('locale'))
          );
        }
      }
    }

    const spreadNode = b.spreadElement(
      b.awaitExpression(
        b.callExpression(
          b.identifier('serverSideTranslations'),
          [
            b.logicalExpression('??', buildLocaleNode(localeVarName), b.stringLiteral('en')),
            b.arrayExpression([b.stringLiteral('common')])
          ]
        )
      )
    );

    if (funcNode.body.type === 'BlockStatement') {
      let returnStmt = null;
      recast.visit(funcNode.body, {
        visitReturnStatement(pathNode) {
          returnStmt = pathNode.node;
          return false;
        }
      });

      if (returnStmt && returnStmt.argument && returnStmt.argument.type === 'ObjectExpression') {
        let propsProp = findProperty(returnStmt.argument, 'props');
        if (propsProp) {
          if (propsProp.value.type === 'ObjectExpression') {
            propsProp.value.properties.push(spreadNode);
          }
        } else {
          returnStmt.argument.properties.push(
            b.objectProperty(b.identifier('props'), b.objectExpression([spreadNode]))
          );
        }
      } else {
        const newReturn = b.returnStatement(
          b.objectExpression([
            b.objectProperty(b.identifier('props'), b.objectExpression([spreadNode]))
          ])
        );
        if (returnStmt) {
          recast.visit(funcNode.body, {
            visitReturnStatement(pathNode) {
              pathNode.replace(newReturn);
              return false;
            }
          });
        } else {
          funcNode.body.body.push(newReturn);
        }
      }
    } else if (funcNode.body.type === 'ObjectExpression') {
      let propsProp = findProperty(funcNode.body, 'props');
      if (propsProp) {
        if (propsProp.value.type === 'ObjectExpression') {
          propsProp.value.properties.push(spreadNode);
        }
      } else {
        funcNode.body.properties.push(
          b.objectProperty(b.identifier('props'), b.objectExpression([spreadNode]))
        );
      }
    }
  }
}

/**
 * Injects serverSideTranslations call into getStaticProps/getServerSideProps in the page AST.
 */
export function injectServerSideTranslationsToPage(sourceCode) {
  const ast = parseNextConfig(sourceCode);
  let alreadyHasImport = false;
  let alreadyHasCall = false;

  recast.visit(ast, {
    visitImportDeclaration(pathNode) {
      if (pathNode.node.source.value.includes('next-i18next/serverSideTranslations')) {
        const spec = pathNode.node.specifiers.find(s => s.type === 'ImportSpecifier' && s.imported.name === 'serverSideTranslations');
        if (spec) {
          alreadyHasImport = true;
        }
      }
      this.traverse(pathNode);
    },
    visitCallExpression(pathNode) {
      if (pathNode.node.callee.name === 'serverSideTranslations') {
        alreadyHasCall = true;
      }
      this.traverse(pathNode);
    }
  });

  if (alreadyHasCall) {
    return { code: sourceCode, touched: false };
  }

  let foundPropsFunction = false;

  recast.visit(ast, {
    visitExportNamedDeclaration(pathNode) {
      const decl = pathNode.node.declaration;
      if (decl) {
        if (decl.type === 'FunctionDeclaration' && (decl.id.name === 'getStaticProps' || decl.id.name === 'getServerSideProps')) {
          foundPropsFunction = true;
          modifyPropsFunction(decl);
        } else if (decl.type === 'VariableDeclaration') {
          for (const initDecl of decl.declarations) {
            if (initDecl.id.name === 'getStaticProps' || initDecl.id.name === 'getServerSideProps') {
              foundPropsFunction = true;
              modifyPropsVar(initDecl);
            }
          }
        }
      }
      this.traverse(pathNode);
    }
  });

  if (!foundPropsFunction) {
    const fnDecl = b.functionDeclaration(
      b.identifier('getStaticProps'),
      [
        b.objectPattern([
          b.objectProperty(b.identifier('locale'), b.identifier('locale'))
        ])
      ],
      b.blockStatement([
        b.returnStatement(
          b.objectExpression([
            b.objectProperty(
              b.identifier('props'),
              b.objectExpression([
                b.spreadElement(
                  b.awaitExpression(
                    b.callExpression(
                      b.identifier('serverSideTranslations'),
                      [
                        b.logicalExpression('??', b.identifier('locale'), b.stringLiteral('en')),
                        b.arrayExpression([b.stringLiteral('common')])
                      ]
                    )
                  )
                )
              ])
            )
          ])
        )
      ])
    );
    fnDecl.async = true;
    const newFunc = b.exportNamedDeclaration(fnDecl);
    ast.program.body.push(newFunc);
  }

  if (!alreadyHasImport) {
    const importNode = b.importDeclaration([
      b.importSpecifier(b.identifier('serverSideTranslations'))
    ], b.stringLiteral('next-i18next/serverSideTranslations'));
    ast.program.body.unshift(importNode);
  }

  return { code: recast.print(ast).code, touched: true };
}

/**
 * Walks directory to find App Router dynamic layout files.
 */
export function findAppLayoutFile(projectRoot) {
  const appDirs = [path.join(projectRoot, 'app'), path.join(projectRoot, 'src', 'app')];
  for (const appDir of appDirs) {
    if (fs.existsSync(appDir)) {
      const files = walkFiles(appDir);
      for (const file of files) {
        const normalised = file.replace(/\\/g, '/');
        const match = normalised.match(/\/app\/.*?\[([^\]]+)\].*?\/layout\.(tsx|jsx)$/);
        if (match) {
          return { filePath: file, segmentName: match[1] };
        }
      }
    }
  }
  return null;
}

/**
 * Injects setRequestLocale(params[segmentName]) call inside App layout body.
 */
export function injectSetRequestLocaleToLayout(sourceCode, segmentName) {
  const ast = parseNextConfig(sourceCode);
  let alreadyHasSetRequestLocale = false;

  recast.visit(ast, {
    visitCallExpression(pathNode) {
      if (pathNode.node.callee.name === 'setRequestLocale') {
        alreadyHasSetRequestLocale = true;
      }
      this.traverse(pathNode);
    }
  });

  if (alreadyHasSetRequestLocale) {
    return sourceCode;
  }

  let layoutFunctionBody = null;
  recast.visit(ast, {
    visitExportDefaultDeclaration(pathNode) {
      const decl = pathNode.node.declaration;
      if (decl.type === 'FunctionDeclaration') {
        layoutFunctionBody = decl.body;
      } else if (decl.type === 'ArrowFunctionExpression') {
        layoutFunctionBody = decl.body;
      } else if (decl.type === 'Identifier') {
        const name = decl.name;
        recast.visit(ast, {
          visitVariableDeclarator(vPath) {
            if (vPath.node.id.name === name && (vPath.node.init.type === 'ArrowFunctionExpression' || vPath.node.init.type === 'FunctionExpression')) {
              layoutFunctionBody = vPath.node.init.body;
            }
            return false;
          }
        });
      }
      return false;
    }
  });

  if (layoutFunctionBody && layoutFunctionBody.type === 'BlockStatement') {
    const callStmt = b.expressionStatement(
      b.callExpression(
        b.identifier('setRequestLocale'),
        [
          b.memberExpression(
            b.identifier('params'),
            b.identifier(segmentName)
          )
        ]
      )
    );
    layoutFunctionBody.body.unshift(callStmt);

    let hasImport = false;
    recast.visit(ast, {
      visitImportDeclaration(pathNode) {
        if (pathNode.node.source.value === 'next-intl/server') {
          const spec = pathNode.node.specifiers.find(s => s.type === 'ImportSpecifier' && s.imported.name === 'setRequestLocale');
          if (spec) {
            hasImport = true;
          }
        }
        this.traverse(pathNode);
      }
    });

    if (!hasImport) {
      const importNode = b.importDeclaration([
        b.importSpecifier(b.identifier('setRequestLocale'))
      ], b.stringLiteral('next-intl/server'));
      ast.program.body.unshift(importNode);
    }
    
    return recast.print(ast).code;
  }

  return sourceCode;
}

/**
 * Ensures skipLibCheck is enabled in tsconfig.json to prevent node_modules compilation errors in older TS versions.
 */
export function ensureSkipLibCheck(projectRoot) {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      const content = fs.readFileSync(tsconfigPath, 'utf8');
      // Simple regex based comment stripping to handle tsconfig.json comments
      const jsonStr = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
      const tsconfig = JSON.parse(jsonStr);
      tsconfig.compilerOptions = tsconfig.compilerOptions || {};

      // Warn about deprecated moduleResolution option without modifying it directly
      if (
        tsconfig.compilerOptions.moduleResolution &&
        String(tsconfig.compilerOptions.moduleResolution).toLowerCase() === 'node' &&
        tsconfig.compilerOptions.ignoreDeprecations === undefined
      ) {
        console.warn(
          `\n⚠️  TSConfig Warning: Option 'moduleResolution: "node"' (node10) is deprecated in newer TypeScript versions.`
        );
        console.warn(
          `   Consider adding '"ignoreDeprecations": "6.0"' to compilerOptions inside tsconfig.json to silence this warning.\n`
        );
      }

      if (tsconfig.compilerOptions.skipLibCheck !== true) {
        tsconfig.compilerOptions.skipLibCheck = true;
        fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf8');
        console.log('✓ Enabled skipLibCheck in tsconfig.json');
      }
    } catch (e) {
      console.warn('- Warning: failed to parse or write to tsconfig.json:', e.message);
    }
  }
}

