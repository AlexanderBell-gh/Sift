// Dev-only test runner (imported only by DevTestsPage, which is DEV-gated
// and lazy-split, so this never rides into the guest chunk). Dynamically
// imports the same *.test.js/ts files CI runs via `node --test`; the
// vite alias for 'node:test' / 'node:assert/strict' makes those imports
// collect into the browser shims instead of executing.
import { takeSuites } from './dev-test-shims/node-test';
import { AssertError } from './dev-test-shims/node-assert';

export interface TestModule {
  file: string;
  label: string;
  url: string;
  importLine: string;
  namePlaceholder: string;
  bodyPlaceholder: string;
}

export interface CaseResult {
  suite: string;
  name: string;
  pass: boolean;
  ms: number;
  message?: string;
  actual?: string;
  expected?: string;
}

export interface FileResult {
  file: string;
  cases: CaseResult[];
  ms: number;
  loadError?: string;
}

export const TEST_MODULES: TestModule[] = [
  {
    file: 'workers/lib/category.test.js',
    label: 'Category scorer',
    url: '/workers/lib/category.test.js',
    importLine: "import { scoreCategory } from './category.js';",
    namePlaceholder: 'Garden Peas 1kg -> Frozen',
    bodyPlaceholder: `const r = scoreCategory(signals({
  breadcrumb_raw: ['Frozen', 'Peas'],
  title: 'Garden Peas 1kg',
}));
assert.equal(r.category, 'Frozen');`,
  },
  {
    file: 'workers/lib/validate.test.js',
    label: 'Username/password allowlists',
    url: '/workers/lib/validate.test.js',
    importLine: "import { isValidUsername } from './validate.js';",
    namePlaceholder: 'accepts mixed-case alphanumerics',
    bodyPlaceholder: "assert.equal(isValidUsername('Bob99'), true);",
  },
  {
    file: 'workers/lib/resolve.test.js',
    label: 'Import-resolve matching',
    url: '/workers/lib/resolve.test.js',
    importLine: "import { normalizeStore } from './resolve.js';",
    namePlaceholder: 'accepts a store plus name pair',
    bodyPlaceholder: `const r = validateResolveInput({ store: 'Tesco', name: 'milk' });
assert.equal(r.ok, true);
assert.equal(r.store, 'Tesco');`,
  },
  {
    file: 'src/lib/pricing.test.ts',
    label: 'Multibuy engine',
    url: '/src/lib/pricing.test.ts',
    importLine: "import { parseOfferDeal } from './pricing.ts';",
    namePlaceholder: '2 for £4 keeps set price',
    bodyPlaceholder: "assert.deepEqual(parseOfferDeal('2 for £4'), { take: 2, payQty: 2, payPrice: 4 });",
  },
  {
    file: 'src/lib/utils.test.ts',
    label: 'Date/deal helpers',
    url: '/src/lib/utils.test.ts',
    importLine: "import { isOfferExpired } from './utils.ts';",
    namePlaceholder: 'strips trailing loyalty suffix',
    bodyPlaceholder: "assert.equal(formatDealShort('Meal Deal for £3.50 with Clubcard'), 'Meal Deal');",
  },
];

export function caseTemplate(mod: TestModule): string {
  return `// ${mod.file} — paste a new case inside the matching describe(), save, Re-run.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
${mod.importLine}

describe('<suite>', () => {
  it('<does what>', () => {
    assert.equal(actual, expected);
  });
});
`;
}

function fmtValue(v: unknown): string {
  try {
    const s = JSON.stringify(v, null, 2);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

export async function runModule(mod: TestModule, bust: number): Promise<FileResult> {  takeSuites(); // drain anything stale before a fresh import
  const t0 = performance.now();
  try {
    await import(/* @vite-ignore */ `${mod.url}?t=${bust}`);
  } catch (e) {
    return {
      file: mod.file,
      cases: [],
      ms: Math.round(performance.now() - t0),
      loadError: e instanceof Error ? e.message : String(e),
    };
  }
  const collected = takeSuites();
  const cases: CaseResult[] = [];
  for (const suite of collected) {
    for (const c of suite.cases) {
      const start = performance.now();
      try {
        await c.fn();
        cases.push({ suite: suite.name, name: c.name, pass: true, ms: Math.round(performance.now() - start) });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        cases.push({
          suite: suite.name,
          name: c.name,
          pass: false,
          ms: Math.round(performance.now() - start),
          message,
          actual: e instanceof AssertError ? fmtValue(e.actual) : undefined,
          expected: e instanceof AssertError ? fmtValue(e.expected) : undefined,
        });
      }
    }
  }
  return { file: mod.file, cases, ms: Math.round(performance.now() - t0) };
}

export interface SuiteInfo {
  name: string;
  startLine: number;
  endLine: number;
  cases: { name: string; line: number }[];
}

export interface AppendResult {
  line: number;
  preview: string[];
}

export async function fetchSuites(mod: TestModule): Promise<SuiteInfo[]> {
  const res = await fetch(`/__dev/tests/suites?file=${encodeURIComponent(mod.file)}`);
  const data = (await res.json()) as { ok: boolean; suites?: SuiteInfo[]; error?: string };
  if (!res.ok || !data.ok || !data.suites) throw new Error(data.error ?? `suites request failed (${res.status})`);
  return data.suites;
}

export async function appendCase(
  mod: TestModule,
  input: { suite: string; name: string; body: string },
  dryRun = false,
): Promise<AppendResult> {
  const res = await fetch(`/__dev/tests/append${dryRun ? '?dryRun=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: mod.file, ...input }),
  });
  const data = (await res.json()) as { ok: boolean; line?: number; preview?: string[]; error?: string };
  if (!res.ok || !data.ok || data.line === undefined || !data.preview) {
    throw new Error(data.error ?? `append request failed (${res.status})`);
  }
  return { line: data.line, preview: data.preview };
}

export interface TunePatch {
  op: 'alias' | 'term';
  category: string;
  store?: string;
  leaf?: string;
  term?: string;
}

export interface TuneWin {
  patch: TunePatch;
  insertLines: string[];
  entryLine: number;
  ran: number;
  failuresLeft: string[];
}

export function describePatch(p: TunePatch): string {
  if (p.op === 'alias') {
    return `Alias ${p.store ? `${p.store} ` : '(any store) '}leaf '${p.leaf ?? ''}' → ${p.category}`;
  }
  return `Keyword '${p.term ?? ''}' → ${p.category} aisle terms`;
}

export async function proposeFix(mod: TestModule, suite: string, name: string): Promise<TuneWin> {
  const res = await fetch('/__dev/tests/tune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: mod.file, suite, name }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string } & Partial<TuneWin>;
  if (!res.ok || !data.ok || !data.patch || !data.insertLines || data.entryLine === undefined) {
    throw new Error(data.error ?? `tune request failed (${res.status})`);
  }
  return { patch: data.patch, insertLines: data.insertLines, entryLine: data.entryLine, ran: data.ran ?? 0, failuresLeft: data.failuresLeft ?? [] };
}

export async function applyFix(mod: TestModule, suite: string, name: string, patch: TunePatch): Promise<{ line: number }> {
  const res = await fetch('/__dev/tests/apply-fix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: mod.file, suite, name, patch }),
  });
  const data = (await res.json()) as { ok: boolean; line?: number; error?: string };
  if (!res.ok || !data.ok || data.line === undefined) {
    throw new Error(data.error ?? `apply-fix request failed (${res.status})`);
  }
  return { line: data.line };
}
