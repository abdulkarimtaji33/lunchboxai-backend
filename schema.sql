-- Schema extracted from live database (2026-04-28T07:17:46.776Z)
-- Database: `lunchboxai`

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Server: 10.4.32-MariaDB

CREATE TABLE `allergens` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_common` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `avatars` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `filename` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `base_lunchboxes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `container_type` varchar(50) DEFAULT NULL,
  `compartments` int(11) DEFAULT 1,
  `image_path` varchar(500) DEFAULT NULL,
  `tags` varchar(255) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `children` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `avatar_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `default_lunchbox_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_children_avatar` (`avatar_id`),
  KEY `idx_children_user` (`user_id`),
  KEY `fk_children_default_lb` (`default_lunchbox_id`),
  CONSTRAINT `fk_children_avatar` FOREIGN KEY (`avatar_id`) REFERENCES `avatars` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_children_default_lb` FOREIGN KEY (`default_lunchbox_id`) REFERENCES `child_lunchboxes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_children_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `child_allergens` (
  `child_id` int(10) unsigned NOT NULL,
  `allergen_id` smallint(5) unsigned NOT NULL,
  `severity` enum('intolerance','allergy','severe') NOT NULL DEFAULT 'allergy',
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`child_id`,`allergen_id`),
  KEY `fk_ca_allergen` (`allergen_id`),
  CONSTRAINT `fk_ca_allergen` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ca_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `child_lunchboxes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `child_id` int(10) unsigned NOT NULL,
  `label` varchar(100) DEFAULT NULL,
  `image_path` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_child_id` (`child_id`),
  CONSTRAINT `fk_cl_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `child_nutrition_goals` (
  `child_id` int(10) unsigned NOT NULL,
  `nutrition_goal_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`child_id`,`nutrition_goal_id`),
  KEY `fk_cng_goal` (`nutrition_goal_id`),
  CONSTRAINT `fk_cng_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cng_goal` FOREIGN KEY (`nutrition_goal_id`) REFERENCES `nutrition_goals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `child_school_rules` (
  `child_id` int(10) unsigned NOT NULL,
  `school_rule_id` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`child_id`,`school_rule_id`),
  KEY `fk_csr_rule` (`school_rule_id`),
  CONSTRAINT `fk_csr_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_csr_rule` FOREIGN KEY (`school_rule_id`) REFERENCES `school_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `food_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ingredient_images` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `session_id` int(10) unsigned NOT NULL,
  `image_path` varchar(500) NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  CONSTRAINT `fk_ingredients_session` FOREIGN KEY (`session_id`) REFERENCES `lunchbox_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lunchbox_results` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `session_id` int(10) unsigned NOT NULL,
  `ai_text_response` longtext DEFAULT NULL,
  `suggested_items` longtext DEFAULT NULL,
  `cooking_ingredients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cooking_ingredients`)),
  `nutrition_notes` text DEFAULT NULL,
  `arrangement_desc` text DEFAULT NULL,
  `fun_note` text DEFAULT NULL,
  `generated_image_b64` longtext DEFAULT NULL,
  `generated_image_path` varchar(500) DEFAULT NULL,
  `no_bg_image_path` varchar(500) DEFAULT NULL,
  `ai_model` varchar(100) DEFAULT NULL,
  `tokens_used` int(10) unsigned DEFAULT NULL,
  `processing_ms` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_id` (`session_id`),
  CONSTRAINT `fk_results_session` FOREIGN KEY (`session_id`) REFERENCES `lunchbox_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lunchbox_sessions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `child_id` int(10) unsigned DEFAULT NULL,
  `lunchbox_image_path` varchar(500) NOT NULL,
  `notes` text DEFAULT NULL,
  `dislikes_override` text DEFAULT NULL,
  `school_rules_override` text DEFAULT NULL,
  `prep_time_minutes` tinyint(3) unsigned DEFAULT NULL,
  `nutrition_goal_override` varchar(500) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `planned_at` datetime DEFAULT NULL,
  `is_favorite` tinyint(1) NOT NULL DEFAULT 0,
  `save_for_later` tinyint(1) NOT NULL DEFAULT 0,
  `feedback_rating` tinyint(3) unsigned DEFAULT NULL,
  `feedback_comment` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_child_id` (`child_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_sessions_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `nutrition_goals` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `goal_key` varchar(50) NOT NULL,
  `label` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `goal_key` (`goal_key`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_reset_tokens` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `token_hash` char(64) NOT NULL,
  `otp_hash` char(64) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token_hash` (`token_hash`),
  KEY `idx_user` (`user_id`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `fk_pwd_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_rules` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `session_allergen_overrides` (
  `session_id` int(10) unsigned NOT NULL,
  `allergen_id` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`session_id`,`allergen_id`),
  KEY `fk_sao_allergen` (`allergen_id`),
  CONSTRAINT `fk_sao_allergen` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sao_session` FOREIGN KEY (`session_id`) REFERENCES `lunchbox_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stripe_processed_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `stripe_event_id` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stripe_event_id` (`stripe_event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscription_packages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) NOT NULL,
  `label` varchar(100) NOT NULL,
  `generations` int(10) unsigned NOT NULL,
  `price_usd` decimal(10,2) NOT NULL,
  `stripe_price_id` varchar(255) DEFAULT NULL,
  `stripe_lookup_key` varchar(120) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subscription_slug` (`slug`),
  UNIQUE KEY `uk_stripe_lookup` (`stripe_lookup_key`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `provider` enum('local','google','facebook') NOT NULL DEFAULT 'local',
  `provider_id` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `generation_credits` int(10) unsigned NOT NULL DEFAULT 0,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_fcm_tokens` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `token` varchar(512) NOT NULL,
  `notifications_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fcm_token` (`token`),
  KEY `idx_user_fcm_user` (`user_id`),
  CONSTRAINT `fk_fcm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `_migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `filename` (`filename`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;