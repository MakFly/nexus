/**
 * Ripgrep Wrapper - Native search without RAM issues
 *
 * Uses ripgrep (rg) for blazing fast code search.
 * No indexation needed - searches files directly.
 */
import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
// ============================================
// RIPGREP BINARY DETECTION
// ============================================
/**
 * Find ripgrep binary path
 * Checks common locations and falls back to PATH
 */
function findRgBinary() {
    const possiblePaths = [
        '/usr/bin/rg',
        '/usr/local/bin/rg',
        `${process.env.HOME}/.cargo/bin/rg`,
        `${process.env.HOME}/.bun/install/global/node_modules/@anthropic-ai/claude-code/vendor/ripgrep/x64-linux/rg`,
    ];
    for (const p of possiblePaths) {
        if (existsSync(p)) {
            return p;
        }
    }
    // Try to find via which command
    try {
        const result = execSync('which rg 2>/dev/null', { encoding: 'utf-8' }).trim();
        if (result)
            return result;
    }
    catch {
        // Ignore
    }
    // Default to PATH
    return 'rg';
}
const RG_BINARY = findRgBinary();
// ============================================
// RIPGREP SEARCH
// ============================================
/**
 * Search files using ripgrep
 * Returns structured results with context
 */
export async function rgSearch(options) {
    const { query, path, maxResults = 20, contextLines = 2, fileGlob, ignoreCase = true, regex = false, wordBoundary = false, } = options;
    const startTime = Date.now();
    // Build ripgrep arguments
    const args = [
        '--json', // JSON output for parsing
        '--max-count', '50', // Max matches per file
        '--max-filesize', '500K', // Skip large files
        '-C', String(contextLines), // Context lines
    ];
    if (ignoreCase) {
        args.push('--smart-case');
    }
    if (!regex) {
        args.push('--fixed-strings');
    }
    if (wordBoundary) {
        args.push('--word-regexp');
    }
    if (fileGlob) {
        args.push('--glob', fileGlob);
    }
    // Default ignores
    args.push('--glob', '!node_modules/**');
    args.push('--glob', '!dist/**');
    args.push('--glob', '!build/**');
    args.push('--glob', '!.git/**');
    args.push('--glob', '!*.min.js');
    args.push('--glob', '!*.min.css');
    args.push('--glob', '!*.lock');
    args.push('--glob', '!package-lock.json');
    args.push(query, path);
    return new Promise((resolve, reject) => {
        const rg = spawn(RG_BINARY, args, {
            cwd: path,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        rg.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        rg.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        rg.on('close', (code) => {
            // Code 1 = no matches (not an error)
            if (code !== 0 && code !== 1) {
                reject(new Error(`ripgrep failed: ${stderr}`));
                return;
            }
            const result = parseRgOutput(stdout, maxResults);
            result.durationMs = Date.now() - startTime;
            resolve(result);
        });
        rg.on('error', (err) => {
            reject(new Error(`Failed to spawn ripgrep: ${err.message}`));
        });
    });
}
/**
 * Parse ripgrep JSON output into structured results
 */
function parseRgOutput(output, maxResults) {
    const matches = [];
    const filesSet = new Set();
    let totalMatches = 0;
    const lines = output.trim().split('\n').filter(Boolean);
    // Group by file for context handling
    const matchesByFile = new Map();
    for (const line of lines) {
        try {
            const json = JSON.parse(line);
            if (json.type === 'match') {
                totalMatches++;
                const filePath = json.data.path.text;
                filesSet.add(filePath);
                if (!matchesByFile.has(filePath)) {
                    matchesByFile.set(filePath, []);
                }
                matchesByFile.get(filePath).push(json.data);
            }
        }
        catch {
            // Skip malformed lines
        }
    }
    // Convert to RgMatch format
    for (const [filePath, fileMatches] of matchesByFile) {
        for (const match of fileMatches) {
            if (matches.length >= maxResults)
                break;
            matches.push({
                path: filePath,
                lineNumber: match.line_number,
                content: match.lines?.text?.trim() || '',
                beforeContext: match.submatches?.[0]?.before_context || [],
                afterContext: match.submatches?.[0]?.after_context || [],
            });
        }
        if (matches.length >= maxResults)
            break;
    }
    return {
        matches,
        totalMatches,
        filesSearched: filesSet.size,
        durationMs: 0,
        truncated: totalMatches > maxResults,
    };
}
// ============================================
// CONVENIENCE FUNCTIONS
// ============================================
/**
 * Quick search with sensible defaults
 */
export async function quickSearch(query, path, limit = 10) {
    const result = await rgSearch({
        query,
        path,
        maxResults: limit,
        contextLines: 1,
    });
    return result.matches;
}
/**
 * Search in specific file types
 */
export async function searchByType(query, path, fileType) {
    const globs = {
        ts: '*.{ts,tsx}',
        js: '*.{js,jsx,mjs}',
        py: '*.py',
        go: '*.go',
        rust: '*.rs',
        java: '*.java',
    };
    const result = await rgSearch({
        query,
        path,
        fileGlob: globs[fileType],
        maxResults: 20,
    });
    return result.matches;
}
/**
 * Format match for display (compact mgrep style)
 */
export function formatMatch(match) {
    return `./${match.path}:${match.lineNumber}`;
}
/**
 * Format matches as compact list
 */
export function formatMatchList(matches) {
    return matches.map(formatMatch).join('\n');
}
//# sourceMappingURL=ripgrep.js.map