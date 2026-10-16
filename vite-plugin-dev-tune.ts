import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parseSuites } from './vite-plugin-dev-tests.ts';

const execFileAsync = promisify(execFile);

// Dev-only scorer tuner (serve-only, category scorer only). Tries small
// keyword/alias patches against temp copies of the scorer, running the
// real category suite each time. First patch that fixes the target with
// zero new failures wins. Nothing writes without an explicit apply call.
export const TUNE_FILE = 'workers/lib/category.test.js';
const SCORER_FILE = 'workers/lib/category.js';

export interface TunePatch {
  op: 'alias' | 'term';
  category: string;
  store?: string;
  leaf?: string;
  term?: string;
}

export interface TuneTarget {
  file: string;
  suite: string;
  name: string;
}

interface TrialOutcome {
  failed: string[];
  passed: string[];
}

const QUANTITY = new Set([
  'g', 'kg', 'mg', 'ml', 'l', 'litre', 'litres', 'ltr', 'pint', 'pints',
  'pack', 'packs', 'oz', 'fl', 'cl',
]);

const MODIFIERS = new Set([
  'berry', 'berries', 'blueberry', 'blueberries', 'strawberry',
  'strawberries', 'raspberry', 'raspberries', 'blackberry', 'blackberries',
  'lemon', 'lime', 'toffee', 'vanilla', 'caramel',
]);

function fail(msg: string): never {
  throw new Error(msg);
}

function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (a === `${b}s` || b === `${a}s`) return true;
  if (a === `${b}es` || b === `${a}es`) return true;
  if (b.endsWith('y') && a === `${b.slice(0, -1)}ies`) return true;
  if (a.endsWith('y') && b === `${a.slice(0, -1)}ies`) return true;
  return false;
}

function escQ(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Collect single-quoted literals from a `  Category: [` block.
export function extractTerms(source: string, category: string): string[] {
  const anchor = `\n  ${category}: [`;
  const start = source.indexOf(anchor);
  if (start === -1) return [];
  const end = source.indexOf('\n  ],', start);
  if (end === -1) return [];
  const terms: string[] = [];
  for (const m of source.slice(start, end).matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
    const raw = m[1] ?? '';
    terms.push(raw.replace(/\\(.)/g, '$1'));
  }
  return terms;
}

function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildCandidates(
  signals: Record<string, unknown>,
  expected: string,
  termsByCat: Map<string, Set<string>>,
): TunePatch[] {
  const out: TunePatch[] = [];
  const leaf = String(signals.breadcrumb_leaf ?? '').toLowerCase().trim();
  const store = String(signals.store_id ?? signals.store ?? '').toLowerCase().trim();
  const words = [...new Set([...leaf.split(/\s+/), ...titleWords(String(signals.title ?? ''))])];
  if (leaf) {
    if (store) out.push({ op: 'alias', category: expected, store, leaf });
    out.push({ op: 'alias', category: expected, leaf });
    if (!termsByCat.get(expected)?.has(leaf)) out.push({ op: 'term', category: expected, term: leaf });
  }
  const allTerms = [...termsByCat.values()].flatMap((s) => [...s]).map((t) => t.toLowerCase());
  for (const w of words) {
    if (w.length < 3 || /^\d/.test(w)) continue;
    if (QUANTITY.has(w) || MODIFIERS.has(w)) continue;
    if (termsByCat.get(expected)?.has(w)) continue;
    if (allTerms.some((t) => sameWord(t, w))) continue;
    out.push({ op: 'term', category: expected, term: w });
    if (out.length >= 12) break;
  }
  return out.slice(0, 12);
}

export interface Insertion {
  text: string;
  entryLine: number;
}

export function buildInsertion(source: string, patch: TunePatch, caseName: string): Insertion {
  const note = `// tuner: '${caseName.replace(/'/g, '')}' (${today()})`;
  if (patch.op === 'alias') {
    if (!patch.leaf) fail('alias patch needs a leaf');
    const anchor = 'const STORE_AISLE_ALIASES = [';
    const ai = source.indexOf(anchor);
    if (ai === -1) fail('alias table anchor not found');
    const close = source.indexOf('\n];', ai);
    if (close === -1) fail('alias table end not found');
    const entry = patch.store
      ? `{ store: '${escQ(patch.store)}', leaf: '${escQ(patch.leaf)}', category: '${escQ(patch.category)}' },`
      : `{ leaf: '${escQ(patch.leaf)}', category: '${escQ(patch.category)}' },`;
    const entryLine = source.slice(0, close).split('\n').length + 1;
    return { text: `\n  ${note}\n  ${entry}`, entryLine };
  }
  if (!patch.term) fail('term patch needs a term');
  const anchor = `\n  ${patch.category}: [`;
  const ai = source.indexOf(anchor);
  if (ai === -1) fail(`term list anchor not found for '${patch.category}'`);
  const lineEnd = source.indexOf('\n', ai + 1);
  if (lineEnd === -1) fail('term list anchor malformed');
  const entryLine = source.slice(0, lineEnd).split('\n').length + 2;
  return { text: `\n    ${note}\n    '${escQ(patch.term)}',`, entryLine };
}

function applyInsertion(source: string, patch: TunePatch, caseName: string): { source: string; entryLine: number } {
  const ins = buildInsertion(source, patch, caseName);
  let at: number;
  if (patch.op === 'alias') {
    const ai = source.indexOf('const STORE_AISLE_ALIASES = [');
    at = source.indexOf('\n];', ai);
  } else {
    const anchor = `\n  ${patch.category}: [`;
    at = source.indexOf('\n', source.indexOf(anchor) + 1);
  }
  return { source: source.slice(0, at) + ins.text + source.slice(at), entryLine: ins.entryLine };
}

function parseTap(out: string): TrialOutcome {
  const failed: string[] = [];
  const passed: string[] = [];
  for (const line of out.split('\n')) {
    const m = /^(not )?ok \d+ - (.+?)( \(\d[\d.]*ms\))?$/.exec(line.trim());
    if (!m) continue;
    const name = (m[2] ?? '').trim();
    if (m[1]) failed.push(name);
    else passed.push(name);
  }
  return { failed, passed };
}

async function trialRun(categorySrc: string, testFileAbs: string): Promise<TrialOutcome> {
  const dir = await mkdtemp(join(tmpdir(), 'sift-tune-'));
  try {
    await writeFile(join(dir, 'category.js'), categorySrc);
    await copyFile(testFileAbs, join(dir, 'category.test.js'));
    try {
      const { stdout } = await execFileAsync(
        process.execPath,
        ['--test', '--test-reporter=tap', join(dir, 'category.test.js')],
        { timeout: 30000 },
      );
      return parseTap(stdout);
    } catch (e) {
      const err = e as { stdout?: string };
      return parseTap(err.stdout ?? '');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Balanced-paren slice starting at the opening paren index.
function parenSlice(text: string, openIdx: number): string | null {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = openIdx; i < text.length; i++) {
    const c = text[i] ?? '';
    if (inStr) {
      if (c === '\\') { i += 1; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl;
      continue;
    }
    if (c === '(') depth += 1;
    if (c === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(openIdx + 1, i);
    }
  }
  return null;
}

function extractSignals(body: string): Record<string, unknown> {
  const call = body.indexOf('scoreCategory(');
  if (call === -1) fail('no scoreCategory() call in case body');
  const arg = parenSlice(body, body.indexOf('(', call));
  if (arg === null) fail('could not parse scoreCategory() argument');
  const sigCall = arg.indexOf('signals(');
  const objText = sigCall === -1 ? arg : parenSlice(arg, arg.indexOf('(', sigCall));
  if (objText === null || !objText.trim().startsWith('{')) fail('case must call scoreCategory(signals({...})) or scoreCategory({...})');
  try {
    const v = new Function(`return (${objText})`)() as unknown;
    if (typeof v !== 'object' || v === null) fail('signals did not evaluate to an object');
    return v as Record<string, unknown>;
  } catch {
    fail('signals object did not evaluate (keep it plain data)');
  }
}

function extractExpected(body: string): string {
  const m = /assert\.(?:equal|deepEqual)\(\s*\w+\.category\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/.exec(body);
  if (!m?.[1]) fail("no assert.equal(<r>.category, '<cat>') in case body");
  return m[1].replace(/\\(.)/g, '$1');
}

export interface TuneWin {
  patch: TunePatch;
  insertLines: string[];
  entryLine: number;
  ran: number;
  failuresLeft: string[];
}

export async function tuneCase(root: string, target: TuneTarget): Promise<TuneWin> {
  if (target.file !== TUNE_FILE) fail('tuner handles the category scorer suite only');
  const testAbs = resolve(root, target.file);
  const testSrc = readFileSync(testAbs, 'utf8');
  const suites = parseSuites(testSrc);
  const hits = suites.filter((s) => s.name === target.suite);
  if (hits.length !== 1) fail(`suite '${target.suite}' not found exactly once`);
  const suite = hits[0];
  if (!suite) fail('suite missing');
  const lines = testSrc.split('\n');
  const idx = suite.cases.findIndex((c) => c.name === target.name);
  if (idx === -1) fail(`case '${target.name}' not in suite`);
  const start = suite.cases[idx]?.line ?? 0;
  const nextStart = idx + 1 < suite.cases.length ? (suite.cases[idx + 1]?.line ?? suite.endLine) : suite.endLine;
  const body = lines.slice(start - 1, nextStart - 1).join('\n');
  const signals = extractSignals(body);
  const expected = extractExpected(body);

  const scorerSrc = readFileSync(resolve(root, SCORER_FILE), 'utf8');
  const cats = ['Chilled', 'Snacks', 'Beverages', 'Produce', 'Frozen', 'Bakery', 'Food Cupboard', 'Other'];
  const termsByCat = new Map<string, Set<string>>();
  for (const c of cats) termsByCat.set(c, new Set(extractTerms(scorerSrc, c)));
  const patches = buildCandidates(signals, expected, termsByCat);
  if (patches.length === 0) fail('no patch candidates (signals carry no usable words)');

  const baseline = await trialRun(scorerSrc, testAbs);
  if (!baseline.failed.includes(target.name)) fail('target already passes — nothing to tune');
  const baselineOthers = new Set(baseline.failed.filter((n) => n !== target.name));

  for (const patch of patches) {
    const { source } = applyInsertion(scorerSrc, patch, target.name);
    const trial = await trialRun(source, testAbs);
    if (trial.failed.includes(target.name)) continue;
    if (trial.failed.some((n) => !baselineOthers.has(n))) continue;
    const ins = buildInsertion(scorerSrc, patch, target.name);
    return {
      patch,
      insertLines: ins.text.split('\n').filter((l) => l.length > 0),
      entryLine: ins.entryLine,
      ran: trial.passed.length + trial.failed.length,
      failuresLeft: trial.failed,
    };
  }
  fail('no clean patch: every keyword/alias try either missed or regressed another case — hand-fix category.js');
}

export async function applyTunePatch(root: string, target: TuneTarget, patch: TunePatch): Promise<{ line: number }> {
  if (target.file !== TUNE_FILE) fail('tuner handles the category scorer suite only');
  const scorerAbs = resolve(root, SCORER_FILE);
  const raw = readFileSync(scorerAbs, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const norm = raw.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l)).join('\n');
  const { source, entryLine } = applyInsertion(norm, patch, target.name);
  // Re-verify on current content before writing.
  const testAbs = resolve(root, target.file);
  const baseline = await trialRun(norm, testAbs);
  const trial = await trialRun(source, testAbs);
  const baselineOthers = new Set(baseline.failed.filter((n) => n !== target.name));
  if (trial.failed.includes(target.name)) fail('patch no longer fixes the target — file changed underneath');
  if (trial.failed.some((n) => !baselineOthers.has(n))) fail('patch now regresses another case — file changed underneath');
  writeFileSync(scorerAbs, source.split('\n').join(eol));
  return { line: entryLine };
}
