// Browser shim for 'node:assert/strict' (dev-only, wired via
// resolve.alias in vite.config.ts). Covers only what the repo suites use:
// equal, notEqual, deepEqual, ok. Error carries actual/expected so the dev
// test page can render a diff.
export class AssertError extends Error {
  actual: unknown;
  expected: unknown;
  constructor(message: string, actual: unknown, expected: unknown) {
    super(message);
    this.name = 'AssertError';
    this.actual = actual;
    this.expected = expected;
  }
}

function fmt(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

export function equal(actual: unknown, expected: unknown, message?: string): void {
  if (!Object.is(actual, expected)) {
    throw new AssertError(message ?? `Expected ${fmt(actual)} to equal ${fmt(expected)}`, actual, expected);
  }
}

export function notEqual(actual: unknown, expected: unknown, message?: string): void {
  if (Object.is(actual, expected)) {
    throw new AssertError(message ?? `Expected ${fmt(actual)} to not equal ${fmt(expected)}`, actual, expected);
  }
}

export function ok(value: unknown, message?: string): void {
  if (!value) throw new AssertError(message ?? `Expected a truthy value, got ${fmt(value)}`, value, true);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function deepStrict(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepStrict(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.hasOwn(b, k) && deepStrict(a[k], b[k]));
  }
  return false;
}

export function deepEqual(actual: unknown, expected: unknown, message?: string): void {
  if (!deepStrict(actual, expected)) {
    throw new AssertError(
      message ?? `Expected ${fmt(actual)} to deep-equal ${fmt(expected)}`,
      actual,
      expected,
    );
  }
}

const assert = { equal, notEqual, ok, deepEqual };
export default assert;
