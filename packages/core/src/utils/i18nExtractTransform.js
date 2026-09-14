import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import { buildExtractVisitor } from './i18n/extractJSX.js';
import { applyEdits } from './i18n/applyEdits.js';

const traverse = _traverse.default || _traverse;

const findLastImportEnd = (ast) => {
    let lastEnd = -1;
    for (const node of ast.program.body) {
        if (t.isImportDeclaration(node)) {
            lastEnd = node.end;
        }
    }
    return lastEnd;
};

const findHookInsertionPoint = (ast, source) => {
    let targetFunc = null;

    for (const node of ast.program.body) {
        if (t.isExportNamedDeclaration(node) && t.isVariableDeclaration(node.declaration)) {
            const decl = node.declaration;
            if (t.isVariableDeclarator(decl.declarations[0]) && t.isArrowFunctionExpression(decl.declarations[0].init)) {
                targetFunc = node;
                break;
            }
        }
        if (t.isVariableDeclaration(node)) {
            const decl = node.declarations[0];
            if (decl && decl.init && t.isArrowFunctionExpression(decl.init)) {
                const varName = decl.id.name;
                if (varName && varName[0] === varName[0].toUpperCase()) {
                    targetFunc = node;
                    break;
                }
            }
        }
    }

    if (!targetFunc) return null;
    
    const funcNode = targetFunc.declaration
        ? (targetFunc.declaration.declarations?.[0]?.init || targetFunc.declaration.init)
        : targetFunc.declarations?.[0]?.init;
    if (!funcNode) return null;

    if (t.isArrowFunctionExpression(funcNode)) {
        if (t.isBlockStatement(funcNode.body)) {
            return { type: 'block', bodyStart: funcNode.body.start, node: funcNode };
        } else {
            return { type: 'implicit', start: funcNode.start, end: funcNode.end, node: funcNode };
        }
    }
    
    if (t.isFunctionDeclaration(funcNode)) {
        return { type: 'block', bodyStart: funcNode.body.start, node: funcNode };
    }
    
    return null;
};

export const extractAndTransformJSX = (codeString, options = {}) => {
    let ast;
    try {
        const isTS = options.fileName && options.fileName.toLowerCase().endsWith('.ts') && !options.fileName.toLowerCase().endsWith('.tsx');
        const plugins = [
            'typescript', 
            'decorators-legacy',
            'classProperties'
        ];
        if (!isTS) {
            plugins.push('jsx');
        }

        ast = parse(codeString, {
            sourceType: 'module',
            plugins
        });
    } catch (e) {
        console.error("Parse Error in extractAndTransformJSX:", e);
        return { modifiedCode: codeString, extractedStrings: new Map() };
    }

    const extractedStrings = new Map();
    const ctx = {
        fileName: options.fileName,
        needsImport: false,
        needsHook: false,
        injectedNodeSet: new Set(),
        registry: options.registry || null,
        edits: []
    };

    const visitor = buildExtractVisitor(extractedStrings, ctx);
    traverse(ast, visitor);

    // Deduplicate edits by (start, end) key to avoid duplicates from AST traversal
    const seen = new Set();
    const uniqueEdits = [];
    for (const e of ctx.edits) {
        const key = `${e.start}-${e.end}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueEdits.push(e);
        }
    }
    
    if (ctx.needsImport || ctx.needsHook) {
        const lastImportEnd = findLastImportEnd(ast);
        const importLibrary = options.useNextI18next ? 'next-i18next' : 'react-i18next';
        
        if (lastImportEnd >= 0) {
            uniqueEdits.push({
                start: lastImportEnd,
                end: lastImportEnd,
                replacement: `\nimport { useTranslation } from "${importLibrary}";`
            });
        } else {
            uniqueEdits.push({
                start: 0,
                end: 0,
                replacement: `import { useTranslation } from "${importLibrary}";\n`
            });
        }
        
        const hookInfo = findHookInsertionPoint(ast, codeString);
        
        if (hookInfo) {
            if (hookInfo.type === 'block') {
                let indent = '  ';
                const firstStmt = hookInfo.node.body.body[0];
                
                if (firstStmt) {
                    const stmtSource = codeString.slice(firstStmt.start, firstStmt.end);
                    const indentMatch = stmtSource.match(/^(\s*)/);
                    if (indentMatch && indentMatch[1]) {
                        indent = indentMatch[1].replace(/[^\s]/g, ' ');
                        if (!indent.includes('\n')) {
                            indent = indent + '  ';
                        } else {
                            indent = indent.replace('\n', '') + '  ';
                        }
                    }
                }
                
                // Fallback: detect indent from the function's opening brace line
                if (indent === '  ' || !indent) {
                    const funcLineStart = hookInfo.node.start;
                    const bodyStart = hookInfo.bodyStart;
                    const beforeBrace = codeString.slice(funcLineStart, bodyStart + 1);
                    const braceLine = beforeBrace.split('\n').slice(-1)[0];
                    const braceIndent = braceLine.match(/^\s*/);
                    if (braceIndent) {
                        indent = braceIndent[0] + '  ';
                    }
                }
                
                uniqueEdits.push({
                    start: hookInfo.bodyStart + 1,
                    end: hookInfo.bodyStart + 1,
                    replacement: '\n' + indent + 'const { t } = useTranslation();'
                });
            } else if (hookInfo.type === 'implicit') {
                const node = hookInfo.node;
                const bodyEdits = uniqueEdits.filter(e =>
                    e.start >= node.body.start && e.end <= node.body.end
                );
                const bodySource = codeString.slice(node.body.start, node.body.end);
                const transformedBody = applyEdits(
                    bodySource,
                    bodyEdits.map(e => ({
                        ...e,
                        start: e.start - node.body.start,
                        end: e.end - node.body.start
                    }))
                );
                const arrowPrefix = codeString.slice(node.start, node.body.start);
                
                uniqueEdits.forEach(e => {
                    if (e.start >= node.body.start && e.end <= node.body.end) {
                        e.skip = true;
                    }
                });
                
                uniqueEdits.push({
                    start: node.start,
                    end: node.end,
                    replacement: arrowPrefix + '{\n  const { t } = useTranslation();\n  return ' + transformedBody + ';\n}'
                });
            }
        }
    }
    
    if (uniqueEdits.length === 0) {
        return { modifiedCode: codeString, extractedStrings };
    }
    
    try {
        const result = applyEdits(codeString, uniqueEdits);
        return { modifiedCode: result, extractedStrings };
    } catch (e) {
        console.error("Error applying edits:", e.message);
        return { modifiedCode: codeString, extractedStrings };
    }
};
