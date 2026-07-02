import { queryOne, queryAll, execute } from './db.js';

const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const JWT_EXPIRY_DAYS = 7;
const encoder = new TextEncoder();

function getJwtSecret(env) {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return env.JWT_SECRET;
}

function isValidUser(user) {
  return (
    user &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.username === 'string' &&
    typeof user.passwordHash === 'string' &&
    (user.role === 'admin' || user.role === 'user') &&
    user.preferences &&
    typeof user.preferences.currency === 'string'
  );
}

function isValidMagicLink(magicLink) {
  return (
    magicLink &&
    typeof magicLink.token === 'string' &&
    typeof magicLink.userId === 'string' &&
    typeof magicLink.expiresAt === 'number' &&
    magicLink.expiresAt > Date.now()
  );
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function arrayBufferToBase64Url(buffer) {
  return arrayBufferToBase64(buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToArrayBuffer(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const saltBase64 = arrayBufferToBase64(salt);
  const hashBase64 = arrayBufferToBase64(derivedBits);

  return `${saltBase64}:${hashBase64}`;
}

async function verifyPassword(password, storedHash) {
  const [saltBase64, hashBase64] = storedHash.split(':');
  if (!saltBase64 || !hashBase64) return false;

  const salt = base64UrlToArrayBuffer(saltBase64);
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const computedHash = arrayBufferToBase64(derivedBits);
  return computedHash === hashBase64;
}

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return arrayBufferToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function createUserId() {
  return `user_${generateToken()}`;
}

function rowToUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    isTrial: !!row.is_trial,
    trialExpiresAt: row.trial_expires_at,
    searchCount: row.search_count || 0,
    preferences: {
      currency: row.currency || 'USD',
      defaultStore: row.default_store || null,
    },
    createdAt: row.created_at,
  };
}

async function createJWT(user, env) {
  const payload = {
    userId: user.id,
    role: user.role,
    isTrial: user.isTrial || false,
    searchCount: user.searchCount || 0,
    exp: Date.now() + JWT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const JWT_SECRET = getJwtSecret(env);
  const keyData = encoder.encode(JWT_SECRET);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadBase64));
  const signatureBase64 = arrayBufferToBase64Url(signatureBuffer);

  return `${payloadBase64}.${signatureBase64}`;
}

async function verifyJWT(token, env) {
  try {
    const [payloadBase64, signatureBase64] = token.split('.');
    if (!payloadBase64 || !signatureBase64) return null;

    const encoder = new TextEncoder();
    const JWT_SECRET = getJwtSecret(env);
    const keyData = encoder.encode(JWT_SECRET);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToArrayBuffer(signatureBase64),
      encoder.encode(payloadBase64)
    );

    if (!signatureValid) return null;

    const payload = JSON.parse(base64UrlDecode(payloadBase64));
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch (e) {
    return null;
  }
}

async function getUserById(env, userId) {
  const row = await queryOne(env, 'SELECT * FROM users WHERE id = ?', [userId]);
  if (!row) return null;
  const user = rowToUser(row);
  return isValidUser(user) ? user : null;
}

async function getUserByEmail(env, email) {
  const row = await queryOne(env, 'SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  return row ? rowToUser(row) : null;
}

async function getUserByUsername(env, username) {
  const row = await queryOne(env, 'SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
  return row ? rowToUser(row) : null;
}

async function saveUser(env, user) {
  await execute(
    env,
    `INSERT INTO users (id, email, username, password_hash, role, is_trial, trial_expires_at, search_count, currency, default_store, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       username = excluded.username,
       password_hash = excluded.password_hash,
       role = excluded.role,
       is_trial = excluded.is_trial,
       trial_expires_at = excluded.trial_expires_at,
       search_count = excluded.search_count,
       currency = excluded.currency,
       default_store = excluded.default_store`,
    [
      user.id,
      user.email.toLowerCase(),
      user.username.toLowerCase(),
      user.passwordHash,
      user.role,
      user.isTrial ? 1 : 0,
      user.trialExpiresAt || null,
      user.searchCount || 0,
      user.preferences?.currency || 'USD',
      user.preferences?.defaultStore || null,
      user.createdAt,
    ]
  );
}

async function deleteUser(env, userId) {
  const products = await queryAll(env, 'SELECT id FROM products WHERE user_id = ?', [userId]);
  if (products.length > 0) {
    const productIds = products.map(p => p.id);
    const placeholders = productIds.map(() => '?').join(',');
    await execute(env, `DELETE FROM prices WHERE product_id IN (${placeholders})`, productIds);
  }
  await execute(env, 'DELETE FROM products WHERE user_id = ?', [userId]);
  await execute(env, 'DELETE FROM users WHERE id = ?', [userId]);
}

export {
  isValidUser,
  isValidMagicLink,
  hashPassword,
  verifyPassword,
  generateToken,
  createUserId,
  createJWT,
  verifyJWT,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  saveUser,
  deleteUser,
};
