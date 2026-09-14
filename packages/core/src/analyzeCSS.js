import postcss from 'postcss';
import safeParser from 'postcss-safe-parser';
import { detectRTLAndFix } from './analyzers/css/detectRTL.js';
import { applyPenalty } from './analyzers/css/scoring.js';

/**
 * Analyzes CSS code for RTL compatibility, responsiveness, and best practices.
 * @param {string} cssString - The CSS code to analyze.
 * @param {object} text - The localization object containing error messages and labels.
 * @param {object} options - Options like isMainFile.
 * @returns {Promise<object>} Result object containing score, warnings, and fixedCSS.
 */
const analyzeCSS = async (cssString, text, options = {}) => {
    let score = 100;
    let warnings = [];

    const addWarning = (type, code, blogID) => {
        warnings.push({ type, code, blogID });
        score = applyPenalty(code, score);
    };

    const plugin = { 
        postcssPlugin: 'arabify-analyzer',
        Declaration(decl) {
            detectRTLAndFix(decl, options, addWarning);
        }
    };

    let fixedCSS = cssString;
    try {
        const result = await postcss([plugin]).process(cssString, { parser: safeParser, from: 'input.css' });
        fixedCSS = result.css;
    } catch (e) {
        console.error("CSS Processing Error:", e);
    }

    // Prevent negative score
    score = Math.max(0, score);

    return { score, warnings, fixedCSS };
};

export default analyzeCSS;
