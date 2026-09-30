import path from "path";
export function deriveSessionTitle(firstMessage) {
    const cleaned = firstMessage.trim().replace(/\s+/g, ' ');
    return cleaned.length > 50 ? cleaned.slice(0, 50) + '…' : cleaned;
}
export function resolveSafePath(inputPath, cwd = process.cwd()) {
    const resolved = path.resolve(cwd, inputPath);
    if (!resolved.startsWith(path.resolve(cwd) + path.sep) && resolved !== path.resolve(cwd)) {
        throw new Error(`Path "${inputPath}" resolves outside the working directory and is not allowed.`);
    }
    return resolved;
}
export const formatRgOutput = (output, maxTotalMatches = 60) => {
    const lines = output.trim().split('\n').filter(Boolean);
    const fileGroups = new Map();
    let totalMatches = 0;
    let truncated = false;
    for (const line of lines) {
        const event = JSON.parse(line);
        if (event.type !== 'match' && event.type !== 'context')
            continue;
        if (event.type === 'match') {
            if (totalMatches >= maxTotalMatches) {
                truncated = true;
                continue;
            }
            totalMatches++;
        }
        const path = event.data.path.text;
        const lineNumber = event.data?.line_number ?? 0;
        const text = event.data?.lines?.text ?? '';
        const isMatch = event.type === 'match';
        if (!fileGroups.has(path))
            fileGroups.set(path, []);
        fileGroups.get(path).push({ lineNumber, text, isMatch });
    }
    if (fileGroups.size === 0)
        return 'No matches found.';
    const outputs = [];
    for (const [filePath, entries] of fileGroups) {
        entries.sort((a, b) => a.lineNumber - b.lineNumber);
        outputs.push(`\n📄 ${filePath}`);
        for (const { lineNumber, text, isMatch } of entries) {
            const marker = isMatch ? '→' : ' ';
            outputs.push(`  ${marker} ${lineNumber}: ${text}`);
        }
    }
    if (truncated) {
        outputs.push(`\n[Results truncated at ${maxTotalMatches} matches — refine your search pattern (e.g. narrow the path or use a more specific pattern) for complete results.]`);
    }
    return outputs.join('\n').trim();
};
//# sourceMappingURL=helpers.js.map