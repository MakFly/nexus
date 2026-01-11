-- ============================================================
-- NEXUS MIGRATION 002 - MEMORY SYSTEM
-- ============================================================
-- Sprint 2: Memory CRUD, Progressive Disclosure, Links
-- ============================================================

-- ==================== OBSERVATIONS EXTENSIONS ====================

-- Add scope (repo, branch, ticket, feature, global)
ALTER TABLE observations ADD COLUMN scope TEXT DEFAULT 'repo';

-- Add tags for filtering
ALTER TABLE observations ADD COLUMN tags_json TEXT;

-- Add confidence score (0.0-1.0)
ALTER TABLE observations ADD COLUMN confidence REAL DEFAULT 0.8;

-- Add compact summary for Progressive Disclosure (~50 chars)
ALTER TABLE observations ADD COLUMN summary TEXT;

-- Index for scope filtering
CREATE INDEX IF NOT EXISTS idx_obs_scope ON observations(scope);

-- ==================== MEMORY LINKS ====================

-- Links between memories and source code
CREATE TABLE IF NOT EXISTS memory_links (
    id INTEGER PRIMARY KEY,
    observation_id INTEGER NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    chunk_id INTEGER REFERENCES chunks(id) ON DELETE SET NULL,
    link_type TEXT DEFAULT 'reference' CHECK(link_type IN ('reference', 'origin', 'example')),
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memlinks_obs ON memory_links(observation_id);
CREATE INDEX IF NOT EXISTS idx_memlinks_file ON memory_links(file_id);
CREATE INDEX IF NOT EXISTS idx_memlinks_chunk ON memory_links(chunk_id);

-- ==================== OBSERVATIONS FTS REBUILD ====================

-- Drop old triggers to add summary to FTS
DROP TRIGGER IF EXISTS obs_ai;
DROP TRIGGER IF EXISTS obs_ad;

-- Recreate FTS table with summary column
DROP TABLE IF EXISTS observations_fts;
CREATE VIRTUAL TABLE observations_fts USING fts5(
    title, subtitle, narrative, summary,
    content='observations',
    content_rowid='id'
);

-- Recreate triggers with summary
CREATE TRIGGER obs_ai AFTER INSERT ON observations BEGIN
    INSERT INTO observations_fts(rowid, title, subtitle, narrative, summary)
    VALUES (new.id, new.title, new.subtitle, new.narrative, new.summary);
END;

CREATE TRIGGER obs_ad AFTER DELETE ON observations BEGIN
    INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, summary)
    VALUES ('delete', old.id, old.title, old.subtitle, old.narrative, old.summary);
END;

CREATE TRIGGER obs_au AFTER UPDATE ON observations BEGIN
    INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, summary)
    VALUES ('delete', old.id, old.title, old.subtitle, old.narrative, old.summary);
    INSERT INTO observations_fts(rowid, title, subtitle, narrative, summary)
    VALUES (new.id, new.title, new.subtitle, new.narrative, new.summary);
END;

-- Rebuild FTS index with existing data
INSERT INTO observations_fts(rowid, title, subtitle, narrative, summary)
SELECT id, title, subtitle, narrative, summary FROM observations;
