import * as t from '@babel/types';
import { RTL_MAPPINGS, STRICT_PHYSICAL_PROPS, AMBIGUOUS_PROPS } from '../../constants.js';
import { getStyleContext } from './detectRTL.js';

export const fixStylesVisitor = () => ({
    ObjectExpression(path) {
        const isStyle = getStyleContext(path);

        path.node.properties.forEach(prop => {
            if (!prop.key) return;

            const isIdentifier = prop.key.type === 'Identifier';
            const isStringLiteral = prop.key.type === 'StringLiteral';
            if (!isIdentifier && !isStringLiteral) return;

            const keyName = isIdentifier ? prop.key.name : prop.key.value;
            const valNode = prop.value;

            // Property Key Replacements
            const mapping = RTL_MAPPINGS.find(m => m[0] === keyName);
            if (mapping) {
                const targetKey = mapping[1];
                let shouldReplace = false;

                if (STRICT_PHYSICAL_PROPS.includes(keyName)) {
                    shouldReplace = true;
                } else if (AMBIGUOUS_PROPS.includes(keyName) && isStyle) {
                    shouldReplace = true;
                }

                if (shouldReplace) {
                    if (isIdentifier) {
                        prop.key.name = targetKey;
                    } else if (isStringLiteral) {
                        prop.key.value = targetKey;
                    }
                }
            }

            // Value String Replacements
            let actualValueNode = valNode;
            if (valNode && valNode.type === 'TSAsExpression') {
                actualValueNode = valNode.expression;
            }

            if (actualValueNode && (actualValueNode.type === 'StringLiteral' || actualValueNode.type === 'Literal')) {
                const val = actualValueNode.value;
                if (keyName === 'textAlign' || keyName === 'text-align') {
                    if (val === 'left') actualValueNode.value = 'start';
                    if (val === 'right') actualValueNode.value = 'end';
                }
                if (keyName === 'float') {
                    if (val === 'left') actualValueNode.value = 'inline-start';
                    if (val === 'right') actualValueNode.value = 'inline-end';
                }
            }
        });
    }
});
