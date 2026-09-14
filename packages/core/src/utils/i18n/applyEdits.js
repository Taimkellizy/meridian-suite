export function applyEdits(source, edits) {
    const filtered = edits.filter(e => !e.skip);
    const sorted = [...filtered].sort((a, b) => b.start - a.start);

    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1].end > sorted[i].start) {
            throw new Error(
                `Meridian: overlapping edits detected at positions ` +
                `${sorted[i + 1].start}–${sorted[i].end}. ` +
                `This is a bug — please report it at github.com/Taimkellizy/meridian-suite/issues`
            );
        }
    }

    let result = source;
    for (const { start, end, replacement } of sorted) {
        result = result.slice(0, start) + replacement + result.slice(end);
    }
    return result;
}