# Story S-06: Incremental Index

**Epic**: E-02 Indexation Continue
**Status**: Ready
**Priority**: P0
**Points**: 5
**Sprint**: 2

---

## User Story

**As a** système Nexus
**I want** mettre à jour uniquement les fichiers modifiés
**So that** l'indexation est rapide et n'impacte pas les performances

---

## Acceptance Criteria

### AC-01: Delete Old Chunks
```gherkin
Given un fichier a été modifié
When l'indexer traite le changement
Then:
  - Les anciens chunks de ce fichier sont supprimés
  - La suppression est faite en une transaction
  - La table files est mise à jour (updated_at)
```

### AC-02: Create New Chunks
```gherkin
Given le contenu d'un fichier est lu
When l'indexer traite le changement
Then:
  - Le fichier est chunké selon les règles de langage
  - Les chunks sont insérés dans la table chunks
  - FTS5 est mis à jour avec les nouveaux chunks
  - L'opération est atomique
```

### AC-03: Handle File Deletion
```gherkin
Given un fichier est supprimé du filesystem
When l'indexer traite l'événement
Then:
  - Tous les chunks du fichier sont supprimés
  - L'entrée dans la table files est supprimée
  - Les embeddings associés sont supprimés (si présents)
```

### AC-04: Parallel Processing
```gherkin
Given N fichiers doivent être indexés
When l'indexer traite le batch
Then:
  - Les fichiers sont traités par lots de 10
  - Chaque lot est traité en parallèle
  - Un maximum de 3 lots sont traités simultanément
  - La progression est affichée
```

### AC-05: Error Recovery
```gherkin
Given un fichier provoque une erreur d'indexation
When l'erreur se produit
Then:
  - L'erreur est loguée avec le filepath
  - Les autres fichiers continuent d'être indexés
  - Le fichier est marqué "failed" dans une table de tracking
  - Un retry peut être fait manuellement
```

---

## Technical Specification

### Incremental Indexer Service

```typescript
// packages/indexer/src/incremental.ts

import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import type { Database } from '@nexus/storage'

interface IndexResult {
  path: string
  success: boolean
  chunksCreated: number
  chunksDeleted: number
  error?: string
}

class IncrementalIndexer {
  private chunker: CodeChunker

  constructor() {
    this.chunker = new CodeChunker()
  }

  async updateFile(db: Database, filePath: string, rootPath: string): Promise<IndexResult> {
    const fullPath = join(rootPath, filePath)

    try {
      // Check if file exists
      const fileStat = await stat(fullPath).catch(() => null)

      if (!fileStat) {
        // File was deleted
        return this.deleteFile(db, filePath)
      }

      // Skip if not a file
      if (!fileStat.isFile()) {
        return { path: filePath, success: true, chunksCreated: 0, chunksDeleted: 0 }
      }

      // Skip large files (> 1MB)
      if (fileStat.size > 1024 * 1024) {
        return {
          path: filePath,
          success: false,
          chunksCreated: 0,
          chunksDeleted: 0,
          error: 'File too large (> 1MB)'
        }
      }

      // Read content
      const content = await readFile(fullPath, 'utf-8')

      // Start transaction
      await db.exec('BEGIN TRANSACTION')

      try {
        // 1. Delete old chunks
        const deleteResult = await this.deleteChunks(db, filePath)

        // 2. Get or create file entry
        const fileId = await this.getOrCreateFile(db, filePath, fileStat)

        // 3. Create new chunks
        const chunks = this.chunker.chunk(filePath, content)
        const chunksCreated = await this.insertChunks(db, fileId, chunks)

        // 4. Update FTS5
        await this.updateFTS5(db, fileId, chunks)

        // 5. Update file metadata
        await db.run(`
          UPDATE files
          SET size = ?, updated_at = ?
          WHERE id = ?
        `, [fileStat.size, Math.floor(Date.now() / 1000), fileId])

        await db.exec('COMMIT')

        return {
          path: filePath,
          success: true,
          chunksCreated,
          chunksDeleted: deleteResult
        }

      } catch (e) {
        await db.exec('ROLLBACK')
        throw e
      }

    } catch (e) {
      return {
        path: filePath,
        success: false,
        chunksCreated: 0,
        chunksDeleted: 0,
        error: String(e)
      }
    }
  }

  private async deleteFile(db: Database, filePath: string): Promise<IndexResult> {
    await db.exec('BEGIN TRANSACTION')

    try {
      // Get file ID
      const file = await db.get('SELECT id FROM files WHERE path = ?', [filePath])

      if (!file) {
        return { path: filePath, success: true, chunksCreated: 0, chunksDeleted: 0 }
      }

      // Delete chunks
      const deleteResult = await this.deleteChunks(db, filePath)

      // Delete embeddings
      await db.run('DELETE FROM embeddings WHERE chunk_id IN (SELECT id FROM chunks WHERE file_path = ?)', [filePath])

      // Delete file entry
      await db.run('DELETE FROM files WHERE path = ?', [filePath])

      await db.exec('COMMIT')

      return {
        path: filePath,
        success: true,
        chunksCreated: 0,
        chunksDeleted: deleteResult
      }

    } catch (e) {
      await db.exec('ROLLBACK')
      throw e
    }
  }

  private async deleteChunks(db: Database, filePath: string): Promise<number> {
    const result = await db.run('DELETE FROM chunks WHERE file_path = ?', [filePath])
    return result.changes || 0
  }

  private async getOrCreateFile(db: Database, filePath: string, fileStat: any): Promise<number> {
    const existing = await db.get('SELECT id FROM files WHERE path = ?', [filePath])

    if (existing) {
      return existing.id
    }

    const result = await db.run(`
      INSERT INTO files (path, size, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `, [filePath, fileStat.size, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)])

    return result.lastInsertRowid as number
  }

  private async insertChunks(db: Database, fileId: number, chunks: Chunk[]): Promise<number> {
    const stmt = db.prepare(`
      INSERT INTO chunks (file_id, file_path, start_line, end_line, content)
      VALUES (?, ?, ?, ?, ?)
    `)

    for (const chunk of chunks) {
      await stmt.run(fileId, chunk.filePath, chunk.startLine, chunk.endLine, chunk.content)
    }

    return chunks.length
  }

  private async updateFTS5(db: Database, fileId: number, chunks: Chunk[]): Promise<void> {
    // FTS5 is automatically updated via triggers
    // But we can force a reindex if needed
    await db.run(`
      INSERT INTO chunks_fts(chunks_fts)
      VALUES ('rebuild')
    `)
  }

  async updateFiles(db: Database, filePaths: string[], rootPath: string, batchSize = 10): Promise<IndexResult[]> {
    const results: IndexResult[] = []

    // Process in batches
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize)

      const batchResults = await Promise.all(
        batch.map(path => this.updateFile(db, path, rootPath))
      )

      results.push(...batchResults)

      // Log progress
      const successCount = batchResults.filter(r => r.success).length
      console.log(`[Indexer] Processed ${i + batch.length}/${filePaths.length} files (${successCount} succeeded)`)
    }

    return results
  }
}

export { IncrementalIndexer }
```

### Failed Files Tracking

```sql
-- New table for tracking failed files
CREATE TABLE index_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  error_message TEXT,
  failed_at INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_retry_at INTEGER
);

CREATE INDEX idx_index_failures_path ON index_failures(file_path);
```

### Retry Command

```typescript
// apps/cli/src/commands/index-retry.ts

export const retryFailedCommand = new Command()
  .name('retry-failed')
  .description('Retry indexing failed files')
  .action(async () => {
    const db = await getDb()
    const indexer = new IncrementalIndexer()

    const failed = await db.all('SELECT * FROM index_failures')

    if (failed.length === 0) {
      console.log('✓ No failed files to retry')
      return
    }

    console.log(`Retrying ${failed.length} failed files...`)

    for (const file of failed) {
      const result = await indexer.updateFile(db, file.file_path, process.cwd())

      if (result.success) {
        await db.run('DELETE FROM index_failures WHERE file_path = ?', [file.file_path])
        console.log(`✓ ${file.file_path}`)
      } else {
        await db.run(`
          UPDATE index_failures
          SET retry_count = retry_count + 1, last_retry_at = ?
          WHERE file_path = ?
        `, [Math.floor(Date.now() / 1000), file.file_path])
        console.log(`✗ ${file.file_path}: ${result.error}`)
      }
    }
  })
```

---

## Database Schema Additions

```sql
-- New table for tracking failed index operations
CREATE TABLE IF NOT EXISTS index_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  error_message TEXT,
  failed_at INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_retry_at INTEGER
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_index_failures_path
ON index_failures(file_path);
```

---

## Definition of Done

- [ ] Service IncrementalIndexer implémenté
- [ ] Delete + insert atomique
- [ ] Gestion des fichiers supprimés
- [ ] Batch processing OK
- [ ] Tracking des erreurs en place
- [ ] Command retry-failed fonctionne
- [ ] Tests sur scénarios variés
- [ ] Performance OK

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| CodeChunker | Internal | ✅ OK |
| Database schema | Internal | ⏳ Migration needed |
| Story S-05 (watcher) | Internal | Blocked |

---

## Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Avg Update Time | < 100ms | Per file |
| Batch Throughput | > 50 files/s | For < 1KB files |
| Failure Rate | < 1% | Files that fail |
| Retry Success Rate | > 50% | Failed files that pass on retry |

---

## Notes

- Transactions garantissent la consistence
- Retry permet de corriger les erreurs temporaires
- Logs de progression pour l'utilisateur
