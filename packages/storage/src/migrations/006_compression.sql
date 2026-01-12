-- ============================================================
-- NEXUS MIGRATION 006 - COMPRESSION TIERS
-- ============================================================
-- Sprint 7: Progressive Disclosure 5 tiers + Tool Output Compression
-- ============================================================

-- ==================== OBSERVATIONS EXTENSIONS ====================

-- Add compression tier for Progressive Disclosure (0-4)
ALTER TABLE observations ADD COLUMN compression_tier INTEGER DEFAULT 3;

-- Add compressed summary for efficient storage
ALTER TABLE observations ADD COLUMN compressed_summary TEXT;

-- Add token counts for ratio tracking
ALTER TABLE observations ADD COLUMN raw_token_count INTEGER;
ALTER TABLE observations ADD COLUMN compressed_token_count INTEGER;

-- Index for tier filtering
CREATE INDEX IF NOT EXISTS idx_obs_compression_tier ON observations(compression_tier);

-- ==================== HOOK_OBSERVATIONS EXTENSIONS ====================

-- Extend hook_observations for compression tracking
ALTER TABLE hook_observations ADD COLUMN compressed_summary TEXT;
ALTER TABLE hook_observations ADD COLUMN compression_mode TEXT;  -- 'llm' or 'algo'
ALTER TABLE hook_observations ADD COLUMN raw_token_count INTEGER;
ALTER TABLE hook_observations ADD COLUMN compressed_token_count INTEGER;

-- ==================== SESSIONS EXTENSIONS ====================

-- Create sessions table for Claude Code hook integration
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  total_tool_uses INTEGER DEFAULT 0,
  total_tokens_saved INTEGER DEFAULT 0,
  compression_mode TEXT DEFAULT 'auto',
  metadata TEXT,  -- JSON: additional session data
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);

-- ==================== TOOL OUTPUTS TABLE ====================

-- Table to store compressed tool outputs
CREATE TABLE IF NOT EXISTS tool_outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  raw_output TEXT NOT NULL,
  compressed_summary TEXT,
  compression_mode TEXT,  -- 'llm' or 'algo'
  raw_token_count INTEGER,
  compressed_token_count INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tool_outputs_session ON tool_outputs(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_outputs_tool_name ON tool_outputs(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_outputs_created ON tool_outputs(created_at DESC);
