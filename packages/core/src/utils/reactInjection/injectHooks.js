import * as t from '@babel/types';

/**
 * Injects the useContext hook into the component using string insertion.
 * @param {Object} hookInfo - Information about the component function
 * @param {Object} config - Configuration options
 * @returns {Object} Edit details for hook injection
 */
export const injectContextHook = (hookInfo, config = {}) => {
    const { collision, useI18next, textDecRemovalRange } = config;
    
    if (useI18next) return null;
    
    if (!hookInfo || !hookInfo.bodyStart) return null;
    
    const varName = collision ? 'arabifyContextvalue' : 'text';
    const HOOK_CODE = `\nconst { ${varName} } = useContext(LanguageContext);\n`;
    
    if (textDecRemovalRange) {
        return {
            removeRange: textDecRemovalRange,
            hookEdit: {
                start: hookInfo.bodyStart + 1,
                end: hookInfo.bodyStart + 1,
                replacement: HOOK_CODE
            }
        };
    }
    
    return {
        hookEdit: {
            start: hookInfo.bodyStart + 1,
            end: hookInfo.bodyStart + 1,
            replacement: HOOK_CODE
        }
    };
};

/**
 * Analyzes the component to find hook insertion point and collision info.
 * @param {import('@babel/parser').ParseResult} ast - The parsed AST
 * @param {Object} scope - Scope information from detectScope
 * @returns {Object} Hook information
 */
export const analyzeHookInfo = (ast, scope) => {
    if (!scope.componentFunctionPath) return null;
    
    const funcNode = scope.componentFunctionPath.node;
    if (!funcNode) return null;
    
    let bodyStart = null;
    if (t.isArrowFunctionExpression(funcNode) && t.isBlockStatement(funcNode.body)) {
        bodyStart = funcNode.body.start;
    } else if (t.isFunctionDeclaration(funcNode) && t.isBlockStatement(funcNode.body)) {
        bodyStart = funcNode.body.start;
    } else if (t.isFunctionExpression(funcNode) && t.isBlockStatement(funcNode.body)) {
        bodyStart = funcNode.body.start;
    }
    
    if (!bodyStart) return null;
    
    return {
        bodyStart,
        node: funcNode,
        collision: scope.collisionDetected,
        textDecRemovalRange: scope.textDeclarationToRemovePath ? {
            start: scope.textDeclarationToRemovePath.node.start,
            end: scope.textDeclarationToRemovePath.node.end
        } : null
    };
};