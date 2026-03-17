const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } = require('../config/constants');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
};

const multerInstance = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

const upload = multerInstance.fields([
  { name: 'lunchbox',    maxCount: 1 },
  { name: 'ingredients', maxCount: 5 },
]);

module.exports = { upload };
