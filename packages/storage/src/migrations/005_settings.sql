-- ============================================================
-- NEXUS MIGRATION 005 - SETTINGS SYSTEM
-- ============================================================
-- Sprint 7: Settings table for API keys, compression config
-- ============================================================

-- ==================== SETTINGS TABLE ====================

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    encrypted INTEGER DEFAULT 0,  -- 1 = valeur chiffrée (API keys)
    category TEXT DEFAULT 'general',  -- 'compression', 'search', 'ui', etc.
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Index pour requêtes par catégorie
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- ==================== DEFAULT VALUES ====================

-- Compression settings
INSERT OR IGNORE INTO settings (key, value, category) VALUES
    ('compression_mode', 'auto', 'compression'),
    ('compression_provider', 'anthropic', 'compression'),
    ('compression_max_tokens', '30', 'compression'),
    ('compression_llm_model', 'claude-3-5-haiku-20241022', 'compression');

-- UI settings
INSERT OR IGNORE INTO settings (key, value, category) VALUES
    ('theme', 'dark', 'ui'),
    ('default_tier', '2', 'api');

-- ==================== VIEWS ====================

-- View: Settings by category
CREATE VIEW IF NOT EXISTS v_settings_by_category AS
SELECT
    category,
    COUNT(*) as count,
    GROUP_CONCAT(key) as keys
FROM settings
GROUP BY category;
