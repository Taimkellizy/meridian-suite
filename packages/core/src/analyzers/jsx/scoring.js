export const PENALTIES = {
    AVOID_PHYSICAL_PROP: { points: 5, severity: 'warning' },
    AVOID_TEXT_ALIGN: { points: 5, severity: 'warning' },
    AVOID_FLOAT: { points: 5, severity: 'warning' },
    AVOID_BORDER_RADIUS_SHORTHAND: { points: 5, severity: 'warning' },
    DETECTED_DIRECTIONAL_CLASS_NAME: { points: 5, severity: 'warning' },
    AVOID_PHYSICAL_MARGIN_PADDING_CLASS: { points: 5, severity: 'warning' },
    MISSING_HEADER: { points: 0, severity: 'info' },
    MISSING_FOOTER: { points: 0, severity: 'info' },
    PARSE_ERROR: { points: 100, severity: 'critical' },
};

export const applyPenalty = (code, currentScore) => {
    const penalty = PENALTIES[code];
    return penalty ? Math.max(0, currentScore - penalty.points) : currentScore;
};
