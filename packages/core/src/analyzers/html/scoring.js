export const PENALTIES = {
    MISSING_HEADER: { points: 20, severity: 'warning' },
    MISSING_NAV: { points: 20, severity: 'warning' },
    MISSING_FOOTER: { points: 20, severity: 'warning' },
    MISSING_META_CHARSET: { points: 5, severity: 'warning' },
    MISSING_META_VIEWPORT: { points: 5, severity: 'warning' },
    MISSING_META_DESCRIPTION: { points: 5, severity: 'warning' },
    MISSING_META_KEYWORDS: { points: 5, severity: 'warning' },
    MISSING_META_AUTHOR: { points: 5, severity: 'warning' },
    MISSING_LANG_ATTRIBUTE: { points: 5, severity: 'warning' },
    MISSING_DIR_ATTRIBUTE: { points: 5, severity: 'warning' },
    PARSE_ERROR: { points: 100, severity: 'critical' },
};

export const applyPenalty = (code, currentScore) => {
    const penalty = PENALTIES[code];
    return penalty ? Math.max(0, currentScore - penalty.points) : currentScore;
};
