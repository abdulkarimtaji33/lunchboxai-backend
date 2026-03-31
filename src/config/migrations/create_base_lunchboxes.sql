-- Migration: create_base_lunchboxes
-- Creates the base_lunchboxes table and seeds 10 preset lunchbox container types.
-- Images are served from /base_lunchboxes/ static path; filenames are 1.jpg … 10.jpg (or .webp).

CREATE TABLE IF NOT EXISTS base_lunchboxes (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  description    VARCHAR(255),
  container_type VARCHAR(50),
  compartments   INT           DEFAULT 1,
  image_path     VARCHAR(500),
  tags           VARCHAR(255),
  sort_order     INT           DEFAULT 0,
  is_active      TINYINT(1)    NOT NULL DEFAULT 1,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO base_lunchboxes (id, name, description, container_type, compartments, image_path, tags, sort_order) VALUES
(1, 'Classic Bento Box',        'Traditional Japanese-style bento with 4 equal compartments', 'bento',    4, 'base_lunchboxes/1.jpg',  'classic,japanese,rectangular', 1),
(2, 'Round Tiffin Box',         '3-tier stacked round tiffin carrier',                        'tiffin',   3, 'base_lunchboxes/2.jpg',  'round,stacked,traditional',    2),
(3, 'Simple Sandwich Box',      'Single-compartment rectangular box ideal for sandwiches',    'sandwich', 1, 'base_lunchboxes/3.jpg',  'simple,rectangular,sandwich',  3),
(4, 'Snack Bento (5 sections)', 'Five-section bento perfect for variety snacks',              'bento',    5, 'base_lunchboxes/4.jpg',  'snack,variety,5-section',      4),
(5, 'Thermos + Side Container', 'Insulated thermos with a small side compartment',            'thermos',  2, 'base_lunchboxes/5.webp', 'hot,thermos,soup,warm',        5),
(6, 'Divided Plate Box',        'Plate-style 3-section divided lunchbox',                     'plate',    3, 'base_lunchboxes/6.jpg',  'plate,divided,3-section',      6);
