-- Migration: widen_nutrition_goal_override
-- Stores comma-separated goal_key values when multiple nutrition goals are selected.

ALTER TABLE lunchbox_sessions MODIFY COLUMN nutrition_goal_override VARCHAR(500) DEFAULT NULL;
