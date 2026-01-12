/**
 * @nexus/core - LLM Compressor (Anthropic, Mistral, OpenAI)
 * Sprint 7: Compression 100:1 - Optimal mode
 *
 * Ratio cible: ~100:1
 * Coût: ~$0.0001/compression
 * Latence: ~200ms
 */
/**
 * Compression prompt template
 */
const COMPRESS_PROMPT = `Résume en moins de 30 tokens les informations clés pour un développeur.
Garde: fichiers modifiés, fonctions principales, décisions techniques.
Format compact, pas de phrases complètes.

Exemple de format attendu:
"Auth: JWT implementation in auth.ts, session timeout 24h. See: authenticate(), validateSession()"`;
/**
 * Compress content using Anthropic Claude
 */
async function compressWithAnthropic(content, apiKey, model = 'claude-3-5-haiku-20241022', maxTokens = 30) {
    // Dynamic import for optional dependency
    // @ts-ignore - Optional dependency, installed separately
    const AnthropicModule = await import('@anthropic-ai/sdk').catch(() => null);
    if (!AnthropicModule) {
        throw new Error('Anthropic SDK not installed. Run: bun add @anthropic-ai/sdk');
    }
    const client = new AnthropicModule.default({ apiKey });
    const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [
            {
                role: 'user',
                content: `${COMPRESS_PROMPT}\n\nContenu à résumer:\n${content}`
            }
        ]
    });
    return response.content[0].type === 'text'
        ? response.content[0].text
        : String(response.content[0]);
}
/**
 * Compress content using Mistral AI
 */
async function compressWithMistral(content, apiKey, model = 'mistral-tiny', maxTokens = 30) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: 'user',
                    content: `${COMPRESS_PROMPT}\n\nContenu à résumer:\n${content}`
                }
            ],
            max_tokens: maxTokens
        })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mistral API error: ${error}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}
/**
 * Compress content using OpenAI
 */
async function compressWithOpenAI(content, apiKey, model = 'gpt-4o-mini', maxTokens = 30) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: 'user',
                    content: `${COMPRESS_PROMPT}\n\nContenu à résumer:\n${content}`
                }
            ],
            max_tokens: maxTokens
        })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}
/**
 * Compress content using Ollama (local, free)
 */
async function compressWithOllama(content, model = 'phi3', maxTokens = 30) {
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            prompt: `${COMPRESS_PROMPT}\n\nContenu à résumer:\n${content}`,
            stream: false,
            options: {
                num_predict: maxTokens
            }
        })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama error: ${error}`);
    }
    const data = await response.json();
    return data.response || '';
}
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
export async function compressWithLLM(content, provider, apiKey, model, maxTokens = 30) {
    const defaultModels = {
        anthropic: 'claude-3-5-haiku-20241022',
        mistral: 'mistral-tiny',
        openai: 'gpt-4o-mini',
        ollama: 'phi3'
    };
    const selectedModel = model || defaultModels[provider];
    switch (provider) {
        case 'anthropic':
            return await compressWithAnthropic(content, apiKey, selectedModel, maxTokens);
        case 'mistral':
            return await compressWithMistral(content, apiKey, selectedModel, maxTokens);
        case 'openai':
            return await compressWithOpenAI(content, apiKey, selectedModel, maxTokens);
        case 'ollama':
            return await compressWithOllama(content, selectedModel, maxTokens);
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}
/**
 * Estimate compression ratio for LLM compression
 * (This is an approximation based on typical LLM performance)
 */
export function estimateLLMRatio(_content) {
    // LLM typically achieves 80-120:1 ratio
    return 100;
}
//# sourceMappingURL=llm.js.map