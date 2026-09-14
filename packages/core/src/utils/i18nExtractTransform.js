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

const inferHookBodyIndent = (funcNode, source) => {
    let indent = '  ';
    const firstStmt = funcNode.body.body[0];

    if (firstStmt) {
        const stmtSource = source.slice(firstStmt.start, firstStmt.end);
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

    if (indent === '  ' || !indent) {
        const beforeBrace = source.slice(funcNode.start, funcNode.body.start + 1);
        const braceLine = beforeBrace.split('\n').slice(-1)[0];
        const braceIndent = braceLine.match(/^\s*/);
        if (braceIndent) {
            indent = braceIndent[0] + '  ';
        }
    }

    return indent;
};

const buildHookEdit = (funcPath, source, uniqueEdits) => {
    const funcNode = funcPath.node;
    const HOOK_STATEMENT = 'const { t } = useTranslation();';

    if (t.isBlockStatement(funcNode.body)) {
        const indent = inferHookBodyIndent(funcNode, source);
        return {
            start: funcNode.body.start + 1,
            end: funcNode.body.start + 1,
            replacement: '\n' + indent + HOOK_STATEMENT
        };
    }

    const bodyEdits = uniqueEdits.filter(edit =>
        edit.start >= funcNode.body.start && edit.end <= funcNode.body.end
    );
    const bodySource = source.slice(funcNode.body.start, funcNode.body.end);
    const transformedBody = applyEdits(
        bodySource,
        bodyEdits.map(edit => ({
            ...edit,
            start: edit.start - funcNode.body.start,
            end: edit.end - funcNode.body.start
        }))
    );
    const arrowPrefix = source.slice(funcNode.start, funcNode.body.start);

    uniqueEdits.forEach(edit => {
        if (edit.start >= funcNode.body.start && edit.end <= funcNode.body.end) {
            edit.skip = true;
        }
    });

    return {
        start: funcNode.start,
        end: funcNode.end,
        replacement: arrowPrefix + '{\n  ' + HOOK_STATEMENT + '\n  return ' + transformedBody + ';\n}'
    };
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
        return { modifiedCode: codeString, extractedStrings: new Map(), skipped: [] };
    }

    const extractedStrings = new Map();
    const ctx = {
        fileName: options.fileName,
        source: codeString,
        needsImport: false,
        needsTransImport: false,
        needsHook: false,
        injectedNodeSet: new Set(),
        hookScopes: [],
        skipped: [],
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
    
    if (ctx.needsImport || ctx.needsHook || ctx.needsTransImport) {
        const lastImportEnd = findLastImportEnd(ast);
        const importLibrary = options.useNextI18next ? 'next-i18next' : 'react-i18next';
        const neededSpecifiers = [];
        if (ctx.needsImport || ctx.needsHook) neededSpecifiers.push('useTranslation');
        if (ctx.needsTransImport) neededSpecifiers.push('Trans');

        const existingImport = ast.program.body.find(node =>
            t.isImportDeclaration(node) && node.source.value === importLibrary
        );

        if (existingImport) {
            const existingNames = existingImport.specifiers
                .filter(specifier => t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported))
                .map(specifier => specifier.imported.name);
            const mergedNames = [...new Set([...existingNames, ...neededSpecifiers])];
            const missingCount = neededSpecifiers.filter(name => !existingNames.includes(name)).length;

            if (missingCount > 0) {
                uniqueEdits.push({
                    start: existingImport.start,
                    end: existingImport.end,
                    replacement: `import { ${mergedNames.join(', ')} } from "${importLibrary}";`
                });
            }
        } else {
            const importStatement = `import { ${neededSpecifiers.join(', ')} } from "${importLibrary}";`;
            if (lastImportEnd >= 0) {
                uniqueEdits.push({
                    start: lastImportEnd,
                    end: lastImportEnd,
                    replacement: `\n${importStatement}`
                });
            } else {
                uniqueEdits.push({
                    start: 0,
                    end: 0,
                    replacement: `${importStatement}\n`
                });
            }
        }
        
        const hookScopes = [...ctx.hookScopes].sort((a, b) => b.node.start - a.node.start);
        for (const funcPath of hookScopes) {
            const hookEdit = buildHookEdit(funcPath, codeString, uniqueEdits);
            if (hookEdit) {
                uniqueEdits.push(hookEdit);
            }
        }
    }
    
    if (uniqueEdits.length === 0) {
        return { modifiedCode: codeString, extractedStrings, skipped: ctx.skipped };
    }

    try {
        const result = applyEdits(codeString, uniqueEdits);
        if (ctx.skipped.length > 0) {
            const skippedLines = ctx.skipped.map(item => item.line).filter(Boolean).join(', ');
            console.log(`meridian: skipped ${ctx.skipped.length} element(s) with unsupported expressions in ${options.fileName || 'file'} (lines ${skippedLines}) — left untouched`);
        }
        return { modifiedCode: result, extractedStrings, skipped: ctx.skipped };
    } catch (e) {
        console.error("Error applying edits:", e.message);
        return { modifiedCode: codeString, extractedStrings, skipped: ctx.skipped };
    }
};
