#!/bin/bash
# Nexus Database Refresh Script
# Supprime et recrée la base de données depuis zéro

set -e

DB_PATH="apps/api/nexus.db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🗑️  Suppression de la base de données..."
rm -f "$SCRIPT_DIR/$DB_PATH"

echo "📦 Réindexation en cours..."
cd "$SCRIPT_DIR"
python3 packages/indexer-py/main.py index .

echo "✅ Refresh terminé !"
