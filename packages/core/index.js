import analyzeCSS from './src/analyzeCSS.js';
import analyzeJSX from './src/analyzeJSX.js';
import analyzeHTML from './src/analyzeHTML.js';
import { extractAndTransformJSX } from './src/utils/i18nExtractTransform.js';
import { getContextTemplate, getI18nContextTemplate, getToggleTemplate } from './src/utils/reactGenerators.js';
import { injectTailwindLogical } from './src/utils/tailwindInjector.js';
import { rewriteTailwindClasses } from './src/utils/tailwindClassRewriter.js';
import { injectDirAttribute } from './src/utils/dirInjector.js';
import { injectDirToHtml } from './src/utils/htmlInjector.js';
import { nextDocumentFixer } from './src/utils/nextDocumentFixer.js';
import { nextLayoutFixer } from './src/utils/nextLayoutFixer.js';
import { nextConfigFixer } from './src/utils/nextConfigFixer.js';
import { saveKeyMap, resetKeyGeneratorStateForTesting } from './src/extractors/keyGenerator.js';

import { TranslatorService } from './src/translator/index.js';
import GoogleProvider from './src/translator/providers/GoogleProvider.js';
import DeepLProvider from './src/translator/providers/DeepLProvider.js';
import LibreProvider from './src/translator/providers/LibreProvider.js';
import MockTranslationAdapter from './src/translator/providers/MockTranslationAdapter.js';

import { NextI18nextAdapter, NextIntlAdapter, getAdapter, detectAdapter } from './src/adapters/index.js';

export { 
    analyzeCSS, 
    analyzeJSX, 
    analyzeHTML, 
    extractAndTransformJSX, 
    saveKeyMap,
    resetKeyGeneratorStateForTesting,
    getContextTemplate, 
    getI18nContextTemplate, 
    getToggleTemplate,
    injectTailwindLogical,
    rewriteTailwindClasses,
    injectDirAttribute,
    injectDirToHtml,
    nextDocumentFixer,
    nextLayoutFixer,
    nextConfigFixer,
    TranslatorService,
    GoogleProvider,
    DeepLProvider,
    LibreProvider,
    MockTranslationAdapter,
    NextI18nextAdapter,
    NextIntlAdapter,
    getAdapter,
    detectAdapter
};
