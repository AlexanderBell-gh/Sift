// Browser shim for 'node:test' (dev-only, wired via resolve.alias in
// vite.config.ts). Collects describe/it cases so the dev test page can run
// the same *.test.js/ts files that `node --test` runs in CI.
export type TestFn = () => void | Promise<void>;

export interface CollectedCase {
  name: string;
  fn: TestFn;
}

export interface CollectedSuite {
  name: string;
  cases: CollectedCase[];
}

const suites: CollectedSuite[] = [];
const stack: CollectedSuite[] = [];

export function describe(name: string, fn: () => void): void {
  const suite: CollectedSuite = { name, cases: [] };
  suites.push(suite);
  stack.push(suite);
  try {
    fn();
  } finally {
    stack.pop();
  }
}

export function it(name: string, fn: TestFn): void {
  const top = stack[stack.length - 1];
  if (!top) throw new Error(`it('${name}') called outside describe()`);
  top.cases.push({ name, fn });
}

// Drain collected suites (also clears stale ones before a fresh import).
export function takeSuites(): CollectedSuite[] {
  return suites.splice(0, suites.length);
}
