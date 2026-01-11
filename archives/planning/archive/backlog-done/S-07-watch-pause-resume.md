# Story S-07: Pause/Resume

**Epic**: E-02 Indexation Continue
**Status**: Ready
**Priority**: P2
**Points**: 1
**Sprint**: 2

---

## User Story

**As a** développeur
**I want** pauser/reprendre le watcher
**So that** je peux contrôler quand l'indexation tourne

---

## Acceptance Criteria

### AC-01: Pause Watcher
```gherkin
Given le watcher tourne en background
When j'exécute "nexus watch --pause"
Then:
  - Le watcher suspend la surveillance
  - Les fichiers modifiés sont accumulés en queue
  - Aucune indexation n'est faite
  - Le status est "paused"
```

### AC-02: Resume Watcher
```gherkin
Given le watcher est en pause avec des fichiers en queue
When j'exécute "nexus watch --resume"
Then:
  - Les fichiers accumulés sont indexés
  - La surveillance reprend
  - Le nombre de fichiers indexés est affiché
  - Le status est "running"
```

### AC-03: Status Display
```gherkin
Given le watcher tourne (ou est en pause)
When j'exécute "nexus watch --status"
Then:
  - Le status actuel est affiché (running/paused/stopped)
  - Le nombre de fichiers en queue est affiché
  - Le nombre de fichiers surveillés est affiché
  - Le uptime est affiché
```

### AC-04: Graceful Shutdown
```gherkin
Given le watcher tourne
When je presse Ctrl+C
Then:
  - Les fichiers en queue sont indexés avant shutdown
  - Un message "Shutting down..." est affiché
  - Le watcher se ferme proprement
```

---

## Technical Specification

### Watcher Service Modifications

```typescript
// apps/api/src/services/watcher.ts

class FileWatcher {
  // ... existing code ...

  private status: 'running' | 'paused' | 'stopped' = 'stopped'
  private startTime: number = 0
  private pausedAt: number = 0

  start() {
    this.status = 'running'
    this.startTime = Date.now()
    // ... existing start code ...
    console.log('[Watcher] ▶ Started')
  }

  pause() {
    this.status = 'paused'
    this.pausedAt = Date.now()
    this.isPaused = true

    // Flush any pending debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    console.log(`[Watcher] ⏸ Paused (queue: ${this.queue.size} files)`)
  }

  resume() {
    const queuedCount = this.queue.size
    this.status = 'running'
    this.isPaused = false

    console.log(`[Watcher] ▶ Resumed (processing ${queuedCount} queued files...)`)

    // Process queued files
    if (queuedCount > 0) {
      this.flush()
    }
  }

  async stop() {
    this.status = 'stopped'

    console.log('[Watcher] Shutting down...')

    // Flush remaining queue
    if (this.queue.size > 0) {
      console.log(`[Watcher] Processing ${this.queue.size} remaining files...`)
      await this.flush()
    }

    // Close watcher
    this.watcher?.close()

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    console.log('[Watcher] ✓ Stopped')
  }

  getStatus() {
    return {
      status: this.status,
      isRunning: this.watcher !== null,
      isPaused: this.isPaused,
      queuedFiles: this.queue.size,
      watchedPaths: this.watcher?.getWatched().size || 0,
      uptime: this.status === 'running'
        ? Math.floor((Date.now() - this.startTime) / 1000)
        : 0,
      pausedDuration: this.status === 'paused'
        ? Math.floor((Date.now() - this.pausedAt) / 1000)
        : 0
    }
  }
}

// Singleton instance for CLI commands
let watcherInstance: FileWatcher | null = null

export function getWatcher(): FileWatcher {
  if (!watcherInstance) {
    throw new Error('Watcher not running. Start with "nexus watch"')
  }
  return watcherInstance
}

export function setWatcher(watcher: FileWatcher) {
  watcherInstance = watcher
}
```

### CLI Commands

```typescript
// apps/cli/src/commands/watch.ts

import { FileWatcher, setWatcher, getWatcher } from '@nexus/watcher'

export const watchCommand = new Command()
  .name('watch')
  .description('Watch files and maintain index')
  .option('--pause', 'Pause the watcher')
  .option('--resume', 'Resume the watcher')
  .option('--status', 'Show watcher status')
  .option('--stop', 'Stop the watcher')
  .action(async (options) => {
    const api = new NexusAPI('http://localhost:3001')

    // Remote control commands
    if (options.pause) {
      await api.post('/watcher/pause')
      console.log('✓ Watcher paused')
      return
    }

    if (options.resume) {
      await api.post('/watcher/resume')
      console.log('✓ Watcher resumed')
      return
    }

    if (options.status) {
      const status = await api.get('/watcher/status')
      console.log(JSON.stringify(status, null, 2))
      return
    }

    if (options.stop) {
      await api.post('/watcher/stop')
      console.log('✓ Watcher stopped')
      return
    }

    // Start watcher
    console.log('🔄 Starting Nexus watcher...')
    console.log('   Ctrl+C to stop')

    const watcher = new FileWatcher({
      rootPath: process.cwd(),
      debounceMs: 500
    })

    setWatcher(watcher)

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await watcher.stop()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      await watcher.stop()
      process.exit(0)
    })

    watcher.start()

    // Keep alive
    await new Promise(() => {})
  })
```

### API Endpoints

```typescript
// apps/api/src/routes/watcher.ts

import { Hono } from 'hono'

const app = new Hono()

// POST /watcher/pause
app.post('/pause', async (c) => {
  const watcher = getWatcher()
  watcher.pause()
  return c.json({ status: 'paused', queuedFiles: watcher.getStatus().queuedFiles })
})

// POST /watcher/resume
app.post('/resume', async (c) => {
  const watcher = getWatcher()
  watcher.resume()
  return c.json({ status: 'running' })
})

// POST /watcher/stop
app.post('/stop', async (c) => {
  const watcher = getWatcher()
  await watcher.stop()
  return c.json({ status: 'stopped' })
})

// GET /watcher/status
app.get('/status', async (c) => {
  try {
    const watcher = getWatcher()
    return c.json(watcher.getStatus())
  } catch (e) {
    return c.json({ status: 'stopped', error: 'Watcher not running' }, 404)
  }
})

export default app
```

---

## Usage Examples

```bash
# Terminal 1: Start watcher
$ nexus watch
🔄 Starting Nexus watcher...
[Watcher] ▶ Started
[Watcher] 🔄 Watching for changes...

# Terminal 2: Pause
$ nexus watch --pause
✓ Watcher paused

# Terminal 2: Check status
$ nexus watch --status
{
  "status": "paused",
  "queuedFiles": 15,
  "watchedPaths": 1523,
  "uptime": 0,
  "pausedDuration": 45
}

# Terminal 2: Resume
$ nexus watch --resume
✓ Watcher resumed
# Output in Terminal 1:
[Watcher] ▶ Resumed (processing 15 queued files...)
[Watcher] Indexing 15 files...
[Watcher] ✓ Indexed 15 files

# Terminal 1: Stop with Ctrl+C
^C
[Watcher] Shutting down...
[Watcher] ✓ Stopped
```

---

## Definition of Done

- [ ] Pause implémenté
- [ ] Resume implémenté
- [ ] Status display OK
- [ ] Graceful shutdown OK
- [ ] CLI commands fonctionnels
- [ ] API endpoints testés
- [ ] Documentation complète

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Story S-05 (watcher) | Internal | Blocked |
| API routes | Internal | ⏳ To create |

---

## Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pause Latency | < 100ms | Time to pause |
| Resume Latency | < 500ms | Time to resume + flush queue |
| Queue Size | < 1000 files | Max reasonable queue |

---

## Notes

- Pause est utile pendant les gros changements (git checkout, rebase)
- Resume traite toute la queue avant de reprendre
- Status peut être utilisé pour des scripts de monitoring
