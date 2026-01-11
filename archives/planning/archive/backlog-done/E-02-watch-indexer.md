# Epic E-02: Indexation Continue (File Watcher)

**Epic Owner**: Backend Team
**Status**: Ready for Sprint 2
**Priority**: P0
**Estimate**: 4 days

---

## Overview

Implémenter un file watcher qui surveille le filesystem et met à jour l'index FTS5 en temps réel, similaire à `mgrep watch`.

---

## Business Value

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Index freshness | Manuel (jours) | Auto (< 5s) | -99% |
| Recherches stale | 30% | < 1% | -97% |
| Indexation frequency | 1/week | Continu | ∞ |

---

## User Stories

| ID | Story | Points | Sprint |
|----|-------|--------|--------|
| S-05 | File Watcher | 3 | 2 |
| S-06 | Incremental Index | 5 | 2 |
| S-07 | Pause/Resume | 1 | 2 |

See individual story files for details.

---

## Technical Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  Filesystem  │────▶│   Watcher   │────▶│   Debounce   │────▶│  Indexer │
│              │     │  (chokidar) │     │   (500ms)    │     │          │
│  src/*.ts    │     │             │     │              │     │          │
│  modified    │     │  .gitignore │     │  Queue       │     │  Chunks  │
└──────────────┘     └─────────────┘     └──────────────┘     └────┬────┘
                                                                    │
                                                                    ▼
                                                             ┌─────────────┐
                                                             │   SQLite    │
                                                             │  + FTS5     │
                                                             └─────────────┘
```

---

## Component Design

### 1. Watcher Service

**File**: `apps/api/src/services/watcher.ts`

```typescript
interface WatcherConfig {
  rootPath: string
  debounceMs: number
  ignorePatterns: string[]
  batchSize: number
}

class FileWatcher {
  private watcher: chokidar.FSWatcher
  private queue: Map<string, number> = new Map()
  private timer: NodeJS.Timeout | null = null

  start() {
    this.watcher = chokidar.watch(this.rootPath, {
      ignored: this.ignorePatterns,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      }
    })

    this.watcher
      .on('add', this.onFileAdd.bind(this))
      .on('change', this.onFileChange.bind(this))
      .on('unlink', this.onFileDelete.bind(this))
  }

  private onFileChange(path: string) {
    this.queue.set(path, Date.now())
    this.scheduleFlush()
  }

  private scheduleFlush() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), this.debounceMs)
  }

  private async flush() {
    const files = Array.from(this.queue.entries())
    this.queue.clear()

    // Batch index
    await indexer.indexFiles(files.map(f => f[0]))
  }
}
```

### 2. Incremental Indexer

**File**: `packages/indexer/src/incremental.ts`

```typescript
class IncrementalIndexer {
  async updateFile(db: Database, filePath: string) {
    // 1. Delete old chunks
    db.run('DELETE FROM chunks WHERE file_path = ?', [filePath])

    // 2. Check if file exists
    if (!existsSync(filePath)) {
      // File deleted, also remove from files table
      db.run('DELETE FROM files WHERE path = ?', [filePath])
      return
    }

    // 3. Read and chunk
    const content = readFileSync(filePath, 'utf-8')
    const chunks = chunker.chunk(filePath, content)

    // 4. Insert new chunks
    const fileId = this.getOrCreateFile(db, filePath)
    const stmt = db.prepare(`
      INSERT INTO chunks (file_id, start_line, end_line, content)
      VALUES (?, ?, ?, ?)
    `)

    for (const chunk of chunks) {
      stmt.run(fileId, chunk.startLine, chunk.endLine, chunk.content)
    }

    // 5. Update FTS5
    this.updateFTS5(db, fileId, chunks)
  }
}
```

### 3. CLI Interface

**File**: `apps/cli/src/watch.ts`

```typescript
export const watchCommand = new Command()
  .name('watch')
  .description('Watch files and maintain index')
  .option('--pause', 'Pause watching')
  .option('--resume', 'Resume watching')
  .option('--status', 'Show watcher status')
  .action(async (options) => {
    const api = new NexusAPI('http://localhost:3001')

    if (options.pause) {
      await api.post('/watcher/pause')
      console.log('✓ Watcher paused')
    } else if (options.resume) {
      await api.post('/watcher/resume')
      console.log('✓ Watcher resumed')
    } else if (options.status) {
      const status = await api.get('/watcher/status')
      console.log(JSON.stringify(status, null, 2))
    } else {
      console.log('🔄 Starting Nexus watcher...')
      console.log('   Press Ctrl+C to stop')

      const watcher = new FileWatcher({
        rootPath: process.cwd(),
        debounceMs: 500,
        ignorePatterns: readGitignore()
      })

      watcher.start()

      // Keep alive
      await new Promise(() => {})
    }
  })
```

---

## API Endpoints

### POST /watcher/start
Démarre le watcher

**Request**:
```json
{
  "root_path": "/path/to/repo"
}
```

**Response**: `200 OK`

### POST /watcher/pause
Met en pause le watcher (accumule les événements)

**Response**: `200 OK` with queued count

### POST /watcher/resume
Reprend le watcher et indexe les fichiers accumulés

**Response**: `200 OK` with indexed count

### GET /watcher/status
Status du watcher

**Response**:
```json
{
  "status": "running",  // "running", "paused", "stopped"
  "queued_files": 0,
  "last_index_at": 1705000000,
  "files_indexed": 1523,
  "uptime_seconds": 3600
}
```

---

## .gitignore Handling

```typescript
import { parse } from 'gitignore-globs'

function readGitignore(cwd: string): string[] {
  const gitignorePath = join(cwd, '.gitignore')
  if (!existsSync(gitignorePath)) {
    return ['node_modules', '.git', 'dist', 'build']
  }

  const content = readFileSync(gitignorePath, 'utf-8')
  return parse(content)
}

// Also support .nexusignore for local override
function readNexusIgnore(cwd: string): string[] {
  const ignorePath = join(cwd, '.nexusignore')
  if (!existsSync(ignorePath)) return []

  return readFileSync(ignorePath, 'utf-8')
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
}
```

---

## Performance Optimizations

### 1. Debounce Strategy

```typescript
// Exponential backoff for burst changes
class SmartDebounce {
  private delay = 100
  private maxDelay = 2000

  schedule(callback: () => void) {
    setTimeout(callback, this.delay)
    this.delay = Math.min(this.delay * 2, this.maxDelay)
  }

  reset() {
    this.delay = 100
  }
}
```

### 2. Parallel Batching

```typescript
async function batchIndex(files: string[]) {
  const batches = chunk(files, 10) // 10 files at a time

  for (const batch of batches) {
    await Promise.all(
      batch.map(f => indexer.updateFile(db, f))
    )
  }
}
```

### 3. Rate Limiting

```typescript
function checkSystemLoad(): boolean {
  const usage = process.cpuUsage()
  const memoryPercent = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100

  return memoryPercent < 80 // Only index if memory < 80%
}
```

---

## Definition of Done

Epic is complete when:
- [ ] All 3 user stories completed
- [ ] CLI `nexus watch` fonctionne
- [ ] .gitignore respecté correctement
- [ ] Index freshness < 5s
- [ ] Pause/resume fonctionne
- [ ] Tests sur repo avec 10k+ files
- [ ] CPU usage < 5% en idle

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| chokidar (Bun compatible) | Library | ⏳ To test |
| gitignore-globs | Library | ✅ OK |
| SQLite transactions | Internal | ✅ OK |

---

## Risks

See R-02 (Watcher Performance), R-03 (SQLite Lock), R-07 (False Positive) in `product/07-risks.md`

---

## Open Questions

| Question | Impact | Decision Needed |
|----------|--------|-----------------|
| Comportement sur git checkout ? | Medium | Sprint 2 |
| Limite taille fichier indexé ? | Low | Sprint 2 |

---

## Notes

- Inspiré de `mgrep watch` : https://github.com/mixedbread-ai/mgrep
- Watcher doit être résilient aux crashs (restart automatique)
- Logs clairs pour debugging (fichiers indexés, erreurs)
