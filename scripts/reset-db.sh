#!/bin/bash
# Reset Nexus SQLite Database
# Removes all database files (including WAL journals) and allows a fresh start

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Possible database locations
DB_PATHS=(
    "$PROJECT_ROOT/nexus.db"
    "$PROJECT_ROOT/apps/api/nexus.db"
    "$PROJECT_ROOT/packages/storage/nexus.db"
)

echo "=== Nexus Database Reset ==="
echo ""

# Find and remove all database files
found=0
for db_path in "${DB_PATHS[@]}"; do
    if [ -f "$db_path" ]; then
        echo "Found database: $db_path"
        rm -f "$db_path"
        rm -f "${db_path}-wal"
        rm -f "${db_path}-shm"
        echo "  - Removed $db_path"
        found=$((found + 1))
    fi
done

# Also check for any .db files in common locations
for extra_db in $(find "$PROJECT_ROOT" -maxdepth 3 -name "*.db" -type f 2>/dev/null); do
    if [ -f "$extra_db" ]; then
        echo "Found additional database: $extra_db"
        rm -f "$extra_db"
        rm -f "${extra_db}-wal"
        rm -f "${extra_db}-shm"
        echo "  - Removed $extra_db"
        found=$((found + 1))
    fi
done

if [ $found -eq 0 ]; then
    echo "No database files found to remove."
else
    echo ""
    echo "Removed $found database file(s)."
fi

echo ""
echo "Database reset complete!"
echo "The database will be recreated with fresh migrations when you restart the API."
echo ""
echo "To restart the API:"
echo "  cd $PROJECT_ROOT/apps/api && bun run src/index.ts"
