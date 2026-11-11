// зачем (владелец 11.11, U20 «Точный смысл»): после правки подсказок уроков теория, объяснения «почему?» и
// вступления продолжали цитировать СТАРЫЕ подсказки («I am early. — Я пришёл рано.»). Скрипт идемпотентно приводит
// цитаты к новым подсказкам, но только там, где старая подсказка однозначно привязана к своей фразе:
//   A) строка «<цель> — <старая подсказка>» внутри текста;
//   B) в массиве строк: элемент с текстом цели, сразу за ним элемент с текстом старой подсказки;
//   C) таблица переводов (объект с ключами языков), где другой язык совпадает с подсказкой той же фразы;
//   D) объект задания с phraseId этой фразы: старая подсказка в кавычках «…» / “…”.
// Свободный текст объяснений не трогается: подстановка в прозу ломает согласование — такие места выводятся списком.
// Пары «было → стало» лежат в docs/work/u20_exact_sense_2026_11_11/pairs_<lang>.json (собраны из коммитов U20),
// поэтому после любой пересборки курса скрипт можно прогнать снова.
// Запуск: node scripts/u20_sync_theory_quotes.cjs [en es fr de it] [--check]
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');
const LANGS = process.argv.slice(2).filter((a) => /^(en|es|fr|de|it)$/.test(a));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const LOCS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const core = (s) => s.replace(/[.?!…]+$/, '');

function syncLang(lang) {
  const dir = path.join(ROOT, 'modules', 'classic-courses', lang);
  const pairs = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'work', 'u20_exact_sense_2026_11_11', `pairs_${lang}.json`), 'utf8'));
  // текущие подсказки фраз — чтобы опознать фразу в таблице переводов по соседнему языку
  const hints = new Map();
  for (let i = 1; i <= 32; i++) for (const p of JSON.parse(fs.readFileSync(path.join(dir, `lessons-${String(i).padStart(2, '0')}.json`), 'utf8')).phrases) hints.set(p.id, p.sourceLocales);
  const byOld = new Map(); for (const p of pairs) { if (!byOld.has(p.old)) byOld.set(p.old, []); byOld.get(p.old).push(p); }
  const byId = new Map(); for (const p of pairs) { if (!byId.has(p.id)) byId.set(p.id, []); byId.get(p.id).push(p); }
  const oldOf = new Map(); for (const p of pairs) oldOf.set(`${p.id}|${p.loc}`, p.old);
  const stat = { A: 0, B: 0, C: 0, D: 0 };
  const textOf = (el) => (el && typeof el === 'object' && Array.isArray(el.parts) ? el.parts.map((x) => (x && typeof x.text === 'string' ? x.text : '')).join('') : (el && typeof el.text === 'string' ? el.text : null));

  function fixString(s, phraseId) {
    let t = s;
    for (const p of pairs) {
      if (!t.includes(p.target)) continue;
      for (const dash of [' — ', ' – ']) for (const [l, r] of [['', ''], ['“', '”'], ['«', '»']]) {
        const a = p.target + dash + l + p.old + r; if (t.includes(a)) { t = t.split(a).join(p.target + dash + l + p.neu + r); stat.A++; }
      }
    }
    if (phraseId && byId.has(phraseId)) for (const p of byId.get(phraseId)) for (const [l, r] of [['«', '»'], ['“', '”']]) {
      for (const [a, b] of [[l + p.old + r, l + p.neu + r], [l + core(p.old) + r, l + core(p.neu) + r]]) if (a !== b && t.includes(a)) { t = t.split(a).join(b); stat.D++; }
    }
    return t;
  }
  function walk(node, phraseId) {
    if (Array.isArray(node)) {
      for (let i = 0; i + 1 < node.length; i++) { // B
        const tgt = textOf(node[i]); const tr = textOf(node[i + 1]);
        if (tgt == null || tr == null || !byOld.has(tr)) continue;
        const p = byOld.get(tr).find((x) => x.target === tgt); if (!p) continue;
        const el = node[i + 1];
        if (Array.isArray(el.parts) && el.parts.length === 1 && el.parts[0].text === tr) { el.parts[0].text = p.neu; stat.B++; } else if (el.text === tr) { el.text = p.neu; stat.B++; }
      }
      for (let i = 0; i < node.length; i++) { if (typeof node[i] === 'string') node[i] = fixString(node[i], phraseId); else walk(node[i], phraseId); }
      return;
    }
    if (!node || typeof node !== 'object') return;
    // задание теории ссылается на фразу-ответ полем answerId, пример — полем phraseId
    const pid = typeof node.phraseId === 'string' ? node.phraseId : typeof node.answerId === 'string' ? node.answerId : phraseId;
    // E) пара {target, translation}
    if (typeof node.target === 'string' && typeof node.translation === 'string' && byOld.has(node.translation)) {
      const p = byOld.get(node.translation).find((x) => x.target === node.target);
      if (p) { node.translation = p.neu; stat.B++; }
    }
    // F) части одной строки: «цель» и следом « — старая подсказка»
    if (Array.isArray(node.parts)) for (let i = 0; i + 1 < node.parts.length; i++) {
      const a = node.parts[i], b = node.parts[i + 1];
      if (!a || !b || typeof a.text !== 'string' || typeof b.text !== 'string') continue;
      const m = /^(\s*[—–]\s*)(.*)$/.exec(b.text); if (!m || !byOld.has(m[2])) continue;
      const p = byOld.get(m[2]).find((x) => x.target === a.text.trim());
      if (p) { b.text = m[1] + p.neu; stat.B++; }
    }
    const locKeys = LOCS.filter((l) => typeof node[l] === 'string');
    if (locKeys.length >= 4) { // C
      for (const l of locKeys) { const cands = byOld.get(node[l]); if (!cands) continue;
        const p = cands.find((x) => x.loc === l && locKeys.some((k) => { if (k === l) return false; const h = hints.get(x.id); return h && (node[k] === h[k] || node[k] === oldOf.get(`${x.id}|${k}`)); }));
        if (p) { node[l] = p.neu; stat.C++; } }
    }
    for (const k of Object.keys(node)) { if (typeof node[k] === 'string') node[k] = fixString(node[k], pid); else walk(node[k], pid); }
  }

  const changedFiles = [];
  for (const name of ['theory.json', 'theory_why.json', 'intro.json']) {
    const file = path.join(dir, name); if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, 'utf8'); const data = JSON.parse(before);
    const fmt = before === JSON.stringify(data) + '\n' ? (d) => JSON.stringify(d) + '\n' : before === JSON.stringify(data, null, 1) + '\n' ? (d) => JSON.stringify(d, null, 1) + '\n' : null;
    if (!fmt) { console.log(`[U20-THEORY] ${lang}/${name}: неизвестный формат файла — пропущен`); continue; }
    walk(data, null);
    const after = fmt(data);
    if (after !== before) { changedFiles.push(name); if (!CHECK) fs.writeFileSync(file, after); }
    // остаток: старая подсказка всё ещё встречается (свободный текст) — только отчёт
    let rest = 0; for (const p of pairs) { const c = core(p.old); if (c.length >= 8 && after.includes(JSON.stringify(c).slice(1, -1))) rest++; }
    console.log(`[U20-THEORY] ${lang}/${name}: ${after !== before ? 'изменён' : 'без изменений'}; старых формулировок в свободном тексте осталось: ${rest}`);
  }
  console.log(`[U20-THEORY] ${lang}: строк «цель — перевод»: ${stat.A}, пар «пример/перевод»: ${stat.B}, таблиц переводов: ${stat.C}, заданий: ${stat.D}${CHECK ? ' (проверка, ничего не записано)' : ''}`);
  if (!CHECK && changedFiles.length) {
    const manifestPath = path.join(dir, '..', 'manifest.json'); const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const name of changedFiles) { const text = fs.readFileSync(path.join(dir, name), 'utf8'); manifest.languages[lang].files[name] = { bytes: Buffer.byteLength(text), sha256: sha(text) }; }
    // зачем: прямую перезапись manifest Windows отклоняет, пока файл открыт другим процессом — меняем через временный файл
    fs.writeFileSync(manifestPath + '.u20tmp', JSON.stringify(manifest) + '\n'); fs.renameSync(manifestPath + '.u20tmp', manifestPath);
  }
  return changedFiles;
}
for (const lang of (LANGS.length ? LANGS : ['en', 'es', 'fr', 'de', 'it'])) syncLang(lang);
