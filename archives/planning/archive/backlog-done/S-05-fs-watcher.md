# Story S-05: File Watcher

**Epic**: E-02 Indexation Continue
**Status**: Ready
**Priority**: P0
**Points**: 3
**Sprint**: 2

---

## User Story

**As a** développeur
**I want** que Nexus surveille mes fichiers automatiquement
**So that** l'index est toujours à jour sans action manuelle

---

## Acceptance Criteria

### AC-01: Start Watching
```gherkin
Given le watcher est lancé via "nexus watch"
When le service démarre
Then:
  - Le filesystem est surveillé à partir du cwd
  - Les événements sont capturés: add, change, unlink
  - Le .gitignore est respecté
  - Un message "🔄 Watching X files" est affiché
```

### AC-02: .gitignore Handling
```gherkin
Given un fichier correspond au .gitignore est modifié
When le changement est détecté
Then:
  - Le fichier est ignoré (pas ajouté à la queue)
  - Les patterns .gitignore sont rechargés si modifiés
  - Un .nexusignore local peut override
```

### AC-03: Event Debouncing
```gherkin
Given un fichier est modifié plusieurs fois rapidement
When les événements sont détectés
Then:
  - Les événements sont mergeés dans une fenêtre de 500ms
  - Un seul événement est envoyé à l'indexer
  - La dernière version du fichier est indexée
```

### AC-04: Directory Exclusions
```gherkin
Given des répertoires standard sont présents
When le watcher démarre
Then ces répertoires sont automatiquement exclus:
  - node_modules/
  - .git/
  - dist/
  - build/
  - .next/
  - coverage/
  - *.min.js, *.min.css
```

### AC-05: Initial Scan Skip
```gherkin
Given le watcher démarre sur un repo existant
When l'initialisation se fait
Then:
  - Aucune indexation initiale n'est faite
  - Seuls les nouveaux changements sont capturés
  - L'utilisateur peut lancer "nexus index" séparément si besoin
```

---

## Technical Specification

### Watcher Service

```typescript
// apps/api/src/services/watcher.ts

import chokidar from 'chokidar'
import { parse } from 'gitignore-globs'
import { join } from 'path'

interface WatcherConfig {
  rootPath: string
  debounceMs: number
  ignored: string[]
}

class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null
  private queue: Map<string, number> = new Map()
  private debounceTimer: NodeJS.Timeout | null = null
  private isPaused = false

  constructor(private config: WatcherConfig) {}

  start() {
    // Load .gitignore patterns
    const ignorePatterns = this.loadIgnorePatterns()

    this.watcher = chokidar.watch(this.config.rootPath, {
      ignored: ignorePatterns,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      },
      persistent: true
    })

    this.watcher
      .on('add', (path) => this.onFileChange(path, 'add'))
      .on('change', (path) => this.onFileChange(path, 'change'))
      .on('unlink', (path) => this.onFileChange(path, 'unlink'))
      .on('error', (error) => console.error('[Watcher] Error:', error))
      .on('ready', () => this.onReady())
  }

  private loadIgnorePatterns(): string[] {
    // Default exclusions
    const defaults = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.min.css',
      '**/.cache/**'
    ]

    // Load .gitignore
    const gitignorePath = join(this.config.rootPath, '.gitignore')
    let gitignorePatterns: string[] = []

    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf-8')
      gitignorePatterns = parse(content)
    }

    // Load .nexusignore (local override)
    const nexusignorePath = join(this.config.rootPath, '.nexusignore')
    let nexusignorePatterns: string[] = []

    if (existsSync(nexusignorePath)) {
      const content = readFileSync(nexusignorePath, 'utf-8')
      nexusignorePatterns = content.split('\n')
        .filter(line => line && !line.startsWith('#'))
    }

    return [...defaults, ...gitignorePatterns, ...nexusignorePatterns]
  }

  private onFileChange(path: string, eventType: string) {
    if (this.isPaused) {
      this.queue.set(path, Date.now())
      return
    }

    this.queue.set(path, Date.now())
    this.scheduleFlush()
  }

  private scheduleFlush() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.flush()
    }, this.config.debounceMs)
  }

  private async flush() {
    const files = Array.from(this.queue.entries())
    this.queue.clear()

    if (files.length === 0) return

    console.log(`[Watcher] Indexing ${files.length} files...`)

    // Send to indexer
    await this.indexFiles(files.map(f => f[0]))

    console.log(`[Watcher] ✓ Indexed ${files.length} files`)
  }

  private async indexFiles(filePaths: string[]) {
    // Call indexer service
    const indexer = new IncrementalIndexer()
    const db = await getDb()

    for (const path of filePaths) {
      try {
        await indexer.updateFile(db, path)
      } catch (e) {
        console.error(`[Watcher] Failed to index ${path}:`, e)
      }
    }
  }

  private onReady() {
    const watchedCount = this.watcher?.getWatched().size || 0
    console.log(`[Watcher] 🔄 Watching for changes...`)
  }

  pause() {
    this.isPaused = true
    console.log('[Watcher] ⏸ Paused (events are queued)')
  }

  resume() {
    this.isPaused = false
    console.log(`[Watcher] ▶ Resumed (processing ${this.queue.size} queued files)`)
    this.flush()
  }

  stop() {
    this.watcher?.close()
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }

  getStatus() {
    return {
      isRunning: this.watcher !== null,
      isPaused: this.isPaused,
      queuedFiles: this.queue.size,
      watchedPaths: this.watcher?.getWatched().size || 0
    }
  }
}
```

### CLI Command

```typescript
// apps/cli/src/commands/watch.ts

import { FileWatcher } from '@nexus/watcher'

export const watchCommand = new Command()
  .name('watch')
  .description('Watch files and maintain index')
  .option('--root <path>', 'Root path to watch', { default: process.cwd() })
  .option('--debounce <ms>', 'Debounce delay in ms', { default: 500 })
  .action(async (options) => {
    const watcher = new FileWatcher({
      rootPath: options.root,
      debounceMs: options.debounce
    })

    watcher.start()

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[Watcher] Shutting down...')
      watcher.stop()
      process.exit(0)
    })

    // Keep alive
    await new Promise(() => {})
  })
```

---

## .nexusignore Example

```gitignore
# Local override for Nexus watcher
# Similar syntax to .gitignore

# Ignore test outputs
**/*.test.js.snap

# Ignore generated files
**/generated.ts

# But include src (even if in .gitignore)
!src/**/*.ts
```

---

## Definition of Done

- [ ] Service watcher implémenté
- [ ] CLI "nexus watch" fonctionne
- [ ] .gitignore respecté
- [ ] Debounce fonctionnel
- [ ] Pause/resume disponible
- [ ] Tests sur repo réel
- [ ] Performance OK (< 5% CPU)

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| chokidar | Library | ⏳ Bun compat check |
| gitignore-globs | Library | ✅ OK |
| Story S-06 (indexer) | Internal | Blocked |

---

## Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Event Detection | 99%+ | % de changements capturés |
| False Positive | < 1% | % d'événements sans changement |
| CPU Usage | < 5% | Avg en idle |
| Memory | < 100MB | Max steady state |

---

## Notes

- Inspiré de mgrep watch
- Ignore initial pour éviter l'indexation massive au démarrage
- Logs clairs pour debugging
