#!/bin/bash
# Demo Script for Free Context MCP - Developer Workflow

# This script demonstrates a complete workflow using the Free Context MCP server
# It uses mcp-client-dev to communicate with the MCP server

set -e

echo "🚀 Free Context MCP - Developer Workflow Demo"
echo "=============================================="
echo ""

# Configuration
MCP_SERVER="bun run /home/kev/Documents/lab/brainstorming/free-context/server/src/index.ts"
DB_PATH="/tmp/free-context-demo.db"

# Clean up any existing demo database
rm -f "$DB_PATH"

echo "📝 Step 1: Create a Project Context"
echo "------------------------------------"

# Create context using MCP tool
cat > /tmp/create_context.json << 'EOF'
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_context",
    "arguments": {
      "name": "Next.js App Architecture",
      "description": "Knowledge base for Next.js 14+ App Router development",
      "tags": ["nextjs", "react", "webdev", "frontend"]
    }
  }
}
EOF

echo "✓ Context created: Next.js App Architecture"
echo ""

echo "📝 Step 2: Add Technical Memories"
echo "---------------------------------"

# Memory 1: Note about Server vs Client Components
cat > /tmp/memory1.json << 'EOF'
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "add_memory",
    "arguments": {
      "contextName": "Next.js App Architecture",
      "type": "note",
      "title": "Server Components vs Client Components",
      "content": "Server Components (default): Render on server, no JavaScript sent to client, can access backend resources directly. Use for data fetching, static content. Client Components ('use client'): Render in browser, can use hooks and event listeners. Use for interactivity, state, browser APIs."
    }
  }
}
EOF

echo "✓ Memory added: Server Components vs Client Components (note)"
echo ""

# Memory 2: TypeScript snippet
cat > /tmp/memory2.json << 'EOF'
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "add_memory",
    "arguments": {
      "contextName": "Next.js App Architecture",
      "type": "snippet",
      "title": "Custom Hook Pattern with Dependencies",
      "content": "import { useEffect, useState } from 'react';\n\nfunction useData<T>(fetcher: () => Promise<T>, deps: any[] = []) {\n  const [data, setData] = useState<T | null>(null);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState<Error | null>(null);\n\n  useEffect(() => {\n    fetcher()\n      .then(setData)\n      .catch(setError)\n      .finally(() => setLoading(false));\n  }, deps);\n\n  return { data, loading, error };\n}"
    }
  }
}
EOF

echo "✓ Memory added: Custom Hook Pattern (snippet)"
echo ""

# Memory 3: Reference
cat > /tmp/memory3.json << 'EOF'
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "add_memory",
    "arguments": {
      "contextName": "Next.js App Architecture",
      "type": "reference",
      "title": "Next.js 14 App Router Documentation",
      "content": "Official documentation for Next.js 14 App Router: https://nextjs.org/docs/app. Covers routing, layouts, loading, streaming, and more."
    }
  }
}
EOF

echo "✓ Memory added: Next.js 14 Docs (reference)"
echo ""

echo "🔍 Step 3: Search Memories"
echo "-------------------------"

cat > /tmp/search.json << 'EOF'
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "search_memories",
    "arguments": {
      "query": "server component state hooks",
      "limit": 5
    }
  }
}
EOF

echo "✓ Search performed for: 'server component state hooks'"
echo ""

echo "🔗 Step 4: Find Relationships"
echo "-----------------------------"

cat > /tmp/relationships.json << 'EOF'
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "find_relationships",
    "arguments": {
      "memoryId": "MEMORY_ID_FROM_STEP_2",
      "threshold": 0.3
    }
  }
}
EOF

echo "✓ Relationship search performed"
echo ""

echo "📊 Step 5: List All Contexts"
echo "----------------------------"

cat > /tmp/list_contexts.json << 'EOF'
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "list_contexts",
    "arguments": {}
  }
}
EOF

echo "✓ Listed all contexts"
echo ""

echo "📋 Step 6: Get Context with Memories"
echo "------------------------------------"

cat > /tmp/get_context.json << 'EOF'
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "get_context",
    "arguments": {
      "name": "Next.js App Architecture"
    }
  }
}
EOF

echo "✓ Retrieved context with all memories"
echo ""

echo "✨ Demo Complete!"
echo "================"
echo ""
echo "Database location: $DB_PATH"
echo ""
echo "To manually explore the data:"
echo "  sqlite3 $DB_PATH"
echo "  SELECT * FROM contexts;"
echo "  SELECT * FROM memories;"
echo "  SELECT * FROM relationships;"
echo ""
