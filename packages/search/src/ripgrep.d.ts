/**
 * Ripgrep Wrapper - Native search without RAM issues
 *
 * Uses ripgrep (rg) for blazing fast code search.
 * No indexation needed - searches files directly.
 */
export interface RgSearchOptions {
    query: string;
    path: string;
    maxResults?: number;
    contextLines?: number;
    fileGlob?: string;
    ignoreCase?: boolean;
    regex?: boolean;
    wordBoundary?: boolean;
}
export interface RgMatch {
    path: string;
    lineNumber: number;
    content: string;
    beforeContext?: string[];
    afterContext?: string[];
}
export interface RgSearchResult {
    matches: RgMatch[];
    totalMatches: number;
    filesSearched: number;
    durationMs: number;
    truncated: boolean;
}
/**
 * Search files using ripgrep
 * Returns structured results with context
 */
export declare function rgSearch(options: RgSearchOptions): Promise<RgSearchResult>;
/**
 * Quick search with sensible defaults
 */
export declare function quickSearch(query: string, path: string, limit?: number): Promise<RgMatch[]>;
/**
 * Search in specific file types
 */
export declare function searchByType(query: string, path: string, fileType: 'ts' | 'js' | 'py' | 'go' | 'rust' | 'java'): Promise<RgMatch[]>;
/**
 * Format match for display (compact mgrep style)
 */
export declare function formatMatch(match: RgMatch): string;
/**
 * Format matches as compact list
 */
export declare function formatMatchList(matches: RgMatch[]): string;
//# sourceMappingURL=ripgrep.d.ts.map