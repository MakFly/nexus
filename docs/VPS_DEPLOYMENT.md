# Déploiement VPS - Free Context MCP

Ce guide explique comment déployer Free Context MCP sur un VPS (Hetzner, DigitalOcean, etc.).

## Architecture de déploiement

```
VPS (Ubuntu 22.04+)
├── API Server (Bun)      → Port 3001
│   ├── REST API         → /api/*
│   └── MCP HTTP         → /mcp
├── Frontend (Static)    → Port 80/443 (Nginx)
└── Database (SQLite)    → /var/opt/free-context/data/
```

## Prérequis

- VPS avec **Ubuntu 22.04+** (ou Debian 12+)
- **2GB RAM** minimum (4GB recommandé)
- **20GB** d'espace disque
- Accès **root** ou utilisateur avec **sudo**

## Installation rapide

### 1. Connexion au VPS

```bash
ssh root@your-vps-ip
```

### 2. Installer les dépendances

```bash
# Installer Bun
curl -fsSL https://bun.sh/install | bash

# Installer Nginx
apt update && apt install -y nginx git

# Cloner le projet
cd /opt
git clone <your-repo-url> free-context
cd free-context

# Installer les dépendances
make install
make front-install
```

### 3. Build

```bash
make build
make front-build
```

### 4. Créer l'utilisateur systemd

```bash
# Créer utilisateur dédié
useradd -r -s /bin/bash free-context
mkdir -p /var/opt/free-context
chown -R free-context:free-context /var/opt/free-context

# Copier les fichiers build
cp -r server/dist /var/opt/free-context/
cp -r server/src /var/opt/free-context/
cp -r server/node_modules /var/opt/free-context/
cp server/package.json /var/opt/free-context/
chown -R free-context:free-context /var/opt/free-context
```

### 5. Créer le service systemd

```bash
cat > /etc/systemd/system/free-context-api.service <<'EOF'
[Unit]
Description=Free Context MCP API Server
After=network.target

[Service]
Type=simple
User=free-context
WorkingDirectory=/var/opt/free-context
Environment=SERVER_MODE=API
Environment=API_PORT=3001
Environment=DATABASE_PATH=/var/opt/free-context/data/free-context.db
ExecStart=/usr/bin/bun run /var/opt/free-context/src/index.ts
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=free-context-api

[Install]
WantedBy=multi-user.target
EOF

# Activer et démarrer
systemctl daemon-reload
systemctl enable free-context-api
systemctl start free-context-api
```

### 6. Configurer Nginx

```bash
cat > /etc/nginx/sites-available/free-context <<'EOF'
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (static files)
    location / {
        root /var/opt/free-context/front/dist;
        try_files $uri $uri/ /index.html;

        # Cache assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API REST
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # MCP Streamable HTTP
    location /mcp {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # MCP requires these headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;

        # CORS headers for MCP
        proxy_set_header Access-Control-Allow-Origin *;
        proxy_set_header Access-Control-Allow-Methods "GET, POST, OPTIONS, DELETE";
        proxy_set_header Access-Control-Allow-Headers "Content-Type, mcp-session-id, mcp-protocol-version, Authorization";
        proxy_set_header Access-Control-Expose-Headers "mcp-session-id, mcp-protocol-version";

        # Increase timeouts for long MCP operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logs
    access_log /var/log/nginx/free-context-access.log;
    error_log /var/log/nginx/free-context-error.log;
}
EOF

# Activer le site
ln -s /etc/nginx/sites-available/free-context /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 7. Build et copier le frontend

```bash
# Build frontend avec l'URL de production
cd front
VITE_API_URL=https://your-domain.com/api bun run build

# Copier sur le VPS
mkdir -p /var/opt/free-context/front
cp -r dist /var/opt/free-context/front/
chown -R free-context:free-context /var/opt/free-context/front
```

### 8. HTTPS avec Let's Encrypt

```bash
# Installer certbot
apt install -y certbot python3-certbot-nginx

# Obtenir certificat SSL
certbot --nginx -d your-domain.com

# Certbot va automatiquement configurer Nginx pour HTTPS
```

## Vérification

```bash
# Vérifier le service API
systemctl status free-context-api

# Vérifier les logs
journalctl -u free-context-api -f

# Tester l'API
curl https://your-domain.com/api/health

# Tester le MCP
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'
```

## Configuration Claude Desktop

Ajoutez le MCP à Claude Desktop :

**~/.claude/claude_desktop_config.json** :
```json
{
  "mcpServers": {
    "free-context": {
      "transport": "http",
      "url": "https://your-domain.com/mcp"
    }
  }
}
```

Ou via commande :
```bash
claude mcp add --transport http https://your-domain.com/mcp
```

## Gestion des mises à jour

```bash
# Sur le VPS
cd /opt/free-context
git pull
make build
make front-build

# Redémarrer le service
systemctl restart free-context-api

# Mettre à jour le frontend
rm -rf /var/opt/free-context/front/dist
cp -r front/dist /var/opt/free-context/front/
```

## Monitoring

```bash
# Vérifier les ressources
htop

# Vérifier les logs en temps réel
journalctl -u free-context-api -f

# Vérifier Nginx
tail -f /var/log/nginx/free-context-error.log

# Statistiques de la base de données
ls -lh /var/opt/free-context/data/
```

## Backup

```bash
# Script de backup simple
cat > /opt/backup-free-context.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/free-context"
mkdir -p $BACKUP_DIR

# Backup database
cp /var/opt/free-context/data/free-context.db $BACKUP_DIR/free-context-$DATE.db

# Garder seulement les 30 derniers backups
ls -t $BACKUP_DIR/free-context-*.db | tail -n +31 | xargs rm -f

echo "Backup completed: free-context-$DATE.db"
EOF

chmod +x /opt/backup-free-context.sh

# Ajouter à crontab (backup quotidien à 2h du matin)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-free-context.sh") | crontab -
```

## Sécurisation

```bash
# Firewall UFW
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# Fail2Ban pour protéger contre les attaques brute force
apt install -y fail2ban

# Limiter les requêtes (optionnel)
# Ajouter dans /etc/nginx/sites-available/free-context :
# limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
# location /api {
#     limit_req zone=api_limit burst=20;
#     ...
# }
```

## Dépannage

### Le service ne démarre pas

```bash
# Vérifier les logs
journalctl -u free-context-api -n 50

# Vérifier les permissions
ls -la /var/opt/free-context

# Tester manuellement
sudo -u free-context bun run /var/opt/free-context/src/index.ts
```

### Erreur 502 Bad Gateway

```bash
# Vérifier que le serveur API tourne
systemctl status free-context-api

# Vérifier le port
netstat -tlnp | grep 3001
```

### Le frontend ne charge pas

```bash
# Vérifier les permissions Nginx
ls -la /var/opt/free-context/front/dist

# Vérifier la configuration Nginx
nginx -t
```

## Coûts estimés

| Fournisseur | Configuration | Prix mensuel |
|-------------|---------------|--------------|
| **Hetzner** CX22 | 2 vCPU, 4GB RAM, 40GB SSD | ~4€ |
| **DigitalOcean** Basic | 1 vCPU, 1GB RAM, 25GB SSD | ~6€ |
| **DigitalOcean** Basic | 2 vCPU, 4GB RAM, 80GB SSD | ~24€ |
| **Linode** Nanode 2GB | 1 vCPU, 2GB RAM, 50GB SSD | ~5€ |

## Prochaines étapes

- [ ] Configurer un nom de domaine et DNS
- [ ] Mettre en place des backups automatiques
- [ ] Surveiller avec des outils de monitoring (Prometheus, Grafana)
- [ ] Configurer CI/CD pour les déploiements automatiques
