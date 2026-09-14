export const generateKey = (textStr) => {
    if (textStr.length <= 50) {
        return textStr;
    }
    const words = textStr.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
    const prefix = words.slice(0, 5).join('_').toLowerCase();
    
    let hash = 0;
    for (let i = 0; i < textStr.length; i++) {
        const char = textStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const hashStr = Math.abs(hash).toString(16).substring(0, 4).padStart(4, '0');
    
    return prefix ? `${prefix}_${hashStr}` : hashStr;
};
