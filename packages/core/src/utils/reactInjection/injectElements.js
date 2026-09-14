import * as t from '@babel/types';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;

/**
 * Analyzes AST to find the export default wrapper position.
 * @param {import('@babel/parser').ParseResult} ast - The parsed AST
 * @returns {Object} Export default information
 */
function findIdentifierInExpression(node) {
    if (!node) return null;
    if (t.isIdentifier(node)) return node.name;
    if (t.isCallExpression(node)) {
        for (const arg of node.arguments) {
            const res = findIdentifierInExpression(arg);
            if (res) return res;
        }
        return findIdentifierInExpression(node.callee);
    }
    return null;
}

export const analyzeExportDefault = (ast) => {
    let exportDefaultNode = null;
    let exportName = "App";
    let hocWrapper = null;
    
    traverse(ast, {
        ExportDefaultDeclaration(path) {
            exportDefaultNode = path.node;
            const decl = path.node.declaration;
            if (t.isIdentifier(decl)) {
                exportName = decl.name;
            } else if (t.isFunctionDeclaration(decl) || t.isClassDeclaration(decl)) {
                if (decl.id) {
                    exportName = decl.id.name;
                }
            } else if (t.isCallExpression(decl)) {
                if (t.isIdentifier(decl.callee) && decl.arguments.length === 1 && t.isIdentifier(decl.arguments[0])) {
                    hocWrapper = decl.callee.name;
                    exportName = decl.arguments[0].name;
                } else {
                    const found = findIdentifierInExpression(decl);
                    if (found) {
                        exportName = found;
                    }
                }
            }
        }
    });
    
    if (!exportDefaultNode) return null;
    
    return {
        node: exportDefaultNode,
        start: exportDefaultNode.start,
        end: exportDefaultNode.end,
        exportName,
        hocWrapper
    };
};

/**
 * Analyzes AST to find Next.js App Router {children} inside <body>.
 * @param {import('@babel/parser').ParseResult} ast - The parsed AST
 * @returns {Object} Target children container information
 */
export const analyzeAppRouterLayout = (ast) => {
    let targetChildrenPath = null;

    traverse(ast, {
        JSXElement(path) {
            const name = path.node.openingElement.name?.name;
            if (name === 'body') {
                path.traverse({
                    JSXExpressionContainer(innerPath) {
                        if (innerPath.parentPath !== path) return;
                        if (t.isIdentifier(innerPath.node.expression) && innerPath.node.expression.name === 'children') {
                            targetChildrenPath = innerPath;
                            innerPath.stop();
                        }
                    }
                });
                if (targetChildrenPath) path.stop();
            }
        }
    });

    if (targetChildrenPath) {
        return {
            start: targetChildrenPath.node.start,
            end: targetChildrenPath.node.end
        };
    }
    return null;
};

/**
 * Generates the provider wrapper edit using string replacement.
 * @param {string} source - The source code
 * @param {Object} exportInfo - Export default information
 * @param {boolean} isAppRouterLayout - Is this an App Router layout file
 * @param {Object} appRouterInfo - App Router layout information
 * @returns {Object} Edit details
 */
export const generateProviderWrapperEdit = (source, exportInfo, isAppRouterLayout = false, appRouterInfo = null) => {
    if (isAppRouterLayout) {
        if (!appRouterInfo || !appRouterInfo.start || !appRouterInfo.end) return null;
        const wrappedCode = `\n  <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading translations...</div>}>\n    <LanguageProvider>\n      {children}\n    </LanguageProvider>\n  </Suspense>\n`;
        return {
            start: appRouterInfo.start,
            end: appRouterInfo.end,
            replacement: wrappedCode
        };
    }

    if (!exportInfo || !exportInfo.start || !exportInfo.end) return null;
    
    const { exportName, start, end, hocWrapper } = exportInfo;
    let exportStatement = `export default ${exportName}WithLang;`;
    if (hocWrapper) {
        exportStatement = `export default ${hocWrapper}(${exportName}WithLang);`;
    }
    const wrappedCode = `const ${exportName}WithLang = (props) => (
  <LanguageProvider>
    <${exportName} {...props} />
  </LanguageProvider>
);\n${exportStatement}`;
    
    return {
        start,
        end,
        replacement: wrappedCode
    };
};

/**
 * Analyzes AST to find toggle injection target.
 * @param {import('@babel/parser').ParseResult} ast - The parsed AST
 * @param {Object} targetConfig - Target configuration
 * @returns {Object} Target element information
 */
export const analyzeToggleTarget = (ast, targetConfig = { tag: "nav" }) => {
    let exactMatch = null;
    let fallback = null;
    let alreadyInjected = false;
    
    const config = typeof targetConfig === 'string' 
        ? { tag: targetConfig, insertMode: "append" } 
        : { tag: "nav", insertMode: "append", ...targetConfig };
    
    traverse(ast, {
        JSXElement(path) {
            const name = path.node.openingElement.name?.name;
            if (!name) return;
            
            if (name === "LanguageToggle") {
                alreadyInjected = true;
            }
            
            if (!exactMatch) {
                let matched = false;
                if (config.id) {
                    const hasTargetId = path.node.openingElement.attributes.some(attr => {
                        return t.isJSXAttribute(attr) &&
                               attr.name.name === 'id' &&
                               t.isStringLiteral(attr.value) &&
                               attr.value.value === config.id;
                    });
                    if (hasTargetId) matched = true;
                } else if (name === config.tag) {
                    matched = true;
                }
                
                if (matched) exactMatch = path;
            }
            
            if (!exactMatch && (name === "nav" || name === "header" || name === "footer")) {
                if (!fallback) fallback = path;
            }
        }
    });
    
    if (alreadyInjected) return { alreadyInjected: true };
    
    let targetPath = exactMatch || fallback;
    
    if (config.floating) {
        traverse(ast, {
            ReturnStatement(path) {
                if (t.isJSXElement(path.node.argument) || t.isJSXFragment(path.node.argument)) {
                    targetPath = path;
                    path.stop();
                }
            }
        });
    }
    
    if (!targetPath || !targetPath.node) return null;
    
    const targetNode = targetPath.node;
    const children = targetNode.children || [];
    
    let insertIndex = children.length;
    if (config.insertMode === 'prepend') {
        insertIndex = 0;
    }
    
    return {
        targetNode,
        targetStart: targetNode.start,
        targetEnd: targetNode.end,
        children,
        insertIndex,
        insertMode: config.insertMode,
        isList: ['ul', 'ol'].includes(targetNode.openingElement?.name?.name),
        alreadyInjected: false
    };
};

/**
 * Generates toggle insertion edit using string insertion.
 * @param {string} source - The source code
 * @param {Object} targetInfo - Target element information
 * @returns {Object} Edit details
 */
export const generateToggleInsertEdit = (source, targetInfo) => {
    if (!targetInfo || targetInfo.alreadyInjected || !targetInfo.targetStart || !targetInfo.targetEnd) {
        return null;
    }
    
    const { targetStart, targetEnd, children, insertMode, isList } = targetInfo;
    
    const toggleCode = '<LanguageToggle />';
    let insertionCode;
    
    if (isList) {
        insertionCode = `<li>${toggleCode}</li>`;
    } else {
        insertionCode = toggleCode;
    }
    
    if (children.length > 0) {
        let firstNonEmptyChild = null;
        let lastRealChild = null;
        
        for (const child of children) {
            if (!t.isJSXText(child) || child.value.trim() !== '') {
                firstNonEmptyChild = firstNonEmptyChild || child;
                lastRealChild = child;
            }
        }
        
        if (firstNonEmptyChild && lastRealChild) {
            if (insertMode === 'prepend') {
                return {
                    start: firstNonEmptyChild.start,
                    end: firstNonEmptyChild.start,
                    replacement: insertionCode + '\n  '
                };
            } else {
                return {
                    start: lastRealChild.end,
                    end: lastRealChild.end,
                    replacement: '\n  ' + insertionCode + '\n'
                };
            }
        }
    }
    
    return {
        start: targetStart + 1,
        end: targetStart + 1,
        replacement: insertionCode + '\n  '
    };
};

/**
 * Wraps export default with a language provider.
 * @deprecated Kept for backward compatibility - actual wrapping is done via string edits.
 */
export const wrapExportWithProvider = (ast, exportDefaultPath, exportName) => {
    // Kept for backward compatibility - actual wrapping done via string edits
};

/**
 * Injects a language toggle node into the target layout.
 * @deprecated Kept for backward compatibility - actual injection is done via string edits.
 */
export const injectToggleNode = (ast, targetConfig) => {
    // Kept for backward compatibility - actual injection done via string edits
    const targetInfo = analyzeToggleTarget(ast, targetConfig);
    return targetInfo && !targetInfo.alreadyInjected && !!targetInfo.targetNode;
};