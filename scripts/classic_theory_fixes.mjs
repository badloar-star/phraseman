// Правки теорий классики по результатам Opus-аудита full3 (docs/work/classic_audit_full3_2026_11_05/results_theory_<lang>_NN.json).
// Применяются генератором при каждой пересборке (идемпотентно: правка = «записать строку fix по пути field», путь относительно теории урока).
// Правила пути: ведущее «theory.» отбрасывается; «en.chapters[N].body» = localized.en...; пути с [key=…], «|» и не-строковые fix пропускаются (считаем);
// для «(то же chapters[N].body)» / «(+chapters[N].body)» вторую строку обновляем, только если она совпадала со старым значением первой.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs', 'work', 'classic_audit_full3_2026_11_05');
const LOC = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
export const theoryFixStats = { applied: 0, skippedPath: 0, skippedNonString: 0, secondary: 0, perLang: {} };

let cache = null;
function load() {
  if (cache) return cache;
  cache = {};
  if (!existsSync(DIR)) return cache;
  for (const f of readdirSync(DIR).filter((x) => /^results_theory_[a-z]{2}_\d+\.json$/.test(x)).sort()) {
    const lang = f.split('_')[2];
    let arr;
    try { arr = JSON.parse(readFileSync(join(DIR, f), 'utf8')); } catch { continue; }
    for (const r of arr) {
      const m = /^lesson-(\d+)/.exec(r.id ?? '');
      if (!m || typeof r.field !== 'string') continue;
      ((cache[lang] ??= {})[Number(m[1])] ??= []).push(r);
    }
  }
  // ru/uk-полировка Переводчика (после аудита, побеждает): docs/work/classic_theory_polish/polish_<lang>*.json — тот же формат записей {id:"lesson-N/…", field, fix}
  const PDIR = join(ROOT, 'docs', 'work', 'classic_theory_polish');
  if (existsSync(PDIR)) {
    for (const f of readdirSync(PDIR).filter((x) => /^polish_[a-z]{2}.*\.json$/.test(x)).sort()) {
      const lang = f.split('_')[1].slice(0, 2);
      let arr;
      try { arr = JSON.parse(readFileSync(join(PDIR, f), 'utf8')); } catch { continue; }
      for (const r of arr) {
        const m = /^lesson-(\d+)/.exec(r.id ?? '');
        if (!m || typeof r.field !== 'string') continue;
        ((cache[lang] ??= {})[Number(m[1])] ??= []).push(r);
      }
    }
  }
  return cache;
}

function tokens(path) {
  const out = [];
  for (const m of path.matchAll(/([^.\[\]]+)|\[(\d+)\]/g)) out.push(m[2] !== undefined ? Number(m[2]) : m[1]);
  return out;
}

function resolve(root, toks) {
  let cur = root;
  for (let i = 0; i < toks.length - 1; i++) { cur = cur?.[toks[i]]; if (cur === undefined || cur === null || typeof cur !== 'object') return null; }
  return { parent: cur, key: toks[toks.length - 1] };
}

function normalizePrimary(field, fmt) {
  let p = field.split(/\s|;|\(/)[0];
  if (!p || /\[key=|\|/.test(p)) return null;
  p = p.replace(/^theory\./, '');
  const first = p.split('.')[0].replace(/\[\d+\]$/, '');
  if (fmt === 'studio2' && LOC.has(first)) p = `localized.${p}`;
  return p;
}

export function applyTheoryFixes(lang, n, th, fmt) {
  const fixes = load()[lang]?.[n] ?? [];
  const st = (theoryFixStats.perLang[lang] ??= { applied: 0, skipped: 0 });
  for (const r of fixes) {
    if (typeof r.fix !== 'string' || !r.fix.trim()) { theoryFixStats.skippedNonString++; st.skipped++; continue; }
    if (/exampleIds|samples/.test(r.field)) { theoryFixStats.skippedPath++; st.skipped++; continue; } // примеры глав собирает отдельный шаг
    const p = normalizePrimary(r.field, fmt);
    const res = p ? resolve(th, tokens(p)) : null;
    if (!res || typeof res.parent[res.key] !== 'string') { theoryFixStats.skippedPath++; st.skipped++; continue; }
    const old = res.parent[res.key];
    res.parent[res.key] = r.fix.trim();
    theoryFixStats.applied++; st.applied++;
    // вторая строка («(то же chapters[N].body)»): обновляем, если совпадала со старым значением
    const sec = /\((?:то же|\+)\s*([^)]+)\)/.exec(r.field)?.[1]?.trim();
    if (sec && /chapters\[\d+\]\.\w+/.test(sec)) {
      const base = p.split('.').slice(0, fmt === 'studio2' ? 2 : 0).join('.');
      const sp = (base ? `${base}.` : '') + sec.replace(/^localized\.\w+\./, '').replace(/^theory\./, '');
      const r2 = resolve(th, tokens(sp));
      if (r2 && r2.parent[r2.key] === old) { r2.parent[r2.key] = r.fix.trim(); theoryFixStats.secondary++; }
    }
  }
}
