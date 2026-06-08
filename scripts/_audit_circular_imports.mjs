// Detect circular imports among local modules. Circular deps are the #1 cause of
// "Component is not a function (it is Object)" when static import names look correct.
import fs from 'fs';
import path from 'path';

const ROOTS = ['app', 'components', 'contexts', 'hooks', 'constants', 'lib'];
const exts = ['.tsx', '.ts', '.jsx', '.js'];

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (exts.includes(path.extname(e.name))) out.push(full);
  }
  return out;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const cands = [base];
  for (const ext of exts) cands.push(base + ext);
  for (const ext of exts) cands.push(path.join(base, 'index' + ext));
  for (const c of cands) { try { if (fs.statSync(c).isFile()) return path.resolve(c); } catch {} }
  return null;
}

const files = ROOTS.flatMap(r => walk(r)).map(f => path.resolve(f));
const fileSet = new Set(files);

// build graph of VALUE imports only (skip `import type` and `import { type X }`-only)
const graph = new Map();
const importRe = /import\s+(type\s+)?(?:[A-Za-z0-9_$]+\s*,?\s*)?(?:\{([^}]*)\})?\s*(?:[A-Za-z0-9_$*\s]+)?from\s+['"]([^'"]+)['"]/g;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const deps = new Set();
  let m;
  const re = /import\s+(type\s+)?([^'"]*?)from\s+['"]([^'"]+)['"]/g;
  while ((m = re.exec(src))) {
    const [, typeKw, clause, spec] = m;
    if (typeKw) continue; // import type ... — erased at runtime
    // if clause is only { type A, type B } it's also erased; rough check:
    const named = clause.match(/\{([^}]*)\}/);
    if (named) {
      const members = named[1].split(',').map(s => s.trim()).filter(Boolean);
      const allTypes = members.length > 0 && members.every(s => /^type\s/.test(s));
      const hasValue = clause.replace(/\{[^}]*\}/, '').trim().length > 0; // default/namespace part
      if (allTypes && !hasValue) continue;
    }
    const resolved = resolveImport(file, spec);
    if (resolved && fileSet.has(resolved)) deps.add(resolved);
  }
  graph.set(file, deps);
}

// find cycles via DFS
const WHITE = 0, GRAY = 1, BLACK = 2;
const color = new Map(files.map(f => [f, WHITE]));
const stack = [];
const cycles = [];

function dfs(node) {
  color.set(node, GRAY);
  stack.push(node);
  for (const dep of graph.get(node) || []) {
    if (color.get(dep) === GRAY) {
      const idx = stack.indexOf(dep);
      cycles.push(stack.slice(idx).concat(dep));
    } else if (color.get(dep) === WHITE) {
      dfs(dep);
    }
  }
  stack.pop();
  color.set(node, BLACK);
}

for (const f of files) if (color.get(f) === WHITE) dfs(f);

// dedup cycles by normalized member set
const seen = new Set();
const uniq = [];
for (const c of cycles) {
  const key = [...new Set(c)].sort().join('|');
  if (seen.has(key)) continue;
  seen.add(key);
  uniq.push(c);
}

// prioritize cycles that involve a .tsx (component) file
const rel = p => path.relative('.', p);
const componentCycles = uniq.filter(c => c.some(f => f.endsWith('.tsx')));

console.log(`Total unique cycles: ${uniq.length}`);
console.log(`Cycles involving a .tsx component file: ${componentCycles.length}\n`);

const recent = new Set(['_layout.tsx','ActivityHeatmap365.tsx','quizzes.tsx','lesson1.tsx','home.tsx','arena_game.tsx','friends.tsx','personal_plan_exercise.tsx','achievements_screen.tsx','flashcards_collection.tsx']);
const scored = componentCycles.map(c => ({
  c,
  hot: c.some(f => recent.has(path.basename(f))),
  len: c.length,
})).sort((a,b) => (b.hot - a.hot) || (a.len - b.len));

for (const { c, hot } of scored.slice(0, 25)) {
  console.log(`${hot ? '🔥 ' : ''}CYCLE (${c.length-1} nodes):`);
  for (const f of c) console.log('   -> ' + rel(f));
  console.log('');
}
