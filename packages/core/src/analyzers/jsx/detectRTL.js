import { 
    STRICT_PHYSICAL_PROPS, 
    AMBIGUOUS_PROPS, 
    STRICT_CSS_PROPS, 
    LOGICAL_PROPS 
} from '../../constants.js';

export const getStyleContext = (path) => {
    // 1. Prop Context: style={{ ... }}
    const parentContainer = path.parentPath;
    if (parentContainer && parentContainer.isJSXExpressionContainer()) {
        const attribute = parentContainer.parentPath;
        if (attribute && attribute.isJSXAttribute()) {
            const attrName = attribute.node.name.name;
            if (['style', 'sx', 'css'].includes(attrName)) return true;
        }
    }
    
    // 2. Naming Context: const buttonStyle = { ... }
    const varDecl = path.findParent(p => p.isVariableDeclarator());
    if (varDecl && varDecl.node.id.name) {
        const varName = varDecl.node.id.name.toLowerCase();
        if (varName.includes('style') || varName.includes('css')) return true;
    }
    
    // 3. Sibling Context: Contains known CSS properties
    const hasStrictSibling = path.node.properties.some(p => {
        if (!p.key) return false;
        const k = p.key.name || p.key.value;
        return STRICT_CSS_PROPS.includes(k);
    });
    
    return hasStrictSibling;
};

export const checkClassName = (className, addWarning) => {
    if (!className) return;

    if (className.match(/\b(text-left|text-right)\b/)) {
        addWarning("errtypeRTL", "DETECTED_DIRECTIONAL_CLASS_NAME", 3);
    }
    
    if (className.match(/\b(float-left|float-right)\b/)) {
        addWarning("errtypeRTL", "DETECTED_DIRECTIONAL_CLASS_NAME", 3);
    }

    if (/\b(ml-|mr-|pl-|pr-)\d+/.test(className)) {
        addWarning("errtypeRTL", "AVOID_PHYSICAL_MARGIN_PADDING_CLASS", 3);
    }
};

export const detectRTLVisitor = (addWarning, foundTags) => ({
    ObjectExpression(path) {
        const isStyle = getStyleContext(path);

        path.node.properties.forEach(prop => {
            if (!prop.key) return;
            const keyName = prop.key.name || prop.key.value;

            // 1. Strict Physical Properties
            if (STRICT_PHYSICAL_PROPS.includes(keyName)) {
                let valueStr = '';
                if (prop.value && prop.value.type === 'StringLiteral') {
                    valueStr = prop.value.value;
                } else if (prop.value && prop.value.type === 'TSAsExpression' && prop.value.expression.type === 'StringLiteral') {
                    valueStr = prop.value.expression.value;
                }

                if (LOGICAL_PROPS.includes(valueStr)) {
                    return; // Ignore mapping objects
                }

                addWarning("errtypeRTL", "AVOID_PHYSICAL_PROP", 3, [keyName]);
                return;
            }

            // 2. Ambiguous Properties (left, right)
            if (AMBIGUOUS_PROPS.includes(keyName)) {
                if (isStyle) {
                    addWarning("errtypeRTL", "AVOID_PHYSICAL_PROP", 3, [keyName]);
                }
            }

            // 3. Values (textAlign, float)
            let valueNode = prop.value;
            if (valueNode && valueNode.type === 'TSAsExpression') {
                valueNode = valueNode.expression;
            }

            if (keyName === 'textAlign' || keyName === 'text-align') {
                if (valueNode && (valueNode.value === 'left' || valueNode.value === 'right')) {
                    addWarning("errtypeRTL", "AVOID_TEXT_ALIGN", 3);
                }
            }
            if (keyName === 'float') {
                if (valueNode && (valueNode.value === 'left' || valueNode.value === 'right')) {
                    addWarning("errtypeRTL", "AVOID_FLOAT", 3);
                }
            }

            // 4. borderRadius shorthand
            if (keyName === 'borderRadius') {
                if (valueNode && valueNode.type === 'StringLiteral') {
                    const parts = valueNode.value.trim().split(/\s+/);
                    if (parts.length === 4) {
                        addWarning("errtypeRTL", "AVOID_BORDER_RADIUS_SHORTHAND", 3);
                    }
                }
            }
        });
    },

    JSXOpeningElement(path) {
        const getJSXName = (node) => {
            if (node.type === 'JSXIdentifier') return node.name;
            if (node.type === 'JSXMemberExpression') {
                return `${getJSXName(node.object)}.${getJSXName(node.property)}`;
            }
            return '';
        };

        const name = getJSXName(path.node.name);
        foundTags.add(name.toLowerCase());

        const classAttr = path.node.attributes.find(attr => attr.type === 'JSXAttribute' && (attr.name.name === 'className' || attr.name.name === 'class'));
        if (classAttr && classAttr.value) {
            if (classAttr.value.type === 'StringLiteral') {
                checkClassName(classAttr.value.value, addWarning);
            } else if (classAttr.value.type === 'JSXExpressionContainer' && classAttr.value.expression.type === 'StringLiteral') {
                checkClassName(classAttr.value.expression.value, addWarning);
            }
        }
    }
});
