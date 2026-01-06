-- Ralph V3 SQLite Schema
-- Based on claude-mem architecture with progressive disclosure

-- Enable FTS5 extension
-- Note: Most SQLite builds include FTS5 by default

-- ============================================================================
-- OBSERVATIONS TABLE
-- Raw captured context from coding sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  project_path TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),

  -- Observation metadata
  type TEXT NOT NULL CHECK(type IN ('decision', 'action', 'error', 'context', 'progress')),
  category TEXT CHECK(category IN ('backend', 'testing', 'docs', 'refactor', 'implementation', 'auth', 'config', 'other')),
  priority TEXT CHECK(priority IN ('high', 'normal', 'low')) DEFAULT 'normal',

  -- Content
  content TEXT NOT NULL,
  file_path TEXT,
  function_name TEXT,
  code_snippet TEXT,

  -- Links
  parent_id INTEGER,
  related_ids TEXT, -- JSON array of related observation IDs

  -- Metadata
  tokens_estimate INTEGER,
  embedding BLOB, -- For vector similarity search (future)

  FOREIGN KEY (parent_id) REFERENCES observations(id) ON DELETE CASCADE
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_obsessions_session ON observations(session_id);
CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project_path);
CREATE INDEX IF NOT EXISTS idx_observations_timestamp ON observations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_observations_category ON observations(category);

-- ============================================================================
-- FULL-TEXT SEARCH (FTS5)
-- Enables fast semantic search over observations
-- ============================================================================
CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
  content,
  file_path,
  function_name,
  code_snippet,
  tokenize = 'porter unicode61'
);

-- Trigger to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
  INSERT INTO observations_fts(rowid, content, file_path, function_name, code_snippet)
  VALUES (NEW.id, NEW.content, NEW.file_path, NEW.function_name, NEW.code_snippet);
END;

CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
  INSERT INTO observations_fts(observations_fts, rowid, content, file_path, function_name, code_snippet)
  VALUES ('delete', OLD.id, OLD.content, OLD.file_path, OLD.function_name, OLD.code_snippet);
END;

CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
  INSERT INTO observations_fts(observations_fts, rowid, content, file_path, function_name, code_snippet)
  VALUES ('delete', OLD.id, OLD.content, OLD.file_path, OLD.function_name, OLD.code_snippet);
  INSERT INTO observations_fts(rowid, content, file_path, function_name, code_snippet)
  VALUES (NEW.id, NEW.content, NEW.file_path, NEW.function_name, NEW.code_snippet);
END;

-- ============================================================================
-- SESSIONS TABLE
-- Track individual coding sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  task_description TEXT,

  -- Session metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT,

  -- Token tracking
  start_tokens INTEGER DEFAULT 0,
  peak_tokens INTEGER DEFAULT 0,
  end_tokens INTEGER DEFAULT 0,
  total_saved INTEGER DEFAULT 0,

  -- Statistics
  observation_count INTEGER DEFAULT 0,
  checkpoint_count INTEGER DEFAULT 0,
  compression_count INTEGER DEFAULT 0,

  -- State
  status TEXT CHECK(status IN ('active', 'compressed', 'closed')) DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_path);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- ============================================================================
-- COMPRESSED_INSIGHTS TABLE
-- AI-compressed insights from observations
-- ============================================================================
CREATE TABLE IF NOT EXISTS compressed_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  project_path TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),

  -- Insight metadata
  type TEXT CHECK(type IN ('pattern', 'decision', 'error', 'architecture', 'summary')),
  category TEXT,

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Relationships
  observation_ids TEXT, -- JSON array of source observation IDs
  related_insights TEXT, -- JSON array of related insight IDs

  -- Quality metrics
  confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
  tokens_saved INTEGER DEFAULT 0,

  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_insights_session ON compressed_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_insights_project ON compressed_insights(project_path);
CREATE INDEX IF NOT EXISTS idx_insights_type ON compressed_insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_timestamp ON compressed_insights(timestamp DESC);

-- FTS for insights
CREATE VIRTUAL TABLE IF NOT EXISTS insights_fts USING fts5(
  title,
  content,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS insights_ai AFTER INSERT ON compressed_insights BEGIN
  INSERT INTO insights_fts(rowid, title, content)
  VALUES (NEW.id, NEW.title, NEW.content);
END;

-- ============================================================================
-- CHECKPOINTS TABLE
-- Session snapshots for resuming work
-- ============================================================================
CREATE TABLE IF NOT EXISTS checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  label TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),

  -- Checkpoint data
  trajectory_summary TEXT, -- Compressed conversation history
  key_decisions TEXT, -- JSON array of key decision IDs
  key_errors TEXT, -- JSON array of key error IDs

  -- State restoration
  active_context TEXT, -- Current context snapshot
  metadata TEXT, -- Additional metadata (JSON)

  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON checkpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp DESC);

-- ============================================================================
-- METRICS TABLE
-- Track token usage and performance
-- ============================================================================
CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  project_path TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),

  -- Metrics
  metric_type TEXT NOT NULL CHECK(metric_type IN ('compression', 'recall', 'search')),
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,

  -- Context
  metadata TEXT -- JSON
);

CREATE INDEX IF NOT EXISTS idx_metrics_session ON metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_project ON metrics(project_path);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp DESC);

-- ============================================================================
-- HELPER VIEWS
-- Convenient queries for common operations
-- ============================================================================

-- Recent observations with session info
CREATE VIEW IF NOT EXISTS v_recent_observations AS
SELECT
  o.id,
  o.session_id,
  o.project_path,
  o.timestamp,
  o.type,
  o.category,
  o.priority,
  o.content,
  o.file_path,
  o.function_name,
  s.task_description,
  s.status as session_status
FROM observations o
LEFT JOIN sessions s ON o.session_id = s.id
ORDER BY o.timestamp DESC
LIMIT 100;

-- Project statistics
CREATE VIEW IF NOT EXISTS v_project_stats AS
SELECT
  project_path,
  COUNT(DISTINCT session_id) as session_count,
  COUNT(*) as observation_count,
  SUM(tokens_estimate) as total_tokens,
  MAX(timestamp) as last_activity
FROM observations
GROUP BY project_path;

-- Search results with ranking
CREATE VIEW IF NOT EXISTS v_search_results AS
SELECT
  o.id,
  o.session_id,
  o.project_path,
  o.timestamp,
  o.type,
  o.category,
  o.content,
  o.file_path,
  rank as search_rank
FROM observations o
JOIN observations_fts f ON o.id = f.rowid;
