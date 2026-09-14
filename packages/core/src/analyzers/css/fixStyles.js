import postcss from 'postcss';

export const applyFixes = (decl, options, issueType, originalData) => {
    // Only apply AST auto-fixes if isMainFile is true
    if (!options.isMainFile) return;

    switch (issueType) {
        case 'FIX_TEXT_ALIGN':
            decl.value = decl.value === 'left' ? 'start' : 'end';
            break;

        case 'FIX_FLOAT':
            decl.value = decl.value === 'left' ? 'inline-start' : 'inline-end';
            break;

        case 'PHYSICAL_PROP':
            decl.prop = originalData.logical;
            break;

        case 'FIX_BORDER_RADIUS_SHORTHAND':
            const [tl, tr, br, bl] = originalData.parts;
            decl.replaceWith(
                { prop: 'border-start-start-radius', value: tl },
                { prop: 'border-start-end-radius', value: tr },
                { prop: 'border-end-end-radius', value: br },
                { prop: 'border-end-start-radius', value: bl }
            );
            break;

        case 'FIX_SHORTHAND':
            const [top, right, bottom, left] = originalData.parts;
            decl.replaceWith(
                { prop: `${decl.prop}-block-start`, value: top },
                { prop: `${decl.prop}-inline-end`, value: right },
                { prop: `${decl.prop}-block-end`, value: bottom },
                { prop: `${decl.prop}-inline-start`, value: left }
            );
            break;
    }
};
