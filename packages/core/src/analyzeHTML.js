import { parseHTML } from './analyzers/html/parse.js';
import { detectStructure } from './analyzers/html/detectStructure.js';
import { detectMeta } from './analyzers/html/detectMeta.js';
import { detectA11y } from './analyzers/html/detectA11y.js';
import { handleInjections } from './analyzers/html/injectLang.js';
import { applyPenalty } from './analyzers/html/scoring.js';

/**
 * Analyzes HTML code for structure, accessibility, SEO, and required attributes.
 * @param {string} htmlString - The HTML code to analyze.
 * @param {object} text - The localization object.
 * @param {object} options - Configuration options.
 * @param {boolean} [options.isMainFile=true] - Whether this is the main entry file (index.html).
 * @param {boolean} [options.checkStructure=false] - Whether to enforce strict structure based on file type.
 * @param {string} [options.mode='scan'] - Analysis mode ('scan', 'fix', 'multi-lang').
 * @returns {object} Result object containing score, warnings, foundTags, and fixedCode.
 */
const analyzeHTML = (htmlString, text, options = { isMainFile: true, checkStructure: false, mode: 'scan' }) => {
    let score = 100;
    let warnings = [];
    let fixedCode = null;

    let doc;
    try {
        doc = parseHTML(htmlString);
    } catch (e) {
        console.error("HTML Parse Error:", e);
        warnings.push({ type: "errtypeGeneric", code: "PARSE_ERROR", blogID: 0 });
        score = applyPenalty("PARSE_ERROR", score);
        return { score, warnings, foundTags: new Set() };
    }

    const addWarning = (type, code, blogID, args = []) => {
        warnings.push({ type, code, blogID, args });
        score = applyPenalty(code, score);
    };

    // 1. Structure Detection
    const foundTags = detectStructure(doc, options, addWarning);

    // 2. SEO Meta Checks
    detectMeta(doc, options, addWarning);

    // 3. A11y / Language Checks
    detectA11y(doc, options, addWarning);

    // 4. Injections Phase
    fixedCode = handleInjections(htmlString, options);

    score = Math.max(0, score);

    return { score, warnings, foundTags, fixedCode };
};

export default analyzeHTML;
