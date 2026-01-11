/**
 * Incremental Indexer - Nexus
 * Updates FTS5 index incrementally for changed files
 * Atomic delete + insert operations to maintain consistency
 */

import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { Database } from '@nexus/storage';

interface IndexResult {
  path: string;
  success: boolean;
  chunksCreated: number;
  chunksDeleted: number;
  error?: string;
}

interface Chunk {
  startLine: number;
  endLine: number;
  content: string;
}

export class IncrementalIndexer {
  private readonly codeExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs',
    '.py', '.php', '.rb', '.go', '.rs',
    '.java', '.kt', '.scala', '.cs',
    '.c', '.cpp', '.h', '.hpp',
    '.json', '.yaml', '.yml', '.toml',
    '.md', '.txt', '.sh', '.bash',
    '.vue', '.svelte', '.jsx',
  ];

  /**
   * Update a single file in the index
   */
  async updateFile(db: Database, filePath: string, rootPath: string): Promise<IndexResult> {
    // filePath can be absolute or relative - use as-is if absolute, join with rootPath if relative
    const fullPath = filePath.startsWith('/') ? filePath : join(rootPath, filePath);

    try {
      // Check if file exists
      const fileStat = statSync(fullPath);
      if (!fileStat || !fileStat.isFile()) {
        // File was deleted or doesn't exist
        return this.deleteFile(db, filePath);
      }

      // Skip large files (> 1MB)
      if (fileStat.size > 1024 * 1024) {
        return {
          path: filePath,
          success: false,
          chunksCreated: 0,
          chunksDeleted: 0,
          error: 'File too large (> 1MB)',
        };
      }

      // Skip if not a code/text file
      if (!this.isCodeFile(filePath)) {
        return {
          path: filePath,
          success: true,
          chunksCreated: 0,
          chunksDeleted: 0,
        };
      }

      // Read content
      const content = readFileSync(fullPath, 'utf-8');

      // Start transaction
      await db.exec('BEGIN TRANSACTION');

      try {
        // 1. Delete old chunks
        const chunksDeleted = await this.deleteChunks(db, filePath);

        // 2. Get or create file entry
        const fileId = await this.getOrCreateFile(db, filePath, fileStat.size);

        // 3. Create new chunks
        const chunksCreated = await this.insertChunks(db, fileId, filePath, content);

        // 4. Update FTS5
        await this.updateFTS5(db, fileId);

        await db.exec('COMMIT');

        return {
          path: filePath,
          success: true,
          chunksCreated,
          chunksDeleted,
        };
      } catch (e) {
        await db.exec('ROLLBACK');
        throw e;
      }
    } catch (e) {
      return {
        path: filePath,
        success: false,
        chunksCreated: 0,
        chunksDeleted: 0,
        error: String(e),
      };
    }
  }

  /**
   * Delete a file from the index
   */
  private async deleteFile(db: Database, filePath: string): Promise<IndexResult> {
    await db.exec('BEGIN TRANSACTION');

    try {
      // Get file ID if exists
      const file = db.queryOne('SELECT id FROM files WHERE path = ?', filePath);

      if (!file) {
        return {
          path: filePath,
          success: true,
          chunksCreated: 0,
          chunksDeleted: 0,
        };
      }

      // Delete chunks
      const chunksDeleted = await this.deleteChunks(db, filePath);

      // Delete embeddings
      const fileRecord = db.queryOne('SELECT id FROM files WHERE path = ?', filePath);
      if (fileRecord) {
        await db.run('DELETE FROM embeddings WHERE chunk_id IN (SELECT id FROM chunks WHERE file_id = ?)', fileRecord.id);
      }

      // Delete file entry
      await db.run('DELETE FROM files WHERE path = ?', filePath);

      await db.exec('COMMIT');

      return {
        path: filePath,
        success: true,
        chunksCreated: 0,
        chunksDeleted,
      };
    } catch (e) {
      await db.exec('ROLLBACK');
      throw e;
    }
  }

  /**
   * Delete old chunks for a file
   */
  private async deleteChunks(db: Database, filePath: string): Promise<number> {
    // First get the file_id by joining with files table
    const file = db.queryOne('SELECT id FROM files WHERE path = ?', filePath);
    if (!file) {
      return 0;
    }

    // Delete chunks using file_id
    const result = await db.run('DELETE FROM chunks WHERE file_id = ?', file.id);
    return result.changes || 0;
  }

  /**
   * Get or create file entry
   */
  private async getOrCreateFile(db: Database, filePath: string, size: number): Promise<number> {
    const existing = await db.queryOne<{ id: number }>('SELECT id FROM files WHERE path = ?', filePath);

    if (existing && existing.id) {
      // Update size and timestamp
      await db.run(`
        UPDATE files
        SET size = ?, mtime = ?, indexed_at = ?
        WHERE id = ?
      `, size, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000), existing.id);
      return existing.id;
    }

    // Create new file entry
    const result = await db.run(`
      INSERT INTO files (path, hash, mtime, size, indexed_at)
      VALUES (?, ?, ?, ?, ?)
    `, filePath, 'xxh64:placeholder', Math.floor(Date.now() / 1000), size, Math.floor(Date.now() / 1000));

    return Number(result.lastInsertRowid);
  }

  /**
   * Create chunks from file content
   */
  private async insertChunks(db: Database, fileId: number, _filePath: string, content: string): Promise<number> {
    const chunks = this.chunkContent(content);

    const stmt = db.prepare(`
      INSERT INTO chunks (file_id, start_line, end_line, content)
      VALUES (?, ?, ?, ?)
    `);

    for (const chunk of chunks) {
      await stmt.run(fileId, chunk.startLine, chunk.endLine, chunk.content);
    }

    return chunks.length;
  }

  /**
   * Chunk file content by lines
   */
  private chunkContent(content: string): Chunk[] {
    const lines = content.split('\n');
    const chunks: Chunk[] = [];
    const maxChunkSize = 100; // lines per chunk

    for (let i = 0; i < lines.length; i += maxChunkSize) {
      const endLine = Math.min(i + maxChunkSize, lines.length);
      const chunkContent = lines.slice(i, endLine).join('\n');

      chunks.push({
        startLine: i + 1,
        endLine,
        content: chunkContent,
      });
    }

    return chunks;
  }

  /**
   * Update FTS5 index
   */
  private updateFTS5(_db: Database, _fileId: number): Promise<void> {
    // FTS5 is automatically updated via triggers
    // This is a placeholder for any additional FTS5 operations
    return Promise.resolve();
  }

  /**
   * Check if file is a code/text file
   */
  private isCodeFile(filePath: string): boolean {
    return this.codeExtensions.some(ext => filePath.endsWith(ext));
  }

  /**
   * Update multiple files (batch processing)
   */
  async updateFiles(db: Database, filePaths: string[], rootPath: string, batchSize = 10): Promise<IndexResult[]> {
    const results: IndexResult[] = [];

    // Process in batches
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);

      for (const path of batch) {
        const result = await this.updateFile(db, path, rootPath);
        results.push(result);
      }

      const successCount = batch.filter((_, idx) => results[i + idx].success).length;
      console.log(`[Indexer] Batch ${Math.floor(i / batchSize) + 1}: ${successCount}/${batch.length} succeeded`);
    }

    return results;
  }

  /**
   * Retry failed index operations
   */
  async retryFailed(db: Database, rootPath: string): Promise<IndexResult[]> {
    const failed = await db.query('SELECT * FROM index_failures') as any[];
    const results: IndexResult[] = [];

    for (const row of failed) {
      const result = await this.updateFile(db, row.file_path, rootPath);
      results.push(result);

      if (result.success) {
        await db.run('DELETE FROM index_failures WHERE file_path = ?', row.file_path);
        console.log(`[Indexer] ✓ Retry succeeded: ${row.file_path}`);
      } else {
        await db.run(`
          UPDATE index_failures
          SET retry_count = retry_count + 1, last_retry_at = ?
          WHERE file_path = ?
        `, Math.floor(Date.now() / 1000), row.file_path);
        console.log(`[Indexer] ✗ Retry failed: ${row.file_path}`);
      }
    }

    return results;
  }
}
