// Shared input validation for usernames and passwords (plain JS, no deps).
// Imported by workers/index.js; mirrored by AuthPage.tsx and SettingsPage.tsx
// (no shared build across layers — keep the regexes and messages identical).
// Usernames: letters and numbers only. Passwords: letters, numbers, dots,
// underscores only. Both ASCII-only, so emoji and other non-ASCII are rejected.

export const USERNAME_MIN = 4;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const USERNAME_RE = /^[A-Za-z0-9]+$/;
const PASSWORD_RE = /^[A-Za-z0-9._]+$/;

export const USERNAME_ERROR = 'Username must be 4-30 characters, letters and numbers only';
export const PASSWORD_ERROR = 'Password must be 8-128 characters with a letter and a number, using only letters, numbers, dots and underscores';

export function isValidUsername(username) {
  return (
    typeof username === 'string' &&
    username.length >= USERNAME_MIN &&
    username.length <= USERNAME_MAX &&
    USERNAME_RE.test(username)
  );
}

export function isValidPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= PASSWORD_MIN &&
    password.length <= PASSWORD_MAX &&
    PASSWORD_RE.test(password) &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
