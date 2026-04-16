ALTER TABLE lunchbox_results
  ADD COLUMN cooking_ingredients JSON DEFAULT NULL AFTER suggested_items;

ALTER TABLE lunchbox_sessions
  ADD COLUMN feedback_rating TINYINT UNSIGNED DEFAULT NULL AFTER save_for_later,
  ADD COLUMN feedback_comment TEXT DEFAULT NULL AFTER feedback_rating;
