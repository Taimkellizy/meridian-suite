export const detectStructure = (doc, options, addWarning) => {
    // Collect found semantic tags
    const foundTags = new Set();
    ['header', 'nav', 'main', 'footer'].forEach(tag => {
        if (doc.querySelector(tag)) foundTags.add(tag);
    });

    // Structure Checks (Run if Main File OR explicitly requested for local checks)
    // Skip strict structure checks for React projects (index.html is usually just a shell)
    if ((options.isMainFile || options.checkStructure) && !options.isReact) {
        if (!doc.querySelector("header")) {
            addWarning("errtypeStructure", "MISSING_HEADER", 1);
        }
        if (!doc.querySelector("nav")) {
            addWarning("errtypeStructure", "MISSING_NAV", 1);
        }
        if (!doc.querySelector("footer")) {
            addWarning("errtypeStructure", "MISSING_FOOTER", 1);
        }
    }
    
    return foundTags;
};
