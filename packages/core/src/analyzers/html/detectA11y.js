export const detectA11y = (doc, options, addWarning) => {
    if (!options.isMainFile) return;

    const htmlTag = doc.querySelector('html');

    if (htmlTag) {
        if (!htmlTag.getAttribute("lang")) {
            addWarning("errtypeLanguage", "MISSING_LANG_ATTRIBUTE", 5);
        }

        if (!htmlTag.getAttribute("dir")) {
            addWarning("errtypeLanguage", "MISSING_DIR_ATTRIBUTE", 5);
        }
    }
};
