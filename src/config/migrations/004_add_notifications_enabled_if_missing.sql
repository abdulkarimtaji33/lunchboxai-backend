-- Legacy DBs missing notifications_enabled. Skips if column already exists (MySQL 8.0.29+).

ALTER TABLE user_fcm_tokens
  ADD COLUMN IF NOT EXISTS notifications_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER token;
