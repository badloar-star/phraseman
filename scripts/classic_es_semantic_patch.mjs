// зачем (координатор 05.11, смысловой замер Ревизора: испанский курс 22,8% при пороге 15%, docs/work/release/SEMANTIC_ES_DE_IT_2026-11-05.md):
// чиним ИСХОДНИКИ es по классам, одним проходом на шаблон, не трогая генератор соблазнов и сборщик курса. Скрипт читает текущий собранный
// курс (modules/classic-courses/es/lessons-*.json) и пишет точечные правки в scripts/classic_distractor_patches.json:
//   replace["es:LL:NN"] = [{from,to,position}] — заменить выдающий себя соблазн (сборщик всё равно проверяет: не вторая верная фраза);
//   answers["es:LL:NN"] = {add,remove} — недостающие естественные варианты ответа и лишние/неграмматичные.
// Повторный запуск идемпотентен: записи с reason "semantic-es-2026-11-05" пересобираются заново.
// Запуск: node scripts/classic_es_semantic_patch.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PATCH_FILE = path.join(ROOT, 'scripts', 'classic_distractor_patches.json');
const DRY = process.argv.includes('--dry');
const TAG = 'semantic-es-2026-11-05';

// зачем: источник — курс ДО этих правок (коммит --base, по умолчанию 3750e73c6), а не рабочее дерево: после пересборки мусорных соблазнов
// в файлах уже нет, и повторный запуск потерял бы правки (идемпотентность).
const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=3750e73c6').slice(7);
const phrases = new Map();
for (let l = 1; l <= 32; l += 1) {
  const rel = `modules/classic-courses/es/lessons-${String(l).padStart(2, '0')}.json`;
  const text = execSync(`git show ${BASE}:${rel}`, { cwd: ROOT, maxBuffer: 1e9 }).toString();
  for (const p of JSON.parse(text).phrases) phrases.set(p.id, p);
}
const lessonOf = (id) => Number(id.split(':')[1]);
const key = (id) => id; // ключи патча — те же «es:LL:NN»
const replace = {};
const answers = {};
const stats = {};
const count = (k) => { stats[k] = (stats[k] ?? 0) + 1; };
// зачем (сборка 05.11): большинство мусорных соблазнов («Cuándo», «gusta») добавляет сам добор сборщика, в архиве их нет — замена
// по «from» тогда не срабатывает. Поэтому слово ещё и запрещаем для этой фразы (remove), а «to» сборщик ставит первым кандидатом добора.
const removeW = {};
const addRep = (id, position, from, to, cls) => {
  (replace[key(id)] ??= []).push({ from, to, position });
  (removeW[key(id)] ??= []).push(from);
  count(cls);
};
const addAns = (id, add = [], remove = [], cls) => {
  const a = (answers[key(id)] ??= { add: [], remove: [] });
  for (const x of add) if (!a.add.includes(x)) a.add.push(x);
  for (const x of remove) if (!a.remove.includes(x)) a.remove.push(x);
  count(cls);
};
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const low = (s) => s[0].toLowerCase() + s.slice(1);

// ── 1. Имя на позиции имени: соблазн «Cuándo» (вопросительное слово) выдаёт себя → другое имя курса ─────────────────────────────
const NAMES = ['Pablo', 'Elena', 'Marta', 'Sara', 'Rosa'];
const NAME_RE = /^(Ana|Luis)$/;
for (const p of phrases.values()) {
  p.tiles.forEach((t, i) => {
    if (!NAME_RE.test(t.correct) || !t.distractors.includes('Cuándo')) return;
    const used = new Set([t.correct, ...t.distractors, ...p.tiles.map((x) => x.correct)]);
    const to = NAMES.find((n) => !used.has(n));
    if (to) addRep(p.id, i, 'Cuándo', to, 'name_cuando');
  });
}

// ── 2. Позиция формы estar / haber (уроки 19–20): мусор другого класса (gusta, recibido, Buscamos, Comprar…) → формы того же глагола ──
const ESTAR = ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'];
const HABER = ['he', 'has', 'ha', 'hemos', 'habéis', 'han'];
// зачем (сборка 05.11): формы «ты/вы» (estás, estáis, están, has, habéis, han) сборщик отклоняет как возможно верные (youForm) —
// в замены берём только формы, которые точно дают неверную фразу: другое лицо того же глагола или соседний глагол.
// и не «близнецы» правильной формы (общие первые 3+ буквы: estoy/está) — их сборщик тоже отклоняет; берём другой корень.
const POOL = { estar: ['es', 'son', 'ha', 'he', 'hay', 'soy'], haber: ['está', 'es', 'son', 'estoy', 'hay', 'soy'] };
for (const p of phrases.values()) {
  if (![19, 20].includes(lessonOf(p.id))) continue;
  p.tiles.forEach((t, i) => {
    const c = t.correct.toLowerCase();
    const fam = ESTAR.includes(c) ? ESTAR : HABER.includes(c) ? HABER : null;
    if (!fam) return;
    const okClass = new Set([...fam, 'es', 'son', 'hay', 'ser', 'estar', 'haber']);
    const used = new Set([t.correct.toLowerCase(), ...t.distractors.map((d) => d.toLowerCase())]);
    const pool = POOL[fam === ESTAR ? 'estar' : 'haber'].filter((f) => !used.has(f));
    for (const d of t.distractors) {
      if (okClass.has(d.toLowerCase())) continue;
      const to = pool.shift();
      if (!to) break;
      addRep(p.id, i, d, i === 0 ? cap(to) : to, 'aux_junk');
    }
  });
}

// ── 3. Урок 4: на позиции существительного артикли los/una → существительные курса того же числа ───────────────────────────────
const NOUN_SG = ['guía', 'estudiante', 'enfermera', 'profesor'];
const NOUN_PL = ['guías', 'estudiantes', 'profesores', 'enfermeras'];
for (const p of phrases.values()) {
  if (lessonOf(p.id) !== 4) continue;
  p.tiles.forEach((t, i) => {
    const bad = t.distractors.filter((d) => ['los', 'una', 'las', 'un'].includes(d));
    if (!bad.length || ['los', 'las', 'un', 'una', 'el', 'la'].includes(t.correct)) return;
    const plural = /s$/.test(t.correct);
    const used = new Set([t.correct, ...t.distractors]);
    // зачем: тот же корень другого рода («profesora» при «profesor») может дать вторую верную фразу — берём другие слова
    const stem = t.correct.replace(/(os|as|es|o|a|e)$/u, '');
    const pool = (plural ? NOUN_PL : NOUN_SG).filter((n) => !used.has(n) && !n.startsWith(stem));
    for (const d of bad) { const to = pool.shift(); if (to) addRep(p.id, i, d, to, 'l4_article_noun'); }
  });
}

// ── 4. Точечные замены из списка Ревизора ──────────────────────────────────────────────────────────────────────────────────────
const POINT = [
  ['es:04:06', 0, [['Estudiantes', 'Soy'], ['Estudiante', 'Es'], ['Guía', 'Somos'], ['Guías', 'Son'], ['Médico', 'Sois']]],
  ['es:04:09', 1, [['profesora', 'médicos']]],
  ['es:12:21', 3, [['bebes', 'blancas'], ['casa', 'blanco']]],
  ['es:28:28', 0, [['Pagamos', 'Pagaron']]],
  ['es:28:43', 0, [['Pagamos', 'Pagaron']]],
];
for (const [id, pos, pairs] of POINT) {
  const p = phrases.get(id);
  if (!p) { console.warn('[ES-SEM] нет фразы', id); continue; }
  for (const [from, to] of pairs) {
    const i = pos ?? p.tiles.findIndex((t) => t.distractors.includes(from));
    if (i < 0 || !p.tiles[i].distractors.includes(from)) { console.warn('[ES-SEM] нет соблазна', id, from, '(уже нет — пропуск)'); continue; }
    addRep(id, i, from, to, 'point');
  }
}

// ── 4б. Презенс с «mañana / más tarde» = будущее: соблазн даёт верную фразу. Замену-«близнеца» (volvió при volverá) сборщик отклоняет,
// поэтому соблазн просто запрещаем (remove) — сборщик доберёт другой из своего пула.
for (const [id, w] of [['es:28:05', 'vuelve'], ['es:28:17', 'prepara'], ['es:28:33', 'llama']]) { (removeW[id] ??= []).push(w); count('future_present'); }

// ── 5. Варианты ответа (B3/B4) ──────────────────────────────────────────────────────────────────────────────────────────────────
const has = (p, s) => p.answers.includes(s) || p.alternatives.includes(s);
for (const p of phrases.values()) {
  const L = lessonOf(p.id);
  if (![19, 20].includes(L)) continue;
  const t = p.target;
  // (а) финальное «ahora» / «esta semana» → то же время в начале фразы
  for (const tail of ['ahora', 'esta semana']) {
    const m = new RegExp(`^(.+) ${tail}\\.$`, 'u').exec(t);
    if (m && !/^¿/.test(t)) {
      const front = `${cap(tail)} ${low(m[1])}.`;
      if (!has(p, front)) addAns(p.id, [front], [], 'time_front');
    }
  }
  // (б) вопросы с подлежащим-именем: «¿Luis está llevando…?» → «¿Está Luis llevando…?»
  const q = /^¿(Ana|Luis|Mis hermanas|Mis hermanos) (está|están|ha|han) (.+)\?$/u.exec(t);
  if (q) {
    const v = `¿${cap(q[2])} ${q[1] === 'Ana' || q[1] === 'Luis' ? q[1] : low(q[1])} ${q[3]}?`;
    if (!has(p, v)) addAns(p.id, [v], [], 'question_subject');
  }
  // (в) «Estáis / Habéis» (вы): варианты с местоимением и вежливое «Están / Han», если его нет
  const vo = /^(Estáis|Habéis) (.+)$/u.exec(t);
  if (vo) {
    const add = [`Vosotros ${low(vo[1])} ${vo[2]}`, `Vosotras ${low(vo[1])} ${vo[2]}`];
    addAns(p.id, add.filter((x) => !has(p, x)), [], 'vosotros');
  }
}
// B4: «¿Estás en casa?» (ты) при «Вы дома?»; неграмматичное «estas semana»
addAns('es:03:23', [], ['¿Estás en casa?'], 'b4');
// es:20:22 «estas semana» добавляет сам сборщик (addYouVariants принимает указательное «esta» за глагол «está») — из исходников не убрать,
// передано владельцу сборщика; запись remove здесь только маскировала бы ошибку (сторож курса её ловит).

// ── запись ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const P = JSON.parse(fs.readFileSync(PATCH_FILE, 'utf8'));
P.replace ??= {};
P.answers ??= {};
for (const [k, list] of Object.entries(replace)) {
  const prev = (P.replace[k] ?? []).filter((r) => r.reason !== TAG);
  P.replace[k] = [...prev, ...list.map((r) => ({ ...r, reason: TAG }))];
}
P.remove ??= {};
for (const [k, ws] of Object.entries(removeW)) P.remove[k] = [...new Set([...(P.remove[k] ?? []), ...ws])];
for (const [k, a] of Object.entries(answers)) {
  const prev = P.answers[k] ?? {};
  P.answers[k] = { ...prev, add: [...new Set([...(prev.add ?? []), ...a.add])], remove: [...new Set([...(prev.remove ?? []), ...a.remove])], reason: TAG };
}
console.log('[ES-SEM] правки по классам:', JSON.stringify(stats), 'фраз с заменами:', Object.keys(replace).length, 'с ответами:', Object.keys(answers).length);
if (!DRY) fs.writeFileSync(PATCH_FILE, JSON.stringify(P, null, 1) + '\n');
