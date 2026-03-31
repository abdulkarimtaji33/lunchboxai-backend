-- Migration: update_base_lunchboxes_image_path
-- Renames image_url to image_path in base_lunchboxes and updates seed data with real file paths.
-- Safe to run multiple times (uses IF EXISTS / IF NOT EXISTS guards).

-- Step 1: Add image_path column if it does not exist
ALTER TABLE base_lunchboxes ADD COLUMN IF NOT EXISTS image_path VARCHAR(500) AFTER compartments;

-- Step 2: Drop old image_url column if it exists
ALTER TABLE base_lunchboxes DROP COLUMN IF EXISTS image_url;

-- Step 3: Update image_path for all 10 rows
UPDATE base_lunchboxes SET image_path = 'base_lunchboxes/1.jpg'  WHERE id = 1;
UPDATE base_lunchboxes SET image_path = 'base_lunchboxes/2.jpg'  WHERE id = 2;
UPDATE base_lunchboxes SET image_path = 'base_lunchboxes/3.jpg'  WHERE id = 3;
UPDATE base_lunchboxes SET image_path = 'base_lunchboxes/4.jpg'  WHERE id = 4;
UPDATE base_lunchboxes SET image_path = 'base_lunchboxes/5.webp' WHERE id = 5;
UPDATE base_lunchboxes SET image_path = 'base_lunchboxes/6.jpg'  WHERE id = 6;
