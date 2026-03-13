#!/bin/bash
set -e
cd /var/www

# Clone or pull
if [ -d lunchboxai/.git ]; then
  cd lunchboxai && git pull origin main && cd ..
else
  rm -rf lunchboxai
  git clone https://github.com/abdulkarimtaji33/lunchboxai-backend.git lunchboxai
fi

cd lunchboxai

# Create .env if missing (edit with OPENAI_API_KEY, JWT_SECRET)
if [ ! -f .env ]; then
  cp .env.example .env
fi
sed -i 's/PORT=3000/PORT=3001/' .env
sed -i 's|APP_BASE_URL=.*|APP_BASE_URL=http://72.60.223.25:3001|' .env
sed -i 's/^DB_USER=.*/DB_USER=clearearth/' .env
sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=Clearearth2026/' .env

# Deploy database
mysql -u root -e "CREATE DATABASE IF NOT EXISTS lunchboxai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
mysql -u root lunchboxai < schema.sql 2>/dev/null || mysql -u clearearth -pClearearth2026 lunchboxai < schema.sql
mysql -u root < grant-lunchboxai.sql 2>/dev/null || echo "Run manually: mysql -u root -p < grant-lunchboxai.sql"

# Install deps
npm ci --omit=dev

# Upload dirs
mkdir -p uploads/lunchboxes uploads/ingredients uploads/results

# PM2
pm2 delete lunchboxai-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "LunchBox AI deployed on port 3001. Health: http://72.60.223.25:3001/health"
