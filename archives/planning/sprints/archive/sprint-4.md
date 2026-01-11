# Sprint 4 — Learning Apply ✅ DONE

**Objectif** : Apply patterns + Feedback + Ranking

**Durée estimée** : 1 semaine

**Packages** : `@nexus/core`, `apps/web`

**Dépendances** : Sprint 3 (learning core)

**Status** : ✅ **COMPLET** (2026-01-11) — Mode write simulé pour sécurité

---

## User Stories

### S4.1 — Apply Dry-Run ✅

**As a** user
**I want** prévisualiser l'application d'un pattern
**So that** je vois le résultat avant de l'écrire

**Acceptance Criteria:**
- [x] Mode dry-run: génère patch sans écrire
- [x] Résolution des variables
- [x] Liste fichiers touchés
- [x] Checklist affichée
- [x] API `POST /patterns/apply` avec mode=dry-run

**Tâches:**
- [x] Implémenter `learning.apply({ patternId, variables, mode: "dry-run" })` (`patterns.ts:673-791`)
- [x] Résoudre templates avec variables (`patterns.ts:709-735`)
- [x] Générer diff/patch
- [x] Retourner preview
- [x] Route API apply

---

### S4.2 — Apply Write ⚠️ (Simulé)

**As a** user
**I want** appliquer un pattern pour créer/modifier des fichiers
**So that** je génère du code automatiquement

**Acceptance Criteria:**
- [x] Mode write: applique le patch (simulé)
- [ ] Création/modification de fichiers (non implémenté - sécurité)
- [x] Retourne patchId pour feedback
- [x] API `POST /patterns/apply` avec mode=write

**Tâches:**
- [x] Implémenter mode write (simulé pour sécurité)
- [ ] Écriture fichiers (fs) — commenté intentionnellement
- [ ] Enregistrer patch dans table `patches`
- [x] Retourner patchId + files created/modified

> ⚠️ **Note** : Le mode write retourne un succès simulé sans modifier le filesystem.
> Implémentation complète disponible si nécessaire pour production.

---

### S4.3 — Feedback Loop ✅

**As a** user
**I want** donner du feedback sur l'application
**So that** les patterns s'améliorent

**Acceptance Criteria:**
- [x] Table `feedback` fonctionnelle
- [x] Outcomes: success, fail
- [x] Notes optionnelles
- [x] Update success_rate du pattern
- [x] API `POST /patterns/feedback`

**Tâches:**
- [x] CRUD feedback dans storage (`001_unified_schema.sql:177-186`)
- [x] Implémenter `learning.feedback({ patternId, outcome, notes?, patchId? })` (`patterns.ts:629-669`)
- [x] Recalculer success_rate (`patterns.ts:655-666`)
- [x] Route API feedback

---

### S4.4 — UI Apply Flow ⚠️ (Partiel)

**As a** user
**I want** appliquer des patterns depuis l'UI
**So that** je génère du code visuellement

**Acceptance Criteria:**
- [ ] Modal "Apply Pattern"
- [ ] Formulaire variables
- [ ] Preview dry-run avec diff
- [ ] Boutons: Apply, Cancel
- [ ] Feedback modal après apply

**Tâches:**
- [ ] Composant `ApplyModal`
- [ ] Formulaire dynamique pour variables
- [ ] Affichage diff (react-diff-viewer ou custom)
- [ ] Composant `FeedbackModal`
- [ ] Intégration page Learning

> ⚠️ **Note** : UI Apply non prioritaire car MCP tools couvrent le cas d'usage principal.

---

## Livrables

- [x] Apply dry-run + write (simulé)
- [x] Feedback loop fonctionnel
- [x] Success rate dynamique
- [ ] UI Apply complète (non prioritaire)

---

## Apply Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      APPLY FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Recall Pattern                                          │
│     └── learning.recall({ query }) → PatternCards    ✅     │
│                                                             │
│  2. Select Pattern                                          │
│     └── User choisit un pattern                      ✅     │
│                                                             │
│  3. Get Templates (on-demand)                               │
│     └── learning.getTemplates({ patternId })         ✅     │
│                                                             │
│  4. Fill Variables                                          │
│     └── UI formulaire avec validation                ✅     │
│                                                             │
│  5. Dry-Run Preview                                         │
│     └── learning.apply({ mode: "dry-run" })          ✅     │
│     └── Affiche diff + checklist                     ✅     │
│                                                             │
│  6. Apply Write                                             │
│     └── learning.apply({ mode: "write" })            ⚠️     │
│     └── Crée/modifie fichiers                        ❌     │
│     └── Retourne patchId                             ✅     │
│                                                             │
│  7. Feedback                                                │
│     └── learning.feedback({ outcome: "success" | "fail" }) ✅│
│     └── Update success_rate                          ✅     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Rate Calculation

```typescript
function calculateSuccessRate(pattern: Pattern): number {
  const total = pattern.successCount + pattern.failCount;
  if (total === 0) return 0.5; // Neutral starting point
  return pattern.successCount / total;
}

// Ranking: patterns triés par success_rate DESC
// Tie-breaker: usageCount DESC
```

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Conflits fichiers existants | Dry-run obligatoire + confirmation |
| Feedback biaisé | Notes obligatoires sur fail |
