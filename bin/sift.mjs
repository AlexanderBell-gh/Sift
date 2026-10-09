#!/usr/bin/env node
// sift — zero-dep ops CLI. Never deploys (CI owns that on push to main).
// Safety: remote writes need BOTH --remote --yes. Local D1/API writes need
// nothing extra. Admin commands log in per run from env, nothing on disk.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PROD_API = 'https://siftapi.blackmesa.workers.dev';
const WRANGLER = ['exec', 'wrangler'];

const HELP = `Sift — CLI (never deploys; CI owns deploys)

Usage: pnpm sift <command> [args] [flags]
Flags: --api <url> (default $SIFT_API_BASE or prod) --local --remote --yes --json

  Run steps (CI calls these; extra args forwarded):
    install [args]                  pnpm install
    dev [args]                      Vite dev server (:5173)
    build                           tsc -b + vite build → dist/
    lint [args]                     oxlint over the repo
    test [file]                     node --test workers/lib/*.test.js
    audit [args]                    pnpm audit (default --audit-level=high)
    preview [args]                  vite preview of dist/
    gate                            CI mirror: audit + lint + build + test
    doctor                          toolchain, env keys, wrangler auth, secrets, D1

  db (wrangler D1; remote writes need BOTH --remote --yes):
    db migrate [--local|--remote --yes]
    db status [--local|--remote]             migration list
    db query <sql> [--local|--remote] [--json]
    db users [--search q] [--limit n] [--local|--remote]

  admin (needs SIFT_ADMIN_USER + SIFT_ADMIN_PASS; writes need --yes off-localhost):
    admin stats|users|trials [--search q] [--json]
    admin audit [--action a] [--search q] [--page n] [--json]
    admin trials-cleanup [--yes]              DELETE expired trials (write)
    admin user-role <id> <admin|user> --yes   change role (write)
    admin user-delete <id> --yes              delete user (write)
    admin rescore [--apply] [--limit n] [--yes]
    admin category "title" [--brand b] [--store s]
    admin resolve --store s --name n [--json] probe POST /api/import/resolve

  watchlist (read-only debug via admin token):
    watchlist names|offers [--json]

Env: SIFT_API_BASE, SIFT_ADMIN_USER, SIFT_ADMIN_PASS (never commit).
Remote writes need BOTH --remote --yes (db) or --yes (admin API).
Localhost API counts as local.`;

const argv = process.argv.slice(2);
const flags = { api: process.env.SIFT_API_BASE || PROD_API, local: false, remote: false, yes: false, json: false };
const rest = [];
// --flag value and --flag=value both accepted for string flags.
function takeStringFlag(name) {
  return (a, i) => {
    if (a === `--${name}`) { flags[name] = argv[++i.i]; return true; }
    if (a.startsWith(`--${name}=`)) { flags[name] = a.slice(name.length + 3); return true; }
    return false;
  };
}
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const box = { i };
  if (a === '--api') flags.api = argv[++i];
  else if (a === '--local') flags.local = true;
  else if (a === '--remote') flags.remote = true;
  else if (a === '--yes') flags.yes = true;
  else if (a === '--json') flags.json = true;
  else if (a === '--help' || a === '-h') { console.log(HELP); process.exit(0); }
  else if (a === '--apply') flags.apply = true;
  else if (takeStringFlag('brand')(a, box)) i = box.i;
  else if (takeStringFlag('store')(a, box)) i = box.i;
  else if (takeStringFlag('search')(a, box)) i = box.i;
  else if (takeStringFlag('limit')(a, box)) i = box.i;
  else if (takeStringFlag('action')(a, box)) i = box.i;
  else if (takeStringFlag('name')(a, box)) i = box.i;
  else if (takeStringFlag('page')(a, box)) i = box.i;
  else rest.push(a);
}
const [cmd, sub, ...args] = rest;

function fail(msg) { console.error(`sift: ${msg}`); process.exit(1); }
function isLocalApi() {
  try { const h = new URL(flags.api).hostname; return h === 'localhost' || h === '127.0.0.1'; }
  catch { return false; }
}
// Remote writes need the double flag. Local targets proceed freely.
function guardWrite(kind) {
  const remote = kind === 'api' ? !isLocalApi() : flags.remote;
  if (remote && !flags.yes) fail('remote write needs BOTH --remote --yes (db) or --yes (admin API)');
  if (kind === 'db' && !flags.remote && !flags.local) flags.local = true;
}
function run(bin, binArgs, opts = {}) {
  const r = spawnSync(bin, binArgs, { stdio: 'inherit', shell: false, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
function runOut(bin, binArgs) {
  const r = spawnSync(bin, binArgs, { encoding: 'utf8', shell: false });
  if (r.status !== 0) { if (r.stderr) process.stderr.write(r.stderr); process.exit(r.status ?? 1); }
  return (r.stdout || '').trim();
}

// ===== Run steps (CI calls these; gate delegates to them) =====

function installStep(passthru) { run('pnpm', ['install', ...passthru]); }
function devStep(passthru) { run('pnpm', ['run', 'dev', ...passthru]); }
function buildStep() { run('pnpm', ['run', 'build']); }
function lintStep(passthru) { run('pnpm', ['run', 'lint', ...passthru]); }
function testStep(passthru) {
  if (passthru.length) run('node', ['--test', ...passthru]);
  else run('pnpm', ['test']);
}
function auditStep(passthru) {
  run('pnpm', ['audit', ...(passthru.length ? passthru : ['--audit-level=high'])]);
}
function previewStep(passthru) { run('pnpm', ['run', 'preview', ...passthru]); }

function doctor() {
  let ok = true;
  const check = (name, fn) => {
    try { const v = fn(); console.log(`ok   ${name}${v ? ` (${v})` : ''}`); }
    catch (e) { ok = false; console.log(`FAIL ${name}: ${e.message}`); }
  };
  check('repo root', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    if (pkg.name !== 'sift') throw new Error('run from the Sift repo root');
    return `sift@${pkg.version}`;
  });
  check('node >= 24', () => {
    const major = Number(process.versions.node.split('.')[0]);
    if (major < 24) throw new Error(process.versions.node);
    return process.versions.node;
  });
  check('pnpm', () => runOut('pnpm', ['--version']));
  check('node_modules', () => { if (!existsSync('node_modules')) throw new Error('missing — run pnpm sift install'); return 'installed'; });
  check('.env keys', () => {
    const need = readFileSync('.env.example', 'utf8').split('\n')
      .map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('=')).map(l => l.split('=')[0]);
    const have = new Set(readFileSync('.env', 'utf8').split('\n').map(l => l.trim().split('=')[0]));
    const missing = need.filter(k => !have.has(k));
    if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
    return `${need.length} keys present`;
  });
  check('wrangler auth', () => {
    const out = runOut('pnpm', [...WRANGLER, 'whoami']);
    if (/not authenticated/i.test(out)) throw new Error('logged out — run wrangler login');
    return out.split('\n')[0];
  });
  check('worker secrets', () => {
    const out = runOut('pnpm', [...WRANGLER, 'secret', 'list', '--config', 'workers/wrangler.toml']);
    for (const name of ['JWT_SECRET', 'ADMIN_SECRET']) {
      if (!out.includes(name)) throw new Error(`missing secret: ${name} — see workers/wrangler.toml`);
    }
    return 'JWT_SECRET + ADMIN_SECRET present';
  });
  check('d1 database', () => {
    const out = runOut('pnpm', [...WRANGLER, 'd1', 'list']);
    if (!out.includes('sift')) throw new Error('sift database not found — run wrangler login');
    return 'sift found';
  });
  if (!ok) process.exit(1);
}

function gate() {
  auditStep([]);
  lintStep([]);
  buildStep();
  testStep([]);
}

function wranglerD1(extra) {
  const target = flags.remote ? ['--remote'] : ['--local'];
  return ['d1', 'execute', 'sift', ...target, '--config', 'workers/wrangler.toml', ...extra];
}

const READ_SQL = /^\s*(select|with|explain|pragma)\b/i;
// Quote a string literal for --command SQL (ops CLI only, never user input).
function sqlQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
function dbCmd() {
  if (sub === 'migrate') {
    guardWrite('db');
    const target = flags.remote ? ['--remote'] : ['--local'];
    run('pnpm', [...WRANGLER, 'd1', 'migrations', 'apply', 'sift', ...target, '--config', 'workers/wrangler.toml']);
  } else if (sub === 'status') {
    const target = flags.remote ? ['--remote'] : ['--local'];
    run('pnpm', [...WRANGLER, 'd1', 'migrations', 'list', 'sift', ...target, '--config', 'workers/wrangler.toml']);
  } else if (sub === 'query') {
    const sql = args.join(' ');
    if (!sql) fail('usage: pnpm sift db query <sql> [--local|--remote]');
    guardWrite('db');
    if (flags.remote && !READ_SQL.test(sql) && !flags.yes) fail('remote write needs BOTH --remote --yes');
    if (!flags.remote && !flags.local) flags.local = true;
    const extra = flags.json ? ['--json', '--command', sql] : ['--command', sql];
    run('pnpm', [...WRANGLER, ...wranglerD1(extra)]);
  } else if (sub === 'users') {
    if (!flags.remote && !flags.local) flags.local = true;
    const limit = Math.min(100, Math.max(1, parseInt(flags.limit) || 50));
    const where = flags.search
      ? `WHERE LOWER(username) LIKE ${sqlQuote(`%${flags.search.toLowerCase()}%`)} OR LOWER(email) LIKE ${sqlQuote(`%${flags.search.toLowerCase()}%`)}`
      : '';
    const out = runOut('pnpm', [...WRANGLER, ...wranglerD1([
      '--json', '--command',
      `SELECT id, username, email, role, is_trial, trial_expires_at FROM users ${where} ORDER BY created_at DESC LIMIT ${limit}`,
    ])]);
    const rows = JSON.parse(out)[0]?.results ?? [];
    console.table(rows.map(r => ({ ...r, trial_expires_at: r.trial_expires_at ?? '' })));
  } else fail(`unknown db subcommand: ${sub} (migrate|status|query|users)`);
}

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${flags.api}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) fail(`${method} ${path} → ${res.status}: ${data.error || 'request failed'}`);
  return data;
}
async function adminToken() {
  const username = process.env.SIFT_ADMIN_USER;
  const password = process.env.SIFT_ADMIN_PASS;
  if (!username || !password) fail('set SIFT_ADMIN_USER + SIFT_ADMIN_PASS (never commit)');
  const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
  if (data.user?.role !== 'admin') fail(`${username} is not an admin`);
  return data.token;
}
function print(data) {
  if (flags.json) { console.log(JSON.stringify(data, null, 2)); return; }
  if (Array.isArray(data)) console.table(data);
  else console.log(JSON.stringify(data, null, 2));
}

async function adminCmd() {
  if (sub === 'stats') print(await api('/api/admin/stats', { token: await adminToken() }));
  else if (sub === 'users') {
    const q = new URLSearchParams({ page: '1', limit: '50', ...(flags.search ? { search: flags.search } : {}) });
    const data = await api(`/api/admin/users?${q}`, { token: await adminToken() });
    print(flags.json ? data : data.users ?? data);
  } else if (sub === 'trials') {
    const q = new URLSearchParams({ page: '1', limit: '50', status: 'all' });
    const data = await api(`/api/admin/trials?${q}`, { token: await adminToken() });
    print(flags.json ? data : data.trials ?? data);
  } else if (sub === 'audit') {
    const q = new URLSearchParams({
      page: flags.page || '1', limit: '50',
      ...(flags.action ? { action: flags.action } : {}),
      ...(flags.search ? { search: flags.search } : {}),
    });
    const data = await api(`/api/admin/audit?${q}`, { token: await adminToken() });
    print(flags.json ? data : data.logs ?? data);
  } else if (sub === 'trials-cleanup') {
    guardWrite('api');
    print(await api('/api/admin/trials/cleanup', { method: 'DELETE', token: await adminToken() }));
  } else if (sub === 'user-role') {
    const [userId, role] = args;
    if (!userId || (role !== 'admin' && role !== 'user')) fail('usage: pnpm sift admin user-role <id> <admin|user> --yes');
    guardWrite('api');
    print(await api(`/api/admin/users/${userId}/role`, { method: 'PUT', token: await adminToken(), body: { role } }));
  } else if (sub === 'user-delete') {
    const [userId] = args;
    if (!userId) fail('usage: pnpm sift admin user-delete <id> --yes');
    guardWrite('api');
    const token = await adminToken();
    const me = await api('/api/auth/me', { token });
    if (me.id === userId) fail('refusing to delete your own admin account');
    print(await api(`/api/admin/users/${userId}`, { method: 'DELETE', token }));
  } else if (sub === 'rescore') {
    const apply = !!flags.apply;
    if (apply) guardWrite('api');
    print(await api('/api/admin/watchlist/rescore', {
      method: 'POST', token: await adminToken(),
      body: { dryRun: !apply, ...(flags.limit ? { limit: Number(flags.limit) } : {}) },
    }));
  } else if (sub === 'category') {
    const title = args.join(' ');
    if (!title) fail('usage: pnpm sift admin category "title" [--brand b] [--store s]');
    print(await api('/api/category/score', {
      method: 'POST', token: await adminToken(),
      body: { title, ...(flags.brand ? { brand: flags.brand } : {}), ...(flags.store ? { store: flags.store } : {}) },
    }));
  } else if (sub === 'resolve') {
    if (!flags.store || !flags.name) fail('usage: pnpm sift admin resolve --store s --name n');
    print(await api('/api/import/resolve', {
      method: 'POST', token: await adminToken(),
      body: { store: flags.store, name: flags.name },
    }));
  } else fail(`unknown admin subcommand: ${sub} (stats|users|trials|audit|trials-cleanup|user-role|user-delete|rescore|category|resolve)`);
}

async function watchlistCmd() {
  const token = await adminToken();
  if (sub === 'names') print(await api('/api/watchlist-names', { token }));
  else if (sub === 'offers') {
    const data = await api('/api/deal-offers', { token });
    print(flags.json ? data : data ?? data);
  }
  else fail(`unknown watchlist subcommand: ${sub} (names|offers)`);
}

async function main() {
  // Run steps take no subcommand: everything after cmd is passthrough.
  const passthru = [sub, ...args].filter(Boolean);
  if (cmd === 'doctor') doctor();
  else if (cmd === 'gate') gate();
  else if (cmd === 'install') installStep(passthru);
  else if (cmd === 'dev') devStep(passthru);
  else if (cmd === 'build') buildStep();
  else if (cmd === 'lint') lintStep(passthru);
  else if (cmd === 'test') testStep(passthru);
  else if (cmd === 'audit') auditStep(passthru);
  else if (cmd === 'preview') previewStep(passthru);
  else if (cmd === 'db') dbCmd();
  else if (cmd === 'admin') await adminCmd();
  else if (cmd === 'watchlist') await watchlistCmd();
  else { console.log(HELP); process.exit(cmd ? 1 : 0); }
}
main().catch(e => fail(e.message));
