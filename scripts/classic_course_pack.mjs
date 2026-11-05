// Конвертер классических курсов: архив Classic (zip) → рантайм-JSON modules/classic-courses/<lang>/.
//
// зачем (Координатор 04.11, контракт Ядра): владелец вносит в сборку 5 классических курсов — EN (редакция v3), ES, FR, DE, IT,
// по 32 урока × 50 фраз. В рантайм идёт только рабочая часть: фразы с плитками, вступления, теория, словарь, ключи подсказок.
// START.html / BANK / qa / source / runtime / student-locales / locales / lessons (редакторская проекция) / hangul — не рантайм.
// Архивы не распаковываются на диск: читаем напрямую минимальным zip-ридером на node:zlib (без зависимостей), каждый исходный
// файл сверяем с SHA256SUMS архива. Вывод детерминирован: стабильный порядок ключей, без времени, минифицированный UTF-8.
//
// Запуск: node scripts/classic_course_pack.mjs [en es fr de it] [--big <zip>] [--en <zip>] [--out <dir>] [--check] [--sample]
//   --check — только проверки, ничего не пишет; --sample — вывести по 3 записи словаря и 2 фразы на язык.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const BIG = flag('--big', 'C:\\Users\\badlo\\Downloads\\PhraseMan_Classic_EN_ES_DE_FR_IT_PL_PTBR_CS_KO.zip');
const EN_V3 = flag('--en', 'C:\\Users\\badlo\\Documents\\Codex\\2026-11-02\\x20\\outputs\\Classic-EN-reviewed-candidate-v3.zip');
const OUT = flag('--out', join(ROOT, 'modules', 'classic-courses'));
const CHECK_ONLY = argv.includes('--check');
const SAMPLE = argv.includes('--sample');
const skipValues = new Set(['--big', '--en', '--out']);
const wanted = argv.filter((a, i) => !a.startsWith('--') && !skipValues.has(argv[i - 1]));
const LANGS = wanted.length ? wanted : ['en', 'es', 'fr', 'de', 'it'];

const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const INTRO_SUFFIX = { ru: 'RU', uk: 'UK', en: ['EN', 'En'], es: 'ES', 'pt-BR': 'PtBr', vi: 'Vi', id: 'Id', tr: 'Tr', pl: 'Pl' };

// ── минимальный zip-ридер (stored + deflate; архивы < 4 ГБ, записей < 65535) ──────────────────────────────────────────
function openZip(path) {
  const buf = readFileSync(path);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(`${path}: нет EOCD — не zip`);
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`${path}: битая центральная директория`);
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    entries.set(buf.toString('utf8', p + 46, p + 46 + nameLen), { method, csize, usize, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const read = (name) => {
    const e = entries.get(name);
    if (!e) throw new Error(`${path}: нет файла ${name}`);
    const start = e.local + 30 + buf.readUInt16LE(e.local + 26) + buf.readUInt16LE(e.local + 28);
    const raw = buf.subarray(start, start + e.csize);
    if (e.method === 0) return Buffer.from(raw);
    if (e.method === 8) return inflateRawSync(raw);
    throw new Error(`${name}: метод сжатия ${e.method} не поддержан`);
  };
  return { path, entries, read, sha: createHash('sha256').update(buf).digest('hex') };
}

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const pad2 = (n) => String(n).padStart(2, '0');
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
// зачем (Координатор 04.11): пробелы и ошибки словарей архива закрывает Переводчик в docs/work/classic_gloss_overrides.json —
// {"en": {"<ключ глоссы>": {локаль: значение}}, "es": {"<лемма>": {локаль: значение}}}. pl пока HOLD: оставляем как в архиве.
const OVERRIDES_PATH = join(ROOT, 'docs', 'work', 'classic_gloss_overrides.json');
const OVERRIDES = existsSync(OVERRIDES_PATH) ? JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8')) : {};
// зачем (владелец 05.11: «Представь ситуацию» запрещено): переписанные интро живут в слое оверрайдов, а не в архиве — пересборка их сохраняет.
// Два писателя — два файла: ru/прочие языки — Темы, uk — Переводчик. Ключ — screenId «<lang>:<LL>:intro:<N>», значение — поля titleXX/textXX/linesXX.
const readIntroOverrides = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {});
const INTRO_OVERRIDES_PATHS = [join(ROOT, 'docs', 'work', 'classic_intro_overrides.json'), join(ROOT, 'docs', 'work', 'classic_intro_overrides_uk.json')];
const INTRO_OVERRIDES = Object.assign({}, ...INTRO_OVERRIDES_PATHS.map(readIntroOverrides).map((o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== '_note'))));
const introOverrideUsed = new Set();
// зачем: приоритет над архивом; возвращает НОВЫЕ объекты (блоки архива не мутируем). Неиспользованный ключ — предупреждение, чтобы опечатка в screenId была видна.
function applyIntroOverrides(blocks, lang, n) {
  return blocks.map((b, i) => {
    const key = `${lang}:${pad2(n)}:intro:${i + 1}`;
    const ov = INTRO_OVERRIDES[key];
    if (!ov) return b;
    introOverrideUsed.add(key);
    return { ...b, ...ov };
  });
}
process.on('exit', () => {
  const unused = Object.keys(INTRO_OVERRIDES).filter((k) => !introOverrideUsed.has(k));
  if (unused.length) console.warn(`[intro-overrides] не применено ${unused.length} ключ(ей): ${unused.slice(0, 8).join(', ')}`);
});
const overrideLocales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr'];
// зачем (Координатор 04.11): исправления ru/uk из аудита вносит Переводчик в docs/work/classic_translation_fixes_*.json —
// {"<lang>:<LL>.<PP>": {"ru": …, "uk": …, "reason": …}}; здесь они накладываются на sourceLocales фразы (числа и порядок фраз не меняются)
const TRANSLATION_FIXES = new Map();
for (const f of readdirSync(join(ROOT, 'docs', 'work')).filter((n) => /^classic_translation_fixes_.*\.json$/.test(n)).sort()) {
  for (const [k, v] of Object.entries(JSON.parse(readFileSync(join(ROOT, 'docs', 'work', f), 'utf8')))) {
    const m = /^([a-z]{2}):(\d\d)[.:](\d\d)$/.exec(k);
    if (m) TRANSLATION_FIXES.set(`${m[1]}:${m[2]}:${m[3]}`, v);
  }
}
const usedTranslationFixes = new Set();
const translationNormalized = { n: 0 };
// слой правок полного прохода (scripts/classic_audit_apply.mjs): соблазны (tiles), допустимые ответы (alt), целевые фразы (target)
const AUDIT_PATH = join(ROOT, 'scripts', 'classic_audit_layer.json');
const AUDIT = existsSync(AUDIT_PATH) ? JSON.parse(readFileSync(AUDIT_PATH, 'utf8')) : { tiles: {}, alt: {}, target: {} };
const auditForced = new Set(); // 'id#позиция:слово' — соблазны, поставленные аудитором (на них не действуют классовые правила генератора)
const auditStats = { tileApplied: 0, tileAbsent: 0, tileInvalid: 0, altAdded: 0, altRemoved: 0, targetApplied: 0, targetSkipped: 0, invalidReasons: {} };
const tokenizeLine = (str) => str.replace(/[¿¡?!.,;:«»"]/g, ' ').split(/\s+/).filter(Boolean);
const errors = [];
const fail = (lang, msg) => { errors.push(`[${lang}] ${msg}`); };
const warnings = [];
const warn = (lang, msg) => { warnings.push(`[${lang}] ${msg}`); };

// ── профили языков: имена файлов и полей различаются по курсам ──────────────────────────────────────────────────────────
// tiles/alternatives/accepted/rev — откуда брать поле; hintKeys — где лежат ключи подсказок (словарь ui курса)
const PROFILES = {
  en: { dir: 'EN', zip: 'en', adapter: (n) => `classic-adapter/EN-${pad2(n)}.json`, intro: (n) => `classic-intro/EN-${pad2(n)}.json`,
    theory: (n) => `classic-theory/EN-${pad2(n)}.json`, idRe: /^en-classic-r1:\d\d\.\d\d$/, target: 'english', fmt: 'studio2',
    tiles: 'words', alternatives: 'alternatives', accepted: null, answers: null, rev: null, sums: null },
  es: { dir: 'ES', zip: 'big', adapter: (n) => `classic-adapter/ES-${pad2(n)}.phrases.json`, intro: (n) => `classic-intro/ES-${pad2(n)}.intro.json`,
    theory: (n) => `classic-theory/ES-${pad2(n)}.theory.json`, idRe: /^es:\d\d:\d\d$/, target: 'spanish', fmt: 'studio2',
    tiles: 'words', alternatives: 'alternativesEs', accepted: null, answers: 'answerPathsEs', rev: 'contentRevision', sums: 'SHA256SUMS.txt' },
  fr: { dir: 'FR', zip: 'big', adapter: (n) => `classic-adapter/FR-${pad2(n)}.json`, intro: (n) => `classic-intro/FR-${pad2(n)}.json`,
    theory: (n) => `classic-theory/FR-${pad2(n)}.json`, idRe: /^fr:\d\d:\d\d$/, target: 'french', fmt: 'chapters',
    tiles: 'wordsFr', alternatives: 'alternativesFr', accepted: 'acceptedTokenPaths', answers: null, rev: 'contentFingerprint', sums: 'FR/SHA256SUMS.txt' },
  de: { dir: 'DE', zip: 'big', adapter: (n) => `classic-adapter/DE-${pad2(n)}.json`, intro: (n) => `classic-intro/DE-${pad2(n)}.json`,
    theory: (n) => `classic-theory/DE-${pad2(n)}.json`, idRe: /^de:\d\d:\d\d$/, target: 'german', fmt: 'chapters',
    tiles: 'wordsDe', alternatives: 'alternativesDe', accepted: 'acceptedTokenPaths', answers: null, rev: 'revision', sums: 'DE/SHA256SUMS.txt' },
  it: { dir: 'IT', zip: 'big', adapter: (n) => `classic-adapter/IT-${pad2(n)}.json`, intro: (n) => `classic-intro/IT-${pad2(n)}.json`,
    theory: (n) => `classic-theory/IT-${pad2(n)}.json`, idRe: /^it:\d\d:\d\d$/, target: 'italian', fmt: 'chapters',
    tiles: 'wordsIt', alternatives: 'alternativesIt', accepted: 'acceptedTokenPaths', answers: null, rev: 'contentFingerprint', sums: 'IT/SHA256SUMS.txt' },
};

function introText(block, loc, key) {
  const byLocale = block[`${key}ByLocale`];
  const v = byLocale?.[loc];
  // FR/DE/IT: textByLocale[loc] — список абзацев, titleByLocale[loc] — строка
  if (nonEmpty(v) || (Array.isArray(v) && v.length && v.every(nonEmpty))) return v;
  for (const s of [].concat(INTRO_SUFFIX[loc])) if (nonEmpty(block[`${key}${s}`])) return block[`${key}${s}`];
  return null;
}

function loadSums(zip, file) {
  const map = new Map();
  if (!file) return map;
  const prefix = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
  for (const line of zip.read(file).toString('utf8').split(/\r?\n/)) {
    const m = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line.trim());
    if (m) map.set(prefix + m[2], m[1]);
  }
  return map;
}

// Испанский: answerPathsEs — строки; токены = слова без ¿ ¡ и знаков препинания (как acceptedTokenPaths у FR/DE/IT)
const esTokens = (s) => s.replace(/[¿¡?!.,;:«»"]/g, ' ').split(/\s+/).filter(Boolean);

function buildPhrase(lang, prof, r, where) {
  let tiles = (r[prof.tiles] ?? []).map((w) => ({ text: w.text, correct: w.correct, distractors: w.distractors ?? [] }));
  // зачем (Координатор 04.11): точечные правки target по блокерам аудита (it:13:50 порядок слов, fr:02:01 «ici» → «là»); число плиток и их
  // позиции сохраняются, допустимые ответы и прежний target уходят в alternatives/accepted. Соблазны перепроверит fixDistractors.
  const auditKey = (() => { const m = /(\d\d)[.:](\d\d)$/.exec(r.id); return m ? `${lang}:${m[1]}:${m[2]}` : ''; })();
  let tp = PATCHES.targets?.[auditKey];
  // целевая фраза из полного прохода: только если число слов совпадает с числом плиток (позиции и число плиток не меняем); прежняя уходит в допустимые
  const auditTarget = !tp ? AUDIT.target?.[auditKey] : null;
  if (auditTarget) {
    const toks = tokenizeLine(auditTarget);
    if (toks.length !== tiles.length) auditStats.targetSkipped++;
    else {
      const oldTarget = r[prof.target];
      const oldPaths = prof.accepted ? (r[prof.accepted] ?? []) : (r[prof.answers] ?? []).map(tokenizeLine);
      tp = {
        target: auditTarget, tiles: toks,
        accepted: [toks, ...oldPaths.filter((pth) => pth.join(' ').toLowerCase() !== toks.join(' ').toLowerCase())],
        alternatives: [...new Set([oldTarget, ...(r[prof.alternatives] ?? [])])].filter((x) => x !== auditTarget),
        answers: prof.answers ? [...new Set([auditTarget, oldTarget, ...(r[prof.answers] ?? [])])] : undefined,
      };
      auditStats.targetApplied++;
    }
  }
  if (tp) {
    if (tp.tiles.length !== tiles.length && !tp.allowTileCountChange) fail(lang, `${where}: правка target меняет число плиток`);
    tiles = tp.tiles.map((correct, i) => {
      const same = tiles.find((t) => t.correct === correct);
      return same ? { ...same } : { text: correct, correct, distractors: [...(tiles[i] ?? tiles[tiles.length - 1]).distractors] };
    });
  }
  if (!tiles.length || tiles.some((t) => !nonEmpty(t.text) || !nonEmpty(t.correct))) fail(lang, `${where}: пустые плитки`);
  const target = tp ? tp.target : r[prof.target];
  if (!nonEmpty(target)) fail(lang, `${where}: пустая цель`);
  // sourceLocales: все 9 языков интерфейса; у EN часть лежит в верхних полях (english/russian/ukrainian/spanish)
  const src = { ...(r.sourceLocales ?? {}) };
  if (!src.en && nonEmpty(r.english) && lang !== 'en') src.en = r.english;
  if (lang === 'en') { src.en = r.english; src.ru = r.russian; src.uk = r.ukrainian; src.es = r.spanish; }
  const fixKey = (() => { const m = /(\d\d)[.:](\d\d)$/.exec(r.id); return m ? `${lang}:${m[1]}:${m[2]}` : ''; })();
  const tfix = TRANSLATION_FIXES.get(fixKey);
  if (tfix) { usedTranslationFixes.add(fixKey); for (const l of ['ru', 'uk']) if (nonEmpty(tfix[l])) src[l] = tfix[l]; }
  if (tp) for (const l of ['ru', 'uk']) if (nonEmpty(tp[l])) src[l] = tp[l];
  // ru/uk: убираем невидимые символы нулевой ширины и добавляем конечный знак, если его нет (Координатор 04.11, EN 07.21/07.46/08.19)
  for (const l of ['ru', 'uk']) {
    if (typeof src[l] !== 'string') continue;
    let t = src[l].replace(/[​‌‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim();
    if (t && !/[.?!…»"”)]$/.test(t)) t += /[?!]$/.test(target.trim()) ? target.trim().slice(-1) : '.';
    if (t !== src[l]) translationNormalized.n++;
    src[l] = t;
  }
  const sourceLocales = {};
  for (const l of LOCALES) {
    if (!nonEmpty(src[l])) fail(lang, `${where}: нет подсказки ${l}`);
    sourceLocales[l] = src[l];
  }
  let alts = r[prof.alternatives] ?? [];
  const ap0 = PATCHES.answers?.[r.id];
  if (ap0) alts = [...new Set(alts.filter((x) => !(ap0.remove ?? []).includes(x)).map((x) => Object.entries(ap0.replace ?? {}).reduce((acc, [from, to]) => acc.split(from).join(to), x)).concat(ap0.add ?? []))];
  if (tp?.alternatives) alts = tp.alternatives;
  const out = { id: r.id, target, tiles, alternatives: alts };
  if (prof.accepted) {
    out.accepted = tp?.accepted ?? r[prof.accepted];
    if (!Array.isArray(out.accepted) || !out.accepted.length || out.accepted.some((p) => !Array.isArray(p) || !p.length || p.some((t) => !nonEmpty(t)))) fail(lang, `${where}: пустые ${prof.accepted}`);
  }
  if (prof.answers) {
    let a = tp?.answers ?? r[prof.answers];
    const ap = PATCHES.answers?.[r.id];
    if (ap && Array.isArray(a)) {
      a = a.filter((x) => !(ap.remove ?? []).includes(x)).map((x) => Object.entries(ap.replace ?? {}).reduce((acc, [from, to]) => acc.split(from).join(to), x));
      for (const x of ap.add ?? []) if (!a.includes(x)) a.push(x);
      a = [...new Set(a)];
    }
    if (!Array.isArray(a) || !a.length || a.some((x) => !nonEmpty(x))) fail(lang, `${where}: пустые ${prof.answers}`);
    out.answers = a;
    out.accepted = a.map(esTokens);
    // страховка: первый (канонический) путь должен совпасть с плитками в порядке
    if (JSON.stringify(out.accepted[0]) !== JSON.stringify(tiles.map((t) => t.correct))) fail(lang, `${where}: канонический ответ не равен плиткам`);
  }
  // допустимые ответы из полного прохода: remove — только из текущего списка, канонический путь не трогаем; add — новый путь + строка
  const al = AUDIT.alt?.[auditKey];
  if (al) {
    for (const rem of al.remove ?? []) {
      const had = out.alternatives.includes(rem) || (out.answers ?? []).includes(rem);
      if (!had) continue;
      out.alternatives = out.alternatives.filter((x) => x !== rem);
      if (out.answers) out.answers = out.answers.filter((x, idx) => idx === 0 || x !== rem);
      if (out.accepted) out.accepted = out.accepted.filter((pth, idx) => idx === 0 || keyOf(pth) !== keyOf(tokenizeLine(rem)));
      auditStats.altRemoved++;
    }
    for (const add of al.add ?? []) {
      if (add === target || out.alternatives.includes(add)) continue;
      const path = tokenizeLine(add);
      if (!path.length) continue;
      out.alternatives.push(add);
      if (out.answers && !out.answers.includes(add)) out.answers.push(add);
      if (out.accepted && !out.accepted.some((pth) => keyOf(pth) === keyOf(path))) out.accepted.push(path);
      auditStats.altAdded++;
    }
  }
  // сторож фрагментов: ru/uk — полная фраза (≥2 слов при целевой фразе ≥2 слов, знак конца, длина соизмерима с целью)
  for (const l of ['ru', 'uk']) {
    const t = sourceLocales[l];
    const tw = target.trim().split(/\s+/).length;
    const ratio = t.length / Math.max(1, target.trim().length);
    if (tw >= 4 && t.split(/\s+/).length < 2) fail(lang, `${where}: перевод ${l} — фрагмент «${t}»`);
    else if (ratio < 0.3 || ratio > 4) fail(lang, `${where}: перевод ${l} несоизмерим с целью (${t.length}/${target.trim().length}) «${t}»`);
    if (!/[.?!…»"”)]$/.test(t)) fail(lang, `${where}: перевод ${l} без знака конца «${t}»`);
  }
  out.sourceLocales = sourceLocales;
  const keys = [].concat(r.clarifierKeys ?? r.contextCueKeys ?? (nonEmpty(r.clarifierKey) ? [r.clarifierKey] : []));
  out.clarifierKeys = keys;
  out.wordNoteKeys = r.wordNoteKeys ?? [];
  if (out.wordNoteKeys.length && out.wordNoteKeys.length !== tiles.length) fail(lang, `${where}: wordNoteKeys ${out.wordNoteKeys.length} ≠ плиток ${tiles.length}`);
  out.rev = prof.rev ? r[prof.rev] : sha256(JSON.stringify([target, tiles, out.alternatives])).slice(0, 20);
  if (!nonEmpty(out.rev)) fail(lang, `${where}: нет rev`);
  // ES: подсказки контекста (кто говорит и кому) — только непустые
  if (lang === 'es') {
    if (r.context && (nonEmpty(r.context.ru) || nonEmpty(r.context.uk))) out.context = r.context;
    if (r.contextCue) out.contextCue = r.contextCue;
  }
  return out;
}

function buildGlossary(lang, prof, take, zips) {
  const lemmas = [];
  const usedEsOverrides = new Set();
  if (lang === 'en') {
    const g = take('glossary.json');
    const copy = take('copy.json');
    for (const [key, e] of Object.entries(g)) {
      // v3: у 45 глосс (формы вроде leads, spoons, boots) нет переводов ни в copy.json, ни где-либо ещё в архиве — кладём только en
      // и предупреждаем (не ошибка): решение о запасном тексте — за Ядром
      let meaning = copy[e.gloss];
      const ov = OVERRIDES.en?.[key];
      if (ov) {
        for (const l of overrideLocales) if (!nonEmpty(ov[l])) fail(lang, `правка словаря ${key}: нет ${l}`);
        meaning = { ...(meaning ?? {}), en: e.gloss, ...ov };
      } else if (!meaning || LOCALES.some((l) => !nonEmpty(meaning[l]))) { warn(lang, `словарь ${key}: «${e.gloss}» только на английском`); meaning = { en: e.gloss }; }
      lemmas.push({ lemma: e.head, meaning: Object.fromEntries(LOCALES.filter((l) => nonEmpty(meaning[l])).map((l) => [l, meaning[l]])), firstLesson: e.first, phraseIds: e.refs.map((x) => `en-classic-r1:${x}`) });
    }
  } else if (lang === 'es') {
    const led = take('ledger.json');
    for (const [key, e] of Object.entries(led)) {
      if (LOCALES.some((l) => !nonEmpty(e.glosses?.[l]))) fail(lang, `словарь ${key}: глосса не на 9 языках`);
      const ov = OVERRIDES.es?.[e.lemma];
      if (ov) { usedEsOverrides.add(e.lemma); for (const [l, v] of Object.entries(ov)) { if (!nonEmpty(v) || l === 'pl') fail(lang, `правка словаря ${e.lemma}: ${l}`); } }
      lemmas.push({ lemma: e.lemma, meaning: Object.fromEntries(LOCALES.map((l) => [l, ov?.[l] ?? e.glosses?.[l]])), firstLesson: Number(String(e.firstLesson).split(':')[1]), phraseIds: e.examples });
    }
  } else {
    const led = take('ledger.json');
    const texts = take('course.json').texts;
    for (const e of led) {
      const m = texts[e.gloss];
      if (!m || LOCALES.some((l) => !nonEmpty(m[l]))) { fail(lang, `словарь ${e.id}: глосса «${e.gloss}» не на 9 языках`); continue; }
      // DE: в ledger нет firstLesson — номер урока берём из id первой фразы (de:01:01 → 1)
      const firstLesson = e.firstLesson ?? Number(String(e.first).split(':')[1]);
      if (!Number.isInteger(firstLesson) || firstLesson < 1 || firstLesson > 32) fail(lang, `словарь ${e.id}: нет первого урока`);
      lemmas.push({ lemma: e.term, meaning: Object.fromEntries(LOCALES.map((l) => [l, m[l]])), firstLesson, phraseIds: e.examples });
    }
  }
  if (lang === 'es') for (const k of Object.keys(OVERRIDES.es ?? {})) if (!usedEsOverrides.has(k)) fail(lang, `правка словаря: лемма «${k}» не найдена`);
  if (lang === 'en') for (const k of Object.keys(OVERRIDES.en ?? {})) if (!lemmas.length || !Object.hasOwn(take('glossary.json'), k)) fail(lang, `правка словаря: ключ «${k}» не найден`);
  return { lemmas };
}

// зачем (Ядро 04.11, решение владельца): в классических курсах пока ТОЛЬКО системный TTS телефона — никаких полей озвучки,
// ссылок на предзаписанный голос и http-ссылок в lessons/intro/theory/glossary/ui. Находки считаем ошибкой, а не вычищаем молча.
const FORBIDDEN_KEY = /^(audio|voice|tts)/i;
const FORBIDDEN_VALUE = /\.(mp3|ogg|m4a)|https?:\/\//i;
function scanForbidden(lang, name, node, path = '') {
  if (Array.isArray(node)) { node.forEach((v, i) => scanForbidden(lang, name, v, `${path}[${i}]`)); return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (FORBIDDEN_KEY.test(k)) fail(lang, `${name}${path}.${k}: ключ озвучки`);
      scanForbidden(lang, name, v, `${path}.${k}`);
    }
  } else if (typeof node === 'string' && FORBIDDEN_VALUE.test(node)) fail(lang, `${name}${path}: аудио/http-ссылка «${node.slice(0, 60)}»`);
}

// ── плитки-соблазны (Координатор 04.11, аудит выборки): правим только distractors, позиции фраз и число плиток не меняем ──────────
// Правила: (1) регистр: одинокое «i» → «I», соблазн = правильному слову без учёта регистра — убрать; (2) соблазн, равный ДРУГОМУ
// правильному слову той же фразы — убрать; (3) числительные и имена вместо слова другого типа — убрать; (4) подстановка соблазна на
// свою позицию даёт принимаемую фразу (accepted / alternatives) — убрать. Замена берётся из пула: соблазны других плиток с тем же
// окончанием правильного слова (3 → 2 → 1 знака), того же регистра, по убыванию частоты. Результат детерминирован.
const LISTS = JSON.parse(readFileSync(join(ROOT, 'scripts', 'classic_distractor_lists.json'), 'utf8'));
const PATCHES = JSON.parse(readFileSync(join(ROOT, 'scripts', 'classic_distractor_patches.json'), 'utf8'));
const NAME_LANGS = new Set(['en', 'es', 'fr', 'it']);
const CAT_NAME_LANGS = new Set(['es', 'fr', 'it']); // «имя вместо слова другого типа» — только там, где соблазны-имена не строчные как в EN // в немецком существительные с заглавной, в EN соблазны в архиве все строчные (English, Fridays) — имён по регистру не выделить
const upperFirst = (t) => t[0] !== t[0].toLowerCase();
const stripP = (t) => t.toLowerCase().replace(/[.,!?;:¿¡]/g, '');
const keyOf = (tokens) => tokens.map(stripP).join(' ');
const suffixKey = (t, n) => stripP(t).slice(-n);

function phraseKeys(ph) {
  const corrects = ph.tiles.map((t) => t.correct);
  const acc = new Set([keyOf(corrects), ...(ph.accepted ?? []).map(keyOf), ...ph.alternatives.map((a) => keyOf(a.split(/\s+/)))]);
  return { corrects, acc };
}

// Причина, по которой соблазн d на плитке i недопустим (null — допустим). Порядок = приоритет учёта в статистике.
function phraseNumbers(id) { const m = /(\d\d)[.:](\d\d)$/.exec(id); return m ? { lesson: Number(m[1]), key: `${m[1]}:${m[2]}` } : { lesson: 99, key: id }; }
const sameGroup = (groups, a, b) => groups.some((g) => g.includes(a) && g.includes(b));
const noAccent = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
function sibling(tails, a0, b0) {
  const a = noAccent(a0);
  const b = noAccent(b0);
  if (!tails.length || a === b) return false;
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  return p >= 3 && tails.includes(a.slice(p)) && tails.includes(b.slice(p)) && a.length - p <= 4 && b.length - p <= 4;
}
// зачем (Координатор 04.11, повторная проверка ES): русское «вы» (или фраза без указания лица) не различает 2-е лицо, вежливое и множественное —
// все такие формы того же глагола/местоимения нельзя ставить соблазнами; там, где в переводе явно «я/ты/он/она/мы/они», контраст форм оставляем
const RU_VY = /(^|[^а-яё])(вы|вас|вам|вами|ваш[а-яё]*)(?![а-яё])/i;
const RU_OTHER = /(^|[^а-яё])(я|мы|ты|он|она|оно|они|меня|мне|нас|нам|тебя|тебе|его|её|ее|им|ей|ему|их|ним|ней|ними)(?![а-яё])/i;
function youApplies(ph) {
  const ru = ph.sourceLocales?.ru ?? '';
  return RU_VY.test(ru) || !RU_OTHER.test(ru);
}
// род без признака в ru: «они/мы/вы» не различает ils/elles, prêts/prêtes, stanchi/stanche — пары только по роду не соблазны друг для друга
function genderPair(lang, a0, b0) {
  const a = noAccent(a0);
  const b = noAccent(b0);
  if (a === b || a.length < 3 || b.length < 3) return false;
  if (lang === 'fr') return a + 'e' === b || b + 'e' === a || (a.endsWith('s') && b.endsWith('es') && a.slice(0, -1) + 'es' === b) || (b.endsWith('s') && a.endsWith('es') && b.slice(0, -1) + 'es' === a);
  const stem = a.slice(0, -1);
  if (stem !== b.slice(0, -1)) return false;
  const e = a.slice(-1) + b.slice(-1);
  if (lang === 'es') return e === 'oa' || e === 'ao';
  if (lang === 'it') return e === 'oa' || e === 'ao' || e === 'ie' || e === 'ei';
  return false;
}
function badReason(lang, ctx, ph, i, d, mine) {
  const { corrects, acc } = phraseKeys(ph);
  const tile = ph.tiles[i];
  const c = stripP(tile.correct);
  const dd = stripP(d);
  const isNum = ctx.numbers.has(c);
  const isName = ctx.nameTile.get(tile) === true;
  const { lesson, key } = phraseNumbers(ph.id);
  if (!/^[\p{L}][\p{L}'’-]*$/u.test(d)) return 'nonWord';
  if (dd === c) return 'selfCase';
  if (corrects.some((x, j) => j !== i && stripP(x) === dd)) return 'otherCorrect';
  if (ctx.patch.get(`${lang}:${key}`)?.has(dd)) return 'patch';
  // артикль: где язык различает род/число, запрещена только пара «тот же род и число, другая определённость» (el↔un, la↔una), прочие артикли — заведомо неверные соблазны
  if (ctx.articles.has(c) && ctx.articles.has(dd) && (!ctx.artPairs || ctx.artPairs.some(([a, b]) => (a === c && b === dd) || (a === dd && b === c)))) return 'article';
  if (sameGroup(ctx.synonyms, c, dd)) return 'synonym';
  if (genderPair(lang, c, dd)) return 'genderPair';
  if (youApplies(ph) && (sameGroup(ctx.youGroups, c, dd) || sibling(ctx.tails, c, dd))) return 'youForm';
  // DE, уроки Perfekt (16–17): hatte/war на месте вспомогательного habe/ist — плюсквамперфект/претерит тоже верны (Координатор 04.11)
  const pa = LISTS.perfektAux?.[lang];
  if (pa && pa.lessons.includes(lesson) && pa.correct.includes(c) && pa.forbid.includes(dd)) return 'pos';
  // регистр соблазна внутри фразы должен совпадать с плиткой (Hängt, Wartest, Kisten выдают себя): исключение — «I» и первая плитка
  if (i > 0 && tile.correct !== 'I' && upperFirst(d) !== upperFirst(tile.correct)) return 'caseMismatch';
  if (lang === 'de' && ctx.timeAdv.has(dd) && !ctx.timeAdv.has(c)) return 'pos';
  // зачем (Координатор 04.11, аудит №3 ES): предлог заменяем предлогом, союз — союзом; предлог/союз на месте существительного или глагола недопустим;
  // «fuera» — только к наречиям места, в глагольной позиции его принимают за форму ser
  const classOf = (w) => (ctx.closed.prep.includes(w) ? 'prep' : ctx.closed.conj.includes(w) ? 'conj' : null);
  const cc = classOf(c);
  const dc = classOf(dd);
  if (!ctx.relax) {
    if (cc && dc !== cc) return 'posClass';
    if (!cc && dc && !ctx.articles.has(c) && !isNum && !isName) return 'posClass';
  }
  if (ctx.adverbOnly && ctx.adverbOnly.words.includes(dd) && !ctx.adverbOnly.allowedFor.includes(c)) return 'posClass';
  if (lang === 'es' && c === 'fuera' && ctx.serForms.has(dd) && !/^(si|que|como|aunque)$/i.test(corrects[i - 1] ?? '')) return 'pos';
  if (ctx.numbers.has(dd) !== isNum || (!ctx.relax && CAT_NAME_LANGS.has(lang) && ctx.names.has(d) !== isName)) return 'category';
  const seen = ctx.vocab.get(dd);
  // зачем: «без форм из ещё не пройденных уроков» (Координатор 04.11); допуск +2 урока, иначе в уроках 1–3 не из чего выбирать; числительные не режем
  if (!isNum && !isName && !dc && !ctx.relax && (seen === undefined || seen > lesson + Math.max(1, 8 - lesson))) return 'unseen';
  if (acc.has(keyOf(corrects.map((x, j) => (j === i ? d : x))))) return 'acceptedPhrase';
  if (mine.some((x) => stripP(x) === dd)) return 'duplicate';
  return null;
}

function buildContext(lang, all) {
  const numbers = new Set(LISTS.numbers[lang] ?? []);
  const names = new Set();
  if (NAME_LANGS.has(lang)) {
    const lower = new Set();
    for (const ph of all) for (const t of ph.tiles) if (!upperFirst(t.correct)) lower.add(t.correct);
    for (const ph of all) ph.tiles.forEach((t, i) => { if (i > 0 && upperFirst(t.correct) && t.correct !== 'I' && !lower.has(t.correct.toLowerCase())) names.add(t.correct); });
  }
  // плитка-имя: правильное слово — известное имя, либо с заглавной и большинство соблазнов — известные имена (имя в начале фразы)
  // EN: слова начала фразы (She, The, There…) попадают в «имена» из-за реплик с точкой внутри фразы — убираем служебные слова
  // EN: дни недели и месяцы — собственные имена, даже если стоят первым словом фразы
  if (lang === 'en') for (const w of 'Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December'.split(' ')) names.add(w);
  if (lang === 'en') for (const w of 'he she they we you it i the a an this that these those there here what who whom whose when where how why which is are am was were do does did can could will would should may might must have has had not no yes please thanks'.split(' ')) names.delete(w[0].toUpperCase() + w.slice(1));
  const nameTile = new Map();
  const baseNames = new Set(names);
  const fnWords = new Set([...(LISTS.closedClasses?.[lang]?.prep ?? []), ...(LISTS.closedClasses?.[lang]?.conj ?? []), ...(LISTS.articles?.[lang] ?? [])]);
  if (NAME_LANGS.has(lang)) {
    for (let round = 0; round < 2; round++) {
      for (const ph of all) for (const t of ph.tiles) {
        // имя — только по известным именам из ответов; служебные слова и вопросительные слова с заглавной в начале фразы именами не считаются
        const isN = !fnWords.has(stripP(t.correct)) && (baseNames.has(t.correct) || (lang !== 'en' && upperFirst(t.correct) && t.distractors.length && t.distractors.filter((d) => baseNames.has(d)).length * 2 >= t.distractors.length));
        nameTile.set(t, isN);
        // EN: имена не расширяем соблазнами (иначе в «имена» попадают You/We/They) — берём только имена из правильных ответов
        if (isN && lang !== 'en') { names.add(t.correct); for (const d of t.distractors) if (d !== 'I' && /^[\p{L}]+$/u.test(d)) names.add(d[0].toUpperCase() + d.slice(1)); }
      }
    }
  }
  for (const w of LISTS.properNouns?.[lang] ?? []) names.add(w);
  // служебные слова (предлоги, союзы, артикли) не имена, даже если стоят с заглавной в начале фразы
  const fn = [...(LISTS.closedClasses?.[lang]?.prep ?? []), ...(LISTS.closedClasses?.[lang]?.conj ?? []), ...(LISTS.articles?.[lang] ?? [])];
  for (const w of fn) names.delete(w[0].toUpperCase() + w.slice(1));
  const sets = (arr) => new Set(arr ?? []);
  // словарь «что уже пройдено»: слово → первый урок, где оно встречается в правильном ответе, допустимых путях или альтернативах
  const vocab = new Map();
  for (const ph of all) {
    const { lesson } = phraseNumbers(ph.id);
    const toks = [...ph.tiles.map((t) => t.correct), ...(ph.accepted ?? []).flat(), ...ph.alternatives.flatMap((a) => a.split(/\s+/))];
    for (const t of toks) { const k = stripP(t); if (k && (!vocab.has(k) || vocab.get(k) > lesson)) vocab.set(k, lesson); }
  }
  // словарь «вторых верных фраз» курса: все целевые фразы, допустимые пути и альтернативы (для проверки новых соблазнов из полного прохода)
  const globalKeys = new Set();
  for (const ph of all) {
    globalKeys.add(keyOf(ph.tiles.map((t) => t.correct)));
    for (const pth of ph.accepted ?? []) globalKeys.add(keyOf(pth));
    for (const a of ph.alternatives) globalKeys.add(keyOf(tokenizeLine(a)));
  }
  const patch = new Map();
  for (const [k, toks] of Object.entries(PATCHES.remove ?? {})) patch.set(k, new Set(toks.map(stripP)));
  if (process.env.DEBUG_NAMES) console.log(`имена ${lang}: ${[...names].filter((n) => /^(He|She|They|We|You|It|The|A|There|This)$/.test(n)).join(',')} всего ${names.size}`);
  return {
    numbers, names, nameTile, vocab, patch, globalKeys,
    articles: sets(LISTS.articles?.[lang]), synonyms: LISTS.synonyms?.[lang] ?? [], youGroups: LISTS.youGroups?.[lang] ?? [],
    replace: new Map(Object.entries(PATCHES.replace ?? {})), artPairs: LISTS.articlePairs?.[lang] ?? null,
    closed: LISTS.closedClasses?.[lang] ?? { prep: [], conj: [] }, adverbOnly: LISTS.adverbOnly?.[lang] ?? null,
    tails: LISTS.siblingTails?.[lang] ?? [], timeAdv: sets(LISTS.timeAdverbs?.[lang]), serForms: sets(LISTS.serForms?.[lang]),
  };
}

function auditDistractors(lang, all, ctxIn) {
  const ctx = ctxIn ?? buildContext(lang, all);
  const found = {};
  for (const ph of all) ph.tiles.forEach((tile, i) => {
    const seen = [];
    for (const d of tile.distractors) {
      if (auditForced.has(`${ph.id}#${i}:${d}`)) { seen.push(d); continue; }
      const why = badReason(lang, ctx, ph, i, d, seen);
      if (why) found[why] = (found[why] ?? 0) + 1;
      seen.push(d);
    }
    if (lang === 'en' && tile.distractors.some((d) => /^i(['’]|$)/.test(d))) found.lowerI = (found.lowerI ?? 0) + 1;
  });
  return found;
}

function fixDistractors(lang, all) {
  const ctx = buildContext(lang, all);
  // пул замен: слово → сколько раз встречалось как соблазн в плитках с окончанием n
  const pool = { 3: new Map(), 2: new Map(), 1: new Map() };
  for (const ph of all) for (const t of ph.tiles) for (const d of t.distractors) for (const n of [3, 2, 1]) {
    const k = suffixKey(t.correct, n);
    if (!pool[n].has(k)) pool[n].set(k, new Map());
    const m = pool[n].get(k);
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  // соседство: слова, встречавшиеся в одной плитке (правильное + соблазны) — так замена остаётся «того же типа» (формы глагола к глаголу)
  const cooc = new Map();
  for (const ph of all) for (const t of ph.tiles) {
    const set = [t.correct, ...t.distractors];
    for (const a of set) { if (!cooc.has(a)) cooc.set(a, new Map()); const m = cooc.get(a); for (const b of set) if (a !== b) m.set(b, (m.get(b) ?? 0) + 1); }
  }
  const everything = new Map();
  for (const m of pool[1].values()) for (const [d, c] of m) everything.set(d, (everything.get(d) ?? 0) + c);
  const removed = { caseFixed: 0, refilled: 0, short: 0 };
  const youPhrases = new Set();
  const shortSamples = [];
  for (const ph of all) {
    ph.tiles.forEach((tile, i) => {
      const want = tile.distractors.length;
      const kept = [];
      const rep = ctx.replace.get(`${lang}:${phraseNumbers(ph.id).key}`) ?? [];
      for (let d of tile.distractors) {
        const forced = rep.find((r) => stripP(r.from) === stripP(d));
        if (forced) { kept.push(upperFirst(d) ? forced.to[0].toUpperCase() + forced.to.slice(1) : forced.to); removed.patchReplaced = (removed.patchReplaced ?? 0) + 1; continue; }
        if (lang === 'en' && /^i(['’]|$)/.test(d)) { d = 'I' + d.slice(1); removed.caseFixed++; }
        if (ctx.nameTile.get(tile) === true && !upperFirst(d) && ctx.names.has(d[0].toUpperCase() + d.slice(1))) { d = d[0].toUpperCase() + d.slice(1); removed.caseFixed++; }
        const why = badReason(lang, ctx, ph, i, d, kept);
        if (process.env.DEBUG_TILE === `${ph.id}#${i}`) console.log('tile', d, why);
        if (why === 'youForm') youPhrases.add(ph.id);
        if (why) removed[why] = (removed[why] ?? 0) + 1; else kept.push(d);
      }
      if (kept.length < want) {
        // английские соблазны в архиве строчные даже у первой плитки (You → he, they); в остальных языках первая плитка с заглавной
        // внутри фразы регистр соблазна обязан совпасть с плиткой (правило caseMismatch); первая плитка EN — строчные соблазны, остальные языки — как плитка
        const upperWanted = i > 0 && tile.correct !== 'I' ? upperFirst(tile.correct) : kept.length ? kept.filter(upperFirst).length * 2 > kept.length : (lang === 'en' ? ctx.nameTile.get(tile) === true : upperFirst(tile.correct));
        const tried = new Set();
        // тайл-артикль: вместо чужих артиклей — притяжательные/указательные слова (грамматически неверная замена)
        if (ctx.articles.has(stripP(tile.correct))) for (const sub of LISTS.articleSubstitutes?.[lang] ?? []) {
          if (kept.length >= want) break;
          const c = upperFirst(tile.correct) && upperWanted ? sub[0].toUpperCase() + sub.slice(1) : sub;
          if (!tried.has(c) && !badReason(lang, ctx, ph, i, c, kept)) { tried.add(c); kept.push(c); removed.refilled++; }
        }
        // артикль: сначала артикли другого рода/числа (el → la/los/unas — заведомо неверно), потом служебные слова
        if (ctx.articles.has(stripP(tile.correct)) && ctx.artPairs) for (const a of [...ctx.articles]) {
          if (kept.length >= want) break;
          const c = upperFirst(tile.correct) && upperWanted ? a[0].toUpperCase() + a.slice(1) : a;
          if (!tried.has(c) && !badReason(lang, ctx, ph, i, c, kept)) { tried.add(c); kept.push(c); removed.refilled++; }
        }
        // собственные имена из закрытых наборов (дни, месяцы, языки): замена только из того же набора
        for (const set of LISTS.nameSets?.[lang] ?? []) if (set.includes(tile.correct)) for (const m of set) {
          if (kept.length >= want) break;
          if (m !== tile.correct && !tried.has(m) && !badReason(lang, ctx, ph, i, m, kept)) { tried.add(m); kept.push(m); removed.refilled++; }
        }
        // плитка-имя: замены из известных имён (по частоте)
        if (ctx.nameTile.get(tile) === true && CAT_NAME_LANGS.has(lang)) {
          const nm = [...ctx.names].sort((a, b) => (everything.get(b) ?? 0) - (everything.get(a) ?? 0) || (a < b ? -1 : 1));
          for (const c of nm) {
            if (kept.length >= want) break;
            if (!tried.has(c) && !badReason(lang, ctx, ph, i, c, kept)) { tried.add(c); kept.push(c); removed.refilled++; }
          }
        }
        // предлог → предлоги, союз → союзы (по частоте в курсе)
        {
          const cl = ctx.closed.prep.includes(stripP(tile.correct)) ? ctx.closed.prep : ctx.closed.conj.includes(stripP(tile.correct)) ? ctx.closed.conj : null;
          if (cl) for (const w of [...cl].sort((a, b) => (everything.get(b) ?? 0) - (everything.get(a) ?? 0) || (a < b ? -1 : 1))) {
            if (kept.length >= want) break;
            const c = upperWanted && /^[\p{L}]/u.test(w) ? w[0].toUpperCase() + w.slice(1) : w;
            const why = tried.has(c) ? 'tried' : badReason(lang, ctx, ph, i, c, kept);
            if (process.env.DEBUG_TILE === `${ph.id}#${i}`) console.log('class-cand', c, why);
            if (!why) { tried.add(c); kept.push(c); removed.refilled++; }
          }
        }
        const anchors = [tile.correct, ...kept];
        const near = new Map();
        for (const a of anchors) for (const [c, k] of cooc.get(a) ?? []) near.set(c, (near.get(c) ?? 0) + k);
        const nearRanked = [...near.entries()].sort((a, b) => b[1] - a[1] || (everything.get(b[0]) ?? 0) - (everything.get(a[0]) ?? 0) || (a[0] < b[0] ? -1 : 1));
        // кандидат в нужном регистре: строчное имя собственное (wednesday) → Wednesday, если имя известно
        const asWanted = (c) => (upperWanted && !upperFirst(c) && /^[\p{L}]/u.test(c) ? c[0].toUpperCase() + c.slice(1) : c);
        for (const [c0] of nearRanked) {
          const c = asWanted(c0);
          if (kept.length >= want) break;
          if (tried.has(c) || /^i(['’]|$)/.test(c) || upperFirst(c) !== upperWanted || !/^[\p{L}'’-]+$/u.test(c)) continue;
          tried.add(c);
          if (!badReason(lang, ctx, ph, i, c, kept)) { kept.push(c); removed.refilled++; }
        }
        for (const n of kept.length >= want ? [] : [3, 2, 1, 0]) {
          const cands = n ? pool[n].get(suffixKey(tile.correct, n)) ?? new Map() : everything;
          const ranked = [...cands.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
          for (const [c0] of ranked) {
            const c = asWanted(c0);
            if (kept.length >= want) break;
            if (tried.has(c) || /^i(['’]|$)/.test(c) || upperFirst(c) !== upperWanted || !/^[\p{L}'’-]+$/u.test(c)) continue;
            tried.add(c);
            if (!badReason(lang, ctx, ph, i, c, kept)) { kept.push(c); removed.refilled++; }
          }
          if (kept.length >= want) break;
        }
        // запас: если по правилам класса/непройденного не набралось 5 — берём любые допустимые слова нужного регистра (всё остальное правим по-прежнему)
        if (kept.length < want) {
          const ctxR = { ...ctx, relax: true };
          const rankedAll = [...everything.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
          for (const [c0] of rankedAll) {
            if (kept.length >= want) break;
            const c = asWanted(c0);
            if (tried.has(c) || /^i(['’]|$)/.test(c) || upperFirst(c) !== upperWanted || !/^[\p{L}'’-]+$/u.test(c)) continue;
            tried.add(c);
            if (!badReason(lang, ctxR, ph, i, c, kept)) { kept.push(c); removed.refilled++; removed.relaxed = (removed.relaxed ?? 0) + 1; }
          }
        }
        if (kept.length < want) { removed.short++; if (shortSamples.length < 6) shortSamples.push(`${ph.id}#${i} ${tile.correct} ${kept.length}/${want}`); }
      }
      // правки соблазнов полного прохода: старый соблазн реально стоит → заменяем новым, который не даёт второй верной фразы (ни у этой фразы, ни в словаре курса)
      for (const op of AUDIT.tiles?.[`${lang}:${phraseNumbers(ph.id).key}`] ?? []) {
        if (op.position !== i) continue;
        const at = kept.findIndex((x) => stripP(x) === stripP(op.from));
        if (at < 0) { auditStats.tileAbsent++; continue; }
        const others = kept.filter((_, j) => j !== at);
        const cand = upperFirst(kept[at]) && !upperFirst(op.with) ? op.with[0].toUpperCase() + op.with.slice(1) : !upperFirst(kept[at]) && upperFirst(op.with) && !ctx.names.has(op.with) ? op.with[0].toLowerCase() + op.with.slice(1) : op.with;
        const why = badReason(lang, { ...ctx, relax: true }, ph, i, cand, others) ?? (ctx.globalKeys.has(keyOf(ph.tiles.map((t, j) => (j === i ? cand : t.correct)))) ? 'globalPhrase' : null);
        if (why) { auditStats.tileInvalid++; auditStats.invalidReasons[why] = (auditStats.invalidReasons[why] ?? 0) + 1; (auditStats.rejected ??= []).push({ id: ph.id, lang, pos: i, from: op.from, with: cand, why, target: ph.tiles.map((t) => t.correct).join(' '), built: ph.tiles.map((t, j) => (j === i ? cand : t.correct)).join(' '), ru: ph.translations?.ru ?? ph.ru ?? null, alts: ph.alternatives }); continue; }
        kept[at] = cand;
        auditForced.add(`${ph.id}#${i}:${cand}`);
        auditStats.tileApplied++;
      }
      // зачем (механический аудит 05.11): у EN первая плитка с заглавной, а соблазны шли строчными — заглавная выдавала верный ответ; первой позиции выравниваем регистр по верной плитке
      // EN: верная плитка «I» всегда с заглавной — строчные соблазны выдают её; соблазны этой плитки тоже пишем с заглавной
      if ((i === 0 && upperFirst(tile.correct)) || (lang === 'en' && tile.correct === 'I')) {
        const seenCase = new Set();
        const capped = [];
        for (const d of kept) { const c = d[0].toUpperCase() + d.slice(1); if (!seenCase.has(c.toLowerCase())) { seenCase.add(c.toLowerCase()); capped.push(c); } }
        kept.length = 0; kept.push(...capped);
      }
      tile.distractors = kept;
    });
  }
  removed.youFormPhrases = youPhrases.size;
  return { removed, left: auditDistractors(lang, all, ctx), shortSamples };
}


// ── допустимые формы «вы» (Координатор 04.11): для фраз, где в ru «вы» или нет указания лица, верные формы 2-го лица/вежливые/множественные
// того же глагола принимаются как ответ (accepted/alternatives/answers). Только внутри пары по числу (2sg↔3sg, 2pl↔3pl), чтобы не менялось
// согласование прилагательных; в DE (предикатив не согласуется) — любая из четырёх. Форма должна быть реальным словом курса (vocab).
// Фразы с явными местоимениями, притяжательными и клитиками пропускаем (там замена тянет за собой согласование).
const capLike = (orig, w) => (orig[0] !== orig[0].toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w);
function youVariantsOf(lang, token, vocab, afterDet = false) {
  const low = token.toLowerCase();
  const out = new Set();
  // пары форм, обе из которых годятся для «вы» без смены согласования: ES tú↔usted, vosotros↔ustedes; IT tu↔Lei; DE ihr↔Sie; FR — нет
  const pairs = { es: [[0, 1], [2, 3]], it: [[0, 1]], de: [[2, 3]], fr: [] }[lang] ?? [];
  const consider = (group, k) => {
    const mates = pairs.find((p) => p.includes(k));
    if (!mates) return;
    for (const j of mates) if (j !== k && group[j] && group[j].toLowerCase() !== low) out.add(group[j]);
  };
  for (const g of LISTS.youVerbParadigms?.[lang] ?? []) { const k = g.indexOf(low); if (k >= 0) consider(g, k); }
  for (const q of afterDet ? [] : LISTS.youRegularTails?.[lang] ?? []) {
    for (let k = 0; k < q.length; k++) {
      if (!low.endsWith(q[k]) || low.length - q[k].length < 3) continue;
      const stem = low.slice(0, low.length - q[k].length);
      const group = q.map((t) => stem + t);
      // глагол, а не существительное: в курсе встречается ≥ 3 из 4 форм этой парадигмы (llave/llaves — всего 2, это не спряжение)
      if (group.filter((w) => vocab.has(stripP(w))).length < 3) continue;
      consider(group, k);
    }
  }
  return [...out].filter((w) => vocab.has(stripP(w))).map((w) => capLike(token, w));
}
// «У вас (мн.)» — допустимы только формы множественного числа: убираем из alternatives/answers/accepted usted и формы 2/3-го лица ед.ч. того же глагола
function pruneSingularYouForms(lang, all) {
  const sg = new Set(['usted', 'tú']);
  for (const g of LISTS.youVerbParadigms?.[lang] ?? []) { sg.add(g[0].toLowerCase()); sg.add(g[1].toLowerCase()); }
  for (const ph of all) {
    if (!/\(мн\.?\)|\(мн\)|\(мн\.\)/i.test(ph.sourceLocales?.ru ?? '')) continue;
    const base = new Set(ph.tiles.map((t) => stripP(t.correct)));
    const bad = (str) => tokenizeLine(str).some((w) => sg.has(stripP(w)) && !base.has(stripP(w)));
    ph.alternatives = ph.alternatives.filter((a) => !bad(a));
    if (ph.answers) ph.answers = ph.answers.filter((a, i) => i === 0 || !bad(a));
    if (ph.accepted) ph.accepted = ph.accepted.filter((pth, i) => i === 0 || !pth.some((w) => sg.has(stripP(w)) && !base.has(stripP(w))));
  }
}
function addYouVariants(lang, all) {
  const stat = { phrases: 0, variants: 0 };
  if (!['es', 'fr', 'it', 'de'].includes(lang)) return stat;
  const skip = new Set(LISTS.youSkipTokens?.[lang] ?? []);
  const detSet = new Set([...(LISTS.articles?.[lang] ?? []), ...(LISTS.closedClasses?.[lang]?.prep ?? []), ...(LISTS.determiners?.[lang] ?? [])]);
  const vocab = new Map();
  for (const ph of all) for (const t of [...ph.tiles.map((x) => x.correct), ...(ph.accepted ?? []).flat(), ...ph.alternatives.flatMap((a) => a.split(/\s+/))]) vocab.set(stripP(t), 1);
  for (const ph of all) {
    // «Вы (вежл.)» — явная вежливая форма: принимать tu/voi нельзя
    // допустимые формы «вы» — только когда «вы» явно в ru (с подлежащим-существительным или без лица форма менять нельзя: «Anna bist hier»)
    if (!RU_VY.test(ph.sourceLocales?.ru ?? '') || /вежл|ввічл/i.test(`${ph.sourceLocales?.ru ?? ''} ${ph.sourceLocales?.uk ?? ''}`)) continue;
    const toks = ph.tiles.map((t) => t.correct);
    if (toks.some((t) => skip.has(stripP(t)))) continue;
    // строки-основы без явных местоимений («Voi siete…» + замена глагола даёт «Voi sono…»)
    const baseStrings = [ph.target, ...ph.alternatives].filter((x, i, a) => a.indexOf(x) === i && !x.split(/[\s¿?¡!.,]+/).some((w) => skip.has(w.toLowerCase())));
    const newAccepted = [];
    const newStrings = [];
    toks.forEach((tok, i) => {
      // после артикля/предлога/притяжательного стоит существительное, а не глагол — замены по окончаниям не делаем (только таблицы неправильных глаголов)
      const prev = i > 0 ? stripP(toks[i - 1]) : '';
      const afterDet = detSet.has(prev);
      for (const v of youVariantsOf(lang, tok, vocab, afterDet)) {
        const path = toks.map((x, j) => (j === i ? v : x));
        if (!(ph.accepted ?? []).some((p) => keyOf(p) === keyOf(path)) && !newAccepted.some((p) => keyOf(p) === keyOf(path))) newAccepted.push(path);
        const re = new RegExp('(?<![\\p{L}])' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])', 'u');
        for (const b of baseStrings) if (re.test(b)) { const s = b.replace(re, v); if (!ph.alternatives.includes(s) && s !== ph.target && !newStrings.includes(s)) newStrings.push(s); }
      }
    });
    if (!newAccepted.length) continue;
    if (ph.accepted) ph.accepted.push(...newAccepted);
    ph.alternatives.push(...newStrings);
    if (ph.answers) ph.answers.push(...[ph.target, ...newStrings].filter((s) => !ph.answers.includes(s)));
    stat.phrases++;
    stat.variants += newAccepted.length;
  }
  return stat;
}

function convert(lang, zips) {
  const prof = PROFILES[lang];
  if (!prof) throw new Error(`неизвестный язык ${lang}`);
  const zip = zips[prof.zip];
  const sums = loadSums(zips.big, prof.sums);
  const srcHash = {};
  const rawBytes = [...zip.entries].filter(([n]) => n.startsWith(`${prof.dir}/`)).reduce((s, [, e]) => s + e.usize, 0);
  const take = (rel) => {
    const name = `${prof.dir}/${rel}`;
    const buf = zip.read(name);
    const h = sha256(buf);
    srcHash[name] = h;
    const want = sums.get(name);
    if (want && want !== h) fail(lang, `sha256 не совпал: ${name}`);
    if (!want && prof.sums) fail(lang, `нет суммы в ${prof.sums}: ${name}`);
    return JSON.parse(buf.toString('utf8'));
  };

  const files = {};
  const intro = {};
  const theory = {};
  const ids = new Set();
  let phrases = 0;
  const hintKeys = new Set();
  for (let n = 1; n <= 32; n++) {
    const rows = take(prof.adapter(n));
    if (!Array.isArray(rows) || rows.length !== 50) fail(lang, `урок ${n}: ${rows?.length} фраз вместо 50`);
    const built = rows.map((r, i) => {
      const where = `урок ${n} фраза ${i + 1}`;
      if (!prof.idRe.test(r.id)) fail(lang, `${where}: id «${r.id}»`);
      if (ids.has(r.id)) fail(lang, `${where}: повтор id ${r.id}`);
      ids.add(r.id);
      const p = buildPhrase(lang, prof, r, where);
      for (const k of [...p.clarifierKeys, ...p.wordNoteKeys]) if (k) hintKeys.add(k);
      return p;
    });
    phrases += built.length;
    files[`lessons-${pad2(n)}.json`] = { schema: 'phraseman.classic.lesson/1', lang, lesson: n, phrases: built };

    let blocks = take(prof.intro(n));
    if (!Array.isArray(blocks) || blocks.map((b) => b.kind).join() !== 'concept,formula,practice') fail(lang, `урок ${n}: вступление не concept/formula/practice`);
    // зачем: оверрайды применяем до проверок ниже, чтобы проверка видела итоговые тексты
    blocks = applyIntroOverrides(blocks, lang, n);
    for (const b of blocks ?? []) for (const loc of LOCALES) if (!introText(b, loc, 'title') || !introText(b, loc, 'text')) fail(lang, `урок ${n} вступление ${b.kind}: нет ${loc}`);
    // заголовки — обычный текст: обратные кавычки (`je suis`) без разметки показались бы ученику буквально; в текстах и lines* разметку не трогаем
    for (const b of blocks ?? []) {
      for (const k of Object.keys(b)) if (/^title[A-Za-z]*$/.test(k) && typeof b[k] === 'string') b[k] = b[k].replace(/`/g, '');
      if (b.titleByLocale) for (const l of Object.keys(b.titleByLocale)) if (typeof b.titleByLocale[l] === 'string') b.titleByLocale[l] = b.titleByLocale[l].replace(/`/g, '');
    }
    // зачем (Координатор 04.11): рендерер вступлений не понимает разметку — обратные кавычки ученик увидел бы буквально; `слово` → «слово», одиночные убираем
    const unTick = (v) => typeof v === 'string' ? v.replace(/`([^`]+)`/g, '«$1»').replace(/`/g, '') : Array.isArray(v) ? v.map(unTick) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unTick(x)])) : v;
    blocks = unTick(blocks);
    intro[n] = blocks;

    const th = take(prof.theory(n));
    if (prof.fmt === 'studio2') {
      for (const loc of LOCALES) if (!th.localized?.[loc]) fail(lang, `урок ${n}: теория без ${loc}`);
    } else {
      if (!Array.isArray(th.chapters) || !th.chapters.length) fail(lang, `урок ${n}: теория без глав`);
      for (const ch of th.chapters ?? []) for (const loc of LOCALES) if (!nonEmpty(ch.textByLocale?.[loc])) fail(lang, `урок ${n}: глава без ${loc}`);
      for (const loc of LOCALES) if (!nonEmpty(th.title?.[loc])) fail(lang, `урок ${n}: заголовок теории без ${loc}`);
    }
    theory[n] = th;
  }
  if (phrases !== 1600) fail(lang, `всего ${phrases} фраз вместо 1600`);
  const allPhrases = Object.values(files).filter((f) => f.phrases).flatMap((f) => f.phrases);
  pruneSingularYouForms(lang, allPhrases);
  const ystat = addYouVariants(lang, allPhrases);
  const dstat = fixDistractors(lang, allPhrases);
  dstat.removed.youVariantPhrases = ystat.phrases;
  dstat.removed.youVariants = ystat.variants;
  for (const [rule, n] of Object.entries(dstat.left)) if (n) fail(lang, `соблазны: правило ${rule} — осталось ${n}`);
  if (dstat.removed.short) fail(lang, `соблазны: ${dstat.removed.short} плиток с недобором соблазнов`);
  files['intro.json'] = intro;
  files['theory.json'] = { format: prof.fmt, data: theory };
  files['glossary.json'] = buildGlossary(lang, prof, take, zips);
  if (!files['glossary.json'].lemmas.length) fail(lang, 'пустой словарь');

  // ключи подсказок (род, «друг/вы», связка…) резолвятся в ui курса: кладём только используемые, на 9 языках
  if (lang !== 'en' && hintKeys.size) {
    const ui = lang === 'es' ? { ...take('ui.json'), ...take('ui-extra.json') } : take('course.json').ui;
    const sub = {};
    for (const k of [...hintKeys].sort()) {
      if (!ui[k]) { fail(lang, `ключ подсказки «${k}» не найден в ui`); continue; }
      for (const l of LOCALES) if (!nonEmpty(ui[k][l])) fail(lang, `ключ подсказки «${k}» без ${l}`);
      sub[k] = ui[k];
    }
    files['ui.json'] = { ui: sub };
  }
  for (const [name, data] of Object.entries(files)) scanForbidden(lang, name, data);
  return { files, phrases, rawBytes, srcHash, sourceZipSha256: zip.sha, dstat };
}

function checkTranslationFixesUsed() {
  for (const k of TRANSLATION_FIXES.keys()) if (LANGS.includes(k.split(':')[0]) && !usedTranslationFixes.has(k)) fail(k.split(':')[0], `правка перевода ${k}: фраза не найдена`);
}
const zips = { big: openZip(BIG), en: LANGS.includes('en') ? openZip(EN_V3) : null };
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { schema: 'phraseman.classic.manifest/1', languages: {} };
const table = [];
for (const lang of LANGS) {
  const res = convert(lang, zips);
  const dir = join(OUT, lang);
  const fileInfo = {};
  const lessonHash = createHash('sha256');
  for (const [name, data] of Object.entries(res.files)) {
    const text = JSON.stringify(data) + '\n';
    const bytes = Buffer.byteLength(text);
    const h = sha256(text);
    fileInfo[name] = { bytes, sha256: h };
    if (name.startsWith('lessons-')) lessonHash.update(text);
    if (!CHECK_ONLY) { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, name), text); }
  }
  const index = { lang, lessons: 32, phrases: res.phrases, rev: lessonHash.digest('hex'), sourceZipSha256: res.sourceZipSha256 };
  const indexText = JSON.stringify(index) + '\n';
  fileInfo['index.json'] = { bytes: Buffer.byteLength(indexText), sha256: sha256(indexText) };
  if (!CHECK_ONLY) writeFileSync(join(dir, 'index.json'), indexText);
  manifest.languages[lang] = { ...index, files: fileInfo };
  console.log(`соблазны ${lang}: ` + JSON.stringify(res.dstat.removed) + ' осталось ' + JSON.stringify(res.dstat.left) + (res.dstat.shortSamples.length ? ' недобор: ' + res.dstat.shortSamples.join('; ') : ''));
  const sum = (f) => Object.entries(fileInfo).filter(([n]) => f(n)).reduce((s, [, i]) => s + i.bytes, 0);
  const mb = (b) => +(b / 1048576).toFixed(2);
  table.push({ lang, phrases: res.phrases, rawArchiveMB: mb(res.rawBytes), totalMB: mb(sum(() => true)), lessonsMB: mb(sum((n) => n.startsWith('lessons-'))),
    introMB: mb(sum((n) => n === 'intro.json')), theoryMB: mb(sum((n) => n === 'theory.json')), glossaryMB: mb(sum((n) => n === 'glossary.json')),
    uiMB: mb(sum((n) => n === 'ui.json')) });
  if (SAMPLE) {
    console.log(`--- ${lang} glossary sample`, JSON.stringify(res.files['glossary.json'].lemmas.slice(0, 3)));
    console.log(`--- ${lang} phrase sample`, JSON.stringify(res.files['lessons-01.json'].phrases.slice(0, 2)));
  }
}
checkTranslationFixesUsed();
manifest.languages = Object.fromEntries(Object.keys(manifest.languages).sort().map((k) => [k, manifest.languages[k]]));
if (!CHECK_ONLY && !errors.length) { mkdirSync(OUT, { recursive: true }); writeFileSync(manifestPath, JSON.stringify(manifest) + '\n'); }
if (auditStats.rejected && process.env.AUDIT_DUMP) writeFileSync(process.env.AUDIT_DUMP, JSON.stringify(auditStats.rejected, null, 1));
delete auditStats.rejected;
console.log('слой аудита: ' + JSON.stringify(auditStats));
console.log(`переводы ru/uk: исправлено невидимых символов/знаков конца: ${translationNormalized.n}`);
console.log(JSON.stringify(table));
if (warnings.length) console.log(`ПРЕДУПРЕЖДЕНИЯ (${warnings.length}): ` + warnings.slice(0, 3).join(' | ') + ' …');
if (errors.length) {
  console.error(`ОШИБКИ (${errors.length}):\n` + errors.slice(0, 60).join('\n'));
  if (!CHECK_ONLY) console.error('Файлы записаны, но проверки не прошли — не коммитить.');
  process.exitCode = 1;
}
