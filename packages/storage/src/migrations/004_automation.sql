-- Migration 004: Automation - Observations & Candidates
-- Adds tables for auto-capture feature (claude-mem parity)
-- Version: 1.0.0
-- Date: 2025-01-11

-- ============================================================================
-- OBSERVATIONS TABLE
-- Stores raw observations from Claude Code hooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  hook_name TEXT NOT NULL,  -- 'sessionStart', 'postTool', 'sessionEnd'
  payload TEXT NOT NULL,    -- JSON payload
  timestamp INTEGER NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_observations_session ON observations(session_id);
CREATE INDEX IF NOT EXISTS idx_observations_processed ON observations(processed);
CREATE INDEX IF NOT EXISTS idx_observations_hook_name ON observations(hook_name);
CREATE INDEX IF NOT EXISTS idx_observations_timestamp ON observations(timestamp DESC);

-- ============================================================================
-- CANDIDATES TABLE
-- Stores distilled memories pending review before promotion
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL,        -- 'distilled', 'raw', 'diff', 'chunks', 'folder'
  sources TEXT NOT NULL,     -- JSON array of observation IDs
  status TEXT DEFAULT 'pending',  -- 'pending', 'distilled', 'rejected', 'promoted'
  tags TEXT DEFAULT '[]',    -- JSON array of tag strings
  metadata TEXT,             -- JSON: LLM response, confidence, etc.
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_session ON candidates(session_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_kind ON candidates(kind);

-- ============================================================================
-- INDEX FAILURES TABLE
-- Tracks files that failed to index for retry
-- ============================================================================

CREATE TABLE IF NOT EXISTS index_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  error_message TEXT,
  failed_at INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_retry_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_index_failures_path ON index_failures(file_path);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Unprocessed observations ready for distillation
CREATE VIEW IF NOT EXISTS v_pending_distillation AS
SELECT
  session_id,
  COUNT(*) as observation_count,
  MIN(timestamp) as first_observation,
  MAX(timestamp) as last_observation,
  GROUP_CONCAT(DISTINCT hook_name) as hook_types
FROM observations
WHERE processed = FALSE
GROUP BY session_id
HAVING observation_count > 0;

-- View: Candidates ready for review
CREATE VIEW IF NOT EXISTS v_pending_candidates AS
SELECT
  id,
  session_id,
  kind,
  status,
  json_array_length(sources) as source_count,
  created_at
FROM candidates
WHERE status = 'pending'
ORDER BY created_at DESC;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update processed flag when candidate is created
CREATE TRIGGER IF NOT EXISTS trigger_candidate_mark_processed
AFTER INSERT ON candidates
WHEN NEW.kind IN ('distilled', 'raw')
BEGIN
  UPDATE observations
  SET processed = TRUE
  WHERE session_id = NEW.session_id
    AND id IN (SELECT value FROM json_each(NEW.sources));
END;

-- ============================================================================
-- MIGRATION INFO
-- ============================================================================

-- To verify migration:
-- SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('observations', 'candidates', 'index_failures');
-- SELECT COUNT(*) FROM v_pending_distillation;
