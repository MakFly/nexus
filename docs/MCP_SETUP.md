# Free Context MCP - Installation et Configuration

## Configuration MCP pour Claude Desktop/Code

Le serveur MCP est maintenant configuré dans :
- `~/.claude/claude_desktop_config.json`
- `~/.claude-glm/claude_desktop_config.json` (symlink)

### Contenu de la configuration

```json
{
  "mcpServers": {
    "free-context": {
      "command": "bun",
      "args": [
        "run",
        "/home/kev/Documents/lab/brainstorming/free-context/server/src/index.ts"
      ],
      "env": {
        "SERVER_MODE": "MCP"
      }
    }
  }
}
```

## Démarrage des services

### Option 1: MCP seul (pour Claude Desktop)
```bash
cd /home/kev/Documents/lab/brainstorming/free-context/server
bun run dev
```

### Option 2: API seule (pour le dashboard)
```bash
cd /home/kev/Documents/lab/brainstorming/free-context/server
bun run api:dev
```

### Option 3: MCP + API ensemble (recommandé)
```bash
cd /home/kev/Documents/lab/brainstorming/free-context/server
bun run both
```

### Option 4: Dashboard frontend
```bash
cd /home/kev/Documents/lab/brainstorming/free-context/front
bun run dev
```

## URLs

- **API REST**: http://localhost:3001
- **Dashboard**: http://localhost:5173
- **Health Check**: http://localhost:3001/api/health

## Outils MCP disponibles

Le serveur expose 11 outils MCP :

### Gestion des Contexts
- `create_context` - Créer un nouveau contexte
- `get_context` - Obtenir un contexte par ID
- `list_contexts` - Lister tous les contextes
- `update_context` - Mettre à jour un contexte
- `delete_context` - Supprimer un contexte

### Gestion des Mémoires
- `add_memory` - Ajouter une mémoire à un contexte
- `get_memory` - Obtenir une mémoire par ID
- `list_memories` - Lister les mémoires avec filtres
- `update_memory` - Mettre à jour une mémoire
- `delete_memory` - Supprimer une mémoire

### Recherche
- `search` - Recherche plein texte avec FTS5

## Test rapide

### Tester l'API
```bash
# Health check
curl http://localhost:3001/api/health

# Créer un contexte
curl -X POST http://localhost:3001/api/contexts \
  -H "Content-Type: application/json" \
  -d '{"name":"Mon Projet","description":"Un projet test","tags":["test"]}'

# Lister les contextes
curl http://localhost:3001/api/contexts

# Créer une mémoire
curl -X POST http://localhost:3001/api/memories \
  -H "Content-Type: application/json" \
  -d '{"contextId":"<ID>","type":"note","title":"Note test","content":"Contenu de la note"}'

# Rechercher
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}'
```

## Utilisation dans Claude

Une fois le serveur MCP démarré, Claude aura accès à tous les outils :

```
Claude: Crée un contexte pour mon projet React
Claude: Ajoute une mémoire sur l'architecture
Claude: Recherche toutes les mémoires sur "React"
```

## Dépannage

### Le serveur MCP ne démarre pas
```bash
# Vérifier que bun est installé
bun --version

# Tester le démarrage manuel
cd /home/kev/Documents/lab/brainstorming/free-context/server
SERVER_MODE=MCP bun src/index.ts
```

### L'API ne répond pas
```bash
# Vérifier si le port 3001 est utilisé
lsof -i :3001

# Tester l'API
curl http://localhost:3001/api/health
```

### Le dashboard n'affiche pas les données
1. Vérifier que l'API tourne : `curl http://localhost:3001/api/health`
2. Ouvrir la console du navigateur (F12) pour voir les erreurs
3. Vérifier les requests dans l'onglet Network

### Problèmes CORS
Si vous avez des erreurs CORS, vérifiez que l'API est configurée avec le bon origin :
- Frontend: http://localhost:5173
- API: http://localhost:3001

## Structure de la base de données

La base SQLite est créée automatiquement au premier démarrage :
- Emplacement: `/home/kev/Documents/lab/brainstorming/free-context/server/data/free-context.db`
- Tables: users, contexts, memories, relationships
- Recherche FTS5: memories_fts

## Prochaines étapes

- [ ] Ajouter la recherche vectorielle pour la sémantique
- [ ] Implémenter WebSocket pour les mises à jour en temps réel
- [ ] Ajouter l'authentification multi-utilisateur
- [ ] Support PostgreSQL pour la production
- [ ] Export/Import (JSON, Markdown, CSV)
