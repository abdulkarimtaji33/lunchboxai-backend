// Non-DB constants only. KIDS_FOODS and NUTRITION_GOAL_LABELS moved to DB tables.

module.exports = {
  UPLOAD_DIR: 'uploads',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  DEFAULT_FOOD_COUNT: 10,
};
