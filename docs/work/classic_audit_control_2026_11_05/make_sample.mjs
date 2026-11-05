// make_sample.mjs — КОНТРОЛЬНЫЙ независимый аудит курсов: выборка по 400 фраз на язык (en/es/fr/de/it), случайная, фиксированный seed.
//
// зачем (координатор 05.11, цель владельца: ≤1% фраз с ошибкой в каждом языке): после применения правок полного прохода №2 нужна
// ВТОРАЯ, независимая проверка на фразах, которые аудиторы раньше НЕ разбирали и мы НЕ чинили. Поэтому выборка берёт только
// фразы вне «множества тронутых»: любой id, попавший в результаты прежних аудитов (results_*.json во всех docs/work/classic_audit_*),
// в слои исправлений (scripts/classic_audit_layer.json, classic_distractor_patches.json, docs/work/classic_translation_fixes_*.json).
//
// Запуск (читает ТОЛЬКО файлы; пишет только в свою папку):
//   node docs/work/classic_audit_control_2026_11_05/make_sample.mjs [--seed=20261105] [--per-lang=400] [--out=<папка>]
// Результат: chunk_<lang>_<NN>.json по 100 записей (формат как у full2), MANIFEST.json (seed, коммит, число исключённых, id выборки).
// Повторный запуск с тем же seed и тем же множеством тронутых даёт ТУ ЖЕ выборку. Если «тронутые» выросли (новые правки) —
// выборка пересчитывается без них; зафиксировать выборку можно, передав --keep=<MANIFEST.json>: берутся id из манифеста как есть.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const arg = (name, def) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : def; };
const SEED = arg('seed', '20261105');
const PER_LANG = Number(arg('per-lang', '400'));
const OUT = path.resolve(arg('out', HERE));
const KEEP = arg('keep', '');
const LANGS = ['en', 'es', 'fr', 'de', 'it'];
const CHUNK = 100;

// PRNG: mulberry32 от sha256(seed|контекст) — воспроизводимо и не зависит от порядка вызовов других частей.
function rng(context) {
  const h = crypto.createHash('sha256').update(`${SEED}|${context}`).digest();
  let a = h.readUInt32LE(0);
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(list, rand) { const a = [...list]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Нормализация id/ключей слоёв к виду «lang:LL.PP»: «en-classic-r1:02.15», «fr:25:17», «de:01:44», «en:02.24» → одно и то же.
function norm(raw) {
  const s = String(raw);
  const lang = s.split(':')[0].split('-')[0].toLowerCase();
  const m = s.match(/(\d+)\D+(\d+)\s*$/);
  if (!m) return null;
  return `${lang}:${String(Number(m[1])).padStart(2, '0')}.${String(Number(m[2])).padStart(2, '0')}`;
}

// 1. Множество тронутых фраз.
const touched = new Set();
const sources = {};
const add = (source, key) => { const n = norm(key); if (n && /^(en|es|fr|de|it):/.test(n)) { touched.add(n); sources[source] = (sources[source] ?? 0) + 1; } };
const docsWork = path.join(ROOT, 'docs', 'work');
for (const dir of fs.readdirSync(docsWork).filter((d) => /^classic_audit_/.test(d) && d !== path.basename(OUT))) {
  const full = path.join(docsWork, dir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full).filter((n) => /^results_.*\.json$/.test(n))) {
    try { for (const r of JSON.parse(fs.readFileSync(path.join(full, f), 'utf8'))) if (r && r.id) add(`results:${dir}`, r.id); } catch (e) { console.warn('skip', dir, f, e.message); }
  }
}
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.warn('skip', p, e.message); return null; } };
const layer = readJson(path.join(ROOT, 'scripts', 'classic_audit_layer.json'));
if (layer) for (const section of Object.values(layer)) if (section && typeof section === 'object') for (const k of Object.keys(section)) add('scripts/classic_audit_layer.json', k);
const patches = readJson(path.join(ROOT, 'scripts', 'classic_distractor_patches.json'));
if (patches) for (const [name, section] of Object.entries(patches)) if (name !== '_comment' && section && typeof section === 'object') for (const k of Object.keys(section)) add('scripts/classic_distractor_patches.json', k);
for (const f of fs.readdirSync(docsWork).filter((n) => /^classic_translation_fixes_.*\.json$/.test(n))) {
  const j = readJson(path.join(docsWork, f)); if (j) for (const k of Object.keys(j)) if (!k.startsWith('_')) add(`docs/work/${f}`, k);
}

// 2. Вселенная фраз по текущим данным курса.
const phrasesOf = (j) => (Array.isArray(j) ? j : (j.phrases ?? j.items ?? []));
const universe = {};
for (const lang of LANGS) {
  const dir = path.join(ROOT, 'modules', 'classic-courses', lang);
  universe[lang] = [];
  for (const f of fs.readdirSync(dir).filter((n) => /^lessons-\d+\.json$/.test(n)).sort()) {
    const lesson = Number(f.match(/(\d+)/)[1]);
    for (const p of phrasesOf(readJson(path.join(dir, f)) ?? {})) {
      universe[lang].push({
        lesson, id: p.id, target: p.target, ru: p.sourceLocales?.ru ?? '', uk: p.sourceLocales?.uk ?? '',
        tiles: (p.tiles ?? []).map((t) => ({ correct: t.correct, distractors: t.distractors })), alternatives: p.alternatives ?? [],
      });
    }
  }
}

// 3. Выборка: расслоённая по урокам (400/32 = 12,5 → 12 на урок + 16 уроков по 13, какие именно — по seed), без «тронутых».
const keepIds = KEEP ? new Set(readJson(path.resolve(KEEP))?.ids ?? []) : null;
const manifest = { seed: SEED, perLang: PER_LANG, commit: '', touchedByLang: {}, touchedSources: sources, ids: [], counts: {} };
try { manifest.commit = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(); } catch { manifest.commit = 'unknown'; }
fs.mkdirSync(OUT, { recursive: true });
for (const lang of LANGS) {
  const all = universe[lang];
  const free = all.filter((p) => !touched.has(norm(p.id)));
  manifest.touchedByLang[lang] = all.length - free.length;
  const lessons = [...new Set(all.map((p) => p.lesson))].sort((a, b) => a - b);
  const base = Math.floor(PER_LANG / lessons.length);
  const extra = PER_LANG - base * lessons.length;
  const extraLessons = new Set(shuffle(lessons, rng(`${lang}|extra`)).slice(0, extra));
  let picked = [];
  if (keepIds) picked = all.filter((p) => keepIds.has(p.id));
  else {
    for (const lesson of lessons) {
      const want = base + (extraLessons.has(lesson) ? 1 : 0);
      picked.push(...shuffle(free.filter((p) => p.lesson === lesson), rng(`${lang}|lesson${lesson}`)).slice(0, want));
    }
    if (picked.length < PER_LANG) { // запас: если в уроке не хватило свободных фраз — добираем из остальных
      const have = new Set(picked.map((p) => p.id));
      picked.push(...shuffle(free.filter((p) => !have.has(p.id)), rng(`${lang}|fill`)).slice(0, PER_LANG - picked.length));
    }
  }
  picked.sort((a, b) => a.lesson - b.lesson || String(a.id).localeCompare(String(b.id), 'en', { numeric: true }));
  manifest.counts[lang] = picked.length;
  manifest.ids.push(...picked.map((p) => p.id));
  for (let i = 0; i < picked.length; i += CHUNK) {
    const nn = String(i / CHUNK).padStart(2, '0');
    fs.writeFileSync(path.join(OUT, `chunk_${lang}_${nn}.json`), `${JSON.stringify(picked.slice(i, i + CHUNK), null, 0)}\n`);
  }
}
fs.writeFileSync(path.join(OUT, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 1)}\n`);
console.log(JSON.stringify({ seed: SEED, commit: manifest.commit, touched: manifest.touchedByLang, counts: manifest.counts, touchedSources: sources }));
