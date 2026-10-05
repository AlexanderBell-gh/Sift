#!/usr/bin/env node
// sift — zero-dep ops CLI. Never deploys (CI owns that on push to main).
// Safety: remote writes need BOTH --remote --yes. Local D1/API writes need
// nothing extra. Admin commands log in per run from env, nothing on disk.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PROD_API = 'https://siftapi.blackmesa.workers.dev';
const WRANGLER = ['exec', 'wrangler'];

const HELP = `sift — ops CLI (never deploys; CI owns deploys)

Usage: pnpm sift <command> [args] [flags]
Flags: --api <url> (default $SIFT_API_BASE or prod) --local --remote --yes --json

  doctor                          toolchain, env keys, wrangler auth
  gate                            CI mirror: audit + lint + build + test
  db migrate [--local|--remote --yes]
  db query <sql> [--local|--remote]        remote non-SELECT needs --yes
  db users [--local|--remote]              read-only user list
  admin stats|users|trials [--search q]     read-only admin reads
  admin trials-cleanup [--yes]              DELETE expired trials (write)
  admin rescore [--apply] [--limit n] [--yes]
  admin category "title" [--brand b] [--store s]

Env: SIFT_API_BASE, SIFT_ADMIN_USER, SIFT_ADMIN_PASS (never commit).
Remote writes need BOTH --remote --yes (db) or --yes against a
non-localhost API (admin). Localhost API counts as local.`;

const argv = process.argv.slice(2);
const flags = { api: process.env.SIFT_API_BASE || PROD_API, local: false, remote: false, yes: false, json: false };
const rest = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--api') flags.api = argv[++i];
  else if (a === '--local') flags.local = true;
  else if (a === '--remote') flags.remote = true;
  else if (a === '--yes') flags.yes = true;
  else if (a === '--json') flags.json = true;
  else if (a === '--help' || a === '-h') { console.log(HELP); process.exit(0); }
  else if (a.startsWith('--brand=')) flags.brand = a.slice(8);
  else if (a === '--brand') flags.brand = argv[++i];
  else if (a.startsWith('--store=')) flags.store = a.slice(8);
  else if (a === '--store') flags.store = argv[++i];
  else if (a.startsWith('--search=')) flags.search = a.slice(9);
  else if (a === '--search') flags.search = argv[++i];
  else if (a.startsWith('--limit=')) flags.limit = a.slice(8);
  else if (a === '--limit') flags.limit = argv[++i];
  else if (a === '--apply') flags.apply = true;
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
  check('node_modules', () => { if (!existsSync('node_modules')) throw new Error('missing — run pnpm install'); return 'installed'; });
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
  if (!ok) process.exit(1);
}

function gate() {
  run('pnpm', ['audit', '--audit-level=high']);
  run('pnpm', ['run', 'lint']);
  run('pnpm', ['run', 'build']);
  run('pnpm', ['test']);
}

function wranglerD1(extra) {
  const target = flags.remote ? ['--remote'] : ['--local'];
  return ['d1', 'execute', 'sift', ...target, '--config', 'workers/wrangler.toml', ...extra];
}

const READ_SQL = /^\s*(select|with|explain|pragma)\b/i;
function dbCmd() {
  if (sub === 'migrate') {
    guardWrite('db');
    const target = flags.remote ? ['--remote'] : ['--local'];
    run('pnpm', [...WRANGLER, 'd1', 'migrations', 'apply', 'sift', ...target, '--config', 'workers/wrangler.toml']);
  } else if (sub === 'query') {
    const sql = args.join(' ');
    if (!sql) fail('usage: pnpm sift db query <sql> [--local|--remote]');
    guardWrite('db');
    if (flags.remote && !READ_SQL.test(sql) && !flags.yes) fail('remote write needs BOTH --remote --yes');
    if (!flags.remote && !flags.local) flags.local = true;
    run('pnpm', [...WRANGLER, ...wranglerD1(['--command', sql])]);
  } else if (sub === 'users') {
    if (!flags.remote && !flags.local) flags.local = true;
    const out = runOut('pnpm', [...WRANGLER, ...wranglerD1([
      '--json', '--command',
      'SELECT id, username, email, role, is_trial, trial_expires_at FROM users ORDER BY created_at DESC LIMIT 50',
    ])]);
    const rows = JSON.parse(out)[0]?.results ?? [];
    console.table(rows.map(r => ({ ...r, trial_expires_at: r.trial_expires_at ?? '' })));
  } else fail(`unknown db subcommand: ${sub} (migrate|query|users)`);
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
  } else if (sub === 'trials-cleanup') {
    guardWrite('api');
    print(await api('/api/admin/trials/cleanup', { method: 'DELETE', token: await adminToken() }));
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
  } else fail(`unknown admin subcommand: ${sub} (stats|users|trials|trials-cleanup|rescore|category)`);
}

async function main() {
  if (cmd === 'doctor') doctor();
  else if (cmd === 'gate') gate();
  else if (cmd === 'db') dbCmd();
  else if (cmd === 'admin') await adminCmd();
  else { console.log(HELP); process.exit(cmd ? 1 : 0); }
}
main().catch(e => fail(e.message));
