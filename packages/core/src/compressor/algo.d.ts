/**
 * @nexus/core - Algorithmic Compressor (No API key required)
 * Sprint 7: Compression 100:1 - Fallback mode
 *
 * Ratio cible: ~30:1 (vs 100:1 avec LLM)
 * Coût: Gratuit
 * Latence: ~5ms
 */
/**
 * Compress content using algorithmic methods (no LLM required)
 *
 * @param content - The content to compress
 * @param maxTokens - Maximum tokens in output (default: 50)
 * @returns Compressed summary
 *
 * @example
 * ```ts
 * const summary = compressAlgorithmic(toolOutput, 50);
 * // Returns: "Files: src/auth.ts, src/db.ts | Keys: authenticate, validate, session | Stats: 52 matches, 3 files | (1500 lines)"
 * ```
 */
export declare function compressAlgorithmic(content: string, maxTokens?: number): string;
/**
 * Estimate compression ratio for algorithmic compression
 */
export declare function estimateAlgorithmicRatio(content: string): number;
//# sourceMappingURL=algo.d.ts.map