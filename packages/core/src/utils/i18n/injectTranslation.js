import * as t from '@babel/types';

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
        if (!ctx.hookScopes) ctx.hookScopes = [];
        ctx.hookScopes.push(parentFunc);
        ctx.needsHook = true;
    }
    return true;
};