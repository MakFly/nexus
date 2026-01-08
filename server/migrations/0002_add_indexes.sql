-- Migration: Add performance indexes
-- Date: 2026-01-08
-- Description: Add indexes for common query patterns

-- Memories table indexes
CREATE INDEX IF NOT EXISTS memories_context_id_idx ON memories(context_id);
CREATE INDEX IF NOT EXISTS memories_type_idx ON memories(type);
CREATE INDEX IF NOT EXISTS memories_created_at_idx ON memories(created_at);
CREATE INDEX IF NOT EXISTS memories_stack_idx ON memories(stack);
CREATE INDEX IF NOT EXISTS memories_context_type_idx ON memories(context_id, type);

-- Events table indexes
CREATE INDEX IF NOT EXISTS events_type_idx ON events(type);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON events(created_at);

-- Relationships table indexes
CREATE INDEX IF NOT EXISTS relationships_source_idx ON relationships(source_id);
CREATE INDEX IF NOT EXISTS relationships_target_idx ON relationships(target_id);
