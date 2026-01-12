-- Migration 004: Automation - Hook Observations & Candidates
-- Adds tables for auto-capture feature (claude-mem parity)
-- Version: 1.0.1
-- Date: 2025-01-11

-- ============================================================================
-- HOOK_OBSERVATIONS TABLE (renamed from observations to avoid conflict)
-- Stores raw observations from Claude Code hooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS hook_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  hook_name TEXT NOT NULL,  -- 'sessionStart', 'postTool', 'sessionEnd'
  payload TEXT NOT NULL,    -- JSON payload
  timestamp INTEGER NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_hook_observations_session ON hook_observations(session_id);
CREATE INDEX IF NOT EXISTS idx_hook_observations_processed ON hook_observations(processed);
CREATE INDEX IF NOT EXISTS idx_hook_observations_hook_name ON hook_observations(hook_name);
CREATE INDEX IF NOT EXISTS idx_hook_observations_timestamp ON hook_observations(timestamp DESC);

-- ============================================================================
-- CANDIDATES TABLE EXTENSIONS
-- Add columns for auto-capture feature (candidates already exists in 001)
-- ============================================================================

-- Add session_id column if not exists
ALTER TABLE candidates ADD COLUMN session_id TEXT;

-- Add metadata column if not exists
ALTER TABLE candidates ADD COLUMN metadata TEXT;

-- Update kind check constraint to include new types
-- Note: SQLite doesn't support modifying constraints, so we just add the columns

-- Indexes (only create session index, others exist from 001)
CREATE INDEX IF NOT EXISTS idx_candidates_session ON candidates(session_id);

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

-- View: Unprocessed hook observations ready for distillation
CREATE VIEW IF NOT EXISTS v_pending_distillation AS
SELECT
  session_id,
  COUNT(*) as observation_count,
  MIN(timestamp) as first_observation,
  MAX(timestamp) as last_observation,
  GROUP_CONCAT(DISTINCT hook_name) as hook_types
FROM hook_observations
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
  json_array_length(sources_json) as source_count,
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
  UPDATE hook_observations
  SET processed = TRUE
  WHERE session_id = NEW.session_id
    AND id IN (SELECT value FROM json_each(NEW.sources_json));
END;

-- ============================================================================
-- MIGRATION INFO
-- ============================================================================

-- To verify migration:
-- SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('observations', 'candidates', 'index_failures');
-- SELECT COUNT(*) FROM v_pending_distillation;
