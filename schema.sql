-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 17, 2026 at 11:22 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lunchboxai`
--

-- --------------------------------------------------------

--
-- Table structure for table `allergens`
--

CREATE TABLE IF NOT EXISTS `allergens` (
  `id` smallint(5) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_common` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `allergens`
--

INSERT INTO `allergens` (`id`, `name`, `icon`, `category`, `description`, `is_common`) VALUES
(1, 'Peanuts', NULL, 'Nuts', 'Groundnuts and peanut-derived products', 1),
(2, 'Tree Nuts', NULL, 'Nuts', 'Almonds, cashews, walnuts, pistachios, etc.', 1),
(3, 'Milk/Dairy', NULL, 'Dairy', 'Cow milk and dairy products', 1),
(4, 'Eggs', NULL, 'Animal', 'Chicken eggs and egg-derived products', 1),
(5, 'Wheat/Gluten', NULL, 'Grains', 'Wheat, barley, rye — includes gluten', 1),
(6, 'Soy', NULL, 'Legumes', 'Soybeans and soy-derived products', 1),
(7, 'Fish', NULL, 'Seafood', 'Finned fish (salmon, tuna, cod, etc.)', 1),
(8, 'Shellfish', NULL, 'Seafood', 'Shrimp, crab, lobster, clams, etc.', 1),
(9, 'Sesame', NULL, 'Seeds', 'Sesame seeds and sesame oil', 1),
(10, 'Mustard', NULL, 'Spices', 'Mustard seeds and mustard-derived products', 0),
(11, 'Celery', NULL, 'Vegetables', 'Celery stalks, leaves, seeds, and celeriac', 0),
(12, 'Lupin', NULL, 'Legumes', 'Lupin flour and seeds used in some breads', 0),
(13, 'Sulphites', NULL, 'Additives', 'Sulphur dioxide used as a preservative', 0),
(14, 'Corn', NULL, 'Grains', 'Corn and corn-derived ingredients', 0),
(15, 'Latex-Fruit', NULL, 'Other', 'Cross-reactive fruits: banana, avocado, kiwi', 0);

-- --------------------------------------------------------

--
-- Table structure for table `avatars`
--

CREATE TABLE IF NOT EXISTS `avatars` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `filename` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `avatars`
--

INSERT INTO `avatars` (`id`, `name`, `filename`, `is_active`, `created_at`) VALUES
(1, 'Lion', 'lion.png', 1, '2026-03-16 10:22:52'),
(2, 'Panda', 'panda.png', 1, '2026-03-16 10:22:52'),
(3, 'Fox', 'fox.png', 1, '2026-03-16 10:22:52'),
(4, 'Bunny', 'bunny.png', 1, '2026-03-16 10:22:52'),
(5, 'Bear', 'bear.png', 1, '2026-03-16 10:22:52'),
(6, 'Cat', 'cat.png', 1, '2026-03-16 10:22:52'),
(7, 'Dog', 'dog.png', 1, '2026-03-16 10:22:52'),
(8, 'Penguin', 'penguin.png', 1, '2026-03-16 10:22:52');

-- --------------------------------------------------------

--
-- Table structure for table `children`
--

CREATE TABLE IF NOT EXISTS `children` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `avatar_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `child_allergens`
--

CREATE TABLE IF NOT EXISTS `child_allergens` (
  `child_id` int(10) UNSIGNED NOT NULL,
  `allergen_id` smallint(5) UNSIGNED NOT NULL,
  `severity` enum('intolerance','allergy','severe') NOT NULL DEFAULT 'allergy',
  `notes` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `child_nutrition_goals`
--

CREATE TABLE IF NOT EXISTS `child_nutrition_goals` (
  `child_id` int(10) UNSIGNED NOT NULL,
  `nutrition_goal_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `child_school_rules`
--

CREATE TABLE IF NOT EXISTS `child_school_rules` (
  `child_id` int(10) UNSIGNED NOT NULL,
  `school_rule_id` smallint(5) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `food_items`
--

CREATE TABLE IF NOT EXISTS `food_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `food_items`
--

INSERT INTO `food_items` (`id`, `name`, `category`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'peanut butter and jelly sandwich', 'Sandwich', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(2, 'turkey and cheese sandwich', 'Sandwich', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(3, 'ham sandwich', 'Sandwich', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(4, 'chicken sandwich', 'Sandwich', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(5, 'tuna sandwich', 'Sandwich', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(6, 'grilled cheese sandwich', 'Sandwich', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(7, 'mini burgers/sliders', 'Sandwich', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(8, 'chicken nuggets', 'Main', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(9, 'hot dog', 'Main', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(10, 'pasta with tomato or cheese sauce', 'Main', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(11, 'mac and cheese', 'Main', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(12, 'wrap with turkey/cheese', 'Sandwich', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(13, 'cheese quesadilla', 'Main', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(14, 'boiled eggs', 'Protein', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(15, 'yogurt cups', 'Dairy', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(16, 'apple slices', 'Fruit', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(17, 'banana', 'Fruit', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(18, 'grapes', 'Fruit', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(19, 'carrot sticks', 'Vegetable', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(20, 'cucumber slices', 'Vegetable', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(21, 'string cheese', 'Dairy', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(22, 'crackers', 'Snack', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(23, 'mini muffins', 'Snack', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52');

-- --------------------------------------------------------

--
-- Table structure for table `ingredient_images`
--

CREATE TABLE IF NOT EXISTS `ingredient_images` (
  `id` int(10) UNSIGNED NOT NULL,
  `session_id` int(10) UNSIGNED NOT NULL,
  `image_path` varchar(500) NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lunchbox_results`
--

CREATE TABLE IF NOT EXISTS `lunchbox_results` (
  `id` int(10) UNSIGNED NOT NULL,
  `session_id` int(10) UNSIGNED NOT NULL,
  `ai_text_response` longtext DEFAULT NULL,
  `suggested_items` longtext DEFAULT NULL,
  `nutrition_notes` text DEFAULT NULL,
  `arrangement_desc` text DEFAULT NULL,
  `fun_note` text DEFAULT NULL,
  `generated_image_b64` longtext DEFAULT NULL,
  `generated_image_path` varchar(500) DEFAULT NULL,
  `ai_model` varchar(100) DEFAULT NULL,
  `tokens_used` int(10) UNSIGNED DEFAULT NULL,
  `processing_ms` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lunchbox_sessions`
--

CREATE TABLE IF NOT EXISTS `lunchbox_sessions` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `child_id` int(10) UNSIGNED DEFAULT NULL,
  `lunchbox_image_path` varchar(500) NOT NULL,
  `notes` text DEFAULT NULL,
  `dislikes_override` text DEFAULT NULL,
  `school_rules_override` text DEFAULT NULL,
  `prep_time_minutes` tinyint(3) UNSIGNED DEFAULT NULL,
  `nutrition_goal_override` varchar(50) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nutrition_goals`
--

CREATE TABLE IF NOT EXISTS `nutrition_goals` (
  `id` int(10) UNSIGNED NOT NULL,
  `goal_key` varchar(50) NOT NULL,
  `label` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `nutrition_goals`
--

INSERT INTO `nutrition_goals` (`id`, `goal_key`, `label`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'balanced', 'Balanced', 'balanced nutrition — aim for variety across all food groups', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(2, 'high_protein', 'High Protein', 'high protein — prioritize protein-rich foods like eggs, chicken, cheese, beans', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(3, 'high_calories', 'High Calories', 'high calories — include calorie-dense foods like nut butters, cheese, avocado', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(4, 'low_sugar', 'Low Sugar', 'low sugar — avoid sugary items, use natural fruit only', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(5, 'low_carb', 'Low Carb', 'low carb — minimize bread and starchy foods, favour protein and vegetables', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52'),
(6, 'high_fiber', 'High Fiber', 'high fiber — include whole grains, legumes, fruits, and vegetables', 1, '2026-03-16 10:22:52', '2026-03-16 10:22:52');

-- --------------------------------------------------------

--
-- Table structure for table `school_rules`
--

CREATE TABLE IF NOT EXISTS `school_rules` (
  `id` smallint(5) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `school_rules`
--

INSERT INTO `school_rules` (`id`, `name`, `description`, `is_active`) VALUES
(1, 'No Nuts', 'No peanuts or tree nuts allowed', 1),
(2, 'No Meat', 'No meat products allowed', 1),
(3, 'No Reheating', 'No microwave or reheating facilities', 1),
(4, 'Dairy Free', 'No dairy products allowed', 1),
(5, 'Nut Free', 'Strictly nut-free environment', 1),
(6, 'Halal Only', 'Only halal-certified food permitted', 1),
(7, 'Vegetarian', 'No meat or fish allowed', 1),
(8, 'No Shellfish', 'No shellfish or crustaceans allowed', 1);

-- --------------------------------------------------------

--
-- Table structure for table `session_allergen_overrides`
--

CREATE TABLE IF NOT EXISTS `session_allergen_overrides` (
  `session_id` int(10) UNSIGNED NOT NULL,
  `allergen_id` smallint(5) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `provider` enum('local','google','facebook') NOT NULL DEFAULT 'local',
  `provider_id` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `allergens`
--
ALTER TABLE `allergens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `avatars`
--
ALTER TABLE `avatars`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `children`
--
ALTER TABLE `children`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_children_avatar` (`avatar_id`),
  ADD KEY `idx_children_user` (`user_id`);

--
-- Indexes for table `child_allergens`
--
ALTER TABLE `child_allergens`
  ADD PRIMARY KEY (`child_id`,`allergen_id`),
  ADD KEY `fk_ca_allergen` (`allergen_id`);

--
-- Indexes for table `child_nutrition_goals`
--
ALTER TABLE `child_nutrition_goals`
  ADD PRIMARY KEY (`child_id`,`nutrition_goal_id`),
  ADD KEY `fk_cng_goal` (`nutrition_goal_id`);

--
-- Indexes for table `child_school_rules`
--
ALTER TABLE `child_school_rules`
  ADD PRIMARY KEY (`child_id`,`school_rule_id`),
  ADD KEY `fk_csr_rule` (`school_rule_id`);

--
-- Indexes for table `food_items`
--
ALTER TABLE `food_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `ingredient_images`
--
ALTER TABLE `ingredient_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_session_id` (`session_id`);

--
-- Indexes for table `lunchbox_results`
--
ALTER TABLE `lunchbox_results`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_id` (`session_id`);

--
-- Indexes for table `lunchbox_sessions`
--
ALTER TABLE `lunchbox_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_child_id` (`child_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `nutrition_goals`
--
ALTER TABLE `nutrition_goals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `goal_key` (`goal_key`);

--
-- Indexes for table `school_rules`
--
ALTER TABLE `school_rules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `session_allergen_overrides`
--
ALTER TABLE `session_allergen_overrides`
  ADD PRIMARY KEY (`session_id`,`allergen_id`),
  ADD KEY `fk_sao_allergen` (`allergen_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `allergens`
--
ALTER TABLE `allergens`
  MODIFY `id` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `avatars`
--
ALTER TABLE `avatars`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `children`
--
ALTER TABLE `children`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `food_items`
--
ALTER TABLE `food_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `ingredient_images`
--
ALTER TABLE `ingredient_images`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lunchbox_results`
--
ALTER TABLE `lunchbox_results`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lunchbox_sessions`
--
ALTER TABLE `lunchbox_sessions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nutrition_goals`
--
ALTER TABLE `nutrition_goals`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `school_rules`
--
ALTER TABLE `school_rules`
  MODIFY `id` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `children`
--
ALTER TABLE `children`
  ADD CONSTRAINT `fk_children_avatar` FOREIGN KEY (`avatar_id`) REFERENCES `avatars` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_children_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `child_allergens`
--
ALTER TABLE `child_allergens`
  ADD CONSTRAINT `fk_ca_allergen` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ca_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `child_nutrition_goals`
--
ALTER TABLE `child_nutrition_goals`
  ADD CONSTRAINT `fk_cng_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cng_goal` FOREIGN KEY (`nutrition_goal_id`) REFERENCES `nutrition_goals` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `child_school_rules`
--
ALTER TABLE `child_school_rules`
  ADD CONSTRAINT `fk_csr_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_csr_rule` FOREIGN KEY (`school_rule_id`) REFERENCES `school_rules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `ingredient_images`
--
ALTER TABLE `ingredient_images`
  ADD CONSTRAINT `fk_ingredients_session` FOREIGN KEY (`session_id`) REFERENCES `lunchbox_sessions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lunchbox_results`
--
ALTER TABLE `lunchbox_results`
  ADD CONSTRAINT `fk_results_session` FOREIGN KEY (`session_id`) REFERENCES `lunchbox_sessions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lunchbox_sessions`
--
ALTER TABLE `lunchbox_sessions`
  ADD CONSTRAINT `fk_sessions_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `session_allergen_overrides`
--
ALTER TABLE `session_allergen_overrides`
  ADD CONSTRAINT `fk_sao_allergen` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sao_session` FOREIGN KEY (`session_id`) REFERENCES `lunchbox_sessions` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
