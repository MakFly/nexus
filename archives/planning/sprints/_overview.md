# Sprint Plan — Nexus Automation

**Basé sur** : PRD Automation (product/04-prd.md)
**État actuel** : Automation features complétées (Sprints 0-10)
**Méthodologie** : Sprints de 1 semaine, focus vertical (feature complète end-to-end)

**Dernière mise à jour** : 2025-01-11

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1 : CORE (DONE)                        │
├─────────────────────────────────────────────────────────────────┤
│ Sprint 0   │ Foundation         │ Monorepo + Storage            │ ✅ DONE │
│ Sprint 1   │ Indexer + Search   │ FTS5 + Code search            │ ✅ DONE │
│ Sprint 2   │ Memory System      │ CRUD + Progressive Disclosure  │ ✅ DONE │
│ Sprint 3   │ Learning Core      │ Capture + Patterns            │ ✅ DONE │
│ Sprint 4   │ Learning Apply     │ Apply + Feedback              │ ✅ DONE │
│ Sprint 5   │ MCP Server         │ Tools + Context injection     │ ✅ DONE │
│ Sprint 6   │ Polish             │ Budget + Security (REPORTÉ)   │ ⏸️ SKIP │
│ Sprint 7   │ Nexus Turbo        │ Token savings 40-50x          │ ✅ DONE │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2 : AUTOMATION (DONE)                  │
├─────────────────────────────────────────────────────────────────┤
│ Sprint 8   │ Auto-capture MVP   │ Lifecycle hooks + Compression │ ✅ DONE │
│ Sprint 9   │ Indexation Continue│ File watcher + Incremental    │ ✅ DONE │
│ Sprint 10  │ Integration        │ E2E + Hardening               │ ✅ DONE │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 3 : ENHANCEMENT (FUTURE)               │
├─────────────────────────────────────────────────────────────────┤
│ Sprint 11  │ Semantic Search    │ Embeddings + Hybrid           │ 📅 FUTURE│
│ Sprint 12+ │ Advanced Features  │ TBC                           │ 📅 FUTURE│
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Automation Sprints (DONE)

### Sprint 8: Auto-capture MVP ✅
**Voir** : [done/sprint-8.md](done/sprint-8.md)

**Goal** : Implémenter les lifecycle hooks Claude Code

| Stories | Points | Status |
|---------|--------|--------|
| S-01 | 2 | ✅ Hook Session Start |
| S-02 | 3 | ✅ Hook Post-Tool (with privacy) |
| S-03 | 5 | ✅ Compression LLM (distillation) |
| S-04 | 3 | ✅ Context Injection |

**Total**: 13 points (~5 days)

**Deliverables** ✅:
- 4 hook scripts fonctionnels (`sessionStart.sh`, `postTool.sh`, `sessionEnd.sh`)
- API endpoints `/capture`, `/capture/batch`, `/capture/distill`
- Compression ratio ≥ 10:1 (Mistral API + fallback raw)
- Context injection < 2000 tokens

---

### Sprint 9: Indexation Continue ✅
**Voir** : [done/sprint-9.md](done/sprint-9.md)

**Goal** : File watcher avec indexation incrémentale

| Stories | Points | Status |
|---------|--------|--------|
| S-05 | 3 | ✅ File Watcher (chokidar) |
| S-06 | 5 | ✅ Incremental Index |
| S-07 | 1 | ✅ Pause/Resume |

**Total**: 9 points (~4 days)

**Deliverables** ✅:
- CLI `nexus watch` fonctionnel (apps/cli)
- .gitignore handling (DEFAULT_IGNORE + gitignore parsing)
- Debounce 500ms (FileWatcher queue)
- Index freshness < 5s (testé avec 660+ fichiers Symfony)

---

### Sprint 10: Integration + Hardening ✅
**Voir** : [done/sprint-10.md](done/sprint-10.md)

**Goal** : E2E tests, stabilisation, documentation

| Tasks | Effort | Status |
|-------|--------|--------|
| E2E Tests | 2 days | ✅ Session → Capture → Injection |
| Privacy Audit | 1 day | ✅ Filtres passwords/secrets |
| Performance | 1 day | ✅ Hooks < 500ms, Index < 5s |
| Documentation | 1 day | ✅ README + API docs |

**Total**: ~5 days

**Deliverables** ✅:
- E2E tests passants (Symfony 7.4 e-commerce project)
- Zero privacy incidents (filters implemented)
- Performance OK (hooks async, watcher debounce)
- Doc complète (`apps/hooks/README.md`, verification report)

---

## Gap Analysis vs Competitors

| Feature | Nexus (après S10) | claude-mem | mgrep |
|---------|-------------------|------------|-------|
| **Auto-capture** | ✅ 4 hooks | ✅ 6 hooks | ❌ |
| **Compression LLM** | ✅ 10:1 | ✅ 100:1 | ❌ |
| **Context Injection** | ✅ < 2k tok | ✅ Progressive | ❌ |
| **File Watcher** | ✅ chokidar | ❌ | ✅ watch |
| **Incremental Index** | ✅ | ❌ | ✅ |
| **Semantic Search** | ✅ Existing | ✅ Chroma | ✅ Cloud |
| **Multi-LLM Support** | ✅ Claude + GLM | ❌ | ❌ |

**Nexus a atteint la parité功能nelle avec claude-mem + mgrep !**

---

## Success Metrics Automation

Voir [product/06-metrics-kpis.md](../product/06-metrics-kpis.md)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Hook Success Rate | 99%+ | 100% (async) | ✅ |
| Compression Ratio | 10:1 | ~15:1 (Mistral) | ✅ |
| Index Freshness | < 5s | < 500ms | ✅ |
| Context Recall | 60%+ | TBD (user feedback) | ⏳ |

---

## Archive (Sprints 0-7)

Les sprints précédents sont archivés dans `archive/`:

| Sprint | Focus | Status |
|--------|-------|--------|
| 0-7 | Core features | ✅ DONE |

Les sprints 8-10 sont archivés dans `done/`:

| Sprint | Focus | Status |
|--------|-------|--------|
| 8 | Auto-capture MVP | ✅ DONE |
| 9 | Indexation Continue | ✅ DONE |
| 10 | Integration | ✅ DONE |

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Claude Code hooks API | External | ✅ Verified (Multi-LLM) |
| chokidar (Bun) | Library | ✅ Tested |
| MISTRAL_API_KEY | Config | ✅ Optional (fallback raw) |

---

## Risques

Voir [product/07-risks.md](../product/07-risks.md)

Top risks:
- 🟢 R-06: Privacy Leaks (audit S10 ✅)
- 🟢 R-01: Claude Code Hooks API changes (✅ Stable)
- 🟢 R-02: Watcher Performance (✅ < 500ms)

---

## Next Steps

1. ✅ PRD Automation approuvé
2. ✅ Sprint 8 Kickoff (Discovery)
3. ✅ POC Hooks Claude Code
4. ✅ Implémentation S8-S10
5. ⏳ **User Feedback Loop** - Beta testing avec Symfony project
6. 📅 Sprint 11 Planning (Semantic Search enhancements)

---

## Notes

- Sprints 1 semaine chacun
- Priorité: Automation features → Core stable
- Sprint 6 (Polish) reporté indéfiniment
- Sprint 1.1 (Semantic) → Sprint 11
- **Feature Parity Achieved** ✅
