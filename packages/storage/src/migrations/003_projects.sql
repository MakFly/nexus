-- Migration 003: Projects System (Sprint 7)
-- Adds project scoping for multi-repo support and token isolation

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_indexed_at TEXT,
  -- Stats cache (updated on index)
  file_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  memory_count INTEGER DEFAULT 0,
  pattern_count INTEGER DEFAULT 0
);

-- Index for fast path lookup
CREATE INDEX IF NOT EXISTS idx_projects_root_path ON projects(root_path);

-- Add project_id to files (nullable for backwards compatibility)
ALTER TABLE files ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

-- Add project_id to observations (nullable - global memories have NULL)
ALTER TABLE observations ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;

-- Add project_id to patterns (nullable - global patterns have NULL)
ALTER TABLE patterns ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;

-- Indexes for efficient project filtering
CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project_id);
CREATE INDEX IF NOT EXISTS idx_patterns_project ON patterns(project_id);

-- Trigger to update project stats on file insert
CREATE TRIGGER IF NOT EXISTS update_project_file_count_insert
AFTER INSERT ON files
WHEN NEW.project_id IS NOT NULL
BEGIN
  UPDATE projects SET
    file_count = file_count + 1,
    updated_at = datetime('now')
  WHERE id = NEW.project_id;
END;

-- Trigger to update project stats on file delete
CREATE TRIGGER IF NOT EXISTS update_project_file_count_delete
AFTER DELETE ON files
WHEN OLD.project_id IS NOT NULL
BEGIN
  UPDATE projects SET
    file_count = file_count - 1,
    updated_at = datetime('now')
  WHERE id = OLD.project_id;
END;

-- Trigger to update project stats on observation insert
CREATE TRIGGER IF NOT EXISTS update_project_memory_count_insert
AFTER INSERT ON observations
WHEN NEW.project_id IS NOT NULL
BEGIN
  UPDATE projects SET
    memory_count = memory_count + 1,
    updated_at = datetime('now')
  WHERE id = NEW.project_id;
END;

-- Trigger to update project stats on observation delete
CREATE TRIGGER IF NOT EXISTS update_project_memory_count_delete
AFTER DELETE ON observations
WHEN OLD.project_id IS NOT NULL
BEGIN
  UPDATE projects SET
    memory_count = memory_count - 1,
    updated_at = datetime('now')
  WHERE id = OLD.project_id;
END;

-- Trigger to update project stats on pattern insert
CREATE TRIGGER IF NOT EXISTS update_project_pattern_count_insert
AFTER INSERT ON patterns
WHEN NEW.project_id IS NOT NULL
BEGIN
  UPDATE projects SET
    pattern_count = pattern_count + 1,
    updated_at = datetime('now')
  WHERE id = NEW.project_id;
END;

-- Trigger to update project stats on pattern delete
CREATE TRIGGER IF NOT EXISTS update_project_pattern_count_delete
AFTER DELETE ON patterns
WHEN OLD.project_id IS NOT NULL
BEGIN
  UPDATE projects SET
    pattern_count = pattern_count - 1,
    updated_at = datetime('now')
  WHERE id = OLD.project_id;
END;
