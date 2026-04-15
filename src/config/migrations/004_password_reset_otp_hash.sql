-- OTP for password reset (mobile + email); hashed at rest alongside link token.

ALTER TABLE password_reset_tokens
  ADD COLUMN otp_hash CHAR(64) NULL AFTER token_hash;
