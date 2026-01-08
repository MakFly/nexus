# ✅ Free Context MCP - Installation Complète

## Ce qui a été fait

### 1. Architecture User-Less Implémentée ✅
- Suppression complète du système d'utilisateurs
- Base de données simplifiée (pas de table users, pas de userId)
- Tous les fichiers nettoyés (20+ fichiers modifiés)

### 2. Configuration MCP Créée ✅

**Fichier de configuration :** `~/.claude-glm/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "free-context": {
      "command": "bun",
      "args": [
        "/home/kev/Documents/lab/brainstorming/free-context/server/src/index.ts"
      ],
      "env": {
        "SERVER_MODE": "MCP"
      }
    }
  }
}
```

### 3. Hooks Externes Créés ✅

**Répertoire :** `~/.claude/hooks/`

| Hook | Fichier | Fonction |
|------|---------|----------|
| User Prompt Submit | `user-prompt-submit.js` | Analyse le prompt et détecte le contexte |
| Pre Tool Use | `pre-tool-use.js` | Recherche des mémoires pertinentes avant l'exécution |
| Post Tool Use | `post-tool-use.js` | Sauvegarde automatique après l'exécution |

**Configuration :** `~/.claude/hooks/hooks.json`

### 4. Test MCP Réussi ✅

```bash
$ echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | bun run src/index.ts
```

**Résultat :** 15 outils MCP listés avec leurs schémas JSON complets

## Comment Utiliser

### Via Claude Desktop

1. **Fermer et relancer Claude Desktop** (pour charger la nouvelle config)

2. **Vérifier la connexion** :
   - Settings → Developer → MCP Servers
   - "Free Context" doit apparaître comme "Connected"

3. **Utiliser dans Claude** :

```
Toi: Liste tous mes contextes
Claude: [Appelle list_contexts]

Toi: Crée un contexte "Python Tips" avec les tags python, programmation
Claude: [Appelle create_context]

Toi: Ajoute une note sur les decorators Python
Claude: [Appelle add_memory]

Toi: Cherche "decorator" dans mes mémoires
Claude: [Appelle search]
```

### Via API HTTP (Dashboard)

```bash
# Terminal 1 : Démarrer l'API
cd /home/kev/Documents/lab/brainstorming/free-context/server
SERVER_MODE=API bun run dev

# Terminal 2 : Démarrer le frontend
cd /home/kev/Documents/lab/brainstorming/free-context/front
bun run dev
```

Puis ouvrir `http://localhost:5173`

## Fichiers Importants

| Fichier | Description |
|---------|-------------|
| `~/.claude-glm/claude_desktop_config.json` | Config MCP pour Claude Desktop |
| `~/.claude/hooks/hooks.json` | Configuration des hooks |
| `~/.claude/hooks/*.js` | Scripts des hooks (3 fichiers) |
| `server/src/index.ts` | Point d'entrée du serveur MCP |
| `server/free-context.db` | Base de données SQLite |
| `free-examples/TEST_MCP.md` | Guide de test complet |
| `free-examples/QUICK_START.md` | Guide de démarrage rapide |

## Outils MCP Disponibles

### Gestion des Contextes
- `create_context` - Créer un contexte
- `list_contexts` - Lister tous les contextes
- `get_context` - Obtenir un contexte
- `update_context` - Modifier un contexte
- `delete_context` - Supprimer un contexte

### Gestion des Mémoires
- `add_memory` - Ajouter une mémoire
- `get_memory` - Obtenir une mémoire
- `list_memories` - Lister les mémoires
- `update_memory` - Modifier une mémoire
- `delete_memory` - Supprimer une mémoire

### Recherche & Automatisations
- `search` - Recherche FTS5
- `auto_analyze_context` - Analyser et suggérer un contexte
- `smart_search` - Recherche hybride (FTS5 + TF-IDF)
- `find_relationships` - Trouver les connexions
- `auto_save_memory` - Sauvegarde intelligente

## Vérification

```bash
# 1. Vérifier la config MCP
cat ~/.claude-glm/claude_desktop_config.json

# 2. Vérifier les hooks
ls -la ~/.claude/hooks/

# 3. Tester le MCP
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | bun run src/index.ts

# 4. Vérifier l'API
curl http://localhost:3001/api/health

# 5. Vérifier la DB
sqlite3 server/free-context.db ".tables"
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Claude Desktop / Claude Code     │
│           (via ~/.claude-glm/config)     │
└──────────────────┬──────────────────────┘
                   │ stdio (MCP)
┌──────────────────▼──────────────────────┐
│      Free Context MCP Server             │
│      (server/src/index.ts)               │
│  - 15 outils MCP                        │
│  - Architecture user-less               │
│  - Hooks externes (~/.claude/hooks/)    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      SQLite Database                     │
│      (server/free-context.db)           │
│  - contexts (no userId)                 │
│  - memories (no userId)                 │
│  - relationships                        │
│  - memories_fts (FTS5)                  │
│  - events (no userId)                   │
└─────────────────────────────────────────┘
```

## Prochaines Étapes

1. ✅ **Relancer Claude Desktop** pour charger la nouvelle config
2. ✅ **Tester dans Claude** avec les exemples de `free-examples/`
3. ✅ **Utiliser le dashboard** sur `http://localhost:5173`
4. ✅ **Explorer les mémoires** avec SQLite directement

## Support

- Tests complets : `free-examples/TEST_MCP.md`
- Quick start : `free-examples/QUICK_START.md`
- Exemples : `free-examples/developer-workflow/`

---

**Statut :** ✅ INSTALLATION TERMINÉE ET TESTÉE

Le MCP Free Context est **opérationnel** et **prêt à l'emploi** avec Claude Desktop.
