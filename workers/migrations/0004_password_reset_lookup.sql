-- Add fast lookup column for password reset tokens (CODEREVIEW: O(n) PBKDF2 scan -> O(1))
-- token_sha256 = SHA-256(plaintext token) at insert time, enables indexed lookup
ALTER TABLE password_resets ADD COLUMN token_sha256 TEXT;

-- Existing pending tokens can't be backfilled (only PBKDF2 hash stored), and expire in 30min anyway
DELETE FROM password_resets WHERE used = 0;

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_sha256);
