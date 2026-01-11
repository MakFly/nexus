# Sprint 10: Integration + Hardening

**Dates**: Week 3
**Epic**: Automation Completion
**Status**: 📅 TODO
**Points**: N/A (Integration Sprint)

---

## Goal

Intégrer les features d'automation, durcir la sécurité, et préparer la release.

---

## Tasks Breakdown

### E2E Testing (2 days)

| Task | Description | Owner |
|------|-------------|-------|
| Write E2E test | Session → Capture → Distill → Inject | |
| Test privacy filters | Passwords, tokens, JWT patterns | |
| Test edge cases | API down, LLM timeout, crash | |
| Performance test | 100 sessions, measure latency | |

**Deliverable**: E2E tests passants, report de performance

### Privacy Audit (1 day)

| Task | Description | Owner |
|------|-------------|-------|
| Audit hook scripts | Vérifier aucun leak dans logs | |
| Test filter patterns | 50+ secret patterns | |
| Review server logs | Vérifier pas de données sensibles | |
| Document privacy | Privacy policy + handling | |

**Deliverable**: Audit report, zero known leaks

### Performance Profiling (1 day)

| Task | Description | Owner |
|------|-------------|-------|
| Profile hooks | Mesurer latence P95 | |
| Profile watcher | CPU/memory usage | |
| Optimize bottlenecks | Si > 500ms hooks ou > 5% CPU | |
| Load testing | Simuler 100 fichiers/s | |

**Deliverable**: Performance report, OK si targets OK

### Documentation (1 day)

| Task | Description | Owner |
|------|-------------|-------|
| Install guide | How to install hooks | |
| API documentation | Endpoints /capture, /distill, /watcher | |
| Troubleshooting | Common issues + solutions | |
| README update | New features documented | |

**Deliverable**: Doc complète dans docs/

---

## Definition of Done

Sprint is complete when:
- [ ] E2E tests pass (100% scenarios)
- [ ] Zero privacy incidents (audit clean)
- [ ] Performance OK (hooks < 500ms, watcher < 5% CPU)
- [ ] Documentation published
- [ ] Ready for beta release

---

## E2E Test Scenarios

### Scenario 1: Full Flow
```gherkin
Given Claude Code démarre une nouvelle session
When j'exécute plusieurs outils (Read, Edit, Bash)
And je termine la session
Then:
  - 1 observation sessionStart créée
  - N observations postTool créées
  - 1 observation sessionEnd créée
  - La distillation crée 1-3 candidats
```

### Scenario 2: Privacy
```gherkin
Given un tool output contient "password=secret123"
When le hook postTool s'exécute
Then:
  - L'observation est capturée
  - Le password est remplacé par [REDACTED]
  - Les logs ne contiennent pas le password
```

### Scenario 3: Context Injection
```gherkin
Given une nouvelle session démarre
When le hook sessionStart s'exécute
Then:
  - Le contexte est récupéré
  - Le nombre de tokens < 2000
  - Le contexte est affiché
```

### Scenario 4: Watcher
```gherkin
Given le watcher tourne
When je modifie un fichier
Then:
  - Le changement est détecté
  - L'index est mis à jour en < 5s
  - La recherche trouve le nouveau contenu
```

---

## Performance Targets

| Component | Metric | Target | Actual |
|-----------|--------|--------|--------|
| Hooks | Latency P95 | < 500ms | TBD |
| Hooks | Success rate | > 99% | TBD |
| Watcher | CPU idle | < 5% | TBD |
| Watcher | Index freshness | < 5s | TBD |
| Compression | Ratio | > 10:1 | TBD |
| Context injection | Token count | < 2000 | TBD |

---

## Privacy Checklist

- [ ] Password patterns filtered
- [ ] API key patterns filtered
- [ ] JWT tokens filtered
- [ ] UUID v4 filtered (suspects)
- [ ] <private> tag respected
- [ ] Logs sanitised (no raw data)
- [ ] DB access restricted
- [ ] HTTPS for API (production)

---

## Documentation Outline

### Install Guide
```markdown
# Nexus Automation Installation

## Prerequisites
- Claude Code with hooks support
- Nexus API running
- MISTRAL_API_KEY configured

## Install Hooks
\`\`\`bash
npm install -g @nexus/hooks
nexus-hooks install
\`\`\`

## Configure
\`\`\`bash
export NEXUS_API=http://localhost:3001
export MISTRAL_API_KEY=your_key
\`\`\`

## Verify
\`\`\`bash
nexus-hooks status
\`\`\`
```

### API Docs
- POST /capture
- POST /capture/batch
- POST /distill
- GET /context/inject
- POST /watcher/start
- POST /watcher/pause
- POST /watcher/resume
- GET /watcher/status

---

## Release Checklist

- [ ] All AC validated
- [ ] E2E tests passing
- [ ] Performance OK
- [ ] Privacy audit clean
- [ ] Docs published
- [ ] Changelog updated
- [ ] Version tagged (v1.1.0-automation)
- [ ] Release notes published

---

## Notes

- Critical sprint for production readiness
- Privacy audit is non-negotiable
- Performance must be within targets
- Documentation is key for adoption
