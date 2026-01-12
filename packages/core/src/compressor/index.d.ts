/**
 * @nexus/core - Compression Module (Unified Wrapper)
 * Sprint 7: Compression 100:1 - Auto-detection + Fallback
 *
 * Modes:
 * - LLM: ~100:1 ratio (requires API key)
 * - Algo: ~30:1 ratio (free, no API key)
 * - Auto: Detects API key and switches automatically
 */
import { compressWithLLM } from './llm.js';
import { compressAlgorithmic } from './algo.js';
import type { CompressionProvider } from '../index.js';
/**
 * Compression mode
 */
export type CompressionMode = 'auto' | 'llm' | 'algo';
/**
 * Compression configuration
 */
export interface CompressorConfig {
    mode: CompressionMode;
    provider?: CompressionProvider;
    maxTokens?: number;
    llmModel?: string;
}
/**
 * Compression result
 */
export interface CompressionResult {
    summary: string;
    mode: 'llm' | 'algo';
    provider?: CompressionProvider;
    inputTokens: number;
    outputTokens: number;
    ratio: number;
}
/**
 * Compress content with auto-detection of mode
 *
 * @param content - The content to compress
 * @param config - Compression configuration
 * @returns Compression result with summary and metadata
 *
 * @example
 * ```ts
 * // Auto mode (detects API key)
 * const result = await compress(largeContent);
 * console.log(result.summary); // Compressed text
 * console.log(result.ratio); // e.g., 85.5
 *
 * // Force algorithmic mode
 * const algoResult = await compress(content, { mode: 'algo' });
 *
 * // Force LLM with specific provider
 * const llmResult = await compress(content, {
 *   mode: 'llm',
 *   provider: 'anthropic',
 *   maxTokens: 50
 * });
 * ```
 */
export declare function compress(content: string, config?: Partial<CompressorConfig>): Promise<CompressionResult>;
/**
 * Quick compress (returns summary only)
 *
 * @param content - The content to compress
 * @param maxTokens - Maximum tokens in output
 * @returns Compressed summary string
 */
export declare function quickCompress(content: string, maxTokens?: number): Promise<string>;
export { compressWithLLM, compressAlgorithmic };
//# sourceMappingURL=index.d.ts.map