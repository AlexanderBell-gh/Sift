const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const JWT_SECRET = 'pricetrackr-jwt-secret-change-in-production';
const JWT_EXPIRY_DAYS = 7;

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

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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

  const salt = base64ToArrayBuffer(saltBase64);
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

async function createJWT(user) {
  const encoder = new TextEncoder();
  const payload = {
    userId: user.id,
    role: user.role,
    exp: Date.now() + JWT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  const payloadBase64 = btoa(JSON.stringify(payload));

  const keyData = encoder.encode(JWT_SECRET);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadBase64));
  const signatureBase64 = arrayBufferToBase64(signatureBuffer);

  return `${payloadBase64}.${signatureBase64}`;
}

async function verifyJWT(token) {
  try {
    const [payloadBase64, signatureBase64] = token.split('.');
    if (!payloadBase64 || !signatureBase64) return null;

    const encoder = new TextEncoder();
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
      base64ToArrayBuffer(signatureBase64),
      encoder.encode(payloadBase64)
    );

    if (!signatureValid) return null;

    const payload = JSON.parse(atob(payloadBase64));
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch (e) {
    return null;
  }
}

async function getUserById(env, userId) {
  const user = await env.USERS.get(`user:${userId}`, 'json');
  return user && isValidUser(user) ? user : null;
}

async function getUserByEmail(env, email) {
  const userId = await env.USERS.get(`email:${email.toLowerCase()}`);
  if (!userId) return null;
  return getUserById(env, userId);
}

async function getUserByUsername(env, username) {
  const userId = await env.USERS.get(`username:${username.toLowerCase()}`);
  if (!userId) return null;
  return getUserById(env, userId);
}

async function saveUser(env, user) {
  await env.USERS.put(`user:${user.id}`, JSON.stringify(user));
  await env.USERS.put(`email:${user.email.toLowerCase()}`, user.id);
  await env.USERS.put(`username:${user.username.toLowerCase()}`, user.id);

  const userIds = await env.USERS.get('users', 'json');
  const ids = userIds && Array.isArray(userIds) ? userIds : [];
  if (!ids.includes(user.id)) {
    ids.push(user.id);
    await env.USERS.put('users', JSON.stringify(ids));
  }
}

async function deleteUser(env, userId) {
  const user = await getUserById(env, userId);
  if (!user) return;

  await env.USERS.delete(`user:${userId}`);
  await env.USERS.delete(`email:${user.email.toLowerCase()}`);
  await env.USERS.delete(`username:${user.username.toLowerCase()}`);

  const userIds = await env.USERS.get('users', 'json');
  if (userIds && Array.isArray(userIds)) {
    const filtered = userIds.filter(id => id !== userId);
    await env.USERS.put('users', JSON.stringify(filtered));
  }
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
