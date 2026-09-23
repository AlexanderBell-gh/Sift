// Regression tests for workers/lib/validate.js. Run: node --test workers/lib/validate.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidUsername,
  isValidPassword,
  USERNAME_ERROR,
  PASSWORD_ERROR,
} from './validate.js';

describe('isValidUsername (letters and numbers only, 4-30)', () => {
  it('accepts plain alphanumerics', () => {
    assert.equal(isValidUsername('Alice123'), true);
    assert.equal(isValidUsername('abcd'), true);
    assert.equal(isValidUsername('A'.repeat(30)), true);
  });

  it('rejects emoji, spaces, and symbols', () => {
    assert.equal(isValidUsername('alice🎉'), false);
    assert.equal(isValidUsername('alice bob'), false);
    assert.equal(isValidUsername('alice.bob'), false);
    assert.equal(isValidUsername('alice_bob'), false);
    assert.equal(isValidUsername('alice-bob'), false);
    assert.equal(isValidUsername('alice@x'), false);
    assert.equal(isValidUsername('álice123'), false);
  });

  it('rejects wrong lengths and non-strings', () => {
    assert.equal(isValidUsername('abc'), false);
    assert.equal(isValidUsername('A'.repeat(31)), false);
    assert.equal(isValidUsername(''), false);
    assert.equal(isValidUsername(null), false);
    assert.equal(isValidUsername(undefined), false);
    assert.equal(isValidUsername(12345), false);
  });

  it('exposes the shared error message', () => {
    assert.equal(USERNAME_ERROR, 'Username must be 4-30 characters, letters and numbers only');
  });
});

describe('isValidPassword (letters, numbers, dots, underscores; 8-128; letter + digit)', () => {
  it('accepts compliant passwords', () => {
    assert.equal(isValidPassword('Passw0rd'), true);
    assert.equal(isValidPassword('my_pass.123'), true);
    assert.equal(isValidPassword('A1' + 'x'.repeat(126)), true);
  });

  it('rejects emoji and non-ASCII', () => {
    assert.equal(isValidPassword('Passw0rd🎉'), false);
    assert.equal(isValidPassword('Pässw0rd1'), false);
    assert.equal(isValidPassword('Password١٢٣'), false);
  });

  it('rejects disallowed ASCII symbols', () => {
    assert.equal(isValidPassword('Passw0rd!'), false);
    assert.equal(isValidPassword('Pass word1'), false);
    assert.equal(isValidPassword('Pass-word1'), false);
  });

  it('keeps the letter-plus-digit rule and length bounds', () => {
    assert.equal(isValidPassword('password_..'), false);
    assert.equal(isValidPassword('12345678'), false);
    assert.equal(isValidPassword('Pw1.....'), true);
    assert.equal(isValidPassword('Pw0rd'), false);
    assert.equal(isValidPassword('A1' + 'x'.repeat(127)), false);
    assert.equal(isValidPassword(''), false);
    assert.equal(isValidPassword(null), false);
    assert.equal(isValidPassword(undefined), false);
  });

  it('exposes the shared error message', () => {
    assert.equal(
      PASSWORD_ERROR,
      'Password must be 8-128 characters with a letter and a number, using only letters, numbers, dots and underscores'
    );
  });
});
