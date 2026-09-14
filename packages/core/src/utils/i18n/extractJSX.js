import * as t from '@babel/types';
import * as recast from 'recast';
import chalk from 'chalk';
import { generateContextAwareKey } from '../../extractors/keyGenerator.js';

const assertNotDataPromoted = (ctx) => {
    if (!ctx || !ctx.fileName) return;
    const normalized = ctx.fileName.replace(/\\/g, '/');
    if (
        normalized.includes('src/config') ||
        normalized.includes('src/data') ||
        normalized.includes('src/content') ||
        normalized.includes('src/constants')
    ) {
        throw new Error('Data-promoted keys must never be passed to generateContextAwareKey. Path: ' + ctx.fileName);
    }
};
import { injectHook } from './injectTranslation.js';


export const NEVER_WRAP_PROPS = [
    'className', 'key', 'id', 'href', 'src', 'onClick', 'style',
    'type', 'tabIndex', 'to', 'as', 'htmlFor'
];

export const ALWAYS_WRAP_PROPS = [
    'aria-label', 'placeholder', 'title', 'children'
];

const METHOD_NAMES = new Set([
    'map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every',
    'flat', 'flatMap', 'sort', 'slice', 'join', 'split', 'indexOf',
    'includes', 'replace', 'trim', 'toLowerCase', 'toUpperCase',
    'toString', 'charAt', 'concat'
]);

const isMemberExpressionLike = (node) =>
    t.isMemberExpression(node) || t.isOptionalMemberExpression(node);

const isCallExpressionLike = (node) =>
    t.isCallExpression(node) || t.isOptionalCallExpression(node);

const generateCode = (node) => {
    const result = recast.print(node);
    return result.code;
};

const getJsxPropName = (path) =>
    path.parentPath.isJSXAttribute() ? path.parentPath.node.name.name : 'children';

const addTranslationEdit = (path, ctx, expr) => {
    if (!injectHook(path, ctx)) return false;

    const newExpr = t.callExpression(t.identifier('t'), [expr]);
    // The AST we're splicing against was parsed from a \r\n normalized string.
    // However, expr.start and expr.end inside extractJSX rely on parseCode which gets called elsewhere.
    // Actually, extractJSX itself is passed `source` but the AST is passed to it?
    // Wait, extractJSX doesn't parse! It is just a visitor!
    ctx.edits.push({
        start: expr.start,
        end: expr.end,
        replacement: generateCode(newExpr)
    });
    path.skip();
    return true;
};

const addStringLiteralEdit = (path, ctx, extractedMap, node) => {
    const strValue = node.value;
    if (!strValue || !strValue.trim()) return false;
    if (!injectHook(path, ctx)) return false;

    extractedMap.set(strValue, strValue);
    const newExpr = t.callExpression(t.identifier('t'), [t.stringLiteral(strValue)]);
    ctx.edits.push({
        start: node.start,
        end: node.end,
        replacement: generateCode(newExpr)
    });
    return true;
};

const isTranslatableField = (fieldName, registry) => {
    if (!registry) return false;
    return Object.values(registry).some(entry =>
        entry.translatable && entry.translatable.includes(fieldName)
    );
};

const registryHasField = (fieldName, registry) => {
    if (!registry) return false;
    return Object.values(registry).some(entry =>
        (entry.translatable && entry.translatable.includes(fieldName)) ||
        (entry.skip && entry.skip.includes(fieldName)) ||
        (entry.identifier && entry.identifier.includes(fieldName))
    );
};

export function shouldWrapMemberExpression(propName, objectName, fieldName, registry) {
    if (NEVER_WRAP_PROPS.includes(propName)) return false;
    if (propName.startsWith('data-') || (propName.startsWith('aria-') && propName !== 'aria-label')) return false;

    if (ALWAYS_WRAP_PROPS.includes(propName)) return true;

    if (!registry) return false;

    if (!registryHasField(fieldName, registry)) {
        console.log(chalk.yellow(`Warning: skipped uncertain expression ${objectName}.${fieldName}; object was not traced to a scanned data file. Add it to .meridianrc.json > dataFiles if it contains display text.`));
        return false;
    }

    return isTranslatableField(fieldName, registry);
}

const extractMemberInfo = (node) => {
    if (!isMemberExpressionLike(node) || node.computed) return null;
    if (!t.isIdentifier(node.property)) return null;

    const fieldName = node.property.name;
    let objectName = null;
    let cursor = node.object;

    while (isMemberExpressionLike(cursor) && !cursor.computed) {
        if (t.isIdentifier(cursor.property)) {
            objectName = cursor.property.name;
        }
        cursor = cursor.object;
    }

    if (t.isIdentifier(cursor)) {
        objectName = objectName || cursor.name;
    }
    if (!objectName) return null;

    return { objectName, fieldName, node };
};

const findTranslatableFieldInExpression = (node, registry) => {
    if (!node) return null;

    if (isMemberExpressionLike(node) && !node.computed && t.isIdentifier(node.property)) {
        if (isTranslatableField(node.property.name, registry)) {
            return node.property.name;
        }
        return findTranslatableFieldInExpression(node.object, registry);
    }

    if (t.isLogicalExpression(node)) {
        return findTranslatableFieldInExpression(node.left, registry) ||
            findTranslatableFieldInExpression(node.right, registry);
    }

    if (t.isConditionalExpression(node)) {
        return findTranslatableFieldInExpression(node.consequent, registry) ||
            findTranslatableFieldInExpression(node.alternate, registry);
    }

    if (
        t.isTSAsExpression(node) ||
        t.isTSTypeAssertion(node) ||
        t.isTSNonNullExpression(node)
    ) {
        return findTranslatableFieldInExpression(node.expression, registry);
    }

    if (isCallExpressionLike(node)) {
        return findTranslatableFieldInExpression(node.callee, registry);
    }

    return null;
};

const hasMethodCall = (node, methodName) => {
    if (!node) return false;

    if (isCallExpressionLike(node)) {
        return hasMethodCall(node.callee, methodName);
    }

    if (isMemberExpressionLike(node) && !node.computed) {
        return (
            (t.isIdentifier(node.property) && node.property.name === methodName) ||
            hasMethodCall(node.object, methodName)
        );
    }

    return false;
};

const findNearestArrowFunction = (path) => {
    let currentPath = path.parentPath;
    while (currentPath && !currentPath.isArrowFunctionExpression()) {
        currentPath = currentPath.parentPath;
    }
    return currentPath;
};

const getMapSourceExpression = (arrowPath, varName) => {
    if (!arrowPath?.isArrowFunctionExpression()) return null;

    const isLoopParam = arrowPath.node.params.some(p =>
        t.isIdentifier(p) && p.name === varName
    );
    if (!isLoopParam) return null;

    const callPath = arrowPath.parentPath;
    if (!callPath || !isCallExpressionLike(callPath.node)) return null;

    const callee = callPath.node.callee;
    if (
        !isMemberExpressionLike(callee) ||
        !t.isIdentifier(callee.property) ||
        callee.property.name !== 'map'
    ) {
        return null;
    }

    return callee.object;
};

const shouldTranslateMapIdentifier = (path, varName, ctx) => {
    const arrayExpr = getMapSourceExpression(findNearestArrowFunction(path), varName);
    const arrayFieldName = findTranslatableFieldInExpression(arrayExpr, ctx.registry);
    return Boolean(arrayFieldName && !hasMethodCall(arrayExpr, 'split'));
};

const findTranslatableMember = (node, registry) => {
    if (isMemberExpressionLike(node)) {
        const info = extractMemberInfo(node);
        if (
            info &&
            !METHOD_NAMES.has(info.fieldName) &&
            isTranslatableField(info.fieldName, registry)
        ) {
            return info;
        }
        return findTranslatableMember(node.object, registry);
    }

    if (isCallExpressionLike(node)) {
        return findTranslatableMember(node.callee, registry);
    }

    return null;
};

const getMethodChainToMember = (node, memberNode) => {
    if (!node) return null;
    if (node === memberNode) return [];

    if (isCallExpressionLike(node)) {
        return getMethodChainToMember(node.callee, memberNode);
    }

    if (isMemberExpressionLike(node) && !node.computed) {
        const childChain = getMethodChainToMember(node.object, memberNode);
        if (!childChain) return null;

        if (t.isIdentifier(node.property)) {
            return [node.property.name, ...childChain];
        }
        return childChain;
    }

    return null;
};

const shouldTranslateMapCallbackOnly = (callNode, memberNode) => {
    const methodChain = getMethodChainToMember(callNode, memberNode);
    if (!methodChain || !methodChain.includes('map')) return false;

    // String split chains need the source string translated before splitting.
    return !methodChain.includes('split');
};

const isSimpleInterpolationExpression = (node) =>
    t.isIdentifier(node) || isMemberExpressionLike(node);

const getInterpolationName = (node, index) => {
    if (t.isIdentifier(node)) return node.name;
    if (isMemberExpressionLike(node) && t.isIdentifier(node.property)) {
        return node.property.name;
    }
    return `var${index}`;
};

const isTranslatableInterpolation = (node, registry) =>
    isMemberExpressionLike(node) &&
    !node.computed &&
    t.isIdentifier(node.property) &&
    isTranslatableField(node.property.name, registry);

const collectTextRun = (children, startIndex) => {
    let textStr = '';
    const variables = [];
    let hasText = false;
    let index = startIndex;

    while (index < children.length) {
        const child = children[index];

        if (t.isJSXText(child)) {
            textStr += child.value;
            hasText = hasText || child.value.trim() !== '';
            index++;
            continue;
        }

        if (
            t.isJSXExpressionContainer(child) &&
            !t.isJSXEmptyExpression(child.expression) &&
            isSimpleInterpolationExpression(child.expression)
        ) {
            const varName = getInterpolationName(child.expression, variables.length);
            const isShorthand = t.isIdentifier(child.expression) && child.expression.name === varName;
            textStr += `{{${varName}}}`;
            variables.push(t.objectProperty(
                t.identifier(varName),
                child.expression,
                false,
                isShorthand
            ));
            index++;
            continue;
        }

        break;
    }

    return { textStr, variables, hasText, endIndex: index };
};

const getOnlyExpression = (children, startIndex, endIndex) => {
    const expressionContainer = children.slice(startIndex, endIndex).find(
        child => t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)
    );
    return expressionContainer?.expression || null;
};

const shouldWrapBareExpression = (expr, ctx) => {
    if (isMemberExpressionLike(expr) && !expr.computed && t.isIdentifier(expr.property)) {
        const info = extractMemberInfo(expr);
        return Boolean(info && shouldWrapMemberExpression('children', info.objectName, info.fieldName, ctx.registry));
    }

    return t.isIdentifier(expr) && isTranslatableField(expr.name, ctx.registry);
};

const pushRemovalPlaceholders = (ranges, children, startIndex, endIndex) => {
    for (let i = startIndex; i < endIndex; i++) {
        ranges.push({
            start: children[i].start,
            end: children[i].end,
            replacement: null
        });
    }
};

const buildTextReplacement = (textStr, key, variables) => {
    const params = [t.stringLiteral(key)];
    if (variables.length > 0) {
        params.push(t.objectExpression(variables));
    }

    const leadingMatch = textStr.match(/^\s+/);
    const trailingMatch = textStr.match(/\s+$/);
    let replacement = leadingMatch ? leadingMatch[0] : '';

    replacement += generateCode(t.jsxExpressionContainer(
        t.callExpression(t.identifier('t'), params)
    ));

    if (trailingMatch && trailingMatch[0] !== textStr) {
        replacement += trailingMatch[0];
    }

    return replacement;
};

const handleAttributeStrings = (path, extractedMap, ctx) => {
    path.node.openingElement.attributes.forEach((attr) => {
        if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) return;
        if (!['placeholder', 'title'].includes(attr.name.name)) return;
        if (!t.isStringLiteral(attr.value) || attr.value.value.trim() === '') return;
        if (!injectHook(path, ctx)) return;

        const strValue = attr.value.value;
        assertNotDataPromoted(ctx);
        const key = generateContextAwareKey(path, ctx, strValue);
        extractedMap.set(key, strValue);

        const newValue = t.jsxExpressionContainer(
            t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
        );
        ctx.edits.push({
            start: attr.value.start,
            end: attr.value.end,
            replacement: generateCode(newValue)
        });
    });
};

const hasMeridianIgnore = (path) =>
    path.node.openingElement.attributes?.some(attr =>
        t.isJSXAttribute(attr) && attr.name.name === 'data-meridian-ignore'
    );

const handleTextRun = (path, extractedMap, ctx, startIndex, childEditRanges) => {
    const children = path.node.children;
    const { textStr, variables, hasText, endIndex } = collectTextRun(children, startIndex);
    if (endIndex === startIndex) return startIndex + 1;

    const normalizedText = textStr.trim().replace(/\s+/g, ' ');

    if (hasText && normalizedText.length > 0) {
        if (variables.length > 0 && variables.every(variable =>
            isTranslatableInterpolation(variable.value, ctx.registry)
        )) {
            if (injectHook(path, ctx)) {
                for (let i = startIndex; i < endIndex; i++) {
                    const child = children[i];
                    if (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)) {
                        childEditRanges.push({
                            start: child.expression.start,
                            end: child.expression.end,
                            replacement: generateCode(t.callExpression(t.identifier('t'), [child.expression]))
                        });
                    }
                }
            }
            return endIndex;
        }

        if (!injectHook(path, ctx)) {
            pushRemovalPlaceholders(childEditRanges, children, startIndex, endIndex);
            return endIndex;
        }

        assertNotDataPromoted(ctx);
        const key = generateContextAwareKey(path, ctx, normalizedText);
        extractedMap.set(key, normalizedText);
        childEditRanges.push({
            start: children[startIndex].start,
            end: children[endIndex - 1].end,
            replacement: buildTextReplacement(textStr, key, variables)
        });
        return endIndex;
    }

    if (!hasText && variables.length === 1) {
        const onlyExpr = getOnlyExpression(children, startIndex, endIndex);
        if (onlyExpr && shouldWrapBareExpression(onlyExpr, ctx) && injectHook(path, ctx)) {
            childEditRanges.push({
                start: onlyExpr.start,
                end: onlyExpr.end,
                replacement: generateCode(t.callExpression(t.identifier('t'), [onlyExpr]))
            });
        } else {
            pushRemovalPlaceholders(childEditRanges, children, startIndex, endIndex);
        }
        return endIndex;
    }

    pushRemovalPlaceholders(childEditRanges, children, startIndex, endIndex);
    return endIndex;
};

export const buildExtractVisitor = (extractedMap, ctx) => ({
    JSXExpressionContainer(path) {
        const expr = path.node.expression;

        if (isMemberExpressionLike(expr)) {
            const info = extractMemberInfo(expr);
            if (!info) return;

            const propName = getJsxPropName(path);
            if (!path.parentPath.isJSXAttribute() && !path.parentPath.isJSXElement() && !path.parentPath.isJSXFragment()) {
                return;
            }

            if (shouldWrapMemberExpression(propName, info.objectName, info.fieldName, ctx.registry)) {
                addTranslationEdit(path, ctx, expr);
            }
            return;
        }

        if (t.isConditionalExpression(expr)) {
            const info = extractMemberInfo(expr.consequent);
            if (info) {
                const propName = getJsxPropName(path);
                if (shouldWrapMemberExpression(propName, info.objectName, info.fieldName, ctx.registry)) {
                    addTranslationEdit(path, ctx, info.node);
                }
            }

            if (t.isStringLiteral(expr.alternate) && !NEVER_WRAP_PROPS.includes(getJsxPropName(path))) {
                addStringLiteralEdit(path, ctx, extractedMap, expr.alternate);
            }
            return;
        }

        if (
            t.isIdentifier(expr) &&
            (path.parentPath.isJSXElement() || path.parentPath.isJSXAttribute() || path.parentPath.isJSXFragment())
        ) {
            const propName = getJsxPropName(path);
            if (NEVER_WRAP_PROPS.includes(propName)) return;

            if (isTranslatableField(expr.name, ctx.registry) || shouldTranslateMapIdentifier(path, expr.name, ctx)) {
                addTranslationEdit(path, ctx, expr);
            }
            return;
        }

        if (isCallExpressionLike(expr)) {
            const info = findTranslatableMember(expr, ctx.registry);
            if (!info || shouldTranslateMapCallbackOnly(expr, info.node)) return;

            addTranslationEdit(path, ctx, info.node);
        }
    },

    JSXElement(path) {
        if (hasMeridianIgnore(path)) {
            path.skip();
            return;
        }

        handleAttributeStrings(path, extractedMap, ctx);

        const childEditRanges = [];
        let index = 0;
        while (index < path.node.children.length) {
            const child = path.node.children[index];
            if (
                t.isJSXText(child) ||
                (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression))
            ) {
                index = handleTextRun(path, extractedMap, ctx, index, childEditRanges);
            } else {
                index++;
            }
        }

        for (const range of childEditRanges) {
            if (range.replacement !== null) {
                ctx.edits.push(range);
            }
        }
    }
});
