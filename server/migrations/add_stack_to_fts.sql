-- Migration: Add stack column to memories_fts table
-- Date: 2026-01-08
-- Issue: FTS table missing stack column

-- Step 1: Save existing data
CREATE TABLE IF NOT EXISTS memories_fts_backup AS SELECT * FROM memories_fts;

-- Step 2: Drop the old FTS table
DROP TABLE IF EXISTS memories_fts;

-- Step 3: Recreate FTS table with stack column
CREATE VIRTUAL TABLE memories_fts USING fts5(
  id,
  memory_id,
  title,
  content,
  type,
  context_id,
  stack
);

-- Step 4: Restore data (stack will be NULL for existing records)
INSERT INTO memories_fts (id, memory_id, title, content, type, context_id, stack)
SELECT
  id,
  memory_id,
  title,
  content,
  type,
  context_id,
  NULL as stack
FROM memories_fts_backup;

-- Step 5: Clean up
DROP TABLE memories_fts_backup;

-- Step 6: Update existing records with stack from memories table
UPDATE memories_fts
SET stack = (
  SELECT stack FROM memories WHERE memories.id = memories_fts.memory_id
)
WHERE stack IS NULL;
