import postcss from 'postcss';
import { applyFixes } from './fixStyles.js';

export const detectRTLAndFix = (decl, options, addWarning) => {
    // 1. Text Align
    if (decl.prop === 'text-align') {
        if (decl.value === 'left' || decl.value === 'right') {
            applyFixes(decl, options, 'FIX_TEXT_ALIGN');
            addWarning("errtypeRTL", "FIX_TEXT_ALIGN", 7);
        }
    }

    // 2. Float
    else if (decl.prop === 'float') {
        if (decl.value === 'left' || decl.value === 'right') {
            applyFixes(decl, options, 'FIX_FLOAT');
            addWarning("errtypeRTL", "FIX_FLOAT", 7);
        }
    }

    // 3. Physical Properties
    const physicalMap = {
        'margin-left': { logical: 'margin-inline-start', code: 'FIX_MARGIN_LEFT' },
        'margin-right': { logical: 'margin-inline-end', code: 'FIX_MARGIN_RIGHT' },
        'padding-left': { logical: 'padding-inline-start', code: 'FIX_PADDING_LEFT' },
        'padding-right': { logical: 'padding-inline-end', code: 'FIX_PADDING_RIGHT' },
        'border-left': { logical: 'border-inline-start', code: 'FIX_BORDER_LEFT' },
        'border-right': { logical: 'border-inline-end', code: 'FIX_BORDER_RIGHT' },
        'left': { logical: 'inset-inline-start', code: 'FIX_LEFT_POSITION' },
        'right': { logical: 'inset-inline-end', code: 'FIX_RIGHT_POSITION' },
        'border-top-left-radius': { logical: 'border-start-start-radius', code: 'FIX_BORDER_TOP_LEFT_RADIUS' },
        'border-top-right-radius': { logical: 'border-start-end-radius', code: 'FIX_BORDER_TOP_RIGHT_RADIUS' },
        'border-bottom-right-radius': { logical: 'border-end-end-radius', code: 'FIX_BORDER_BOTTOM_RIGHT_RADIUS' },
        'border-bottom-left-radius': { logical: 'border-end-start-radius', code: 'FIX_BORDER_BOTTOM_LEFT_RADIUS' },
    };

    if (physicalMap[decl.prop]) {
        const entry = physicalMap[decl.prop];
        applyFixes(decl, options, 'PHYSICAL_PROP', entry);
        addWarning("errtypeRTL", entry.code, 3);
    }

    // 4. Border Radius Shorthand
    else if (decl.prop === 'border-radius') {
        const parts = postcss.list.space(decl.value);
        if (parts.length === 4) {
            applyFixes(decl, options, 'FIX_BORDER_RADIUS_SHORTHAND', { parts });
            addWarning("errtypeRTL", "FIX_BORDER_RADIUS_SHORTHAND", 3);
        }
    }

    // 5. Margin/Padding Shorthand
    else if (decl.prop === 'padding' || decl.prop === 'margin') {
        const parts = postcss.list.space(decl.value);
        if (parts.length === 4) {
            const code = `FIX_${decl.prop.toUpperCase()}_SHORTHAND`;
            applyFixes(decl, options, 'FIX_SHORTHAND', { parts });
            addWarning("errtypeRTL", code, 3);
        }
    }
};
