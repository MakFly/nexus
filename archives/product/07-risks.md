# Nexus Automation - Risk Register

**Version**: 1.0
**Date**: 2025-01-11

---

## Risk Matrix

```
                    Impact
              Low     Med     High
        Low    ✓       ✓       !
Prob   Med    ✓       !       !
        High   !       !       X
```

Legend: `✓` Accept | `!` Mitigate | `X` Avoid

---

## Technical Risks

### R-01: Claude Code Hooks API Changes

| Field | Value |
|-------|-------|
| **Risk** | L'API hooks de Claude Code change, cassant notre implémentation |
| **Probability** | Medium (40%) |
| **Impact** | High (feature complètement broken) |
| **Category** | External Dependency |

**Mitigation**:
- Documenter la version exacte de Claude Code utilisée
- Créer un wrapper d'abstraction autour de l'API hooks
- Surveiller les releases Claude Code (GitHub watchers)
- Tests E2E qui détectent les breaking changes

**Contingency**:
- Fallback vers capture manuelle si hooks non disponibles
- Versioning de l'API côté Nexus

---

### R-02: File Watcher Performance

| Field | Value |
|-------|-------|
| **Risk** | Le watcher consomme trop de CPU/RAM sur gros repos |
| **Probability** | Medium (30%) |
| **Impact** | Medium (UX dégradée) |
| **Category** | Performance |

**Mitigation**:
- Debounce intelligent (exponential backoff)
- Limit parallel indexing (max 5 files simultanés)
- Rate limiting basé sur la charge système
- Tests sur repos volumineux (10k+ files)

**Contingency**:
- Mode "batch" pour les gros changements (ex: git checkout)
- Option de désactivation du watcher

---

### R-03: SQLite Lock Contention

| Field | Value |
|-------|-------|
| **Risk** | Conflits d'écriture entre watcher et API |
| **Probability** | Medium (35%) |
| **Impact** | Medium (errors, slow) |
| **Category** | Database |

**Mitigation**:
- WAL mode activé (déjà fait)
- Timeout transactions (max 5s)
- Retry avec exponential backoff
- Queue d'écritures sérialisée

**Contingency**:
- Indexer dans un DB temporaire, puis swap
- Mode "maintenance" pour arrêter le watcher

---

### R-04: LLM Compression Failure

| Field | Value |
|-------|-------|
| **Risk** | Mistral API down/slow → compression impossible |
| **Probability** | Low (10%) |
| **Impact** | Medium (pas de compression, plus de tokens) |
| **Category** | External Service |

**Mitigation**:
- Store les observations brutes comme fallback
- Retry avec backoff (3 tentatives)
- Timeout court (10s)
- Cache local des templates communs

**Contingency**:
- Mode "raw" : stocker sans compression
- Notification utilisateur que compression est désactivée

---

## User Experience Risks

### R-05: Context Overload

| Field | Value |
|-------|-------|
| **Risk** | Trop de contexte injecté → token waste, confusion |
| **Probability** | Medium (40%) |
| **Impact** | Medium (dégradation UX) |
| **Category** | UX |

**Mitigation**:
- Limite stricte de 2000 tokens injection
- Relevance scoring (ne pas injecter si score < 0.3)
- UI pour review les candidats avant injection
- Option de désactivation par session

**Contingency**:
- Progressive disclosure strict (recall → timeline → get)
- User feedback loop (thumbs up/down sur injection)

---

### R-06: Privacy Leaks

| Field | Value |
|-------|-------|
| **Risk**** | Données sensibles capturées (passwords, tokens) |
| **Probability** | Low (15%) |
| **Impact** | **High** (security incident) |
| **Category** | Security |

**Mitigation**:
- Filtre strict avec patterns de secrets (API keys, JWT, etc.)
- Tag `<private>` respecté impérativement
- Audit trail de tout ce qui est capturé
- Review obligatoire des candidats avant distillation

**Contingency**:
- "Panic button" : suppression immédiate des mémoires
- chiffrement au repos pour les champs sensibles

---

### R-07: False Positive Indexing

| Field | Value |
|-------|-------|
| **Risk** | Le watcher indexe node_modules, .git, etc. |
| **Probability** | Low (10%) |
| **Impact** | Medium (index bloat, slow) |
| **Category** | Data Quality |

**Mitigation**:
- Respect strict de .gitignore
- Liste blanche d'extensions (.ts, .tsx, .py, etc.)
- Tests de régression sur différents .gitignore
- Alerte si index size > seuil

**Contingency**:
- Command `nexus watch --reset` pour clean
- `.nexusignore` pour override local

---

## Product Risks

### R-08: Adoption Friction

| Field | Value |
|-------|-------|
| **Risk** | Les développeurs désactivent les hooks (tôt intrusif) |
| **Probability** | Medium (50%) |
| **Impact** | High (feature inutile) |
| **Category** | Adoption |

**Mitigation**:
- Opt-in par défaut (pas opt-out)
- Feedback transparent ("X observations capturées")
- UI de gestion des hooks (pause, blacklist)
- Value visible early (search fonctionne mieux)

**Contingency**:
- Mode "silent" (capture sans feedback)
- Onboarding guidé pour les early adopters

---

### R-09: Scope Creep

| Field | Value |
|-------|-------|
| **Risk**** | Ajout de features "nice-to-have" (smart filters, etc.) |
| **Probability** | Medium (40%) |
| **Impact** | Medium (délai, complexité) |
| **Category** | Project Management |

**Mitigation**:
- PRD clair avec "Out of Scope" explicite
- Sprint backlog gelé après planning
- Process de change request formel
- Focus sur MVP first

**Contingency**:
- Deferred backlog pour v2+
- Timebox strict par sprint

---

## Operational Risks

### R-10: Database Corruption

| Field | Value |
|-------|-------|
| **Risk**** | Crash pendant écriture → DB corrompue |
| **Probability** | Low (5%) |
| **Impact** | **High** (perte de données) |
| **Category** | Data Loss |

**Mitigation**:
- Backups automatiques journaliers (sqlite backups)
- WAL mode (write-ahead logging)
- Tests de crash recovery
- Health checks API

**Contingency**:
- Restore depuis backup
- Rebuild depuis source si possible

---

## Risk Monitoring

### Weekly Risk Review

| Risk | Status | Owner | Action |
|------|--------|-------|--------|
| R-01: Hooks API | 🟡 Monitored | Tech | Check releases weekly |
| R-02: Watcher Perf | 🟢 OK | Tech | Profiling每月 |
| R-03: SQLite Lock | 🟡 Mitigated | Tech | Monitoring slow queries |
| R-04: LLM Down | 🟢 OK | Tech | Fallback tested |
| R-05: Context Overload | 🟡 Monitored | PO | User feedback needed |
| R-06: Privacy Leaks | 🔴 Critical | Tech | Audit required |
| R-07: False Positive | 🟢 OK | Tech | .gitignore tests OK |
| R-08: Adoption | 🟡 Unknown | PO | Survey after Sprint 1 |
| R-09: Scope Creep | 🟢 Controlled | PO | Backlog frozen |
| R-10: DB Corruption | 🟢 OK | Ops | Backups verified |

### Escalation Matrix

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| 🔴 Critical | Immediate | CTO + All hands |
| 🟡 High | Within 4 hours | Tech Lead + PO |
| 🟢 Medium | Within 1 day | Owner only |
| ⚪ Low | Next retro | Owner only |

---

## Insurance Strategies

### Feature Flags

```typescript
// Feature flags pour rollback rapide
const flags = {
  autoCapture: process.env.NEXUS_AUTO_CAPTURE === 'true',
  contextInjection: process.env.NEXUS_CONTEXT_INJECTION === 'true',
  fileWatcher: process.env.NEXUS_FILE_WATCHER === 'true',
  llmCompression: process.env.NEXUS_LLM_COMPRESSION === 'true',
}
```

### Kill Switches

```bash
# Désactivation d'urgence
export NEXUS_EMERGENCY_MODE=true  # Arrête toutes les automations

# Arrêt du watcher
nexus watch --stop

# Désactivation hooks
rm ~/.claude/hooks/nexus-*
```

---

## Next Actions

1. **[ ]** Créer un POC hooks Claude Code (Sprint 0)
2. **[ ]** Profiler le watcher sur un gros repo (Sprint 0)
3. **[ ]** Implémenter les filtres de secrets (Sprint 1)
4. **[ ]** Setup backup automatique (Sprint 1)
5. **[ ]** Crash recovery testing (Sprint 2)
