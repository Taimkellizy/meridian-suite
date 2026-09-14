/**
 * Constants for JSX Analysis
 * Extracted to prevent self-scanning issues and improve maintainability.
 */

// 1. Strict Physical Properties (Always Errors/Fixes)
export const STRICT_PHYSICAL_PROPS = [
    'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight',
    'borderLeft', 'borderRight', 'borderLeftWidth', 'borderRightWidth',
    'borderLeftColor', 'borderRightColor', 'borderLeftStyle', 'borderRightStyle',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'
];

// 2. Ambiguous Properties (Context-Aware Errors/Fixes)
export const AMBIGUOUS_PROPS = ['left', 'right'];

// 3. Strict CSS Properties (Used for Sibling Context Heuristic)
export const STRICT_CSS_PROPS = [
    'position', 'display', 'backgroundColor', 'fontSize',
    'zIndex', 'width', 'height', 'color', 'top', 'bottom', 'flex', 'grid'
];

// 4. Logical Properties (Allowed values)
export const LOGICAL_PROPS = [
    'marginInlineStart', 'marginInlineEnd', 'paddingInlineStart', 'paddingInlineEnd',
    'borderInlineStart', 'borderInlineEnd', 'borderStartStartRadius', 'borderStartEndRadius',
    'borderEndStartRadius', 'borderEndEndRadius', 'insetInlineStart', 'insetInlineEnd',
    'start', 'end', 'inline-start', 'inline-end'
];

// 5. RTL Mappings (Replacements)
// Exported as Array of Arrays to prevent "RTL Error" flags on this file itself
export const RTL_MAPPINGS = [
    ['marginLeft', 'marginInlineStart'],
    ['marginRight', 'marginInlineEnd'],
    ['paddingLeft', 'paddingInlineStart'],
    ['paddingRight', 'paddingInlineEnd'],
    ['borderLeft', 'borderInlineStart'],
    ['borderRight', 'borderInlineEnd'],
    ['borderTopLeftRadius', 'borderStartStartRadius'],
    ['borderTopRightRadius', 'borderStartEndRadius'],
    ['borderBottomLeftRadius', 'borderEndStartRadius'],
    ['borderBottomRightRadius', 'borderEndEndRadius'],
    ['left', 'insetInlineStart'],
    ['right', 'insetInlineEnd'],
    ['borderLeftWidth', 'borderInlineStartWidth'],
    ['borderRightWidth', 'borderInlineEndWidth'],
    ['borderLeftColor', 'borderInlineStartColor'],
    ['borderRightColor', 'borderInlineEndColor'],
    ['borderLeftStyle', 'borderInlineStartStyle'],
    ['borderRightStyle', 'borderInlineEndStyle']
];
