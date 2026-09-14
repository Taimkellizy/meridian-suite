export const detectMeta = (doc, options, addWarning) => {
    if (!options.isMainFile) return;

    if (!doc.querySelector("meta[charset]")) {
        addWarning("errtypeMeta", "MISSING_META_CHARSET", 6);
    }
    if (!doc.querySelector('meta[name="viewport"]')) {
        addWarning("errtypeMeta", "MISSING_META_VIEWPORT", 6);
    }
    if (!doc.querySelector('meta[name="description"]')) {
        addWarning("errtypeMeta", "MISSING_META_DESCRIPTION", 6);
    }
    if (!doc.querySelector('meta[name="keywords"]')) {
        addWarning("errtypeMeta", "MISSING_META_KEYWORDS", 6);
    }
    if (!doc.querySelector('meta[name="author"]')) {
        addWarning("errtypeMeta", "MISSING_META_AUTHOR", 6);
    }
};
