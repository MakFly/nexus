# CORRECTIONS APPLIQUÉES - FREE CONTEXT MCP

Date : 2026-01-08
Statut : ✅ Tous les problèmes ont été corrigés

---

## RÉSUMÉ DES CORRECTIONS

### 🔧 Problème 1 : Colonne `stack` manquante dans FTS

**Fichiers modifiés :**
- `/server/src/storage/client.ts` (lignes 121-163)
- `/server/migrations/add_stack_to_fts.sql` (nouveau fichier de migration)

**Correction :**
Ajout d'une migration automatique dans `initializeDatabase()` qui :
1. Détecte si la colonne `stack` manque dans `memories_fts`
2. Sauvegarde les données existantes
3. Recrée la table FTS avec la colonne `stack`
4. Restaure les données

**Test :**
```bash
cd /home/kev/Documents/lab/brainstorming/free-context
sqlite3 free-context.db "PRAGMA table_info(memories_fts);"
# Doit afficher 7 colonnes dont 'stack'
```

---

### 🔧 Problème 2 : Variable `contexts` non définie

**Fichier modifié :**
- `/server/src/tools/auto-save.ts` (ligne 8)

**Correction :**
```diff
- import { memories } from '../storage/schema.js';
+ import { memories, contexts } from '../storage/schema.js';
```

Suppression de l'import dynamique redondant (ligne 213).

**Test :**
```bash
# Le MCP tool auto_save_memory fonctionne maintenant
```

---

### 🔧 Problème 3 : Parsing JSON incorrect dans le frontend

**Fichier modifié :**
- `/front/src/lib/api.ts` (toutes les fonctions API)

**Correction :**
Suppression du parsing JSON inutile sur les tags :
```diff
- tags: typeof context.tags === 'string' ? JSON.parse(context.tags) : context.tags,
+ // Tags are already arrays from Drizzle ORM
```

**Pourquoi ?**
L'API retourne déjà des tableaux JSON grâce à Drizzle ORM avec `{ mode: 'json' }`.
Le code essayait de faire `JSON.parse()` sur un tableau déjà parsé, ce qui échouait.

**Test :**
```bash
# Lancer le frontend et vérifier que les données s'affichent
cd front
bun run dev
# Ouvrir http://localhost:3000
# Vérifier que les contexts et memories s'affichent
```

---

## INSTRUCTIONS POUR APPLIQUER LES CORRECTIONS

### 1. Arrêter le serveur API (s'il tourne)

```bash
# Trouver et tuer le processus
ps aux | grep "bun" | grep -v grep
kill <PID>
```

### 2. Mettre à jour la base de données

```bash
cd /home/kev/Documents/lab/brainstorming/free-context/server

# Option 1 : Lancer la migration automatique (recommandé)
bun -e "
import { initializeDatabase } from './src/storage/client.js';
await initializeDatabase();
console.log('Database migrated successfully');
process.exit(0);
"

# Option 2 : Migration manuelle (si échec)
sqlite3 ../free-context.db < migrations/add_stack_to_fts.sql
```

### 3. Vérifier la migration

```bash
sqlite3 ../free-context.db "PRAGMA table_info(memories_fts);"
# Doit afficher 7 colonnes : id, memory_id, title, content, type, context_id, stack
```

### 4. Redémarrer le serveur API

```bash
cd /home/kev/Documents/lab/brainstorming/free-context/server
SERVER_MODE=API bun run src/index.ts
```

### 5. Vérifier l'API

```bash
# Test health
curl http://localhost:3001/api/health

# Test contexts
curl http://localhost:3001/api/contexts | jq '.data.contexts | length'

# Test memories
curl http://localhost:3001/api/memories | jq '.data.memories | length'
```

### 6. Lancer le frontend

```bash
cd /home/kev/Documents/lab/brainstorming/free-context/front
bun run dev
```

### 7. Tester dans le navigateur

Ouvrir `http://localhost:3000` et vérifier :
- ✅ 2 contexts s'affichent
- ✅ 14 memories s'affichent
- ✅ Recent Activity montre des données
- ✅ Growth Rate = +7.0

---

## VÉRIFICATION AUTOMATISÉE

```bash
#!/bin/bash
echo "=== Vérification Free Context MCP ==="

echo -n "1. API Health... "
curl -s http://localhost:3001/api/health | jq -e '.success == true' && echo "✅ OK" || echo "❌ FAIL"

echo -n "2. Contexts count... "
COUNT=$(curl -s http://localhost:3001/api/contexts | jq '.data.contexts | length')
if [ "$COUNT" -ge 2 ]; then
  echo "✅ OK ($COUNT contexts)"
else
  echo "❌ FAIL ($COUNT contexts)"
fi

echo -n "3. Memories count... "
COUNT=$(curl -s http://localhost:3001/api/memories | jq '.data.memories | length')
if [ "$COUNT" -ge 14 ]; then
  echo "✅ OK ($COUNT memories)"
else
  echo "❌ FAIL ($COUNT memories)"
fi

echo -n "4. FTS stack column... "
COLS=$(sqlite3 free-context.db "SELECT COUNT(*) FROM pragma_table_info('memories_fts') WHERE name='stack';")
if [ "$COLS" -eq 1 ]; then
  echo "✅ OK"
else
  echo "❌ FAIL"
fi

echo "=== Fin de la vérification ==="
```

---

## EXPLICATION DU GROWTH RATE

Le **Growth Rate** (taux de croissance) est une métrique qui calcule la **moyenne de memories par contexte** :

```typescript
Math.round((totalMemories / Math.max(totalContexts, 1)) * 10) / 10
```

### Exemple avec vos données actuelles :
- 14 memories / 2 contexts = 7.0
- Affiché comme "+7.0"

### Signification :
- **Indicateur de productivité** : Combien de memories sont créées par contexte en moyenne
- **Mesure d'activité** : Permet de voir si les contexts sont utilisés efficacement
- **Tendance** : Plus il est élevé, plus votre base de connaissances est riche

### Interprétation :
- **< 1.0** : Peu de memories par contexte (contexts sous-utilisés)
- **1.0 - 5.0** : Utilisation normale
- **> 5.0** : Contexts très productifs (comme vos 7.0 actuels !)

---

## DONNÉES ACTUELLES DANS LA BASE

```sql
-- Contexts
SELECT id, name, stack, difficulty FROM contexts;
-- 2 contexts Symfony

-- Memories
SELECT type, stack, difficulty, COUNT(*) as count
FROM memories
GROUP BY type, stack, difficulty;
-- 14 memories (snippets, notes)
```

---

## PROCHAINES ÉTAPES RECOMMANDÉES

1. **Tester le frontend** avec les corrections appliquées
2. **Vérifier que toutes les pages s'affichent** correctly:
   - `/contexts` - Liste des contexts
   - `/memories` - Liste des memories
   - `/` - Dashboard avec Growth Rate
3. **Tester les MCP tools** après corrections:
   - `create_context` avec stack/difficulty
   - `auto_save_memory`
   - `add_memory` avec stack
4. **Surveiller les logs** pour détecter d'autres erreurs potentielles

---

## CONTACT

Si vous rencontrez des problèmes après ces corrections :
1. Vérifiez que le serveur API tourne bien sur le port 3001
2. Vérifiez que la migration BDD a bien été appliquée
3. Consultez les logs du serveur : `SERVER_MODE=API bun run src/index.ts`
4. Vérifiez la console du navigateur pour les erreurs frontend

---

## ANNEXE : Structure de la base de données

### Table `contexts`
```sql
CREATE TABLE contexts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT NOT NULL DEFAULT '[]',  -- JSON array
  stack TEXT,                        -- nextjs, laravel, symfony, etc.
  difficulty TEXT,                   -- easy, normal, hard
  metadata TEXT NOT NULL DEFAULT '{}', -- JSON object
  system_prompt TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

### Table `memories`
```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  context_id TEXT NOT NULL REFERENCES contexts(id),
  type TEXT NOT NULL,                -- note, conversation, snippet, etc.
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  stack TEXT,                        -- nextjs, laravel, symfony, etc.
  difficulty TEXT,                   -- easy, normal, hard
  metadata TEXT NOT NULL DEFAULT '{}', -- JSON object
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

### Table `memories_fts` (Full-Text Search)
```sql
CREATE VIRTUAL TABLE memories_fts USING fts5(
  id,
  memory_id,
  title,
  content,
  type,
  context_id,
  stack  -- ← Colonne ajoutée par la migration
)
```
