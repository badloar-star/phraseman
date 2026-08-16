#!/usr/bin/env node
/**
 * Стоп-кран по нагрузке: смотрит на git-историю и говорит, когда пора остановиться.
 *
 * зачем (ресерч 2026-08-15): по 300 последним коммитам видно — суббота самый
 * нагруженный день недели (130 коммитов из 300, больше чем понедельник, среда
 * и пятница вместе), рабочий день тянется с 07:00 до 23:00. Это не «много
 * работает», это отсутствие выходного как явления.
 *
 * Систематический обзор 92 исследований выгорания у разработчиков
 * (Information and Software Technology, 2022) называет главными предикторами
 * перегрузку задачами и постоянное переключение контекста.
 *
 * зачем именно так: для кода уже есть автоматический эскалатор — сложная
 * развилка зовёт модель посильнее. Для себя симметричного механизма не было.
 * Это тот же приём: измеримое условие → автоматический сигнал. Не «медитируй»,
 * а цифра, которую видно.
 *
 * Данные только локальные: своя git-история, ничего не собирается и никуда
 * не уходит. Ни сети, ни записи в чужие файлы.
 *
 * Использование:
 *   node scripts/workload_check.mjs           # короткий вердикт
 *   node scripts/workload_check.mjs --full    # разбор по дням и часам
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));

/**
 * Пороги.
 *
 * зачем такие: это не медицинские нормы, а сигналы «заметно выше обычного».
 * Смысл не в точности числа, а в том, чтобы перегрузка перестала быть
 * невидимой — сейчас её видно только задним числом в графике коммитов.
 */
const LONG_DAY_HOURS = 12;      // разброс между первым и последним коммитом
const LATE_HOUR = 22;           // после этого часа — поздний коммит
const NO_REST_DAYS = 10;        // дней подряд с коммитами без единого пустого
const WEEKEND_SHARE = 0.35;     // доля коммитов на выходных, выше которой это норма жизни

function git(...gitArgs) {
  return execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' });
}

/** Локальное время коммитов автора: дата, час, день недели. */
function readCommits(limit = 400) {
  const raw = git('log', `-${limit}`, '--pretty=%ad', '--date=format:%Y-%m-%d %H %u');
  return raw.trim().split('\n').filter(Boolean).map((line) => {
    const [date, hour, weekday] = line.trim().split(/\s+/);
    return { date, hour: Number(hour), weekday: Number(weekday) };
  });
}

const commits = readCommits();
if (commits.length === 0) {
  console.log('Коммитов нет — считать нечего.');
  process.exit(0);
}

const byDate = new Map();
for (const c of commits) {
  if (!byDate.has(c.date)) byDate.set(c.date, []);
  byDate.get(c.date).push(c);
}

const dates = [...byDate.keys()].sort();
const weekendCommits = commits.filter((c) => c.weekday >= 6).length;
const weekendShare = weekendCommits / commits.length;

/**
 * Самая длинная серия дней подряд без единого дня отдыха.
 *
 * зачем считать по календарю, а не по числу дней с коммитами: пропущенный
 * день — это и есть отдых, и именно его отсутствие важно заметить.
 */
function longestStreak(sortedDates) {
  let best = 0;
  let current = 0;
  let previous = null;
  for (const date of sortedDates) {
    const day = new Date(`${date}T00:00:00Z`);
    if (previous && (day - previous) / 86_400_000 === 1) current += 1;
    else current = 1;
    if (current > best) best = current;
    previous = day;
  }
  return best;
}

const streak = longestStreak(dates);

/** Дни, где разброс между первым и последним коммитом больше порога. */
const longDays = dates.filter((date) => {
  const hours = byDate.get(date).map((c) => c.hour);
  return Math.max(...hours) - Math.min(...hours) >= LONG_DAY_HOURS;
});

const lateCommits = commits.filter((c) => c.hour >= LATE_HOUR).length;

if (args.has('--full')) {
  const WEEKDAY_NAMES = ['', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
  const perWeekday = new Map();
  for (const c of commits) perWeekday.set(c.weekday, (perWeekday.get(c.weekday) ?? 0) + 1);

  console.log(`Разбор по ${commits.length} коммитам, ${dates.length} дней с работой\n`);
  console.log('По дням недели:');
  for (let d = 1; d <= 7; d += 1) {
    const n = perWeekday.get(d) ?? 0;
    const bar = '█'.repeat(Math.round((n / commits.length) * 60));
    console.log(`  ${WEEKDAY_NAMES[d]}  ${String(n).padStart(4)}  ${bar}`);
  }
  console.log('');
}

const warnings = [];

if (weekendShare > WEEKEND_SHARE) {
  warnings.push(
    `Выходные — ${Math.round(weekendShare * 100)}% всей работы. `
    + 'Суббота и воскресенье перестали быть выходными.',
  );
}

if (streak >= NO_REST_DAYS) {
  warnings.push(`${streak} дней подряд без единого дня без коммитов.`);
}

if (longDays.length >= 3) {
  warnings.push(
    `Дней длиннее ${LONG_DAY_HOURS} часов: ${longDays.length}. `
    + `Последний — ${longDays[longDays.length - 1]}.`,
  );
}

if (lateCommits >= 10) {
  warnings.push(`Коммитов после ${LATE_HOUR}:00 — ${lateCommits}.`);
}

if (warnings.length === 0) {
  console.log('Нагрузка в норме: выходные есть, дни не растянуты.');
  process.exit(0);
}

console.log('Нагрузка выше обычного:\n');
for (const w of warnings) console.log(`  · ${w}`);
console.log('');
// зачем не блокировать, а сообщать: это не гейт качества кода, а сигнал о себе.
// Скрипт, который мешает работать, отключат в первый же день.
console.log('Это не ошибка и ничего не блокирует — просто цифры, которые иначе не видно.');
console.log('Подробнее: node scripts/workload_check.mjs --full');
