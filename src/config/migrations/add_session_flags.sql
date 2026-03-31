-- Migration: add_session_flags
-- Adds is_favorite and save_for_later boolean columns to lunchbox_sessions.

ALTER TABLE lunchbox_sessions ADD COLUMN IF NOT EXISTS is_favorite TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE lunchbox_sessions ADD COLUMN IF NOT EXISTS save_for_later TINYINT(1) NOT NULL DEFAULT 0;
