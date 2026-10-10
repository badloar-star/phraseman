// Запуск: node scripts/dev_graph_estimate.cjs — только чтение, Metro не запускается.
// Статическая оценка графа проектных файлов (без node_modules и без запуска Metro): достижимые от контекста роутера и index.js
// для двух режимов: dev (всё из app/) и стор-релиз (вырезы router.ctx.js + подмены metro-конфигурации). Размер исходников — прокси веса графа.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..').split(path.sep).join('/');
const EXTS = ['.tsx', '.ts', '.android.tsx', '.android.ts', '.native.tsx', '.native.ts', '.js', '.jsx', '.android.js', '.native.js', '.json', '.cjs', '.mjs'];
const FILE_RE = /\.(tsx?|jsx?|json|cjs|mjs)$/;

// пути из router.ctx.js
const NON_ROUTE_DIRS = ['audio', 'community_packs', 'components', 'constants', 'error_traps', 'flashcards', 'graphify-out', 'quizzes', 'services', 'settings', 'types'];
const STORE_CUT = /learning[_-]v2/;
const STORE_DEV_NAMES = /(?:^|\/)(?:_?admin_settings_testers|_?admin_intro_preview|_?admin_review_test|_?admin_premium_delivery_test|_?admin_celebration_lab|_?admin_speaking_lab|_?admin_referral_lab|_?pos_analytics_audit|vip_survey_dev_auth|flashcards_market_dev|_motion_showcase|_phone_state_sqlcipher_smoke)\.tsx?$/;
const STORE_STUB_SPECIFIERS = new Set(['./_admin_settings_testers', './_admin_intro_preview', './_admin_review_test', './_admin_premium_delivery_test', './_admin_celebration_lab', './_admin_speaking_lab', './_admin_referral_lab', './_admin_sound_lab', './_pos_analytics_audit', './flashcards_market_dev', './_motion_showcase', './_phone_state_sqlcipher_smoke']);

function listRoutes(dir, rel = '') {
  const out = [];
  for (const name of fs.readdirSync(path.join(dir, rel))) {
    const r = rel ? rel + '/' + name : name;
    const full = path.join(dir, r);
    if (fs.statSync(full).isDirectory()) {
      if (!rel && NON_ROUTE_DIRS.includes(name)) continue;
      out.push(...listRoutes(dir, r));
    } else if (/\.tsx$/.test(name) && !/(\+api|\+html|\+middleware)\.tsx?$/.test(name)) out.push('app/' + r);
  }
  return out;
}

const cache = new Map();
function resolveFile(fromFile, spec) {
  const base = path.resolve(path.dirname(path.join(ROOT, fromFile)), spec);
  const tries = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, 'index' + e))];
  for (const t of tries) {
    try { if (fs.statSync(t).isFile() && FILE_RE.test(t)) return path.relative(ROOT, t).split(path.sep).join('/'); } catch { /* нет */ }
  }
  return null;
}
const IMPORT_RE = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;
function importsOf(file) {
  if (cache.has(file)) return cache.get(file);
  let text = '';
  try { text = fs.readFileSync(path.join(ROOT, file), 'utf8'); } catch { /* нет */ }
  const specs = [];
  if (/\.(tsx?|jsx?|cjs|mjs)$/.test(file)) {
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(text))) { const s = m[1] || m[2] || m[3] || m[4]; if (s && s.startsWith('.')) specs.push(s); }
  }
  cache.set(file, specs);
  return specs;
}

function reach(entries, store) {
  const seen = new Set();
  const stack = [...entries];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const s of importsOf(f)) {
      if (store && STORE_STUB_SPECIFIERS.has(s)) continue;
      const r = resolveFile(f, s);
      if (!r || seen.has(r)) continue;
      if (store && STORE_CUT.test(path.basename(r)) && r.startsWith('app/')) continue;
      stack.push(r);
    }
  }
  return seen;
}

const allRoutes = listRoutes(path.join(ROOT, 'app')).map((r) => r.replace(/^app\/app\//, 'app/'));
const devRoutes = allRoutes;
const storeRoutes = allRoutes.filter((r) => !STORE_CUT.test(path.basename(r)) && !STORE_DEV_NAMES.test(r));
const extra = ['index.js', 'router.ctx.js'].filter((f) => fs.existsSync(path.join(ROOT, f)));

const size = (set) => [...set].reduce((s, f) => { try { return s + fs.statSync(path.join(ROOT, f)).size; } catch { return s; } }, 0);
const dev = reach([...devRoutes, ...extra], false);
const store = reach([...storeRoutes, ...extra], true);
const mb = (n) => (n / 1048576).toFixed(1);
console.log(`маршрутов (файлов app/**/*.tsx): dev ${devRoutes.length}, стор-релиз ${storeRoutes.length}`);
console.log(`граф проекта (без node_modules): dev ${dev.size} файлов / ${mb(size(dev))} МБ; стор-релиз ${store.size} файлов / ${mb(size(store))} МБ`);
const onlyDev = [...dev].filter((f) => !store.has(f));
console.log(`только в dev: ${onlyDev.length} файлов / ${mb(size(new Set(onlyDev)))} МБ (${((size(new Set(onlyDev)) / size(dev)) * 100).toFixed(0)} % веса dev-графа проекта)`);
const byDir = {};
for (const f of onlyDev) { const k = f.split('/').slice(0, 3).join('/'); byDir[k] = (byDir[k] || 0) + fs.statSync(path.join(ROOT, f)).size; }
console.log('--- только в dev, по каталогам (топ 8):');
for (const [k, s] of Object.entries(byDir).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`${mb(s).padStart(6)} МБ  ${k}`);
const devAll = {};
for (const f of dev) { const k = f.split('/').slice(0, 2).join('/'); devAll[k] = (devAll[k] || 0) + fs.statSync(path.join(ROOT, f)).size; }
console.log('--- dev-граф целиком, по каталогам (топ 8):');
for (const [k, s] of Object.entries(devAll).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`${mb(s).padStart(6)} МБ  ${k}`);
