import _traverse from '@babel/traverse';

export const traverseAST = (ast, visitor) => {
    // Handling differences between distinct environments (ESM vs CJS)
    const traverse = _traverse.default || _traverse;
    return traverse(ast, visitor);
};
