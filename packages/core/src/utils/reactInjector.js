import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import * as t from '@babel/types';
import * as recast from 'recast';
import { applyEdits } from './i18n/applyEdits.js';
import { analyzeProviderScope } from './reactInjection/detectScope.js';
import { generateImportEdits, generateToggleImportEdits } from './reactInjection/injectImports.js';
import { injectContextHook, analyzeHookInfo } from './reactInjection/injectHooks.js';
import { analyzeExportDefault, analyzeToggleTarget, generateProviderWrapperEdit, generateToggleInsertEdit, analyzeAppRouterLayout } from './reactInjection/injectElements.js';

/**
 * Parses source code into AST with support for JSX, TypeScript, and modern JS features.
 * @param {string} code - Source code to parse
 * @returns {import('@babel/parser').ParseResult} Parsed AST
 */
const getAST = (code) => {
    const plugins = ["jsx", "typescript", "classProperties", "dynamicImport", "exportDefaultFrom", "exportNamespaceFrom"];
    return recast.parse(code, {
        parser: {
            parse(source) {
                return parse(source, {
                    sourceType: "module",
                    plugins: plugins,
                    tokens: true
                });
            }
        }
    });
};

/**
 * Finds the corresponding Next.js layout or _app file for a given page.
 * @param {string} directory - Directory to search in
 * @param {string} baseName - Base name of the file ('layout' or '_app')
 * @param {string} ignoreFileName - The current file to ignore
 * @returns {string|null} Path to the file if found, else null
 */
function findFileWithExtensions(directory, baseName, ignoreFileName) {
    const extensions = ['.tsx', '.jsx', '.js', '.ts'];
    for (const ext of extensions) {
        const potentialPath = path.join(directory, `${baseName}${ext}`);
        if (fs.existsSync(potentialPath) && potentialPath !== ignoreFileName) {
            return potentialPath;
        }
    }
    return null;
}

/**
 * Determines the path to the parent layout or _app file.
 * @param {string} normalizedFileName - Forward-slash normalized path
 * @param {string} originalFileName - Original file path
 * @returns {string|null} Path to the parent layout file if found
 */
function getLayoutPath(normalizedFileName, originalFileName) {
    if (normalizedFileName.includes('/app/')) {
        const appDir = normalizedFileName.substring(0, normalizedFileName.indexOf('/app/') + 5);
        return findFileWithExtensions(appDir, 'layout', originalFileName);
    } 
    
    if (normalizedFileName.includes('/pages/')) {
        const pagesDir = normalizedFileName.substring(0, normalizedFileName.indexOf('/pages/') + 7);
        return findFileWithExtensions(pagesDir, '_app', originalFileName);
    }
    
    return null;
}

/**
 * Checks if the file is a page-level file and if its parent layout/_app already has a provider.
 * @param {string} fileName - Current file name
 * @returns {string|null} Path to the layout file if provider is found, else null
 */
function checkLayoutProvider(fileName) {
    if (!fileName) return null;
    
    const normalizedFileName = fileName.replace(/\\/g, '/');
    const layoutPath = getLayoutPath(normalizedFileName, fileName);

    if (!layoutPath) return null;

    try {
        const layoutCode = fs.readFileSync(layoutPath, 'utf8');
        const layoutAst = getAST(layoutCode);
        const layoutScope = analyzeProviderScope(layoutAst);
        
        if (layoutScope.hasProviderWrapper) {
            return layoutPath;
        }
    } catch (e) {
        // gracefully ignore parse or read errors
    }
    
    return null;
}

/**
 * Injects LanguageProvider wrapper by finding the export default and replacing it with a wrapped version.
 * Uses AST for detection only - string replacement for actual modification.
 * @param {string} code - Source code to modify
 * @param {Object} config - Configuration options
 * @param {string} fileName - Current file name
 * @returns {string} Modified code
 */
export const injectProvider = (rawCode, config = {}, fileName = '') => {
    // Normalize to CRLF to ensure AST offsets perfectly match string slice offsets
    const code = rawCode.replace(/\r?\n/g, '\r\n');
    let ast;
    try {
        ast = getAST(code);
    } catch (e) {
        console.error("Parse Error in injectProvider:", e);
        return code;
    }

    const scope = analyzeProviderScope(ast);

    let layoutProviderPath = null;
    if (scope.hasProviderWrapper) {
        console.warn(`meridian sync warning: ${fileName} is already wrapped by a provider in ${fileName}; skipping duplicate wrap.`);
    } else {
        layoutProviderPath = checkLayoutProvider(fileName);
        if (layoutProviderPath) {
            console.warn(`meridian sync warning: ${fileName} is already wrapped by a provider in ${layoutProviderPath}; skipping duplicate wrap.`);
        }
    }

    const hasProviderAnywhere = scope.hasProviderWrapper || !!layoutProviderPath;

    const isFullyInjected = config.i18next 
        ? (scope.hasContextImport && hasProviderAnywhere) 
        : (scope.hasContextImport && scope.hasHook && hasProviderAnywhere);

    const isAppRouterLayout = config.isNextJs && fileName && (fileName.endsWith('layout.jsx') || fileName.endsWith('layout.tsx'));

    if (isFullyInjected) return code;
    if (!scope.exportDefaultNodePath && !isAppRouterLayout) return code;

    const edits = [];

    const importEdits = generateImportEdits(code, ast, fileName, {
        hasContextImport: scope.hasContextImport,
        hasReactImport: scope.hasReactImport,
        useI18next: config.i18next
    });
    edits.push(...importEdits);

    const hookInfo = analyzeHookInfo(ast, scope);
    if (!scope.hasHook && scope.componentFunctionPath && !config.i18next) {
        const hookInjection = injectContextHook(hookInfo, {
            collision: scope.collisionDetected,
            useI18next: config.i18next,
            textDecRemovalRange: scope.textDeclarationToRemovePath ? {
                start: scope.textDeclarationToRemovePath.node.start,
                end: scope.textDeclarationToRemovePath.node.end
            } : null
        });
        if (hookInjection) {
            if (hookInjection.removeRange) {
                edits.push({
                    start: hookInjection.removeRange.start,
                    end: hookInjection.removeRange.end,
                    replacement: ''
                });
            }
            if (hookInjection.hookEdit) {
                edits.push(hookInjection.hookEdit);
            }
        }
    }

    if (!hasProviderAnywhere) {
        let exportInfo = null;
        let appRouterInfo = null;
        if (isAppRouterLayout) {
            appRouterInfo = analyzeAppRouterLayout(ast);
        } else {
            exportInfo = analyzeExportDefault(ast);
        }

        const wrapperEdit = generateProviderWrapperEdit(code, exportInfo, isAppRouterLayout, appRouterInfo);
        if (wrapperEdit) {
            edits.push(wrapperEdit);
        }
    }

    if (edits.length === 0) return code;

    try {
        return applyEdits(code, edits);
    } catch (e) {
        console.error("Error applying provider edits:", e.message);
        return code;
    }
};

/**
 * Injects LanguageToggle component into target element.
 * Uses AST for detection - string insertion for actual modification.
 * @param {string} code - Source code to modify
 * @param {Object} targetConfig - Target element configuration
 * @param {string} fileName - Current file name
 * @returns {{code: string, injected: boolean}} Result with modified code and injected status
 */
export const injectToggle = (rawCode, targetConfig = { tag: "nav" }, fileName = '') => {
    // Normalize to CRLF to ensure AST offsets perfectly match string slice offsets
    const code = rawCode.replace(/\r?\n/g, '\r\n');
    let ast;
    try {
        ast = getAST(code);
    } catch (e) {
        console.error("Parse Error in injectToggle:", e);
        return { code, injected: false };
    }

    const edits = [];

    const importEdits = generateToggleImportEdits(code, ast, fileName);
    edits.push(...importEdits);

    const targetInfo = analyzeToggleTarget(ast, targetConfig);
    
    if (targetInfo && !targetInfo.alreadyInjected && targetInfo.targetNode) {
        const toggleEdit = generateToggleInsertEdit(code, targetInfo);
        if (toggleEdit) {
            edits.push(toggleEdit);
        }
    }

    if (edits.length === 0) {
        return { code, injected: false };
    }

    try {
        const result = applyEdits(code, edits);
        return { code: result, injected: !!targetInfo && !targetInfo.alreadyInjected };
    } catch (e) {
        console.error("Error applying toggle edits:", e.message);
        return { code, injected: false };
    }
};
