-- Generation credits, Stripe customer id, admin flag; Stripe webhook idempotency

ALTER TABLE users
  ADD COLUMN generation_credits INT UNSIGNED NOT NULL DEFAULT 0 AFTER avatar_url,
  ADD COLUMN stripe_customer_id VARCHAR(255) NULL DEFAULT NULL AFTER generation_credits,
  ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER stripe_customer_id;

-- One-time grant so existing accounts keep working after deploy (runs once with migration)
UPDATE users SET generation_credits = GREATEST(generation_credits, 5);

CREATE TABLE IF NOT EXISTS stripe_processed_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  stripe_event_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stripe_event_id (stripe_event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
