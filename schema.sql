CREATE DATABASE IF NOT EXISTS lunchboxai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lunchboxai;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255)     NOT NULL UNIQUE,
  password_hash VARCHAR(255)     NULL,
  full_name     VARCHAR(100)     NOT NULL,
  google_id     VARCHAR(255)     NULL UNIQUE,
  facebook_id   VARCHAR(255)     NULL UNIQUE,
  avatar_url    VARCHAR(500)     NULL,
  auth_provider ENUM('local','google','facebook') NOT NULL DEFAULT 'local',
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allergens (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)      NOT NULL UNIQUE,
  category    VARCHAR(100)      NULL,
  description VARCHAR(255)      NULL,
  is_common   TINYINT(1)        NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS children (
  id             INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED     NOT NULL,
  name           VARCHAR(100)     NOT NULL,
  age            TINYINT UNSIGNED NULL,
  dislikes       VARCHAR(255)     NULL,
  school_rules   VARCHAR(255)     NULL,
  nutrition_goal ENUM('balanced','high_protein','high_calories','low_sugar','low_carb','high_fiber') NOT NULL DEFAULT 'balanced',
  calorie_target SMALLINT UNSIGNED NULL,
  protein_target TINYINT UNSIGNED  NULL,
  created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_children_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_children_user (user_id)
);

CREATE TABLE IF NOT EXISTS child_allergens (
  child_id    INT UNSIGNED      NOT NULL,
  allergen_id SMALLINT UNSIGNED NOT NULL,
  severity    ENUM('intolerance','allergy','severe') NOT NULL DEFAULT 'allergy',
  notes       VARCHAR(255)      NULL,
  PRIMARY KEY (child_id, allergen_id),
  CONSTRAINT fk_ca_child    FOREIGN KEY (child_id)    REFERENCES children(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ca_allergen FOREIGN KEY (allergen_id) REFERENCES allergens(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lunchbox_sessions (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id                 INT UNSIGNED NOT NULL,
  child_id                INT UNSIGNED NULL,
  lunchbox_image_path     VARCHAR(500) NOT NULL,
  notes                   TEXT         NULL,
  dislikes_override       VARCHAR(255) NULL,
  school_rules_override   VARCHAR(255) NULL,
  prep_time_minutes       TINYINT      NULL,
  nutrition_goal_override ENUM('balanced','high_protein','high_calories','low_sugar','low_carb','high_fiber') NULL,
  status                  ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user  FOREIGN KEY (user_id)  REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_sessions_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_child_id (child_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS session_allergen_overrides (
  session_id  INT UNSIGNED      NOT NULL,
  allergen_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (session_id, allergen_id),
  CONSTRAINT fk_sao_session  FOREIGN KEY (session_id)  REFERENCES lunchbox_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_sao_allergen FOREIGN KEY (allergen_id) REFERENCES allergens(id)         ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ingredient_images (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id INT UNSIGNED NOT NULL,
  image_path VARCHAR(500) NOT NULL,
  label      VARCHAR(100) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ingredients_session FOREIGN KEY (session_id) REFERENCES lunchbox_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id)
);

CREATE TABLE IF NOT EXISTS lunchbox_results (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id           INT UNSIGNED NOT NULL UNIQUE,
  ai_text_response     TEXT         NOT NULL,
  suggested_items      JSON         NULL,
  nutrition_notes      TEXT         NULL,
  arrangement_desc     TEXT         NULL,
  fun_note             VARCHAR(255) NULL,
  generated_image_b64  LONGTEXT     NULL,
  generated_image_path VARCHAR(500) NULL,
  ai_model             VARCHAR(100) NULL,
  tokens_used          INT UNSIGNED NULL,
  processing_ms        INT UNSIGNED NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_session FOREIGN KEY (session_id) REFERENCES lunchbox_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS food_items (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200)  NOT NULL UNIQUE,
  category   VARCHAR(100)  NULL,
  is_active  TINYINT(1)    NOT NULL DEFAULT 1,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nutrition_goals (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  goal_key    VARCHAR(50)   NOT NULL UNIQUE,
  label       VARCHAR(100)  NOT NULL,
  description TEXT          NOT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO allergens (name, category, description, is_common) VALUES
  ('Peanuts',      'Nuts',        'Groundnuts and peanut-derived products',         1),
  ('Tree Nuts',    'Nuts',        'Almonds, cashews, walnuts, pistachios, etc.',    1),
  ('Milk/Dairy',   'Dairy',       'Cow milk and dairy products',                    1),
  ('Eggs',         'Animal',      'Chicken eggs and egg-derived products',          1),
  ('Wheat/Gluten', 'Grains',      'Wheat, barley, rye — includes gluten',          1),
  ('Soy',          'Legumes',     'Soybeans and soy-derived products',              1),
  ('Fish',         'Seafood',     'Finned fish (salmon, tuna, cod, etc.)',          1),
  ('Shellfish',    'Seafood',     'Shrimp, crab, lobster, clams, etc.',             1),
  ('Sesame',       'Seeds',       'Sesame seeds and sesame oil',                    1),
  ('Mustard',      'Spices',      'Mustard seeds and mustard-derived products',     0),
  ('Celery',       'Vegetables',  'Celery stalks, leaves, seeds, and celeriac',    0),
  ('Lupin',        'Legumes',     'Lupin flour and seeds used in some breads',      0),
  ('Sulphites',    'Additives',   'Sulphur dioxide used as a preservative',         0),
  ('Corn',         'Grains',      'Corn and corn-derived ingredients',              0),
  ('Latex-Fruit',  'Other',       'Cross-reactive fruits: banana, avocado, kiwi',  0);

INSERT IGNORE INTO food_items (name, category) VALUES
  ('peanut butter and jelly sandwich', 'Sandwich'),
  ('turkey and cheese sandwich',       'Sandwich'),
  ('ham sandwich',                     'Sandwich'),
  ('chicken sandwich',                 'Sandwich'),
  ('tuna sandwich',                    'Sandwich'),
  ('grilled cheese sandwich',          'Sandwich'),
  ('mini burgers/sliders',             'Sandwich'),
  ('chicken nuggets',                  'Main'),
  ('hot dog',                          'Main'),
  ('pasta with tomato or cheese sauce','Main'),
  ('mac and cheese',                   'Main'),
  ('wrap with turkey/cheese',          'Sandwich'),
  ('cheese quesadilla',                'Main'),
  ('boiled eggs',                      'Protein'),
  ('yogurt cups',                      'Dairy'),
  ('apple slices',                     'Fruit'),
  ('banana',                           'Fruit'),
  ('grapes',                           'Fruit'),
  ('carrot sticks',                    'Vegetable'),
  ('cucumber slices',                  'Vegetable'),
  ('string cheese',                    'Dairy'),
  ('crackers',                         'Snack'),
  ('mini muffins',                     'Snack');

INSERT IGNORE INTO nutrition_goals (goal_key, label, description) VALUES
  ('balanced',      'Balanced',      'balanced nutrition — aim for variety across all food groups'),
  ('high_protein',  'High Protein',  'high protein — prioritize protein-rich foods like eggs, chicken, cheese, beans'),
  ('high_calories', 'High Calories', 'high calories — include calorie-dense foods like nut butters, cheese, avocado'),
  ('low_sugar',     'Low Sugar',     'low sugar — avoid sugary items, use natural fruit only'),
  ('low_carb',      'Low Carb',      'low carb — minimize bread and starchy foods, favour protein and vegetables'),
  ('high_fiber',    'High Fiber',    'high fiber — include whole grains, legumes, fruits, and vegetables');
