# API Documentation - Nexus

> REST API pour la recherche de code, la gestion des mémoires et le système de patterns

**Base URL:** `http://localhost:3001`

**Content-Type:** `application/json`

---

## 📖 Table des Matières

1. [Health & Stats](#health--stats)
2. [Search](#search)
3. [Memory](#memory)
4. [Patterns](#patterns)
5. [Errors](#errors)

---

## 🔍 Health & Stats

### GET `/`

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

---

### GET `/ping`

Simple ping endpoint.

**Response:**
```text
pong
```

---

### GET `/stats`

Database and search engine statistics.

**Response:**
```json
{
  "files": 142,
  "chunks": 1847,
  "embeddings": 856,
  "engines": {
    "keyword": "fts5",
    "semantic": "mistral"
  }
}
```

---

## 🔎 Search

### POST `/search`

Keyword search using FTS5 with BM25 ranking.

**Request:**
```json
{
  "q": "user authentication",
  "limit": 20,
  "offset": 0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | ✅ | Search query |
| `limit` | number | ❌ | Max results (default: 20, max: 100) |
| `offset` | number | ❌ | Pagination offset (default: 0) |

**Response:**
```json
{
  "query": "user authentication",
  "hits": [
    {
      "path": "src/auth/user.ts",
      "startLine": 42,
      "endLine": 58,
      "content": "export function loginUser(credentials) { ... }",
      "symbol": "loginUser",
      "score": 0.87,
      "mgrep": "./src/auth/user.ts:42-58 [87%]"
    }
  ],
  "totalHits": 15,
  "processingTimeMs": 23
}
```

---

### POST `/grep`

Live grep using ripgrep (unindexed search).

**Request:**
```json
{
  "q": "TODO|FIXME",
  "path": "./src",
  "limit": 20,
  "glob": "*.ts",
  "regex": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | ✅ | Search query (supports regex if `regex: true`) |
| `path` | string | ❌ | Search path (default: `./packages`) |
| `limit` | number | ❌ | Max results (default: 20, max: 50) |
| `glob` | string | ❌ | File filter (e.g., `*.ts`) |
| `regex` | boolean | ❌ | Enable regex mode (default: false) |

**Response:**
```json
{
  "query": "TODO|FIXME",
  "hits": [
    {
      "path": "src/auth/user.ts",
      "line": 15,
      "content": "// TODO: add rate limiting"
    }
  ],
  "totalHits": 8,
  "filesSearched": 142,
  "processingTimeMs": 156,
  "truncated": false
}
```

---

### POST `/search/semantic`

Semantic search using embeddings.

**Request:**
```json
{
  "q": "authenticate user with credentials",
  "limit": 10
}
```

**Response:**
```json
{
  "query": "authenticate user with credentials",
  "mode": "semantic",
  "hits": [
    {
      "path": "src/auth/user.ts",
      "startLine": 42,
      "endLine": 58,
      "content": "export function loginUser(credentials) { ... }",
      "symbol": "loginUser",
      "similarity": 0.92,
      "mgrep": "./src/auth/user.ts:42-58 [92%]"
    }
  ],
  "embeddingTimeMs": 45,
  "processingTimeMs": 89
}
```

> **Note:** Requires `MISTRAL_API_KEY` or `OPENAI_API_KEY` in `.env`

---

### POST `/search/hybrid`

Hybrid search combining semantic and keyword with custom weights.

**Request:**
```json
{
  "q": "user login",
  "limit": 10,
  "semanticWeight": 0.7,
  "keywordWeight": 0.3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | ✅ | Search query |
| `limit` | number | ❌ | Max results (default: 10) |
| `semanticWeight` | number | ❌ | Semantic weight (default: 0.7) |
| `keywordWeight` | number | ❌ | Keyword weight (default: 0.3) |

**Response:**
```json
{
  "query": "user login",
  "mode": "hybrid",
  "weights": {
    "semantic": 0.7,
    "keyword": 0.3
  },
  "hits": [...],
  "embeddingTimeMs": 42,
  "processingTimeMs": 67
}
```

---

### POST `/open`

Read a file or extract specific lines.

**Request:**
```json
{
  "path": "src/auth/user.ts",
  "startLine": 42,
  "endLine": 58
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | ✅ | File path (relative or absolute) |
| `startLine` | number | ❌ | Start line (1-indexed, default: 1) |
| `endLine` | number | ❌ | End line (default: end of file) |

**Response:**
```json
{
  "path": "src/auth/user.ts",
  "startLine": 42,
  "endLine": 58,
  "totalLines": 120,
  "content": "export function loginUser(credentials) {\n  return db.users.findOne(...)\n}"
}
```

---

## 🧠 Memory

### GET `/memory/recall`

Recall memories with compact output (Progressive Disclosure Layer 1).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (optional) |
| `type` | string | Filter by type (optional) |
| `scope` | string | Filter by scope (optional) |
| `limit` | number | Max results (default: 20, max: 100) |
| `offset` | number | Pagination offset (default: 0) |

**Types:** `decision`, `preference`, `fact`, `note`, `discovery`, `bugfix`, `feature`, `refactor`, `change`

**Scopes:** `repo`, `branch`, `ticket`, `feature`, `global`

**Response:**
```json
{
  "memories": [
    {
      "id": 42,
      "summary": "Use JWT for authentication tokens",
      "type": "decision",
      "scope": "repo",
      "confidence": 0.95,
      "score": 0.87,
      "created_at": 1704987654321
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

### POST `/memory/batch`

Get full memory content by IDs (Progressive Disclosure Layer 3).

**Request:**
```json
{
  "ids": [42, 45, 47]
}
```

**Response:**
```json
{
  "memories": [
    {
      "id": 42,
      "session_id": "web-1704987654321",
      "project": "nexus",
      "type": "decision",
      "scope": "repo",
      "title": "Use JWT for authentication",
      "subtitle": "Stateless auth strategy",
      "summary": "Use JWT for authentication tokens",
      "narrative": "We decided to use JWT because it's stateless and scalable...",
      "facts": ["Tokens expire after 24h", "Refresh token rotation enabled"],
      "concepts": ["JWT", "OAuth2", "Refresh tokens"],
      "tags": ["security", "auth", "jwt"],
      "files_read": ["src/auth/jwt.ts"],
      "files_modified": ["src/auth/index.ts"],
      "links": [
        {
          "id": 123,
          "observation_id": 42,
          "file_id": 15,
          "chunk_id": null,
          "link_type": "reference",
          "path": "src/auth/jwt.ts",
          "start_line": 10,
          "end_line": 25
        }
      ],
      "confidence": 0.95,
      "created_at": 1704987654321
    }
  ]
}
```

---

### GET `/memory/:id/timeline`

Get chronological context around a memory (Progressive Disclosure Layer 2).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Memory ID |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `window` | number | Items before/after (default: 5, max: 20) |

**Response:**
```json
{
  "target_id": 42,
  "session_id": "web-1704987654321",
  "before": [
    {
      "id": 38,
      "summary": "Refactored: extract auth logic",
      "type": "refactor",
      "scope": "repo",
      "confidence": 0.85,
      "created_at": 1704987600000
    },
    {
      "id": 40,
      "summary": "Decision: use JWT",
      "type": "decision",
      "scope": "repo",
      "confidence": 0.90,
      "created_at": 1704987620000
    }
  ],
  "after": [
    {
      "id": 45,
      "summary": "Bugfix: token expiration issue",
      "type": "bugfix",
      "scope": "repo",
      "confidence": 1.0,
      "created_at": 1704987700000
    },
    {
      "id": 47,
      "summary": "Feature: add refresh tokens",
      "type": "feature",
      "scope": "repo",
      "confidence": 0.88,
      "created_at": 1704987750000
    }
  ]
}
```

---

### GET `/memory/:id`

Get a single memory with full details.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Memory ID |

**Response:** Same as `/memory/batch` but for a single memory.

---

### POST `/memory`

Create a new memory.

**Request:**
```json
{
  "session_id": "web-1704987654321",
  "project": "nexus",
  "type": "decision",
  "scope": "repo",
  "title": "Use PostgreSQL for persistent data",
  "subtitle": "Database choice",
  "summary": "Use PostgreSQL for persistent data storage",
  "narrative": "We chose PostgreSQL because...",
  "facts": ["ACID compliant", "Good for complex queries"],
  "concepts": ["PostgreSQL", "RDBMS", "ACID"],
  "tags": ["database", "sql", "postgresql"],
  "files_read": [],
  "files_modified": [],
  "confidence": 0.9,
  "prompt_number": 5,
  "discovery_tokens": 1250
}
```

**Response:**
```json
{
  "id": 123,
  "created": true
}
```

---

### PATCH `/memory/:id`

Update an existing memory.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Memory ID |

**Request:** (all fields optional)
```json
{
  "type": "decision",
  "scope": "repo",
  "title": "Updated title",
  "narrative": "Updated narrative",
  "facts": ["New fact"],
  "concepts": ["New concept"],
  "tags": ["new-tag"],
  "confidence": 0.95
}
```

**Response:**
```json
{
  "id": 123,
  "updated": true
}
```

---

### DELETE `/memory/:id`

Delete a memory.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Memory ID |

**Response:**
```json
{
  "id": 123,
  "deleted": true
}
```

---

### POST `/memory/:id/links`

Add a link from a memory to a file or chunk.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Memory ID |

**Request:**
```json
{
  "file_id": 15,
  "chunk_id": null,
  "link_type": "reference"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file_id` | number | ❌ | File ID to link to |
| `chunk_id` | number | ❌ | Chunk ID to link to |
| `link_type` | string | ❌ | Link type: `reference`, `origin`, `example` (default: `reference`) |

> **Note:** At least one of `file_id` or `chunk_id` is required.

**Response:**
```json
{
  "id": 456,
  "created": true
}
```

---

### GET `/memory/:id/links`

Get all links for a memory.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Memory ID |

**Response:**
```json
{
  "links": [
    {
      "id": 456,
      "observation_id": 42,
      "file_id": 15,
      "chunk_id": null,
      "link_type": "reference",
      "path": "src/auth/jwt.ts",
      "start_line": 10,
      "end_line": 25,
      "content": "export function generateToken(...)"
    }
  ]
}
```

---

### DELETE `/memory/:id/links/:linkId`

Remove a link from a memory.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Memory ID |
| `linkId` | number | Link ID |

**Response:**
```json
{
  "id": 456,
  "deleted": true
}
```

---

## ✨ Patterns

### GET `/patterns/recall`

Recall patterns with compact output (Progressive Disclosure Layer 1).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query by intent (optional) |
| `lang` | string | Filter by language (optional) |
| `framework` | string | Filter by framework (optional) |
| `limit` | number | Max results (default: 3, max: 10) |

**Response:**
```json
{
  "patterns": [
    {
      "id": 15,
      "intent": "Create REST API endpoint with CRUD operations",
      "title": "REST Endpoint Pattern",
      "tags": ["express", "rest", "crud"],
      "constraints": {
        "lang": "typescript",
        "framework": "express"
      },
      "success_rate": 0.85,
      "usage_count": 12
    }
  ],
  "total": 3
}
```

---

### GET `/patterns/:id/templates`

Get full templates for a pattern (Progressive Disclosure Layer 2).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Pattern ID |

**Response:**
```json
{
  "id": 15,
  "variables": [
    {
      "name": "ResourceName",
      "type": "string",
      "transform": "pascalCase",
      "default": "User"
    },
    {
      "name": "resourceName",
      "type": "string",
      "transform": "camelCase",
      "default": "user"
    }
  ],
  "templates": [
    {
      "path": "src/routes/{{resourceName}}.ts",
      "content": "import { Router } from 'express';\n\nconst router = Router();..."
    }
  ],
  "checklist": [
    "Add input validation",
    "Add error handling",
    "Add rate limiting"
  ],
  "gotchas": [
    "Remember to register routes in app.ts",
    "Use async/await for database operations"
  ]
}
```

---

### GET `/patterns`

List all patterns.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

**Response:**
```json
{
  "patterns": [
    {
      "id": 15,
      "intent": "Create REST API endpoint",
      "title": "REST Endpoint Pattern",
      "tags": ["express", "rest"],
      "constraints": {
        "lang": "typescript",
        "framework": "express"
      },
      "success_rate": 0.85,
      "usage_count": 12,
      "created_at": 1704987654321,
      "updated_at": 1704987654321
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

---

### GET `/patterns/:id`

Get a single pattern (full details).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Pattern ID |

**Response:**
```json
{
  "id": 15,
  "intent": "Create REST API endpoint",
  "title": "REST Endpoint Pattern",
  "tags": ["express", "rest"],
  "constraints": {
    "lang": "typescript",
    "framework": "express"
  },
  "variables": [...],
  "templates": [...],
  "checklist": [...],
  "gotchas": [...],
  "sources": [...],
  "success_rate": 0.85,
  "usage_count": 12,
  "success_count": 10,
  "fail_count": 2,
  "created_at": 1704987654321,
  "updated_at": 1704987654321
}
```

---

### POST `/patterns`

Create a new pattern directly (without distillation).

**Request:**
```json
{
  "intent": "Create REST API endpoint",
  "title": "REST Endpoint Pattern",
  "tags": ["express", "rest"],
  "constraints": {
    "lang": "typescript",
    "framework": "express"
  },
  "variables": [
    {
      "name": "ResourceName",
      "type": "string",
      "transform": "pascalCase"
    }
  ],
  "templates": [
    {
      "path": "src/routes/{{resourceName}}.ts",
      "content": "..."
    }
  ],
  "checklist": ["Add validation"],
  "gotchas": ["Remember to register routes"],
  "sources": []
}
```

**Response:**
```json
{
  "id": 123,
  "created": true
}
```

---

### PATCH `/patterns/:id`

Update a pattern.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Pattern ID |

**Request:** (all fields optional)
```json
{
  "intent": "Updated intent",
  "title": "Updated title",
  "tags": ["new-tag"],
  "constraints": {},
  "variables": [],
  "templates": [],
  "checklist": [],
  "gotchas": [],
  "sources": []
}
```

**Response:**
```json
{
  "id": 123,
  "updated": true
}
```

---

### DELETE `/patterns/:id`

Delete a pattern.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Pattern ID |

**Response:**
```json
{
  "id": 123,
  "deleted": true
}
```

---

### POST `/patterns/capture`

Capture a code example as a candidate for distillation.

**Request:**
```json
{
  "kind": "chunks",
  "sources": [
    {"chunkId": 42},
    {"chunkId": 43}
  ],
  "label": "REST endpoint example",
  "tags": ["express", "rest"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | string | ✅ | Candidate type: `diff`, `chunks`, `folder` |
| `sources` | array | ✅ | Array of `{chunkId}` or `{fileId}` |
| `label` | string | ❌ | Optional label |
| `tags` | array | ❌ | Optional tags |

**Response:**
```json
{
  "id": 789,
  "status": "pending",
  "created": true
}
```

---

### GET `/patterns/candidates`

List candidates.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `pending`, `distilled`, `archived` |
| `limit` | number | Max results (default: 20) |

**Response:**
```json
{
  "candidates": [
    {
      "id": 789,
      "kind": "chunks",
      "sources": [{"chunkId": 42}],
      "label": "REST endpoint example",
      "tags": ["express"],
      "status": "pending",
      "created_at": 1704987654321
    }
  ]
}
```

---

### POST `/patterns/distill`

Distill a candidate into a pattern.

**Request:**
```json
{
  "candidateId": 789,
  "intent": "Create REST API endpoint with CRUD operations",
  "title": "REST Endpoint Pattern",
  "constraints": {
    "lang": "typescript",
    "framework": "express"
  },
  "variablesHint": []
}
```

**Response:**
```json
{
  "id": 123,
  "intent": "Create REST API endpoint",
  "title": "REST Endpoint Pattern",
  "variables": [
    {
      "name": "ResourceName",
      "type": "string",
      "transform": "pascalCase"
    }
  ],
  "templates": 2,
  "created": true
}
```

---

### POST `/patterns/:id/apply`

Apply a pattern with variables (dry-run or write mode).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Pattern ID |

**Request:**
```json
{
  "variables": {
    "ResourceName": "User",
    "resourceName": "user"
  },
  "mode": "dry-run",
  "targetPath": "./src"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `variables` | object | ✅ | Variable values |
| `mode` | string | ❌ | `dry-run` (default) or `write` |
| `targetPath` | string | ❌ | Target path for files (default: `.`) |

**Response (dry-run):**
```json
{
  "mode": "dry-run",
  "patternId": 123,
  "variables": {
    "ResourceName": "User",
    "resourceName": "user"
  },
  "files": [
    {
      "path": "src/routes/user.ts",
      "content": "import { Router } from 'express'...",
      "action": "create"
    }
  ],
  "checklist": ["Add validation", "Add error handling"],
  "gotchas": ["Register routes in app.ts"],
  "preview": true
}
```

**Response (write):**
```json
{
  "mode": "write",
  "patternId": 123,
  "patchId": "patch-123-1704987654321",
  "variables": {
    "ResourceName": "User",
    "resourceName": "user"
  },
  "files": [
    {
      "path": "src/routes/user.ts",
      "action": "create"
    }
  ],
  "checklist": ["Add validation"],
  "applied": true
}
```

---

### POST `/patterns/:id/feedback`

Record pattern usage outcome.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Pattern ID |

**Request:**
```json
{
  "outcome": "success",
  "notes": "Generated clean code, minimal changes needed",
  "patchId": "patch-123-1704987654321"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `outcome` | string | ✅ | `success` or `fail` |
| `notes` | string | ❌ | Optional notes |
| `patchId` | string | ❌ | Associated patch ID |

**Response:**
```json
{
  "recorded": true,
  "outcome": "success"
}
```

---

## ❌ Errors

All endpoints may return errors in the following format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Common HTTP Status Codes

| Status | Description |
|--------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (invalid parameters) |
| `404` | Not Found |
| `500` | Internal Server Error |
| `503` | Service Unavailable (e.g., embeddings not configured) |

### Example Error Response

```json
{
  "error": "Missing required fields",
  "message": "candidateId, intent, and title are required"
}
```

---

## 📚 Additional Resources

- [MCP Usage Guide](MCP_USAGE.md) - Using Nexus tools with Claude Code
- [README](../README.md) - Project overview
- [Sprint Planning](../planning/sprints/_overview.md) - Development roadmap

---

**Nexus API** v0.1.0
