/**
 * FTS5 Search - SQLite full-text search with BM25 ranking
 *
 * Features:
 * - BM25 relevance scoring (like mgrep)
 * - Native SQLite (no external dependencies)
 * - Instant search on indexed content
 */
// ============================================
// FTS5 SEARCH
// ============================================
/**
 * Search chunks using FTS5 with BM25 ranking
 */
export function ftsSearch(db, query, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const startTime = Date.now();
    // Escape special FTS5 characters
    const escapedQuery = escapeQuery(query);
    // FTS5 search with BM25 ranking
    // bm25(chunks_fts) returns negative scores (more negative = more relevant)
    // We negate it to get positive scores
    const sql = `
    SELECT
      c.id as chunkId,
      c.file_id as fileId,
      f.path,
      c.start_line as startLine,
      c.end_line as endLine,
      c.content,
      c.symbol,
      -bm25(chunks_fts) as score
    FROM chunks_fts
    JOIN chunks c ON chunks_fts.rowid = c.id
    JOIN files f ON c.file_id = f.id
    WHERE chunks_fts MATCH ?
    ORDER BY score DESC
    LIMIT ? OFFSET ?
  `;
    const hits = db.query(sql, [escapedQuery, limit, offset]);
    // Get total count
    const countSql = `
    SELECT COUNT(*) as count
    FROM chunks_fts
    WHERE chunks_fts MATCH ?
  `;
    const countResult = db.queryOne(countSql, [escapedQuery]);
    return {
        query,
        hits,
        totalHits: countResult?.count || 0,
        processingTimeMs: Date.now() - startTime,
    };
}
/**
 * Quick search with default options
 */
export function quickFtsSearch(db, query, limit = 10) {
    return ftsSearch(db, query, { limit }).hits;
}
/**
 * Search with path filter
 */
export function ftsSearchInPath(db, query, pathPattern, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const startTime = Date.now();
    const escapedQuery = escapeQuery(query);
    const sql = `
    SELECT
      c.id as chunkId,
      c.file_id as fileId,
      f.path,
      c.start_line as startLine,
      c.end_line as endLine,
      c.content,
      c.symbol,
      -bm25(chunks_fts) as score
    FROM chunks_fts
    JOIN chunks c ON chunks_fts.rowid = c.id
    JOIN files f ON c.file_id = f.id
    WHERE chunks_fts MATCH ?
      AND f.path LIKE ?
    ORDER BY score DESC
    LIMIT ? OFFSET ?
  `;
    const hits = db.query(sql, [escapedQuery, pathPattern, limit, offset]);
    return {
        query,
        hits,
        totalHits: hits.length, // Approximate for filtered
        processingTimeMs: Date.now() - startTime,
    };
}
// ============================================
// FORMATTING (mgrep style)
// ============================================
/**
 * Format match in mgrep compact style: path:lines [score%]
 */
export function formatMgrep(match) {
    const scorePercent = Math.round(match.score * 10); // Normalize score
    return `./${match.path}:${match.startLine}-${match.endLine} [${scorePercent}%]`;
}
/**
 * Format all matches in mgrep style
 */
export function formatMgrepList(matches) {
    return matches.map(formatMgrep).join('\n');
}
/**
 * Format match with content preview
 */
export function formatWithPreview(match, maxLines = 3) {
    const header = formatMgrep(match);
    const lines = match.content.split('\n').slice(0, maxLines);
    const preview = lines.map(l => `  ${l}`).join('\n');
    return `${header}\n${preview}`;
}
// ============================================
// HELPERS
// ============================================
/**
 * Escape special FTS5 query characters
 */
function escapeQuery(query) {
    // FTS5 special characters: " * - + ( ) : ^
    // For simple keyword search, we wrap in quotes if it contains spaces
    // and escape internal quotes
    if (query.includes(' ') && !query.startsWith('"')) {
        // Phrase search - wrap in quotes
        return `"${query.replace(/"/g, '""')}"`;
    }
    // Single word - use as is (FTS5 handles it)
    return query;
}
/**
 * Build FTS5 query for multiple terms (AND)
 */
export function buildAndQuery(terms) {
    return terms.map(t => `"${t.replace(/"/g, '""')}"`).join(' AND ');
}
/**
 * Build FTS5 query for multiple terms (OR)
 */
export function buildOrQuery(terms) {
    return terms.map(t => `"${t.replace(/"/g, '""')}"`).join(' OR ');
}
/**
 * Build prefix query for autocomplete
 */
export function buildPrefixQuery(prefix) {
    return `${prefix}*`;
}
//# sourceMappingURL=fts5.js.map