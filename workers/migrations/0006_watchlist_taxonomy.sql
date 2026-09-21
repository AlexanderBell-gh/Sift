-- Worker-owned category taxonomy (CATEGORY_PLAN Phase 3).
-- taxonomy_version 0 = legacy guess or title-only provisional (never forced).
-- taxonomy_version 1 = scored server-side from extension category_signals.
ALTER TABLE watchlist ADD COLUMN taxonomy_version INTEGER NOT NULL DEFAULT 0;
