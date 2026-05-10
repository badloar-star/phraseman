/**
 * Правит rule, где левая и правая часть от · совпадают (нет нормальной UK-части).
 * Запуск: node scripts/fix_arena_mirrored_rules.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function halves(s) {
  const t = String(s || '');
  const i = t.indexOf('·');
  if (i < 0) return null;
  return { a: t.slice(0, i).trim(), b: t.slice(i + 1).trim() };
}

/** Явные замены для A2 (короткие пояснения RU · UK). */
const A2_MAP = new Map([
  ['they + were.', 'Местоимение they — форма were · Займенник they — форма were'],
  ['tall → taller, не more tall.', 'Сравнение: taller, не *more tall · Вищий ступінь: taller, не *more tall'],
  ['arrive at the airport.', 'arrive + at для airport · arrive + at + airport'],
  [
    'in the morning/afternoon/evening.',
    'Утром/днём/вечером — предлог in · Зранку/вдень/ввечері — прийменник in',
  ],
  ['we + were + V-ing.', 'Past Continuous: подлежащее + were + -ing · Past Continuous: підмет + were + -ing'],
  ['If + Present Simple, will….', 'Условие 1-го типа: If + Present, then will · Умова 1 типу: If + Present, then will'],
  ['the + superlative.', 'Превосходная степень с the · Найвищий ступінь із the'],
  ['old → older, не more older.', 'Сравнение: older, не *more older · Порівняння: older, не *more older'],
  ['good at + noun/-ing.', 'Умею хорошо: good at + форма · Добре вмію: good at + форма'],
  ['big → bigger.', 'Сравнение: bigger · Порівняння: bigger'],
  ['because — причина.', 'Союз because выражает причину · Спілка because виражає причину'],
  ['the most expensive.', 'Наивысшая степень: the most + прилагательное · Найвищий ступінь: the most + прикметник'],
  ['First conditional: if + Present.', 'If + настоящее, then will · If + теперішній, then will'],
  ['on the wall.', 'На поверхности стены — on the wall · На поверхні стіни — on the wall'],
  ["didn't + go.", 'Отрицание: didn’t + голый инфинитив · Заперечення: didn’t + інфінітив без to'],
  ['apples мн. → there are.', 'Множественное подлежащее — there are · Множинний підмет — there are'],
  ['people → how many.', 'Для people используем how many · Для people вживаємо how many'],
  ['in the morning.', 'Часть дня выражаем: in the morning · Пора доби: in the morning'],
  ["Правильно: 'I agree', без 'am'.", "Соглашаемся: I agree, без am · Погоджуємось: I agree, без am"],
  ["Present Simple: 'we have'.", 'Обычное настоящее: we have · Звичайний теперішній: we have'],
]);

/** Для банка B1 — коллокации «не тот предлог». */
const B1_PREP = new Map([
  ['depend on, а не depend of', 'Нужна форма depend on (не of) · Потрібна форма depend on (не of)'],
  ['depend on, а не depend from', 'Нужна форма depend on (не from) · Потрібна форма depend on (не from)'],
  ['depend on, не depend of', 'Нужна форма depend on (не of) · Потрібна форма depend on (не of)'],
  ['depend on, не depend from', 'Нужна форма depend on (не from) · Потрібна форма depend on (не from)'],
  ['afraid of, а не afraid from', 'После afraid — of, не from · Після afraid — of, не from'],
  ['afraid of, не afraid from', 'После afraid — of, не from · Після afraid — of, не from'],
  ['good at, а не good in', 'Умение: good at, не in · Вміння: good at, не in'],
  ['married to, а не married with', 'Устойчиво married to, не married with · Стійка конструкція married to, не married with'],
  ['married to, не married with', 'Устойчиво married to, не married with · Стійка конструкція married to, не married with'],
  [
    'interested in, а не interested about',
    'Нужна форма interested in (не about) · Потрібна форма interested in (не about)',
  ],
  [
    'interested in, не interested on',
    'Нужна форма interested in (не on) · Потрібна форма interested in (не on)',
  ],
  [
    'interested in, не about',
    'Нужна форма interested in (не about) · Потрібна форма interested in (не about)',
  ],
  ['interested in, не on', 'Нужна форма interested in (не on) · Потрібна форма interested in (не on)'],
  ['bored with, не from', 'Нужна форма bored with (не from) · Потрібна форма bored with (не from)'],
  [
    'bored with, не bored from',
    'Нужна форма bored with (не from) · Потрібна форма bored with (не from)',
  ],
  ['warn someone about something', 'warn someone about something · попередити когось про щось'],
  [
    'apologize for + ing',
    'Извиняемся за действие: apologize for + -ing · Вибачаємося за дію: apologize for + -ing',
  ],
]);

function fixRule(rule, pool) {
  const h = halves(rule);
  if (!h || h.a !== h.b) return rule;

  if (pool === 'A2' && A2_MAP.has(h.a)) return A2_MAP.get(h.a);
  if (pool === 'B1' && B1_PREP.has(h.a)) return B1_PREP.get(h.a);

  if (pool === 'B1' || pool === 'A2') {
    if (/^правильно:/i.test(h.a)) {
      const rest = h.a.replace(/^правильно:\s*/i, '').trim();
      return `Правильная форма: ${rest} · Правильна форма: ${rest}`;
    }
    if (/^Правильно:/.test(h.a)) {
      const rest = h.a.replace(/^Правильно:\s*/, '').trim();
      return `Правильно: ${rest} · Правильний варіант: ${rest}`;
    }
  }

  return rule;
}

function patchFile(rel, pool) {
  const p = path.join(__dirname, '..', rel);
  const raw = fs.readFileSync(p, 'utf8');
  const arr = JSON.parse(raw);
  let n = 0;
  for (const q of arr) {
    if (!q.rule) continue;
    const next = fixRule(q.rule, pool);
    if (next !== q.rule) {
      q.rule = next;
      n++;
    }
  }
  if (n) fs.writeFileSync(p, JSON.stringify(arr, null, 2) + '\n', 'utf8');
  console.log(rel, 'updated', n);
}

patchFile('scripts/b1_seed.json', 'B1');
patchFile('scripts/a2_seed.json', 'A2');
