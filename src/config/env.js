'use strict';

require('dotenv').config();

const required = [
  'DB_HOST', 'DB_USER', 'DB_NAME',
  'JWT_SECRET',
  'OPENAI_API_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  PORT:             process.env.PORT || 3000,
  NODE_ENV:         process.env.NODE_ENV || 'development',

  DB_HOST:          process.env.DB_HOST,
  DB_PORT:          parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER:          process.env.DB_USER,
  DB_PASSWORD:      process.env.DB_PASSWORD || '',
  DB_NAME:          process.env.DB_NAME,

  JWT_SECRET:       process.env.JWT_SECRET,
  JWT_EXPIRES_IN:   process.env.JWT_EXPIRES_IN || '7d',

  OPENAI_API_KEY:   process.env.OPENAI_API_KEY,

  GOOGLE_CLIENT_ID:     process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  FACEBOOK_APP_ID:      process.env.FACEBOOK_APP_ID || '',
  FACEBOOK_APP_SECRET:  process.env.FACEBOOK_APP_SECRET || '',

  APP_BASE_URL:  process.env.APP_BASE_URL || 'http://localhost:3000',
  FRONTEND_URL:  process.env.FRONTEND_URL || 'http://localhost:3001',
};
