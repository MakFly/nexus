# Nexus Automation - Roadmap

**Last Updated**: 2025-01-11
**Status**: **Automation MVP COMPLETE ✅**

---

## ✅ Now (Sprint 0-10) - COMPLETE

### Goal
Déployer les features d'automation de base pour Nexus - **FEATURE PARITY ACHIEVED**

### Timeline - COMPLETED

```
Sprint 0: Discovery (2 days) ✅
  ├─ POC Claude Code hooks
  ├─ POC File watcher
  └─ Design schema DB

Sprint 1: Auto-capture (5 days) ✅
  ├─ 4 Lifecycle hooks
  ├─ Compression LLM
  └─ UI review candidats

Sprint 2: Indexation Continue (4 days) ✅
  ├─ File watcher (chokidar)
  ├─ Incremental index
  └─ Pause/resume

Sprint 3: Integration (3 days) ✅
  ├─ E2E tests
  ├─ Context injection
  └─ Documentation
```

### Deliverables - ALL COMPLETE ✅

| Sprint | Deliverable | Success Criteria | Status |
|--------|-------------|------------------|--------|
| **S0** | POC + Design | Hooks validés, schema approuvé | ✅ |
| **S1** | Auto-capture MVP | 4 hooks fonctionnels, compression 10:1 | ✅ |
| **S2** | Watcher MVP | Index < 5s après changement | ✅ |
| **S3** | Release v1.0 | E2E OK, doc complète | ✅ |

---

## 🔄 Next (Sprint 11-12) - Enhancement

### Goal
Améliorer les features existantes et ajouter des fonctionnalités avancées

### Stories

| Story | Priority | Estimate | Status |
|-------|----------|----------|--------|
| Semantic Search improvements | P1 | 3 days | 📅 TODO |
| Query expansion (smart search) | P1 | 2 days | 📅 TODO |
| Auto-relationships (embeddings) | P2 | 5 days | 📅 TODO |
| Multi-repo support | P2 | 3 days | 📅 TODO |
| Visual analytics (dashboard) | P3 | 3 days | 📅 TODO |

### Success Criteria

- Semantic search accuracy > 80%
- Query expansion reduces failed searches by 50%
- Multi-repo supports 3+ projects simultaneously

---

## 📅 Later (Q2 2025) - Advanced Features

### Goal
Ajouter des features premium et d'entreprise

### Candidates

| Feature | Value | Effort | RICE |
|---------|-------|--------|------|
| Endless Mode (compression continue) | High | 5 days | 30 |
| Auto-relationships (embeddings) | High | 8 days | 25 |
| Query expansion (smart search) | Medium | 3 days | 15 |
| Multi-repo support | Medium | 5 days | 12 |
| Visual analytics (dashboard) | Low | 3 days | 8 |

**RICE Formula**: `(Reach × Impact × Confidence) / Effort`

---

## Dependencies

| Dependency | Blocker | Owner | Status |
|------------|---------|-------|--------|
| Claude Code hooks doc | Sprint 0 | Tech | ✅ Verified |
| chokidar Bun compatible | Sprint 1 | Tech | ✅ Tested |
| Mistral API stable | Sprint 1 | External | ✅ OK |
| Schema migrations | Sprint 0 | Tech | ✅ Done |

---

## Risks & Mitigations

See `product/07-risks.md`

Top risks - **ALL MITIGATED** ✅:
- 🟢 R-06: Privacy Leaks (filters implemented)
- 🟢 R-01: Claude Code Hooks API changes (multi-LLM support)
- 🟢 R-05: Context Overload (progressive disclosure working)

---

## Releases

### ✅ v1.0 - Automation MVP - COMPLETE
**Date**: Completed 2025-01-11
**Features**:
- ✅ Auto-capture (4 hooks: sessionStart, postTool, sessionEnd, sessionStart multi-LLM)
- ✅ Compression LLM (Mistral + fallback raw, ~15:1 ratio)
- ✅ File watcher + incremental index (chokidar, < 500ms)
- ✅ Context injection basique
- ✅ Multi-LLM support (Claude Opus + GLM-4)
- ✅ Privacy filters (passwords, API keys, secrets)

### v1.1 - Hardening - PLANNED
**Date**: TBD (Sprint 11)
**Features**:
- 🔄 Smart filtering
- 🔄 Performance optimization
- 🔄 Enhanced semantic search

### v2.0 - Enhancement (Q2)
**Date**: TBD
**Features**:
- 📅 Endless Mode
- 📅 Auto-relationships
- 📅 Query expansion

---

## Milestones

| Milestone | Date | Criteria | Status |
|-----------|------|----------|--------|
| **M1: POC Validé** | Sprint 0 Day 2 | Hooks + watcher test OK | ✅ |
| **M2: Auto-capture Ready** | Sprint 1 Day 5 | First auto memory created | ✅ |
| **M3: Watcher Ready** | Sprint 2 Day 4 | Index auto-updates | ✅ |
| **M4: MVP Complete** | Sprint 3 Day 3 | E2E passes, ready for beta | ✅ |
| **M5: Feature Parity** | Sprint 10 | Parity avec claude-mem + mgrep | ✅ |

---

## Resource Allocation (Completed)

| Role | Sprint 8 | Sprint 9 | Sprint 10 |
|------|----------|----------|-----------|
| Backend Dev | 100% | 100% | 80% |
| Frontend Dev | 20% | 0% | 40% |
| PO | 10% | 10% | 25% |
| QA | 20% | 20% | 50% |

---

## Definition of Done

A feature is "done" when:
- [x] User stories implemented with AC validated
- [x] Unit tests + E2E tests pass
- [x] Documentation updated
- [x] Code reviewed and merged
- [x] Demo completed
- [x] No critical bugs remaining

**ALL SPRINTS 0-10 MEET DoD criteria ✅**

---

## Next Steps

1. ✅ PRD approved by stakeholders
2. ✅ Sprint 0 kickoff (Discovery)
3. ✅ POC validation
4. ✅ Sprint 1-10 implémentation
5. ⏳ **User Feedback Loop** - Beta testing réel
6. 📅 Sprint 11 planning

---

## Achievement Summary 🎉

**Nexus Automation MVP is COMPLETE and has achieved FEATURE PARITY with competitors:**

| Competitor | Auto-capture | Compression | Context | Watcher | Incremental |
|------------|--------------|-------------|---------|---------|-------------|
| **Nexus** | ✅ 4 hooks | ✅ 15:1 | ✅ <2k | ✅ chokidar | ✅ Yes |
| claude-mem | ✅ 6 hooks | ✅ 100:1 | ✅ Progressive | ❌ | ❌ |
| mgrep | ❌ | ❌ | ❌ | ✅ watch | ✅ Yes |

**Unique Nexus Features:**
- Multi-LLM support (Claude + GLM)
- Async hooks (no blocking)
- Privacy-first architecture
- Progressive disclosure (3-layer)
