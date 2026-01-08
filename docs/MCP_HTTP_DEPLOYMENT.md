# Free Context MCP - Déploiement HTTP (Streamable Transport)

## 🌐 Nouveau : Support Streamable HTTP Transport

Le serveur Free Context MCP supporte maintenant le **Streamable HTTP Transport**, ce qui permet de l'utiliser à distance sans installation locale !

## 📦 Installation

### Option 1: Installation locale (stdio - classique)
```bash
bun add -g free-context-mcp-server
```

**~/.claude/claude_desktop_config.json** :
```json
{
  "mcpServers": {
    "free-context": {
      "command": "free-context-mcp"
    }
  }
}
```

### Option 2: Déploiement HTTP (nouveau !) 🆕

Déployez le serveur sur n'importe quel hébergeur HTTP, puis ajoutez-le à Claude :

```bash
# Depuis n'importe où !
claude mcp add --transport http https://your-server.com/mcp
```

## 🚀 Options de déploiement HTTP

### 1. Hébergement Cloud recommandé

| Plateforme | Prix | Avantages |
|------------|------|-----------|
| **Railway** | ~5-20$/mois | Auto-deploy, SSL, très simple |
| **Fly.io** | Gratuit (~) | Edge deployment, bas délai |
| **Render** | ~7$/mois | Simple, Docker natif |
| **VPS (Hetzner)** | ~4€/mois | Contrôle total, pas cher |

### 2. Déploiement sur Railway

```bash
# 1. Installer Railway CLI
npm install -g @railway/cli

# 2. Login et déployer
railway login
railway init
railway up

# 3. Obtenir l'URL
railway domain
```

Une fois déployé, ajoutez le MCP :
```bash
claude mcp add --transport http https://your-app.railway.app/mcp
```

### 3. Déploiement sur Fly.io

```bash
# 1. Installer flyctl
curl -L https://fly.io/install.sh | sh

# 2. Créer fly.toml
cat > fly.toml <<EOF
app = "free-context-mcp"
primary_region = "cdg"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8080"
  SERVER_MODE = "API"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[http_service.checks]]
  interval = "15s"
  timeout = "10s"
  grace_period = "5s"
  method = "GET"
  path = "/api/health"
EOF

# 3. Déployer
fly launch
fly deploy
```

### 4. Docker (pour tout hébergeur)

```dockerfile
# Dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN bun run build

# Expose port
EXPOSE 3001

# Set environment
ENV SERVER_MODE=API
ENV PORT=3001

# Run
CMD ["bun", "run", "dist/index.js"]
```

```bash
# Build and run
docker build -t free-context-mcp .
docker run -p 3001:3001 -e SERVER_MODE=API free-context-mcp
```

## 🔧 Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SERVER_MODE` | Mode serveur | `MCP` |
| `API_PORT` | Port API | `3001` |
| `WS_PORT` | Port WebSocket | `3002` |
| `DATABASE_PATH` | Chemin base SQLite | `./free-context.db` |
| `DEBUG` | Mode debug | `false` |

### Pour le déploiement HTTP, utiliser :
```bash
SERVER_MODE=API bun run src/index.ts
```

## 🧪 Test du endpoint MCP

```bash
# Health check
curl https://your-server.com/api/health

# MCP endpoint info
curl https://your-server.com/mcp

# Test initialize (JSON-RPC)
curl -X POST https://your-server.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {}
  }'

# Lister les outils disponibles
curl -X POST https://your-server.com/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Session-Id: test-session" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'

# Appeler un outil
curl -X POST https://your-server.com/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Session-Id: test-session" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_contexts",
      "arguments": {}
    }
  }'
```

## 📝 Utilisation dans Claude Desktop

Une fois le serveur déployé, ajoutez-le dans Claude Desktop :

**~/.claude/claude_desktop_config.json** :
```json
{
  "mcpServers": {
    "free-context-remote": {
      "transport": "http",
      "url": "https://your-server.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_IF_NEEDED"
      }
    }
  }
}
```

Ou via commande :
```bash
claude mcp add --transport http https://your-server.com/mcp
```

## 🔒 Sécurité

### Ajouter l'authentification

Pour sécuriser votre MCP endpoint :

```typescript
// Dans src/mcp/http-transport.ts
export function createMcpHttpRouter(options: {
  authToken?: string;
}) {
  const router = new Hono();

  router.use('*', async (c, next) => {
    const auth = c.req.header('authorization');
    if (auth !== `Bearer ${options.authToken}`) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
  });

  // ... rest of the router
}
```

Puis utilisez :
```bash
claude mcp add --transport http \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-server.com/mcp
```

## 🌍 CORS

Le serveur configure automatiquement CORS pour autoriser les requêtes cross-origin. Vous pouvez limiter les origines autorisées dans `src/api/middleware.ts`.

## 📊 Monitoring

```bash
# Vérifier les sessions actives
curl https://your-server.com/api/health

# Logs (si activé)
tail -f /var/log/free-context/mcp.log
```

## 🆚 Comparaison : stdio vs HTTP

| | **stdio (local)** | **HTTP (remote)** |
|---|---|---|
| **Installation** | Requiert `npm install` | Aucune installation |
| **Performance** | Plus rapide (IPC) | Dépend réseau |
| **Flexibilité** | Machine locale | N'importe où |
| **Maintenance** | Mises à jour manuelles | Centralisée |
| **Authentification** | Non nécessaire | Facile à ajouter |

## 🔗 Ressources

- [MCP Specification - Transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Railway Documentation](https://docs.railway.app/)
- [Fly.io Documentation](https://fly.io/docs/)

## 🎯 Prochaines étapes

- [ ] Ajouter l'authentification OAuth
- [ ] Support WebSocket pour temps réel
- [ ] Rate limiting
- [ ] Cache Redis pour les sessions
- [ ] Metrics Prometheus
