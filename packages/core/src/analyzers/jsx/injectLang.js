import { injectProvider, injectToggle } from '../../utils/reactInjector.js';

export const handleInjections = (codeString, foundTags, options) => {
    let modifiedCode = codeString;
    let injected = false;

    if (!['multi-lang', 'fix-lang', 'fix-all'].includes(options.mode)) {
        return { modifiedCode, injected };
    }

    // 1. Inject Provider if it's the App File
    if (options.isAppFile) {
        modifiedCode = injectProvider(modifiedCode, options.config, options.fileName);
        injected = true;
    }

    // 2. Inject Toggle based on user configuration
    let targetConfig = options.config?.languageSwitcher?.position || { tag: 'nav' };
    
    if (typeof targetConfig === 'string') {
        if (targetConfig === 'custom selector') targetConfig = { tag: 'nav' };
        else targetConfig = { tag: targetConfig };
    }

    let shouldInject = false;
    
    // Check if the current file matches the requested filePath
    if (targetConfig.filePath) {
        const normalizedTarget = targetConfig.filePath.replace(/\\/g, '/');
        const normalizedFile = (options.fileName || '').replace(/\\/g, '/');
        
        if (normalizedTarget.endsWith(normalizedFile) || normalizedFile.endsWith(normalizedTarget)) {
            shouldInject = true;
        } else {
            return { modifiedCode, injected }; // Fast exit, don't inject in other files
        }
    } else {
        if (targetConfig.floating) {
            shouldInject = true;
        } else if (targetConfig.tag && (foundTags.has(targetConfig.tag) || targetConfig.tag === 'custom selector')) {
            shouldInject = true;
        } else if (foundTags.has('nav') || foundTags.has('header')) {
            shouldInject = true;
            targetConfig.tag = foundTags.has('nav') ? 'nav' : 'header';
        }
    }

    let switcherInjected = false;
    if (shouldInject) {
        const toggleResult = injectToggle(modifiedCode, targetConfig, options.fileName);
        modifiedCode = toggleResult.code;
        switcherInjected = toggleResult.injected;
        injected = injected || switcherInjected;
    }

    return { modifiedCode, injected, switcherInjected };
};
