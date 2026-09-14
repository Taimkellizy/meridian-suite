export const PENALTIES = {
    FIX_TEXT_ALIGN: { points: 5, severity: 'warning' },
    FIX_FLOAT: { points: 5, severity: 'warning' },
    FIX_MARGIN_LEFT: { points: 5, severity: 'warning' },
    FIX_MARGIN_RIGHT: { points: 5, severity: 'warning' },
    FIX_PADDING_LEFT: { points: 5, severity: 'warning' },
    FIX_PADDING_RIGHT: { points: 5, severity: 'warning' },
    FIX_BORDER_LEFT: { points: 5, severity: 'warning' },
    FIX_BORDER_RIGHT: { points: 5, severity: 'warning' },
    FIX_LEFT_POSITION: { points: 5, severity: 'warning' },
    FIX_RIGHT_POSITION: { points: 5, severity: 'warning' },
    FIX_BORDER_TOP_LEFT_RADIUS: { points: 5, severity: 'warning' },
    FIX_BORDER_TOP_RIGHT_RADIUS: { points: 5, severity: 'warning' },
    FIX_BORDER_BOTTOM_RIGHT_RADIUS: { points: 5, severity: 'warning' },
    FIX_BORDER_BOTTOM_LEFT_RADIUS: { points: 5, severity: 'warning' },
    FIX_BORDER_RADIUS_SHORTHAND: { points: 5, severity: 'warning' },
    FIX_PADDING_SHORTHAND: { points: 5, severity: 'warning' },
    FIX_MARGIN_SHORTHAND: { points: 5, severity: 'warning' },
};

export const applyPenalty = (code, currentScore) => {
    const penalty = PENALTIES[code];
    return penalty ? Math.max(0, currentScore - penalty.points) : currentScore;
};
