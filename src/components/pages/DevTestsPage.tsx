import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, FlaskConical, Loader2, Play, Plus, Wand2 } from 'lucide-react';
import NavHeader from '../layout/NavHeader';
import { NotFoundPage } from '../guards/ErrorPage';
import { CATEGORIES } from '../../lib/categories';
import {
  TEST_MODULES,
  appendCase,
  applyFix,
  caseTemplate,
  describePatch,
  fetchSuites,
  proposeFix,
  runModule,
  type CaseResult,
  type FileResult,
  type SuiteInfo,
  type TestModule,
  type TuneWin,
} from '../../lib/dev-test-runner';

function StatusPill({ result, running }: { result?: FileResult; running: boolean }) {
  if (running) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[11px] uppercase text-[var(--muted)]">
        <Loader2 className="h-3 w-3 animate-spin" /> Running
      </span>
    );
  }
  if (!result) {
    return (
      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[11px] uppercase text-[var(--muted)]">
        Not run
      </span>
    );
  }
  if (result.loadError) {
    return (
      <span className="rounded-full border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.08)] px-2 py-0.5 font-mono text-[11px] uppercase text-red-600">
        Load failed
      </span>
    );
  }
  const failed = result.cases.filter((c) => !c.pass).length;
  if (failed > 0) {
    return (
      <span className="rounded-full border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.08)] px-2 py-0.5 font-mono text-[11px] uppercase text-red-600">
        {failed} failed
      </span>
    );
  }
  return (
    <span className="rounded-full border border-green-600/30 bg-green-600/10 px-2 py-0.5 font-mono text-[11px] uppercase text-green-700 dark:text-green-400">
      Pass
    </span>
  );
}

function FixPanel({ mod, suite, name, onFixed }: { mod: TestModule; suite: string; name: string; onFixed: () => void }) {
  const [phase, setPhase] = useState<{ s: 'idle' } | { s: 'working' } | { s: 'won'; win: TuneWin } | { s: 'lost'; error: string }>({ s: 'idle' });
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  async function propose() {
    setPhase({ s: 'working' });
    try {
      const win = await proposeFix(mod, suite, name);
      setPhase({ s: 'won', win });
    } catch (e) {
      setPhase({ s: 'lost', error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function apply(win: TuneWin) {
    if (applying) return;
    setApplying(true);
    setApplyError('');
    try {
      await applyFix(mod, suite, name, win.patch);
      onFixed();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }

  if (phase.s === 'idle') {
    return (
      <button type="button" className="btn-secondary mt-2 px-3 py-1.5 text-xs" onClick={propose}>
        <Wand2 className="h-3.5 w-3.5" /> Propose fix
      </button>
    );
  }
  if (phase.s === 'working') {
    return (
      <p className="mt-2 flex items-center gap-2 font-mono text-xs text-[var(--muted)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Trying keyword/alias patches against the full suite…
      </p>
    );
  }
  if (phase.s === 'lost') {
    return (
      <div className="alert-error mt-2" role="alert">
        No clean patch: {phase.error}{' '}
        <button type="button" className="underline" onClick={propose}>
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-green-600/30 bg-green-600/10 p-3">
      <p className="text-sm">
        <strong>{describePatch(phase.win.patch)}</strong> — target fixed, {phase.win.ran} suite cases green.
      </p>
      <pre className="mt-2 max-h-32 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 font-mono text-xs">
        {phase.win.insertLines.join('\n')}
      </pre>
      {applyError && (
        <div className="alert-error mt-2" role="alert">
          {applyError}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => apply(phase.win)} disabled={applying}>
          {applying ? 'Applying…' : `Apply to workers/lib/category.js:${phase.win.entryLine}`}
        </button>
        <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setPhase({ s: 'idle' })}>
          Discard
        </button>
      </div>
    </div>
  );
}

function CaseRow({ c, mod, onFixed }: { c: CaseResult; mod?: TestModule; onFixed?: () => void }) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-2 last:border-0">
      <div className="flex items-center gap-2 text-sm">
        <span
          aria-hidden
          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${c.pass ? 'bg-green-600' : 'bg-red-600'}`}
        />
        <span className={`min-w-0 flex-1 truncate ${c.pass ? '' : 'font-semibold text-red-600'}`}>{c.name}</span>
        <span className="font-mono text-xs text-[var(--muted)]">{c.ms}ms</span>
      </div>
      {!c.pass && (
        <div className="mt-2 rounded-lg bg-[rgba(220,38,38,0.08)] p-3 text-sm">
          <p className="font-mono text-xs break-words text-red-700 dark:text-red-400">{c.message}</p>
          {c.actual !== undefined && (
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div>
                <p className="font-mono text-[11px] uppercase text-[var(--muted)]">Actual</p>
                <pre className="mt-1 overflow-x-auto font-mono text-xs break-words">{c.actual}</pre>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase text-[var(--muted)]">Expected</p>
                <pre className="mt-1 overflow-x-auto font-mono text-xs break-words">{c.expected}</pre>
              </div>
            </div>
          )}
          {mod && mod.file === 'workers/lib/category.test.js' && onFixed && (
            <FixPanel mod={mod} suite={c.suite} name={c.name} onFixed={onFixed} />
          )}
        </div>
      )}
    </div>
  );
}

export interface CaseDraft {
  suite: string;
  name: string;
  body: string;
}

function AddCaseForm({ mod, onSaved, initial }: { mod: TestModule; onSaved: () => void; initial?: CaseDraft | null }) {
  const [open, setOpen] = useState(!!initial);
  const [suites, setSuites] = useState<SuiteInfo[] | null>(null);
  const [suitesError, setSuitesError] = useState('');
  const [suite, setSuite] = useState(initial?.suite ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string[] | null>(null);
  const [savedLine, setSavedLine] = useState<number | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !suites && !suitesError) {
      try {
        const s = await fetchSuites(mod);
        setSuites(s);
        setSuite((cur) => cur || s[0]?.name || '');
      } catch (e) {
        setSuitesError(e instanceof Error ? e.message : String(e));
      }
    }
  }

  async function save(dryRun: boolean) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await appendCase(mod, { suite, name, body }, dryRun);
      if (dryRun) {
        setPreview(r.preview);
        setSavedLine(null);
      } else {
        setPreview(null);
        setSavedLine(r.line);
        setName('');
        setBody('');
        onSaved();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-[var(--border)]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
      >
        <Plus className="h-4 w-4" /> Add case to file
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          {suitesError && (
            <div className="alert-error" role="alert">
              Suite list failed: {suitesError}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] uppercase text-[var(--muted)]">Suite</span>
              <select value={suite} onChange={(e) => setSuite(e.target.value)} className="admin-input w-full" disabled={!suites && !initial}>
                {(suites ?? []).map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.cases.length})
                  </option>
                ))}
                {!suites && initial && <option value={initial.suite}>{initial.suite}</option>}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] uppercase text-[var(--muted)]">Case name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={mod.namePlaceholder}
                className="admin-input w-full"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] uppercase text-[var(--muted)]">
              Body — assert lines only, wrapped in it() on save
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder={mod.bodyPlaceholder}
              className="admin-input w-full font-mono text-[13px]"
            />
          </label>
          {error && (
            <div className="alert-error" role="alert">
              {error}
            </div>
          )}
          {preview && (
            <pre className="max-h-48 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs">
              {preview.join('\n')}
            </pre>
          )}
          {savedLine !== null && (
            <p className="text-sm text-green-700 dark:text-green-400">
              Saved to {mod.file} line {savedLine}.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-sm"
              onClick={() => save(true)}
              disabled={busy || !suite || !name.trim() || !body.trim()}
            >
              Preview
            </button>
            <button
              type="button"
              className="btn-primary px-3 py-2 text-sm"
              onClick={() => save(false)}
              disabled={busy || !suite || !name.trim() || !body.trim()}
            >
              {busy ? 'Saving…' : 'Save to file'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type Scorer = (signals: Record<string, unknown>) => { category?: string };

async function loadScorer(): Promise<Scorer> {
  const url = '/workers/lib/category.js';
  const m = (await import(/* @vite-ignore */ url)) as unknown as { scoreCategory: Scorer };
  if (typeof m.scoreCategory !== 'function') throw new Error('scoreCategory not found');
  return m.scoreCategory;
}

function escSingle(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function suggestSuite(suites: SuiteInfo[], titleOnly: boolean): string {
  if (titleOnly) {
    const t = suites.find((s) => /no crumbs|title-only/i.test(s.name));
    if (t) return t.name;
  } else {
    const h = [...suites].reverse().find((s) => /harden/i.test(s.name));
    if (h) return h.name;
  }
  return suites[suites.length - 1]?.name ?? '';
}

// Guided edge-case composer for the category scorer: type product facts,
// see today's verdict live, hand a filled case to the form below.
function CategoryComposer({ onDraft }: { onDraft: (d: CaseDraft) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [crumbs, setCrumbs] = useState('');
  const [leaf, setLeaf] = useState('');
  const [brand, setBrand] = useState('');
  const [store, setStore] = useState('tesco');
  const [expected, setExpected] = useState<string>('Chilled');
  const [verdict, setVerdict] = useState<{ key: string; category: string } | { key: string; error: string } | null>(null);
  const [suites, setSuites] = useState<SuiteInfo[] | null>(null);

  // Key of the inputs a verdict belongs to. Stale verdicts hide by
  // derivation during render, so the effect below never clears state.
  const inputsKey = open ? [title.trim(), crumbs, leaf, brand, store].join('\n') : '';
  const visible = verdict && verdict.key === inputsKey ? verdict : null;

  useEffect(() => {
    if (!inputsKey || !title.trim()) return;
    let live = true;
    const crumbList = crumbs.split(',').map((s) => s.trim()).filter(Boolean);
    const t = title.trim();
    const l = leaf.trim();
    const b = brand.trim();
    const st = store.trim() || 'tesco';
    const key = inputsKey;
    (async () => {
      try {
        const score = await loadScorer();
        if (!live) return;
        const r = score({
          breadcrumb_raw: crumbList,
          breadcrumb_leaf: l,
          title: t,
          brand: b,
          store_id: st,
          url_path: '',
          jsonld_category: null,
        });
        if (live) setVerdict({ key, category: String(r.category ?? '?') });
      } catch (e) {
        if (live) setVerdict({ key, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      live = false;
    };
  }, [inputsKey, title, crumbs, leaf, brand, store]);

  async function useTheseValues() {
    let list = suites;
    if (!list) {
      list = await fetchSuites(TEST_MODULES[0] as TestModule);
      setSuites(list);
    }
    const crumbList = crumbs.split(',').map((s) => s.trim()).filter(Boolean);
    const titleOnly = crumbList.length === 0 && !leaf.trim();
    const argLines = [`  breadcrumb_raw: [${crumbList.map((c) => `'${escSingle(c)}'`).join(', ')}],`];
    if (leaf.trim()) argLines.push(`  breadcrumb_leaf: '${escSingle(leaf.trim())}',`);
    argLines.push(`  title: '${escSingle(title.trim())}',`);
    if (brand.trim()) argLines.push(`  brand: '${escSingle(brand.trim())}',`);
    argLines.push(`  store_id: '${escSingle(store.trim() || 'tesco')}',`);
    onDraft({
      suite: suggestSuite(list, titleOnly),
      name: `${title.trim()} -> ${expected}`,
      body: [`const r = scoreCategory(signals({`, ...argLines, `}));`, `assert.equal(r.category, '${expected}');`].join('\n'),
    });
  }

  const ready = title.trim().length > 0;
  const mismatch = visible && 'category' in visible && visible.category !== expected;

  return (
    <div className="border-t border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
      >
        <Wand2 className="h-4 w-4" /> Add edge case (guided)
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] uppercase text-[var(--muted)]">Product title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Spicy Mango Salad Bowl 200g"
                className="admin-input w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] uppercase text-[var(--muted)]">Should be</span>
              <select value={expected} onChange={(e) => setExpected(e.target.value)} className="admin-input w-full">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block font-mono text-[11px] uppercase text-[var(--muted)]">
                Breadcrumb, comma separated (blank for title-only)
              </span>
              <input
                value={crumbs}
                onChange={(e) => setCrumbs(e.target.value)}
                placeholder="Chilled, Prepared Salads"
                className="admin-input w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] uppercase text-[var(--muted)]">Leaf</span>
              <input
                value={leaf}
                onChange={(e) => setLeaf(e.target.value)}
                placeholder="Prepared Salads"
                className="admin-input w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] uppercase text-[var(--muted)]">Brand (optional)</span>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Tesco"
                className="admin-input w-full"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] uppercase text-[var(--muted)]">Store id</span>
            <input
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="tesco"
              className="admin-input w-full"
            />
          </label>
          {visible && 'error' in visible && (
            <div className="alert-error" role="alert">
              Scorer failed: {visible.error}
            </div>
          )}
          {visible && 'category' in visible && (
            <div
              className={`rounded-lg p-3 text-sm ${mismatch ? 'bg-[rgba(220,38,38,0.08)]' : 'bg-green-600/10'}`}
              role="status"
            >
              <p>
                Scores <strong className="font-mono">{visible.category}</strong> · want{' '}
                <strong className="font-mono">{expected}</strong>
              </p>
              {mismatch ? (
                <p className="mt-1 text-[var(--muted)]">Will land red. Save it, then fix the scorer.</p>
              ) : (
                <p className="mt-1 text-[var(--muted)]">Already right. Saving locks the behavior in.</p>
              )}
            </div>
          )}
          <div>
            <button type="button" className="btn-primary px-3 py-2 text-sm" onClick={useTheseValues} disabled={!ready}>
              Use these values
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  mod,
  result,
  running,
  onRun,
  onSaved,
  filter,
}: {
  mod: TestModule;
  result?: FileResult;
  running: boolean;
  onRun: () => void;
  onSaved: () => void;
  filter: string;
}) {
  const [forced, setForced] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<CaseDraft | null>(null);
  const [draftSeq, setDraftSeq] = useState(0);

  function takeDraft(d: CaseDraft) {
    setDraft(d);
    setDraftSeq((n) => n + 1);
  }
  const failed = result && !result.loadError ? result.cases.filter((c) => !c.pass).length : 0;
  const autoOpen = !result || !!result.loadError || failed > 0;
  const open = forced ?? autoOpen;

  const groups = useMemo(() => {
    const all = result?.cases ?? [];
    const q = filter.trim().toLowerCase();
    const kept = q ? all.filter((c) => `${c.suite} ${c.name}`.toLowerCase().includes(q)) : all;
    const map = new Map<string, CaseResult[]>();
    for (const c of kept) {
      const arr = map.get(c.suite) ?? [];
      arr.push(c);
      map.set(c.suite, arr);
    }
    return [...map.entries()];
  }, [result, filter]);

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(caseTemplate(mod));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center gap-2 px-2 py-2.5 sm:px-3">
        <button
          type="button"
          onClick={() => setForced((f) => !(f ?? autoOpen))}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${mod.label}`}
          className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[rgba(255,87,1,0.08)] hover:text-[var(--text)]"
        >
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{mod.label}</h2>
          <p className="truncate font-mono text-xs text-[var(--muted)]">{mod.file}</p>
        </div>
        <StatusPill result={result} running={running} />
        {result && !result.loadError && (
          <p className="hidden font-mono text-xs text-[var(--muted)] sm:block">
            {result.cases.length - failed}/{result.cases.length} · {result.ms}ms
          </p>
        )}
        <button
          type="button"
          title="Copy hand-edit template"
          onClick={copyTemplate}
          className="rounded-lg p-2 text-[var(--muted)] hover:bg-[rgba(255,87,1,0.08)] hover:text-[var(--text)]"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={onRun} disabled={running}>
          <Play className="h-3.5 w-3.5" /> {running ? 'Running…' : result ? 'Re-run' : 'Run'}
        </button>
      </div>
      {open && (
        <>
          {result?.loadError && (
            <div className="alert-error mx-4 mb-3" role="alert">
              Load failed: {result.loadError}
            </div>
          )}
          {result && !result.loadError && groups.length === 0 && (
            <div className="px-4 pb-4">
              <p className="empty-state-desc">{filter ? 'No cases match the filter.' : 'No cases collected.'}</p>
            </div>
          )}
          {groups.length > 0 && (
            <div className="border-t border-[var(--border)]">
              {groups.map(([suite, cases]) => (
                <div key={suite}>
                  <p className="border-b border-[var(--border)] bg-[var(--bg)] px-4 py-1.5 font-mono text-[11px] uppercase text-[var(--muted)]">
                    {suite}
                  </p>
                  {cases.map((c) => (
                    <CaseRow key={`${c.suite}::${c.name}`} c={c} mod={mod} onFixed={onSaved} />
                  ))}
                </div>
              ))}
            </div>
          )}
          {mod.file === 'workers/lib/category.test.js' && <CategoryComposer onDraft={takeDraft} />}
          <AddCaseForm key={draftSeq} mod={mod} onSaved={onSaved} initial={draft} />
        </>
      )}
    </section>
  );
}

export default function DevTestsPage() {
  // Never ships: route only mounts under `vite dev`.
  const isDev = import.meta.env.DEV;

  const [results, setResults] = useState<Record<string, FileResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const bust = useRef(0);

  const totals = useMemo(() => {
    const all = Object.values(results).flatMap((r) => r.cases);
    return {
      files: Object.keys(results).length,
      cases: all.length,
      passed: all.filter((c) => c.pass).length,
      failed: all.filter((c) => !c.pass).length,
    };
  }, [results]);
  const passRate = totals.cases ? Math.round((totals.passed / totals.cases) * 100) : 0;

  async function runOne(mod: TestModule) {
    if (running) return;
    setRunning(mod.file);
    bust.current += 1;
    try {
      const r = await runModule(mod, bust.current);
      setResults((prev) => ({ ...prev, [mod.file]: r }));
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    if (running) return;
    setRunning('all');
    bust.current += 1;
    const n = bust.current;
    try {
      for (const mod of TEST_MODULES) {
        const r = await runModule(mod, n);
        setResults((prev) => ({ ...prev, [mod.file]: r }));
      }
    } finally {
      setRunning(null);
    }
  }

  if (!isDev) return <NotFoundPage />;

  return (
    <div className="min-h-screen">
      <NavHeader />
      <div className="page-shell">
        <div className="container settings-top">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FlaskConical className="h-6 w-6 shrink-0 text-[var(--primary)]" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">Dev tests</h1>
              <p className="admin-meta">
                Local only. Same files CI runs via <span className="font-mono">pnpm sift test</span>. New cases
                save straight into the test file.
              </p>
            </div>
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setFilter('');
            }}
            placeholder="Filter cases… (Esc clears)"
            aria-label="Filter test cases"
            className="admin-input w-52"
          />
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm"
            onClick={runAll}
            disabled={running !== null}
          >
            {running === 'all' ? 'Running…' : totals.files ? 'Run all again' : 'Run all'}
          </button>
        </div>

        {totals.files > 0 ? (
          <div
            className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            role="status"
          >
            <p className="font-mono text-xs whitespace-nowrap text-[var(--muted)]">
              {totals.files} files · {totals.cases} cases · {totals.passed} passed · {totals.failed} failed
            </p>
            <div
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--border)]"
              aria-label={`${passRate}% passing`}
            >
              <div
                className={`h-full rounded-full ${totals.failed ? 'bg-red-600' : 'bg-green-600'}`}
                style={{ width: `${passRate}%` }}
              />
            </div>
            <p className="font-mono text-xs text-[var(--muted)]">{passRate}%</p>
          </div>
        ) : (
          running === null && (
            <div className="empty-state-box mb-4">
              <p className="empty-state-title">No runs yet</p>
              <p className="empty-state-desc">Hit Run all. Failing cases expand with actual vs expected.</p>
            </div>
          )
        )}

        <div className="grid gap-4">
          {TEST_MODULES.map((mod) => (
            <ModuleCard
              key={mod.file}
              mod={mod}
              result={results[mod.file]}
              running={running === mod.file || running === 'all'}
              onRun={() => runOne(mod)}
              onSaved={() => runOne(mod)}
              filter={filter}
            />
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
