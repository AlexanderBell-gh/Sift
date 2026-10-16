import type { Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { applyTunePatch, tuneCase } from './vite-plugin-dev-tune.ts';

// Dev-only test writer: appends new it() cases to the repo's *.test files
// from the /dev/tests page. Wired with apply: 'serve' so no endpoint
// exists in prod builds. Append-only: no edit, no delete.
export const DEV_TEST_FILES = [
  'workers/lib/category.test.js',
  'workers/lib/validate.test.js',
  'workers/lib/resolve.test.js',
  'src/lib/pricing.test.ts',
  'src/lib/utils.test.ts',
] as const;

export type DevTestFile = (typeof DEV_TEST_FILES)[number];

export interface ParsedCase {
  name: string;
  line: number;
}

export interface ParsedSuite {
  name: string;
  startLine: number;
  endLine: number;
  cases: ParsedCase[];
}

interface ScanLine {
  depthBefore: number;
  delta: number;
  code: string;
  text: string;
}

type Ctx = { t: 'q'; q: string } | { t: 'tpl' } | { t: 'expr' };

// Char scanner: brace depth per line while skipping strings, template
// bodies, and comments (with ${} support inside templates). Regex literals
// are not handled — none exist in the test files; insertion verifies the
// anchor line before writing and aborts on mismatch.
function scanLines(source: string): ScanLine[] {
  const out: ScanLine[] = [];
  const stack: Ctx[] = [];
  const exprDepths: number[] = [];
  let inBlock = false;
  let depth = 0;
  for (const raw of source.split('\n')) {
    const depthBefore = depth;
    let delta = 0;
    let code = '';
    let text = '';
    let j = 0;
    while (j < raw.length) {
      const c = raw[j] ?? '';
      const n = raw[j + 1] ?? '';
      const top = stack[stack.length - 1];
      if (inBlock) {
        if (c === '*' && n === '/') { inBlock = false; j += 2; continue; }
        j += 1;
        continue;
      }
      if (top?.t === 'q') {
        text += c;
        if (c === '\\') { text += n; j += 2; continue; }
        if (c === top.q) stack.pop();
        j += 1;
        continue;
      }
      if (top?.t === 'tpl') {
        if (c === '\\') { text += c + n; j += 2; continue; }
        if (c === '`') { text += c; stack.pop(); j += 1; continue; }
        if (c === '$' && n === '{') {
          stack.push({ t: 'expr' });
          depth += 1;
          delta += 1;
          exprDepths.push(depth);
          code += '{';
          text += '${';
          j += 2;
          continue;
        }
        text += c;
        j += 1;
        continue;
      }
      if (c === '/' && n === '/') break;
      if (c === '/' && n === '*') { inBlock = true; j += 2; continue; }
      if (c === "'" || c === '"') { stack.push({ t: 'q', q: c }); text += c; j += 1; continue; }
      if (c === '`') { stack.push({ t: 'tpl' }); text += c; j += 1; continue; }
      if (c === '{') { depth += 1; delta += 1; code += c; text += c; j += 1; continue; }
      if (c === '}') {
        depth -= 1;
        delta -= 1;
        code += c;
        text += c;
        const want = exprDepths[exprDepths.length - 1];
        if (want !== undefined && depth < want) {
          exprDepths.pop();
          const popped = stack.pop();
          if (popped?.t !== 'expr') throw new Error('scanner state drift');
        }
        j += 1;
        continue;
      }
      code += c;
      text += c;
      j += 1;
    }
    out.push({ depthBefore, delta, code, text });
  }
  return out;
}

// First string-literal argument of a describe(/it( call on one line.
// Runs on comment-stripped text (strings intact), not the brace-only code.
function firstStringArg(text: string, kw: 'describe' | 'it'): string | null {
  const m = new RegExp(`\\b${kw}\\s*\\(\\s*('([^'\\\\]|\\\\.)*'|"([^"\\\\]|\\\\.)*"|\`([^\`\\\\]|\\\\.)*\`)`).exec(text);
  const raw = m?.[1];
  if (!raw) return null;
  return raw.slice(1, -1).replace(/\\(.)/g, '$1');
}

export function parseSuites(source: string): ParsedSuite[] {
  const lines = scanLines(source);
  const suites: ParsedSuite[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const name = firstStringArg(line.text, 'describe');
    if (name === null) continue;
    // Suite opens at the first '{' at/after this line; it closes where
    // depth returns to the pre-line depth.
    const base = line.depthBefore;
    let opened = line.delta > 0;
    let end = -1;
    for (let k = opened ? i : i + 1; k < lines.length; k++) {
      const l = lines[k];
      if (!l) continue;
      if (!opened) {
        if (l.delta > 0) opened = true;
        continue;
      }
      if (l.depthBefore + l.delta === base) { end = k; break; }
    }
    if (!opened || end === -1) throw new Error(`could not find end of suite '${name}'`);
    const anchor = lines[end]?.text.trim() ?? '';
    if (!/^\}\)\s*;?$/.test(anchor)) throw new Error(`suite '${name}' does not end cleanly at line ${end + 1}`);
    const cases: ParsedCase[] = [];
    for (let k = i + 1; k < end; k++) {
      const l = lines[k];
      if (!l) continue;
      const cname = firstStringArg(l.text, 'it');
      if (cname !== null) cases.push({ name: cname, line: k + 1 });
    }
    suites.push({ name, startLine: i + 1, endLine: end + 1, cases });
  }
  return suites;
}

const BODY_BLOCK = /\b(import|require|process|fetch|eval|Function|enum|namespace|__proto__|constructor|globalThis|window|document)\b/;

export interface AppendInput {
  file: string;
  suite: string;
  name: string;
  body: string;
}

function fail(msg: string): never {
  throw new Error(msg);
}

export function buildCaseLines(input: AppendInput, source: string): { lines: string[]; atLine: number } {
  const file = input.file as DevTestFile;
  if (!(DEV_TEST_FILES as readonly string[]).includes(file)) fail(`unknown test file '${input.file}'`);
  const name = input.name.trim();
  if (!name) fail('case name is required');
  if (name.length > 200 || name.includes('\n')) fail('case name must be one line under 200 chars');
  const body = input.body.replace(/\s+$/, '');
  if (!body) fail('case body is required');
  if (body.length > 2000) fail('case body over 2000 chars — split it up');
  if (BODY_BLOCK.test(body)) fail('body uses a blocked pattern (imports, globals, enums)');
  const suites = parseSuites(source);
  const hits = suites.filter((s) => s.name === input.suite);
  if (hits.length === 0) fail(`suite '${input.suite}' not found`);
  if (hits.length > 1) fail(`suite '${input.suite}' appears ${hits.length}x — refusing`);
  const suite = hits[0] as ParsedSuite;
  if (suite.cases.some((c) => c.name === name)) fail(`case '${name}' already exists in '${suite.name}'`);
  const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const bodyLines = body.split('\n').map((l) => `    ${l}`.replace(/\s+$/, ''));
  const lines = ['', `  it('${escaped}', () => {`, ...bodyLines, '  });'];
  return { lines, atLine: suite.endLine };
}

export function appendCase(root: string, input: AppendInput, dryRun: boolean): { line: number; preview: string[] } {
  const abs = resolve(root, input.file);
  const raw = readFileSync(abs, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const { lines, atLine } = buildCaseLines(input, raw);
  const fileLines = raw.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  const preview = [...fileLines.slice(Math.max(0, atLine - 4), atLine - 1), ...lines];
  if (!dryRun) {
    fileLines.splice(atLine - 1, 0, ...lines);
    writeFileSync(abs, fileLines.join(eol));
  }
  return { line: atLine + 1, preview };
}

function send(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function devTestsWriter(root = process.cwd()): Plugin {
  return {
    name: 'dev-tests-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/tests/', (req, res, next) => {
        // Mounted: connect strips '/__dev/tests', so match the remainder.
        const url = new URL(req.url ?? '/', 'http://local');
        try {
          if (req.method === 'GET' && url.pathname === '/suites') {
            const file = url.searchParams.get('file') ?? '';
            if (!(DEV_TEST_FILES as readonly string[]).includes(file)) fail(`unknown test file '${file}'`);
            const source = readFileSync(resolve(root, file), 'utf8');
            send(res, 200, { ok: true, suites: parseSuites(source) });
            return;
          }
          if (req.method === 'POST' && url.pathname === '/append') {
            let raw = '';
            req.on('data', (c: Buffer) => { raw += c; });
            req.on('end', () => {
              try {
                const input = JSON.parse(raw) as AppendInput;
                const dryRun = url.searchParams.get('dryRun') === '1';
                const r = appendCase(root, input, dryRun);
                send(res, 200, { ok: true, dryRun, ...r });
              } catch (e) {
                send(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) });
              }
            });
            return;
          }
          if (req.method === 'POST' && (url.pathname === '/tune' || url.pathname === '/apply-fix')) {
            let raw = '';
            req.on('data', (c: Buffer) => { raw += c; });
            req.on('end', () => {
              (async () => {
                try {
                  const input = JSON.parse(raw) as {
                    file: string;
                    suite: string;
                    name: string;
                    patch?: { op: 'alias' | 'term'; category: string; store?: string; leaf?: string; term?: string };
                  };
                  if (url.pathname === '/tune') {
                    const r = await tuneCase(root, { file: input.file, suite: input.suite, name: input.name });
                    send(res, 200, { ok: true, ...r });
                  } else {
                    if (!input.patch) fail('apply-fix needs a patch');
                    const r = await applyTunePatch(root, { file: input.file, suite: input.suite, name: input.name }, input.patch);
                    send(res, 200, { ok: true, ...r });
                  }
                } catch (e) {
                  send(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) });
                }
              })();
            });
            return;
          }
          next();
        } catch (e) {
          send(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      });
    },
  };
}
