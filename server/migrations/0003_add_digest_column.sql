-- Migration: Add digest column for PMP2 token optimization
-- Date: 2026-01-08
-- Description: Add digest column to memories table for 1-sentence summaries

-- Add digest column to memories table
ALTER TABLE memories ADD COLUMN digest TEXT;

-- Generate digests for existing memories (first sentence, max 80 chars)
-- This is a one-time migration, future digests will be auto-generated on insert
UPDATE memories
SET digest = SUBSTR(
  CASE
    -- Skip code blocks and get first sentence
    WHEN content LIKE '```%' THEN
      SUBSTR(
        REPLACE(content, SUBSTR(content, 1, INSTR(content, '```' || CHAR(10)) + INSTR(SUBSTR(content, INSTR(content, '```' || CHAR(10)) + 3), '```') + 5), ''),
        1,
        CASE
          WHEN INSTR(content, '.') > 0 THEN INSTR(content, '.')
          ELSE 80
        END
      )
    -- Regular content: first sentence
    ELSE
      SUBSTR(content, 1,
        CASE
          WHEN INSTR(content, '. ') > 0 THEN INSTR(content, '. ')
          WHEN INSTR(content, '.') > 0 THEN INSTR(content, '.')
          ELSE 80
        END
      )
  END,
  1, 80
)
WHERE digest IS NULL;
