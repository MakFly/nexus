/**
 * @nexus/core - Algorithmic Compressor (No API key required)
 * Sprint 7: Compression 100:1 - Fallback mode
 *
 * Ratio cible: ~30:1 (vs 100:1 avec LLM)
 * Coût: Gratuit
 * Latence: ~5ms
 */

/**
 * Count approximate tokens (rough estimate: ~4 chars per token)
 */
function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to approximately max tokens
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 3) + '...';
}

/**
 * Parse structured content (JSON, code, etc.)
 */
function tryParseStructured(content: string): any {
  // Try JSON first
  if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
    try {
      return JSON.parse(content);
    } catch {
      // Not valid JSON, continue
    }
  }

  // Return as-is for unstructured content
  return { raw: content };
}

/**
 * Extract keywords using TF-IDF (simplified)
 */
function extractKeywords(text: string, maxKeywords = 10): string[] {
  // Tokenize and normalize
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  // Count frequencies
  const freq = new Map<string, number>();
  words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));

  // Stopwords to exclude
  const stopwords = new Set([
    'this', 'that', 'with', 'from', 'have', 'been', 'were', 'was',
    'they', 'them', 'their', 'there', 'here', 'where', 'when', 'what',
    'which', 'while', 'will', 'would', 'could', 'should', 'about'
  ]);

  // Sort by frequency and return top keywords
  return Array.from(freq.entries())
    .filter(([w]) => !stopwords.has(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([w]) => w);
}

/**
 * Extract symbols (paths, functions, classes)
 */
function extractSymbols(text: string, maxSymbols = 15): string[] {
  const patterns = [
    // File paths (src/lib/...)
    /(?:src|lib|app|packages|apps|components|pages|utils)\/[\w/.\-]+\.\w+/g,
    // Function declarations
    /(?:function|const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/g,
    // Class declarations
    /class\s+(\w+)/g,
    // Method calls
    /(\w+)\.\w+\s*\(/g,
  ];

  const symbols = new Set<string>();

  // Extract from original text
  patterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(m => {
      // Extract the actual symbol name from the match
      const symbolMatch = m.match(/(\w+)(?:\.\w+)?$/);
      if (symbolMatch) {
        symbols.add(symbolMatch[1]);
      }
    });
  });

  // Also try to parse as JSON for structured data
  const parsed = tryParseStructured(text);
  if (parsed.files && Array.isArray(parsed.files)) {
    parsed.files.forEach((f: string) => symbols.add(f));
  }
  if (parsed.matches && Array.isArray(parsed.matches)) {
    parsed.matches.forEach((m: any) => {
      if (m.file) symbols.add(m.file);
      if (m.symbol) symbols.add(m.symbol);
    });
  }

  return Array.from(symbols).slice(0, maxSymbols);
}

/**
 * Extract important numbers (stats, counts, line numbers)
 */
function extractNumbers(text: string, maxNumbers = 5): string[] {
  const numbers: string[] = [];

  // Match common patterns: "X files", "Y errors", line numbers like ":123"
  const patterns = [
    /(\d+)\s*(?:files?|chunks?|matches?|errors?|items?|results?)/gi,
    /:(\d{3,})/g,  // Line numbers (3+ digits)
    /(\d{4,})\s*(?:bytes?|chars?|tokens?)/gi,
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(m => numbers.push(m));
  });

  return Array.from(new Set(numbers)).slice(0, maxNumbers);
}

/**
 * Build compact summary from extracted data
 */
function buildCompactSummary(data: {
  keywords: string[];
  symbols: string[];
  numbers: string[];
  lineCount: number;
}): string {
  const parts: string[] = [];

  if (data.symbols.length > 0) {
    const displaySymbols = data.symbols.slice(0, 5).map(s => {
      // Shorten long paths
      if (s.includes('/')) {
        const parts = s.split('/');
        return parts.length > 2 ? `.../${parts.slice(-2).join('/')}` : s;
      }
      return s;
    });
    parts.push(`Files: ${displaySymbols.join(', ')}`);
  }

  if (data.keywords.length > 0) {
    parts.push(`Keys: ${data.keywords.slice(0, 5).join(', ')}`);
  }

  if (data.numbers.length > 0) {
    parts.push(`Stats: ${data.numbers.join(', ')}`);
  }

  parts.push(`(${data.lineCount} lines)`);

  return parts.join(' | ');
}

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
export function compressAlgorithmic(content: string, maxTokens = 50): string {
  // Parse content
  tryParseStructured(content);

  // Extract key information
  const keywords = extractKeywords(content);
  const symbols = extractSymbols(content);
  const numbers = extractNumbers(content);
  const lineCount = content.split('\n').length;

  // Build summary
  const summary = buildCompactSummary({
    keywords,
    symbols,
    numbers,
    lineCount
  });

  // Truncate if necessary
  return truncateToTokens(summary, maxTokens);
}

/**
 * Estimate compression ratio for algorithmic compression
 */
export function estimateAlgorithmicRatio(content: string): number {
  const inputTokens = countTokens(content);
  const compressed = compressAlgorithmic(content, 50);
  const outputTokens = countTokens(compressed);
  return inputTokens / outputTokens;
}
