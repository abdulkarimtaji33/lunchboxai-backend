require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5100,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lunchboxai',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  /** Pepper for hashing 6-digit reset OTPs (defaults to JWT_SECRET). */
  passwordResetOtpPepper: process.env.PASSWORD_RESET_OTP_PEPPER || process.env.JWT_SECRET || 'fallback_secret',
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    /** Must match “Authorized redirect URIs” in Google Cloud Console (OAuth client). */
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      `${process.env.APP_BASE_URL || 'http://localhost:5100'}/api/auth/google/callback`,
    /** Comma-separated OAuth client IDs allowed as `aud` in ID tokens (web + Android + iOS). Defaults to GOOGLE_CLIENT_ID. */
    allowedAudiences: (process.env.GOOGLE_ALLOWED_AUDIENCES || process.env.GOOGLE_CLIENT_ID || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
  },
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5100',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  /** Required for POST /api/notifications/broadcast (header X-Broadcast-Secret) */
  broadcastSecret: process.env.BROADCAST_SECRET || '',
  s3: {
    bucket: process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || '',
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-north-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    /** Optional CloudFront or custom origin; default https://bucket.s3.region.amazonaws.com/key */
    publicBaseUrl: (process.env.AWS_S3_PUBLIC_URL || '').replace(/\/$/, ''),
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceStarter: process.env.STRIPE_PRICE_STARTER || '',
    priceGrowth: process.env.STRIPE_PRICE_GROWTH || '',
    pricePro: process.env.STRIPE_PRICE_PRO || '',
  },
  /** Comma-separated emails promoted to is_admin on every server start (idempotent). */
  adminBootstrapEmails: (process.env.ADMIN_BOOTSTRAP_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  /** If set with ADMIN_BOOTSTRAP_PASSWORD (min 8 chars), creates local admin or grants is_admin. */
  adminBootstrapEmail: (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim(),
  adminBootstrapPassword: (process.env.ADMIN_BOOTSTRAP_PASSWORD || '').trim(),
  defaultFreeGenerationCredits: Math.max(
    0,
    parseInt(process.env.DEFAULT_FREE_GENERATION_CREDITS ?? '5', 10) || 0
  ),
};
