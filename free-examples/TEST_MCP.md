# Test du MCP Free Context

## Vérification de l'Installation

### 1. Vérifier la configuration

```bash
# Vérifier que la config MCP existe
cat ~/.claude-glm/claude_desktop_config.json

# Vérifier que les hooks existent
ls -la ~/.claude/hooks/
```

### 2. Tester le serveur MCP directement

```bash
cd /home/kev/Documents/lab/brainstorming/free-context/server

# Lancer en mode MCP
SERVER_MODE=MCP bun run dev
```

Le serveur devrait démarrer et attendre des commandes JSON-RPC sur stdin.

### 3. Tester manuellement avec un message JSON-RPC

Créer un fichier test avec un message MCP :

```bash
cat > /tmp/mcp_test.json << 'EOF'
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
EOF

# Envoyer au serveur
cat /tmp/mcp_test.json | SERVER_MODE=MCP bun run src/index.ts
```

Résultat attendu : Liste des 11 outils MCP

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "create_context",
        "description": "Create a new context..."
      },
      ...
    ]
  }
}
```

### 4. Tester avec mcp-client-dev (optionnel)

```bash
# Installer mcp-client-dev
bun install -g mcp-client-dev

# Tester la connexion
mcp-client-dev stdio bun run src/index.ts
```

### 5. Vérifier que l'API HTTP fonctionne

```bash
# Terminal 1 : Démarrer l'API
cd /home/kev/Documents/lab/brainstorming/free-context/server
SERVER_MODE=API bun run dev

# Terminal 2 : Tester l'API
curl http://localhost:3001/api/health
curl http://localhost:3001/api/contexts
```

## Test Complet avec Claude Desktop

1. **Fermer et relancer Claude Desktop** pour qu'il charge la nouvelle config

2. **Vérifier que le MCP est connecté** :
   - Ouvrir les settings de Claude Desktop
   - Chercher "Free Context" dans la liste des MCP
   - Vérifier qu'il est marqué comme "Connected"

3. **Tester dans Claude** :

```
Toi: Liste tous les contextes disponibles

Claude: [Devrait appeler list_contexts et afficher les résultats]

Toi: Crée un contexte "Test MCP" avec les tags test, demo

Claude: [Devrait appeler create_context]

Toi: Ajoute une note "Ceci est un test" au contexte "Test MCP"

Claude: [Devrait appeler add_memory]

Toi: Cherche "test" dans les mémoires

Claude: [Devrait appeler search_memories]
```

## Dépannage

### Le MCP n'apparaît pas dans Claude Desktop

```bash
# Vérifier le chemin du fichier config
echo ~/.claude-glm/claude_desktop_config.json

# Vérifier que bun est installé
which bun

# Tester la commande MCP
bun --version
```

### Erreur "Cannot find module"

```bash
# Réinstaller les dépendances
cd /home/kev/Documents/lab/brainstorming/free-context/server
bun install
```

### Hooks ne s'exécutent pas

```bash
# Vérifier que node est installé
which node

# Tester un hook directement
echo '{"prompt": "test"}' | node ~/.claude/hooks/user-prompt-submit.js
```

### API non disponible

```bash
# Vérifier si le port 3001 est utilisé
lsof -i :3001

# Tuer le processus si nécessaire
kill -9 <PID>

# Redémarrer l'API
SERVER_MODE=API bun run dev
```

## Logs et Debug

### Activer le mode debug

```bash
# Dans server/.env ou en variable d'environnement
DEBUG=free-context:* SERVER_MODE=MCP bun run dev
```

### Voir les logs des hooks

Les hooks écrivent sur stderr, vous devriez voir :

```
[Free Context] 📝 Analyzing prompt (123 chars)
[Free Context] 🎯 Matched context: "Next.js App Architecture"
[Free Context Pre] 🔍 Tool: create_context
[Free Context Pre] 🔑 Keywords: context, nextjs, app
[Free Context Post] ✅ Tool completed: create_context
```

## Succès !

Si tout fonctionne, vous devriez voir :

1. ✅ Le MCP apparaît dans Claude Desktop
2. ✅ Les outils sont disponibles (11 outils)
3. ✅ Les hooks s'exécutent (logs stderr)
4. ✅ La base de données se remplit (sqlite3 server/free-context.db)
5. ✅ L'API répond sur localhost:3001
