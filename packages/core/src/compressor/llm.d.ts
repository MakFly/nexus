/**
 * @nexus/core - LLM Compressor (Anthropic, Mistral, OpenAI)
 * Sprint 7: Compression 100:1 - Optimal mode
 *
 * Ratio cible: ~100:1
 * Coût: ~$0.0001/compression
 * Latence: ~200ms
 */
import type { CompressionProvider } from '../index.js';
/**
 * Compress content using specified LLM provider
 *
 * @param content - The content to compress
 * @param provider - LLM provider (anthropic, mistral, openai, ollama)
 * @param apiKey - API key (not required for ollama)
 * @param model - Model name
 * @param maxTokens - Maximum tokens in output
 * @returns Compressed summary
 */
export declare function compressWithLLM(content: string, provider: CompressionProvider, apiKey: string, model?: string, maxTokens?: number): Promise<string>;
/**
 * Estimate compression ratio for LLM compression
 * (This is an approximation based on typical LLM performance)
 */
export declare function estimateLLMRatio(_content: string): number;
//# sourceMappingURL=llm.d.ts.map