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
/**
 * Default configuration
 */
const defaultConfig = {
    mode: 'auto',
    maxTokens: 30,
    provider: 'anthropic'
};
/**
 * Get available API key
 */
function getApiKey() {
    if (process.env.ANTHROPIC_API_KEY) {
        return { provider: 'anthropic', key: process.env.ANTHROPIC_API_KEY };
    }
    if (process.env.MISTRAL_API_KEY) {
        return { provider: 'mistral', key: process.env.MISTRAL_API_KEY };
    }
    if (process.env.OPENAI_API_KEY) {
        return { provider: 'openai', key: process.env.OPENAI_API_KEY };
    }
    return null;
}
/**
 * Count approximate tokens
 */
function countTokens(text) {
    return Math.ceil(text.length / 4);
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
export async function compress(content, config = {}) {
    const cfg = { ...defaultConfig, ...config };
    const inputTokens = countTokens(content);
    // Determine mode
    let mode;
    let provider;
    if (cfg.mode === 'auto') {
        // Auto-detect based on API key availability
        const apiKey = getApiKey();
        if (apiKey) {
            mode = 'llm';
            provider = apiKey.provider;
        }
        else {
            mode = 'algo';
        }
    }
    else if (cfg.mode === 'llm') {
        mode = 'llm';
        provider = cfg.provider || getApiKey()?.provider || 'anthropic';
    }
    else {
        mode = 'algo';
    }
    // Compress based on mode
    let summary;
    if (mode === 'llm') {
        try {
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('No API key available for LLM compression');
            }
            summary = await compressWithLLM(content, provider || apiKey.provider, apiKey.key, cfg.llmModel, cfg.maxTokens);
        }
        catch (e) {
            // Fallback to algorithmic on error
            console.warn('[Compressor] LLM compression failed, falling back to algo:', e);
            summary = compressAlgorithmic(content, (cfg.maxTokens || 30) * 2);
            mode = 'algo';
            provider = undefined;
        }
    }
    else {
        summary = compressAlgorithmic(content, (cfg.maxTokens || 30) * 2);
    }
    const outputTokens = countTokens(summary);
    const ratio = inputTokens / outputTokens;
    return {
        summary,
        mode,
        provider,
        inputTokens,
        outputTokens,
        ratio
    };
}
/**
 * Quick compress (returns summary only)
 *
 * @param content - The content to compress
 * @param maxTokens - Maximum tokens in output
 * @returns Compressed summary string
 */
export async function quickCompress(content, maxTokens = 30) {
    const result = await compress(content, { maxTokens });
    return result.summary;
}
// Re-export individual compressors
export { compressWithLLM, compressAlgorithmic };
//# sourceMappingURL=index.js.map