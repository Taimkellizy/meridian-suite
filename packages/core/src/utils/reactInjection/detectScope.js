import _traverse from '@babel/traverse';
import * as t from '@babel/types';

const traverse = _traverse.default || _traverse;

export const analyzeProviderScope = (ast) => {
    let hasContextImport = false;
    let hasReactImport = false;
    let hasHook = false;
    let hasProviderWrapper = false;
    let exportDefaultNodePath = null;
    let exportName = "App";
    let componentFunctionPath = null;
    let potentialComponents = {};
    let importedNames = new Set();
    let collisionDetected = false;
    let textDeclarationToRemovePath = null;

    traverse(ast, {
        ImportDeclaration(path) {
            const source = path.node.source.value;
            if (source.includes("LanguageContext")) hasContextImport = true;
            if (source === 'react') {
                if (path.node.specifiers.some(s => s.local.name === 'useContext')) hasReactImport = true;
            }
            if (path.node.specifiers) {
                path.node.specifiers.forEach(s => {
                    if (s.local && s.local.name) importedNames.add(s.local.name);
                });
            }
        },
        ExportDefaultDeclaration(path) {
            exportDefaultNodePath = path;
            if (t.isIdentifier(path.node.declaration)) {
                exportName = path.node.declaration.name;
            } else if (t.isFunctionDeclaration(path.node.declaration) || t.isClassDeclaration(path.node.declaration)) {
                if (path.node.declaration.id) exportName = path.node.declaration.id.name;
                componentFunctionPath = path.get('declaration');
            }
        },
        FunctionDeclaration(path) {
            if (path.node.id) potentialComponents[path.node.id.name] = path;
        },
        VariableDeclarator(path) {
            if (t.isIdentifier(path.node.id) && (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init))) {
                potentialComponents[path.node.id.name] = path.get('init');
            }
        },
        JSXOpeningElement(path) {
            if (t.isJSXIdentifier(path.node.name) && (path.node.name.name === "LanguageProvider" || path.node.name.name === "I18nextProvider")) {
                hasProviderWrapper = true;
            }
        },
        CallExpression(path) {
            if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'useContext') {
                if (path.node.arguments.length > 0 && t.isIdentifier(path.node.arguments[0]) && path.node.arguments[0].name === 'LanguageContext') {
                    hasHook = true;
                }
            }
        }
    });

    if (!componentFunctionPath && exportDefaultNodePath && t.isIdentifier(exportDefaultNodePath.node.declaration)) {
        componentFunctionPath = potentialComponents[exportName];
    }
    if (!componentFunctionPath && potentialComponents['App']) {
        componentFunctionPath = potentialComponents['App'];
    }

    if (componentFunctionPath) {
        componentFunctionPath.traverse({
            Identifier(p) {
                if (p.node.name === 'text' && (p.parentPath.isFunction() || p.parentPath.isObjectProperty() && p.parentPath.parentPath.isObjectPattern() && p.parentPath.parentPath.parentPath.isFunction())) {
                    collisionDetected = true;
                }
            },
            VariableDeclarator(p) {
                if (t.isIdentifier(p.node.id) && p.node.id.name === 'text') {
                    if (t.isMemberExpression(p.node.init) && t.isIdentifier(p.node.init.object) && p.node.init.object.name === 'content') {
                        textDeclarationToRemovePath = p.parentPath; // variable declaration parent
                    } else {
                        collisionDetected = true;
                    }
                }
            }
        });
    }

    if (importedNames.has('text')) collisionDetected = true;

    return {
        hasContextImport, hasReactImport, hasHook, hasProviderWrapper,
        exportDefaultNodePath, exportName, componentFunctionPath, 
        collisionDetected, textDeclarationToRemovePath
    };
};
