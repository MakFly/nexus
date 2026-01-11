# Sprint 9: Indexation Continue

**Dates**: Week 2
**Epic**: E-02 Indexation Continue
**Status**: 📅 TODO
**Points**: 9

---

## Goal

Implémenter un file watcher qui maintient l'index FTS5 à jour en temps réel.

---

## User Stories

| ID | Story | Points | Owner | Status |
|----|-------|--------|-------|--------|
| S-05 | File Watcher | 3 | | 📅 TODO |
| S-06 | Incremental Index | 5 | | 📅 TODO |
| S-07 | Pause/Resume | 1 | | 📅 TODO |

**Voir détails** : [planning/backlog/stories/](../backlog/stories/)

---

## Daily Breakdown

### Day 1: Watcher Foundation
- [ ] Verify chokidar Bun compatibility
- [ ] Implement FileWatcher class
- [ ] Add .gitignore parsing
- [ ] Create watch CLI command
- [ ] Test basic file detection

### Day 2: Incremental Indexer
- [ ] Implement IncrementalIndexer class
- [ ] Add delete old chunks logic
- [ ] Add create new chunks logic
- [ ] Handle file deletion
- [ ] Test with sample files

### Day 3: Debounce + Batch
- [ ] Implement debouncing (500ms)
- [ ] Add batch processing (10 files)
- [ ] Test rapid file changes
- [ ] Add progress logging
- [ ] Measure performance

### Day 4: Pause/Resume + API
- [ ] Implement pause/resume logic
- [ ] Create API endpoints /watcher/*
- [ ] Add --pause, --resume, --status flags
- [ ] Test queue accumulation
- [ ] Test graceful shutdown

### Day 5: Integration + Testing
- [ ] Test on real codebase (1000+ files)
- [ ] Performance profiling (< 5% CPU)
- [ ] Test .gitignore edge cases
- [ ] Documentation (CLI usage)
- [ ] Sprint review

---

## Definition of Done

Sprint is complete when:
- [ ] All 3 stories completed with AC validated
- [ ] CLI `nexus watch` fonctionne
- [ ] Index freshness < 5s
- [ ] .gitignore respecté
- [ ] Pause/resume fonctionne
- [ ] CPU usage < 5% idle
- [ ] Tested on 10k+ files

---

## Deliverables

### Code
- `apps/api/src/services/watcher.ts` - Watcher service
- `packages/indexer/src/incremental.ts` - Incremental indexer
- `apps/cli/src/commands/watch.ts` - CLI command
- `apps/api/src/routes/watcher.ts` - API routes

### Database
```sql
-- New table for failures
CREATE TABLE index_failures (...);
```

### CLI Commands
```bash
nexus watch              # Start watcher
nexus watch --pause      # Pause
nexus watch --resume     # Resume
nexus watch --status     # Status
nexus watch --stop       # Stop
```

---

## Acceptance Criteria Summary

| Story | Key AC |
|-------|--------|
| S-05 | .gitignore respected, debounce 500ms |
| S-06 | Delete + insert atomic, batch processing |
| S-07 | Pause queues, resume flushes |

---

## Dependencies

| Dependency | Type | Status | Owner |
|------------|------|--------|-------|
| chokidar (Bun) | Library | ⏳ Day 1 | |
| gitignore-globs | Library | ✅ OK | |
| Schema migrations | Internal | ⏳ Day 1 | |

---

## Risks

| Risk | Mitigation |
|------|------------|
| chokidar not Bun compatible | Use Node.js watcher |
| High CPU usage | Debounce + rate limiting |
| DB lock contention | WAL mode + queue |

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Index freshness | < 5s | File change → indexed |
| CPU idle | < 5% | Top average |
| Memory | < 100MB | Steady state |
| False positives | < 1% | Events without change |

---

## Demo (Sprint Review)

```
1. Start "nexus watch" → Watching 1523 files
2. Edit src/index.ts → Detected, indexed in < 5s
3. Search for new content → Results appear immediately
4. Pause watcher → Changes queued
5. Resume watcher → Queue flushed, indexed
```

---

## Notes

- Inspired by mgrep watch
- Ignore initial (no full scan on start)
- Graceful shutdown processes queue
- Logs clear for debugging
