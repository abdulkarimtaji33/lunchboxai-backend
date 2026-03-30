-- ============================================================
-- LunchBox AI — v2 Migration
-- Run this on the LIVE server (existing DB, no data loss)
-- ============================================================

-- 1. Add planned_at to lunchbox_sessions
ALTER TABLE `lunchbox_sessions`
  ADD COLUMN `planned_at` datetime DEFAULT NULL;

-- 2. Create child_lunchboxes table
CREATE TABLE IF NOT EXISTS `child_lunchboxes` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `child_id` int(10) UNSIGNED NOT NULL,
  `label` varchar(100) DEFAULT NULL,
  `image_path` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_child_id` (`child_id`),
  CONSTRAINT `fk_cl_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add default_lunchbox_id to children (after child_lunchboxes exists)
ALTER TABLE `children`
  ADD COLUMN `default_lunchbox_id` int(10) UNSIGNED DEFAULT NULL,
  ADD KEY `fk_children_default_lb` (`default_lunchbox_id`),
  ADD CONSTRAINT `fk_children_default_lb` FOREIGN KEY (`default_lunchbox_id`) REFERENCES `child_lunchboxes` (`id`) ON DELETE SET NULL;
