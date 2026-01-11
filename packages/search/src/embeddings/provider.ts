/**
 * Embedding Provider - Abstract interface for multi-provider support
 *
 * Supports: Mistral, OpenAI, Ollama, Voyage, etc.
 * Easy to switch providers via config
 */

// ============================================
// TYPES
// ============================================

export interface EmbeddingResult {
  vector: number[];
  model: string;
  tokens?: number;
}

export interface EmbeddingProvider {
  name: string;
  embed(text: string): Promise<EmbeddingResult>;
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
  dimensions: number;
}

export interface ProviderConfig {
  provider: 'mistral' | 'openai' | 'ollama' | 'voyage';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

// ============================================
// MISTRAL PROVIDER
// ============================================

export class MistralProvider implements EmbeddingProvider {
  name = 'mistral';
  dimensions = 1024;

  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'mistral-embed';
    this.baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[]; index: number }>;
      model: string;
      usage?: { total_tokens: number };
    };

    return data.data.map((item) => ({
      vector: item.embedding,
      model: data.model,
      tokens: data.usage ? Math.floor(data.usage.total_tokens / texts.length) : undefined,
    }));
  }
}

// ============================================
// OPENAI PROVIDER
// ============================================

export class OpenAIProvider implements EmbeddingProvider {
  name = 'openai';
  dimensions = 1536;

  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'text-embedding-3-small';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[]; index: number }>;
      model: string;
      usage?: { total_tokens: number };
    };

    return data.data.map((item) => ({
      vector: item.embedding,
      model: data.model,
      tokens: data.usage ? Math.floor(data.usage.total_tokens / texts.length) : undefined,
    }));
  }
}

// ============================================
// OLLAMA PROVIDER (Local)
// ============================================

export class OllamaProvider implements EmbeddingProvider {
  name = 'ollama';
  dimensions = 768; // nomic-embed-text default

  private model: string;
  private baseUrl: string;

  constructor(config: { model?: string; baseUrl?: string }) {
    this.model = config.model || 'nomic-embed-text';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json() as { embedding: number[] };

    return {
      vector: data.embedding,
      model: this.model,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    // Ollama doesn't support batch, do sequentially
    const results: EmbeddingResult[] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}

// ============================================
// FACTORY
// ============================================

let currentProvider: EmbeddingProvider | null = null;

/**
 * Initialize embedding provider
 */
export function initEmbeddings(config: ProviderConfig): EmbeddingProvider {
  switch (config.provider) {
    case 'mistral':
      if (!config.apiKey) throw new Error('Mistral API key required');
      currentProvider = new MistralProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
      });
      break;

    case 'openai':
      if (!config.apiKey) throw new Error('OpenAI API key required');
      currentProvider = new OpenAIProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
      });
      break;

    case 'ollama':
      currentProvider = new OllamaProvider({
        model: config.model,
        baseUrl: config.baseUrl,
      });
      break;

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }

  return currentProvider;
}

/**
 * Get current provider
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (!currentProvider) {
    throw new Error('Embeddings not initialized. Call initEmbeddings() first.');
  }
  return currentProvider;
}

/**
 * Quick embed using current provider
 */
export async function embed(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  const result = await provider.embed(text);
  return result.vector;
}

/**
 * Quick batch embed using current provider
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const provider = getEmbeddingProvider();
  const results = await provider.embedBatch(texts);
  return results.map(r => r.vector);
}
