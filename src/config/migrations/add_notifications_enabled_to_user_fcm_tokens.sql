-- Migration: add_notifications_enabled_to_user_fcm_tokens
-- 1 = receive broadcasts, 0 = opted out (token row kept).

ALTER TABLE user_fcm_tokens
  ADD COLUMN notifications_enabled TINYINT(1) NOT NULL DEFAULT 1
  AFTER token;
