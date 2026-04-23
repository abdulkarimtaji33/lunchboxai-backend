CREATE TABLE IF NOT EXISTS subscription_packages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  generations INT UNSIGNED NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  stripe_price_id VARCHAR(255) NULL DEFAULT NULL,
  stripe_lookup_key VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_subscription_slug (slug),
  UNIQUE KEY uk_stripe_lookup (stripe_lookup_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO subscription_packages
  (slug, label, generations, price_usd, stripe_lookup_key, sort_order, is_active)
VALUES
  ('starter', 'Starter', 25, 5.00, 'lunchboxai_v1_starter_25gen', 1, 1),
  ('growth', 'Growth', 50, 20.00, 'lunchboxai_v1_growth_50gen', 2, 1),
  ('pro', 'Pro', 100, 25.00, 'lunchboxai_v1_pro_100gen', 3, 1);
