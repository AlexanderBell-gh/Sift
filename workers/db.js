export async function queryAll(env, sql, params = []) {
  const stmt = env.DB.prepare(sql).bind(...params);
  const res = await stmt.all();
  return res.results || [];
}

export async function queryOne(env, sql, params = []) {
  const stmt = env.DB.prepare(sql).bind(...params);
  return await stmt.first();
}

export async function execute(env, sql, params = []) {
  const stmt = env.DB.prepare(sql).bind(...params);
  return await stmt.run();
}

export async function batch(env, statements) {
  if (!statements || statements.length === 0) return [];
  const stmts = statements.map(s => env.DB.prepare(s.sql).bind(...(s.params || [])));
  return await env.DB.batch(stmts);
}
