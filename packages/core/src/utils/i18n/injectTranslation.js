import * as t from '@babel/types';
import * as recast from 'recast';

export const isReactComponent = (funcPath) => {
    if (t.isFunctionDeclaration(funcPath.node) && funcPath.node.id) {
        return /^[A-Z]/.test(funcPath.node.id.name);
    }
    if (funcPath.parentPath.isVariableDeclarator() && t.isIdentifier(funcPath.parentPath.node.id)) {
        return /^[A-Z]/.test(funcPath.parentPath.node.id.name);
    }
    if (funcPath.parentPath.isExportDefaultDeclaration()) {
        return true;
    }
    return false;
};

export const getReactComponentAncestor = (path) => {
    let current = path.findParent(p => p.isFunction());
    while (current) {
        if (isReactComponent(current)) {
            return current;
        }
        current = current.findParent(p => p.isFunction());
    }
    return null;
};

export const injectHook = (path, ctx) => {
    const parentFunc = getReactComponentAncestor(path);
    if (!parentFunc) return false;

    ctx.needsImport = true;

    if (!ctx.injectedNodeSet.has(parentFunc.node) && !parentFunc.scope.hasBinding('t')) {
        ctx.injectedNodeSet.add(parentFunc.node);
        ctx.needsHook = true;
        ctx.hookPosition = parentFunc.node.start;
        ctx.hookScope = parentFunc;
    }
    return true;
};

export const injectImportStatements = (source, ast) => {
    let lastImportEnd = -1;
    let hasImport = false;
    
    ast.program.body.forEach(node => {
        if (t.isImportDeclaration(node)) {
            lastImportEnd = node.end;
            if (node.source.value === 'react-i18next') {
                hasImport = true;
            }
        }
    });

    if (lastImportEnd === -1) {
        const importDecl = `import { useTranslation } from "react-i18next";\n`;
        return { replacement: importDecl + source, importEdit: { start: 0, end: 0, replacement: importDecl } };
    }

    if (!hasImport) {
        const insertCode = '\nimport { useTranslation } from "react-i18next";';
        return {
            replacement: source.slice(0, lastImportEnd) + insertCode + source.slice(lastImportEnd),
            importEdit: { start: lastImportEnd, end: lastImportEnd, replacement: insertCode }
        };
    }

    return { replacement: source, importEdit: null };
};

export const processHookEdits = (source, edits, ctx) => {
    if (!ctx.needsHook) {
        return { replacement: source, hookEdit: null };
    }

    const funcNode = ctx.hookScope.node;
    const HOOK_CODE = '\nconst { t } = useTranslation();';

    if (t.isArrowFunctionExpression(funcNode) && funcNode.body && !t.isBlockStatement(funcNode.body)) {
        const arrowFn = funcNode;
        const returnExpr = arrowFn.body;
        const returnStmt = t.returnStatement(returnExpr);
        const hookDecl = t.variableDeclaration('const', [
            t.variableDeclarator(
                t.objectPattern([
                    t.objectProperty(t.identifier('t'), t.identifier('t'), false, true)
                ]),
                t.callExpression(t.identifier('useTranslation'), [])
            )
        ]);
        const blockBody = t.blockStatement([hookDecl, returnStmt]);
        arrowFn.body = blockBody;
        
        const code = recast.print(arrowFn).code;
        
        const edit = {
            start: arrowFn.start,
            end: arrowFn.end,
            replacement: code
        };
        
        const resultSource = source.slice(0, edit.start) + edit.replacement + source.slice(edit.end);
        return { replacement: resultSource, hookEdit: edit };
    }

    let indent = '  ';
    if (t.isBlockStatement(funcNode.body) && funcNode.body.body.length > 0) {
        const firstStmt = funcNode.body.body[0];
        const stmtSource = source.slice(firstStmt.start, firstStmt.end);
        const indentMatch = stmtSource.match(/^(\s*)/);
        if (indentMatch) {
            indent = indentMatch[1];
        }
    }

    const bodyStart = funcNode.body.start;
    const edit = {
        start: bodyStart,
        end: bodyStart,
        replacement: HOOK_CODE + (indent.startsWith('\n') ? '' : '\n' + indent.slice(0, -1))
    };

    const resultSource = source.slice(0, edit.start) + edit.replacement + source.slice(edit.end);
    return { replacement: resultSource, hookEdit: edit };
};