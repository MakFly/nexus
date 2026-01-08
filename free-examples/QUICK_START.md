# Free Context MCP - Quick Start

## Installation & Setup

### 1. Installer le serveur MCP

```bash
cd /home/kev/Documents/lab/brainstorming/free-context/server
bun install
```

### 2. Configurer Claude Desktop

Ajouter à `~/.config/Claude/claude_desktop_config.json`:

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

### 3. Démarrer l'API Dashboard (optionnel)

```bash
cd /home/kev/Documents/lab/brainstorming/free-context/server
SERVER_MODE=API bun run dev
```

L'API sera disponible sur `http://localhost:3001`

### 4. Démarrer le Frontend Dashboard (optionnel)

```bash
cd /home/kev/Documents/lab/brainstorming/free-context/front
bun run dev
```

Le dashboard sera disponible sur `http://localhost:5173`

## Utilisation Rapide

### Via Claude Desktop

```
Toi: Crée un contexte "Mes Notes Python" avec les tags python, programmation

Claude: [Utilise l'outil create_context]
✓ Contexte créé avec l'ID: 1234567890-abc123

Toi: Ajoute une note sur les decorators Python

Claude: [Utilise l'outil add_memory]
✓ Mémoire ajoutée au contexte "Mes Notes Python"

Toi: Cherche toutes les mémoires sur "async"

Claude: [Utilise l'outil search_memories]
✓ Trouvé 3 mémoires correspondantes:
  1. async/await patterns (note)
  2. Async iterators (snippet)
  3. asyncio library (reference)
```

### Via API REST

```bash
# Créer un contexte
curl -X POST http://localhost:3001/api/contexts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mes Notes Python",
    "description": "Connaissances Python",
    "tags": ["python", "programmation"]
  }'

# Lister les contextes
curl http://localhost:3001/api/contexts

# Ajouter une mémoire
curl -X POST http://localhost:3001/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "CONTEXT_ID",
    "type": "note",
    "title": "Decorators Python",
    "content": "Les decorators permettent de modifier le comportement..."
  }'

# Rechercher
curl "http://localhost:3001/api/search?q=async"
```

## Outils MCP Disponibles

| Outil | Description |
|-------|-------------|
| `create_context` | Créer un nouveau contexte |
| `list_contexts` | Lister tous les contextes |
| `get_context` | Récupérer un contexte avec ses mémoires |
| `update_context` | Modifier un contexte |
| `delete_context` | Supprimer un contexte |
| `add_memory` | Ajouter une mémoire à un contexte |
| `search_memories` | Rechercher des mémoires (FTS5) |
| `smart_search` | Recherche hybride (FTS5 + sémantique) |
| `find_relationships` | Trouver les connexions entre mémoires |
| `auto_save_memory` | Sauvegarde intelligente avec détection de doublons |
| `auto_analyze_context` | Analyser et suggérer un contexte |

## Architecture User-Less

⚠️ **Important**: Free Context MCP utilise une architecture sans utilisateurs.

- **Pas d'authentification**: Tous les contextes et mémoires sont globaux
- **Pas d'isolation**: Tout est partagé dans la même base de données
- **Design pour usage local**: Idéal pour un poste de travail personnel
- **Single-user system**: Un seul utilisateur par installation

## Base de Données

La base SQLite est stockée dans: `server/free-context.db`

Pour explorer directement:

```bash
sqlite3 server/free-context.db

.tables
-- contexts, memories, relationships, memories_fts, events

SELECT * FROM contexts;
SELECT * FROM memories WHERE type = 'note';
SELECT * FROM memories_fts WHERE memories_fts MATCH 'python';
```

## Prochaines Étapes

1. Explorer les exemples dans `free-examples/`
2. Lire la documentation dans `MCP_SETUP.md`
3. Utiliser le dashboard web sur `http://localhost:5173`
4. Intégrer avec votre workflow Claude Desktop

## Support

- GitHub Issues: [Signaler des problèmes]
- Documentation: `ARCHITECTURE.md`, `STATUS.md`
- MCP Setup: `MCP_SETUP.md`
