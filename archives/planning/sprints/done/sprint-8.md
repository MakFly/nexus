# Sprint 8: Auto-capture MVP

**Dates**: Week 1
**Epic**: E-01 Auto-capture
**Status**: 📅 TODO
**Points**: 13

---

## Goal

Implémenter les lifecycle hooks Claude Code pour capturer automatiquement les observations et les comprimer en mémoires pertinentes.

---

## User Stories

| ID | Story | Points | Owner | Status |
|----|-------|--------|-------|--------|
| S-01 | Hook Session Start | 2 | | 📅 TODO |
| S-02 | Hook Post-Tool | 3 | | 📅 TODO |
| S-03 | Compression LLM | 5 | | 📅 TODO |
| S-04 | Context Injection | 3 | | 📅 TODO |

**Voir détails** : [planning/backlog/stories/](../backlog/stories/)

---

## Daily Breakdown

### Day 1: Foundation + Session Hook
- [ ] Review Claude Code hooks API
- [ ] Create database schema (observations, candidates tables)
- [ ] Implement API endpoint /capture
- [ ] Write sessionStart.sh hook script
- [ ] Test hook execution

### Day 2: Post-Tool Hook
- [ ] Design privacy filter patterns
- [ ] Implement API endpoint /capture/batch
- [ ] Write postTool.sh hook script
- [ ] Add <private> tag handling
- [ ] Test with various tool outputs

### Day 3: Compression Service
- [ ] Design distillation prompt
- [ ] Implement DistillationService class
- [ ] Add Mistral API integration
- [ ] Implement fallback "raw" mode
- [ ] Test compression ratio

### Day 4: Context Injection
- [ ] Implement relevance scoring algorithm
- [ ] Create API endpoint /context/inject
- [ ] Modify sessionStart.sh for context fetch
- [ ] Test token count < 2000
- [ ] Add NEXUS_NO_INJECT flag

### Day 5: Integration + Testing
- [ ] End-to-end test: session → capture → distill → inject
- [ ] Performance testing (hooks < 500ms)
- [ ] Error handling tests (API down)
- [ ] Documentation (install hooks)
- [ ] Sprint review

---

## Definition of Done

Sprint is complete when:
- [ ] All 4 stories completed with AC validated
- [ ] Hooks installables via script
- [ ] Compression ratio ≥ 10:1
- [ ] Context injection < 2000 tokens
- [ ] Privacy filter testé (passwords, tokens)
- [ ] E2E test passe
- [ ] Documentation hooks install complète

---

## Deliverables

### Code
- `apps/api/src/routes/capture.ts` - New endpoints
- `apps/api/src/services/distillation.ts` - Compression service
- `apps/hooks/src/sessionStart.sh` - Hook script
- `apps/hooks/src/postTool.sh` - Hook script
- `apps/hooks/src/sessionEnd.sh` - Hook script

### Database
```sql
-- New tables
CREATE TABLE observations (...);
CREATE TABLE candidates (...);
```

### API Endpoints
- `POST /capture` - Capture single observation
- `POST /capture/batch` - Batch capture
- `POST /distill` - Trigger distillation
- `GET /context/inject` - Get context for injection

---

## Acceptance Criteria Summary

| Story | Key AC |
|-------|--------|
| S-01 | Session ID persisté, observation stockée |
| S-02 | Privacy filtering, batching, truncation |
| S-03 | LLM compression 10:1, fallback raw |
| S-04 | Relevance scoring, < 2000 tokens |

---

## Dependencies

| Dependency | Type | Status | Owner |
|------------|------|--------|-------|
| Claude Code hooks API doc | External | ⏳ Day 1 | |
| MISTRAL_API_KEY | Config | ✅ OK | |
| Schema migration | Internal | ⏳ Day 1 | |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Hooks API change | Wrapper d'abstraction |
| LLM downtime | Fallback raw mode |
| Privacy leaks | Filter patterns + audit |

---

## Demo (Sprint Review)

```
1. Start new Claude Code session → Hook captures session start
2. Run some tools (Read, Edit, Bash) → All captured
3. End session → Distillation creates candidates
4. Review candidates in web UI
5. Start new session → Context auto-injected
```

---

## Notes

- Hooks must be non-blocking (< 100ms)
- All sensitive data filtered
- Session ID shared across hooks
- Logs in ~/.nexus/hooks.log
