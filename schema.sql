-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 30, 2026 at 07:02 AM
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

CREATE TABLE `allergens` (
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
(1, 'Peanuts', 'peanuts.png', 'Nuts', 'Groundnuts and peanut-derived products', 1),
(2, 'Tree Nuts', 'tree-nuts.png', 'Nuts', 'Almonds, cashews, walnuts, pistachios, etc.', 1),
(3, 'Milk/Dairy', 'dairy.png', 'Dairy', 'Cow milk and dairy products', 1),
(4, 'Eggs', 'eggs.png', 'Animal', 'Chicken eggs and egg-derived products', 1),
(5, 'Wheat/Gluten', 'wheat.png', 'Grains', 'Wheat, barley, rye — includes gluten', 1),
(6, 'Soy', 'soy.png', 'Legumes', 'Soybeans and soy-derived products', 1),
(7, 'Fish', 'fish.png', 'Seafood', 'Finned fish (salmon, tuna, cod, etc.)', 1),
(8, 'Shellfish', 'prawn.png', 'Seafood', 'Shrimp, crab, lobster, clams, etc.', 1),
(9, 'Sesame', 'sesame.png', 'Seeds', 'Sesame seeds and sesame oil', 1),
(10, 'Mustard', 'mustard.png', 'Spices', 'Mustard seeds and mustard-derived products', 0),
(11, 'Celery', 'celery.png', 'Vegetables', 'Celery stalks, leaves, seeds, and celeriac', 0),
(12, 'Lupin', 'lupin.png', 'Legumes', 'Lupin flour and seeds used in some breads', 0),
(13, 'Sulphites', 'sulphite.png', 'Additives', 'Sulphur dioxide used as a preservative', 0),
(14, 'Corn', 'corn.png', 'Grains', 'Corn and corn-derived ingredients', 0),
(15, 'Latex-Fruit', 'latex-fruit.png', 'Other', 'Cross-reactive fruits: banana, avocado, kiwi', 0);

-- --------------------------------------------------------

--
-- Table structure for table `avatars`
--

CREATE TABLE `avatars` (
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
(6, 'Cat', 'cat.png', 1, '2026-03-16 10:22:52'),
(9, 'Bat', 'bat.png', 1, '2026-03-24 11:14:10'),
(10, 'Blue Whale', 'blue-whale.png', 1, '2026-03-24 11:14:10'),
(11, 'Dinosaur', 'dinosaur.png', 1, '2026-03-24 11:14:10'),
(12, 'Eagle', 'eagle.png', 1, '2026-03-24 11:14:10'),
(13, 'Elephant', 'elephant.png', 1, '2026-03-24 11:14:10'),
(14, 'Owl', 'owl.png', 1, '2026-03-24 11:14:10'),
(15, 'Wolf', 'wolf.png', 1, '2026-03-24 11:14:10');

-- --------------------------------------------------------

--
-- Table structure for table `children`
--

CREATE TABLE `children` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `avatar_id` int(11) DEFAULT NULL,
  `default_lunchbox_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `children`
--

INSERT INTO `children` (`id`, `user_id`, `name`, `date_of_birth`, `avatar_id`, `created_at`, `updated_at`) VALUES
(1, 1, 'test child', '2011-06-18', NULL, '2026-03-18 06:29:09', '2026-03-18 06:29:09'),
(2, 1, 'test child 2', '2021-03-11', 1, '2026-03-18 06:44:53', '2026-03-18 06:44:53'),
(3, 1, 'test child 3', '2021-06-16', 1, '2026-03-18 10:38:39', '2026-03-18 10:38:39');

-- --------------------------------------------------------

--
-- Table structure for table `child_lunchboxes`
--

CREATE TABLE `child_lunchboxes` (
  `id` int(10) UNSIGNED NOT NULL,
  `child_id` int(10) UNSIGNED NOT NULL,
  `label` varchar(100) DEFAULT NULL,
  `image_path` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `child_allergens`
--

CREATE TABLE `child_allergens` (
  `child_id` int(10) UNSIGNED NOT NULL,
  `allergen_id` smallint(5) UNSIGNED NOT NULL,
  `severity` enum('intolerance','allergy','severe') NOT NULL DEFAULT 'allergy',
  `notes` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `child_allergens`
--

INSERT INTO `child_allergens` (`child_id`, `allergen_id`, `severity`, `notes`) VALUES
(1, 13, 'allergy', NULL),
(2, 1, 'allergy', NULL),
(2, 5, 'allergy', NULL),
(2, 8, 'allergy', NULL),
(3, 1, 'allergy', NULL),
(3, 13, 'allergy', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `child_nutrition_goals`
--

CREATE TABLE `child_nutrition_goals` (
  `child_id` int(10) UNSIGNED NOT NULL,
  `nutrition_goal_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `child_school_rules`
--

CREATE TABLE `child_school_rules` (
  `child_id` int(10) UNSIGNED NOT NULL,
  `school_rule_id` smallint(5) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `child_school_rules`
--

INSERT INTO `child_school_rules` (`child_id`, `school_rule_id`) VALUES
(1, 3),
(1, 5),
(1, 6),
(2, 3),
(2, 6),
(3, 3),
(3, 6);

-- --------------------------------------------------------

--
-- Table structure for table `food_items`
--

CREATE TABLE `food_items` (
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

CREATE TABLE `ingredient_images` (
  `id` int(10) UNSIGNED NOT NULL,
  `session_id` int(10) UNSIGNED NOT NULL,
  `image_path` varchar(500) NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ingredient_images`
--

INSERT INTO `ingredient_images` (`id`, `session_id`, `image_path`, `label`, `created_at`) VALUES
(1, 19, 'uploads\\1774351261930-360885221.jpg', NULL, '2026-03-24 11:21:01'),
(2, 19, 'uploads\\1774351261930-924694368.webp', NULL, '2026-03-24 11:21:01'),
(3, 40, 'uploads\\1774505020493-773750187.jpg', NULL, '2026-03-26 06:03:40'),
(4, 41, 'uploads\\1774505041726-405038079.jpg', NULL, '2026-03-26 06:04:01');

-- --------------------------------------------------------

--
-- Table structure for table `lunchbox_results`
--

CREATE TABLE `lunchbox_results` (
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

CREATE TABLE `lunchbox_sessions` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `child_id` int(10) UNSIGNED DEFAULT NULL,
  `lunchbox_image_path` varchar(500) NOT NULL,
  `notes` text DEFAULT NULL,
  `dislikes_override` text DEFAULT NULL,
  `school_rules_override` text DEFAULT NULL,
  `prep_time_minutes` tinyint(3) UNSIGNED DEFAULT NULL,
  `nutrition_goal_override` varchar(500) DEFAULT NULL,
  `planned_at` datetime DEFAULT NULL,
  `status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lunchbox_sessions`
--

INSERT INTO `lunchbox_sessions` (`id`, `user_id`, `child_id`, `lunchbox_image_path`, `notes`, `dislikes_override`, `school_rules_override`, `prep_time_minutes`, `nutrition_goal_override`, `status`, `error_message`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'uploads\\1773816417555-896799807.png', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-18 06:46:57', '2026-03-18 06:46:58'),
(2, 1, 2, 'uploads\\1773816421111-549525425.png', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-18 06:47:01', '2026-03-18 06:47:01'),
(3, 1, 2, 'uploads\\1773816422848-802690873.png', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-18 06:47:02', '2026-03-18 06:47:03'),
(4, 1, 2, 'uploads\\1773816919941-176844445.png', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-18 06:55:19', '2026-03-18 06:55:20'),
(5, 1, 2, 'uploads\\1773817087962-245115333.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-18 06:58:07', '2026-03-18 06:58:32'),
(6, 1, 3, 'uploads\\1773830353068-100712691.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-18 10:39:13', '2026-03-18 10:39:38'),
(7, 1, NULL, 'uploads\\1774266866377-549292814.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-23 11:54:26', '2026-03-23 11:54:51'),
(8, 1, NULL, 'uploads\\1774267047989-162565475.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-23 11:57:28', '2026-03-23 11:57:54'),
(9, 1, NULL, 'uploads\\1774267156085-85222747.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-23 11:59:16', '2026-03-23 11:59:43'),
(10, 1, NULL, 'uploads\\1774267357786-266221339.webp', NULL, NULL, NULL, NULL, NULL, 'processing', NULL, '2026-03-23 12:02:37', '2026-03-23 12:02:37'),
(11, 1, NULL, 'uploads\\1774267478997-803764362.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-23 12:04:39', '2026-03-23 12:05:04'),
(12, 1, NULL, 'uploads\\1774267657776-998141481.webp', NULL, NULL, NULL, NULL, NULL, 'processing', NULL, '2026-03-23 12:07:37', '2026-03-23 12:07:37'),
(13, 1, NULL, 'uploads\\1774267740283-785830123.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-23 12:09:00', '2026-03-23 12:09:27'),
(14, 1, NULL, 'uploads\\1774338507528-601618188.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-24 07:48:27', '2026-03-24 07:48:54'),
(15, 1, NULL, 'uploads\\1774338595420-509279886.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-24 07:49:55', '2026-03-24 07:50:21'),
(16, 1, NULL, 'uploads\\1774339449002-402335791.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-24 08:04:09', '2026-03-24 08:04:36'),
(17, 1, NULL, 'uploads\\1774339597695-174830570.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-24 08:06:37', '2026-03-24 08:07:03'),
(18, 1, NULL, 'uploads\\1774340809279-51029457.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-24 08:26:49', '2026-03-24 08:27:14'),
(19, 1, NULL, 'uploads\\1774351261927-133550455.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-24 11:21:01', '2026-03-24 11:21:29'),
(20, 1, NULL, 'uploads\\1774418442022-441268206.webp', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-25 06:00:42', '2026-03-25 06:00:53'),
(21, 1, NULL, 'uploads\\1774418643243-971975894.webp', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-25 06:04:03', '2026-03-25 06:04:13'),
(22, 1, NULL, 'uploads\\1774419932756-575292332.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 06:25:32', '2026-03-25 06:26:38'),
(23, 1, NULL, 'uploads\\1774420154896-392518159.webp', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-25 06:29:14', '2026-03-25 06:29:15'),
(24, 1, NULL, 'uploads\\1774420406777-138422012.webp', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-25 06:33:26', '2026-03-25 06:33:27'),
(25, 1, NULL, 'uploads\\1774420421054-815701292.webp', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-25 06:33:41', '2026-03-25 06:33:45'),
(26, 1, NULL, 'uploads\\1774420455172-581305384.webp', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-25 06:34:15', '2026-03-25 06:34:19'),
(27, 1, NULL, 'uploads\\1774420472991-32458426.webp', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-25 06:34:33', '2026-03-25 06:34:37'),
(28, 1, NULL, 'uploads\\1774420488624-618507742.webp', NULL, NULL, NULL, NULL, NULL, 'failed', NULL, '2026-03-25 06:34:48', '2026-03-25 06:34:53'),
(29, 1, NULL, 'uploads\\1774420525006-364724427.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 06:35:25', '2026-03-25 06:35:50'),
(30, 1, NULL, 'uploads\\1774420625882-239995102.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 06:37:05', '2026-03-25 06:38:10'),
(31, 1, NULL, 'uploads\\1774421395936-505367300.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 06:49:55', '2026-03-25 06:51:03'),
(32, 1, NULL, 'uploads\\1774421962326-948326494.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 06:59:22', '2026-03-25 07:00:27'),
(33, 1, NULL, 'uploads\\1774422069661-632530910.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 07:01:09', '2026-03-25 07:02:12'),
(34, 1, NULL, 'uploads\\1774422780646-916327745.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 07:13:00', '2026-03-25 07:14:05'),
(35, 1, NULL, 'uploads\\1774422889571-346321271.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 07:14:49', '2026-03-25 07:15:57'),
(36, 1, NULL, 'uploads\\1774423031380-988151667.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 07:17:11', '2026-03-25 07:18:14'),
(37, 1, NULL, 'uploads\\1774423495692-741386153.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 07:24:55', '2026-03-25 07:25:19'),
(38, 1, NULL, 'uploads\\1774423607199-836750271.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 07:26:47', '2026-03-25 07:27:10'),
(39, 1, NULL, 'uploads\\1774441033671-767576731.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-25 12:17:13', '2026-03-25 12:17:40'),
(40, 1, NULL, 'uploads\\1774505020489-972966104.webp', NULL, NULL, NULL, NULL, NULL, 'processing', NULL, '2026-03-26 06:03:40', '2026-03-26 06:03:40'),
(41, 1, NULL, 'uploads\\1774505041724-131202266.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-26 06:04:01', '2026-03-26 06:04:26'),
(42, 1, NULL, 'uploads\\1774512623673-205143434.webp', NULL, NULL, NULL, NULL, NULL, 'processing', NULL, '2026-03-26 08:10:23', '2026-03-26 08:10:23'),
(43, 1, NULL, 'uploads\\1774512733832-194002519.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-26 08:12:13', '2026-03-26 08:12:43'),
(44, 1, NULL, 'uploads\\1774512814231-866530685.webp', NULL, NULL, NULL, NULL, NULL, 'completed', NULL, '2026-03-26 08:13:34', '2026-03-26 08:14:51');

-- --------------------------------------------------------

--
-- Table structure for table `nutrition_goals`
--

CREATE TABLE `nutrition_goals` (
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

CREATE TABLE `school_rules` (
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

CREATE TABLE `session_allergen_overrides` (
  `session_id` int(10) UNSIGNED NOT NULL,
  `allergen_id` smallint(5) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
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
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `provider`, `provider_id`, `avatar_url`, `created_at`, `updated_at`) VALUES
(1, 'abc@lunchboxai.com', '$2b$12$SvuwdKeek4.2UwznZhbQbOy8w3qW9IF45joniIzVFDmD.40Ez.zxS', 'aaa', 'local', NULL, NULL, '2026-03-17 11:26:09', '2026-03-17 11:26:09'),
(2, 'parent196@example.com', '$2b$12$1btFDTcArkBAM3snn3MI3OQN9wJT5lowgo0Cb9gRGdLOOXP0w3ne2', 'Jane Smith', 'local', NULL, NULL, '2026-03-23 05:48:30', '2026-03-23 05:48:30');

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
  ADD KEY `fk_children_default_lb` (`default_lunchbox_id`),
  ADD KEY `idx_children_user` (`user_id`);

--
-- Indexes for table `child_lunchboxes`
--
ALTER TABLE `child_lunchboxes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_child_id` (`child_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `children`
--
ALTER TABLE `children`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `child_lunchboxes`
--
ALTER TABLE `child_lunchboxes`
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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `lunchbox_results`
--
ALTER TABLE `lunchbox_results`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lunchbox_sessions`
--
ALTER TABLE `lunchbox_sessions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `child_lunchboxes`
--
ALTER TABLE `child_lunchboxes`
  ADD CONSTRAINT `fk_cl_child` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `children`
--
ALTER TABLE `children`
  ADD CONSTRAINT `fk_children_avatar` FOREIGN KEY (`avatar_id`) REFERENCES `avatars` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_children_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_children_default_lb` FOREIGN KEY (`default_lunchbox_id`) REFERENCES `child_lunchboxes` (`id`) ON DELETE SET NULL;

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

-- --------------------------------------------------------

--
-- Table structure for table `user_fcm_tokens`
--

CREATE TABLE `user_fcm_tokens` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `token` varchar(512) NOT NULL,
  `notifications_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for table `user_fcm_tokens`
--
ALTER TABLE `user_fcm_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_fcm_token` (`token`),
  ADD KEY `idx_user_fcm_user` (`user_id`);

--
-- AUTO_INCREMENT for table `user_fcm_tokens`
--
ALTER TABLE `user_fcm_tokens`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for table `user_fcm_tokens`
--
ALTER TABLE `user_fcm_tokens`
  ADD CONSTRAINT `fk_fcm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
