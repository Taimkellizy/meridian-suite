import * as t from '@babel/types';
import path from 'path';

/**
 * Computes the relative import path from the current file to the target module.
 * @param {string} fileName - The current file path
 * @param {string} targetSubPath - The target module subpath
 * @returns {string} The computed relative import path
 */
const getRelativeImport = (fileName, targetSubPath) => {
    if (!fileName) return `./${targetSubPath}`;
    
    const normalizedFileName = fileName.replace(/\\/g, '/');
    const parts = normalizedFileName.split('/');
    const rootIndex = parts.findIndex(p => ['src', 'app', 'pages', 'components'].includes(p));
    
    let baseDir = '.';
    if (rootIndex !== -1) {
        baseDir = parts.slice(0, rootIndex + 1).join('/');
    }
    
    const fileDir = normalizedFileName.includes('/') ? normalizedFileName.substring(0, normalizedFileName.lastIndexOf('/')) : '.';
    
    let relative = path.posix.relative(fileDir, `${baseDir}/${targetSubPath}`);
    if (!relative.startsWith('.')) {
        relative = './' + relative;
    }
    return relative;
};

/**
 * Analyzes AST to find the last ImportDeclaration position.
 * @param {import('@babel/parser').ParseResult} ast - The parsed AST
 * @returns {{lastImportEnd: number, hasContextImport: boolean, hasReactImport: boolean, hasToggleImport: boolean}}
 */
export const analyzeImports = (ast) => {
    let lastImportEnd = -1;
    let hasContextImport = false;
    let hasReactImport = false;
    let hasToggleImport = false;
    
    ast.program.body.forEach(node => {
        if (t.isImportDeclaration(node)) {
            lastImportEnd = node.end;
            
            if (node.source.value.includes('LanguageContext')) {
                hasContextImport = true;
            }
            if (node.source.value === 'react') {
                node.specifiers.forEach(s => {
                    if (t.isImportSpecifier(s) && s.local.name === 'useContext') {
                        hasReactImport = true;
                    }
                });
            }
            if (node.source.value.includes('LanguageToggle')) {
                hasToggleImport = true;
            }
        }
    });
    
    return { lastImportEnd, hasContextImport, hasReactImport, hasToggleImport };
};

/**
 * Generates the import injection edits using AST to find positions.
 * @param {string} source - The source code
 * @param {import('@babel/parser').ParseResult} ast - The parsed AST
 * @param {string} fileName - The current file name
 * @param {Object} config - Configuration options
 * @returns {Object} Edit details
 */
export const generateImportEdits = (source, ast, fileName, config = {}) => {
    const { hasContextImport, hasReactImport, hasToggleImport } = config;
    const edits = [];
    
    const importAnalysis = analyzeImports(ast);
    let { lastImportEnd } = importAnalysis;
    
    if (!hasContextImport && lastImportEnd >= 0) {
        const importPath = getRelativeImport(fileName, 'contexts/LanguageContext');
        const insertCode = `\nimport { LanguageProvider, LanguageContext } from "${importPath}";`;
        edits.push({
            start: lastImportEnd,
            end: lastImportEnd,
            replacement: insertCode
        });
    }
    
    if (!hasReactImport && !config.useI18next && lastImportEnd >= 0) {
        const insertCode = `\nimport { useContext } from "react";`;
        edits.push({
            start: lastImportEnd,
            end: lastImportEnd,
            replacement: insertCode
        });
    }
    
    return edits;
};

/**
 * Analyzes AST to find the last import for toggle import injection.
 * @param {import('@babel/parser').ParseResult} ast - The parsed AST
 * @returns {{lastImportEnd: number, hasToggleImport: boolean}}
 */
export const analyzeToggleImports = (ast) => {
    let lastImportEnd = -1;
    let hasToggleImport = false;
    
    ast.program.body.forEach(node => {
        if (t.isImportDeclaration(node)) {
            lastImportEnd = node.end;
            if (node.source.value.includes('LanguageToggle')) {
                hasToggleImport = true;
            }
        }
    });
    
    return { lastImportEnd, hasToggleImport };
};

/**
 * Generates toggle import injection edit.
 * @param {string} source - The source code
 * @param {import('@babel/parser').ParseResult} ast - The parsed AST
 * @param {string} fileName - The current file name
 * @returns {Object} Edit details
 */
export const generateToggleImportEdits = (source, ast, fileName) => {
    const { lastImportEnd, hasToggleImport } = analyzeToggleImports(ast);
    const edits = [];
    
    if (!hasToggleImport && lastImportEnd >= 0) {
        const importPath = getRelativeImport(fileName, 'components/LanguageToggle');
        const insertCode = `\nimport LanguageToggle from "${importPath}";`;
        edits.push({
            start: lastImportEnd,
            end: lastImportEnd,
            replacement: insertCode
        });
    }
    
    return edits;
};

export const injectProviderImports = (ast, hasContextImport, hasReactImport, useI18next, fileName) => {
    // Kept for backward compatibility - returns empty, actual injection done via string edits
};

export const injectToggleImports = (ast, fileName) => {
    // Kept for backward compatibility - returns false, actual injection done via string edits
    return false;
};