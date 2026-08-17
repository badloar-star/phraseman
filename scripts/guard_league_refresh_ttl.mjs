#!/usr/bin/env node
/**
 * ⛔ ЗАМОК ВЛАДЕЛЬЦА: кэш таблицы лиги — 6 часов, и только при заходе на экран.
 *
 * Правило владельца: чужие цифры в таблице лиги обновляются НЕ ЧАЩЕ РАЗА В
 * 6 ЧАСОВ и ТОЛЬКО когда человек заходит на экран клуба. Никаких фоновых
 * таймеров. Свои очки при этом живые — они читаются локально
 * (withMyLivePoints в app/league_open_cache_policy.ts, 0 чтений Firestore).
 *
 * Инцидент 2026-08-17 (аудит лиг): снапшот-коммит e7eb7d316 «preserve complete
 * project snapshot» сломал правило ДВАЖДЫ одной правкой:
 *   1) занизил CLUB_REMOTE_REFRESH_MS с 6 часов до 45 секунд — а эта константа
 *      служит И периодом таймера, И TTL кэша (shouldRefreshRemote в loadData);
 *   2) добавил setInterval, который зовёт loadData({ forceRemote: true }), а
 *      forceRemote явно обнуляет TTL и сбрасывает кэш группы.
 * В результате открытый экран клуба перечитывал группу из Firestore каждые
 * 45 секунд вместо одного раза в 6 часов.
 *
 * Что сторож проверяет в app/club_screen.tsx:
 *   • CLUB_REMOTE_REFRESH_MS >= 6 часов;
 *   • нет setInterval, который дёргает loadData (фоновый опрос);
 *   • forceRemote: true допустим ТОЛЬКО в pull-to-refresh (жест пользователя),
 *     то есть его вхождений в коде не больше одного.
 *
 * Сработал сторож — верните правило, а НЕ удаляйте проверку.
 *
 * Запуск: node scripts/guard_league_refresh_ttl.mjs
 * Подробности: ____ЛИГИ_КЭШ_6_ЧАСОВ_НЕ_ЛОМАТЬ____.md
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const CLUB = 'app/club_screen.tsx';
const MIN_REFRESH_MS = 6 * 60 * 60 * 1000;

function stagedFiles() {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Читаем ровно ту версию, которая уедет в коммит.
function stagedContent(path) {
  try {
    return execFileSync('git', ['show', `:${path}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return existsSync(path) ? readFileSync(path, 'utf8') : '';
  }
}

const staged = stagedFiles();
if (!staged.includes(CLUB)) process.exit(0);

const src = stagedContent(CLUB);
if (!src) process.exit(0);

// Комментарии выбрасываем: они описывают инцидент и сами упоминают setInterval
// и forceRemote, из-за чего сторож ловил бы собственную документацию.
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

const failures = [];

// ── 1. TTL не ниже 6 часов ────────────────────────────────────────────────
const declMatch = /const\s+CLUB_REMOTE_REFRESH_MS\s*=\s*([^;]+);/.exec(code);
if (!declMatch) {
  failures.push(
    'не найдена константа CLUB_REMOTE_REFRESH_MS — TTL кэша таблицы лиги должен существовать и быть >= 6 часов',
  );
} else {
  const expr = declMatch[1].trim();
  // Допускаем только арифметику из чисел (6 * 60 * 60 * 1000, 21_600_000).
  const safe = /^[\d_\s*+()]+$/.test(expr);
  if (!safe) {
    failures.push(
      `CLUB_REMOTE_REFRESH_MS задан выражением «${expr}» — сторож умеет проверять только числовую арифметику; верните явное значение >= 6 часов`,
    );
  } else {
    let value = NaN;
    try {
      // eslint-disable-next-line no-new-func
      value = Number(new Function(`return (${expr.replace(/_/g, '')});`)());
    } catch {
      value = NaN;
    }
    if (!Number.isFinite(value)) {
      failures.push(`не удалось вычислить CLUB_REMOTE_REFRESH_MS («${expr}»)`);
    } else if (value < MIN_REFRESH_MS) {
      const hours = (value / 3_600_000).toFixed(2);
      failures.push(
        `CLUB_REMOTE_REFRESH_MS = ${expr} (~${hours} ч) — меньше обязательных 6 часов. Это TTL кэша таблицы лиги: занижение означает лишние чтения Firestore при каждом заходе`,
      );
    }
  }
}

// ── 2. Никаких фоновых таймеров, дёргающих loadData ───────────────────────
// Смотрим окно текста после каждого setInterval: разбирать вложенные скобки
// регуляркой ненадёжно (тело коллбэка само содержит `)` до запятой с периодом),
// поэтому берём фиксированное окно — фоновый опрос всегда зовёт loadData рядом.
for (const match of code.matchAll(/setInterval\s*\(/g)) {
  const window = code.slice(match.index, match.index + 400);
  if (/loadData\s*\(/.test(window)) {
    failures.push(
      'setInterval зовёт loadData — вернулся фоновый опрос Firestore. Таблица лиги обновляется ТОЛЬКО при заходе на экран',
    );
    break;
  }
}
// Отдельно: сам факт периодического рефреша по этой константе.
if (/setInterval[\s\S]{0,300}CLUB_REMOTE_REFRESH_MS/.test(code)) {
  failures.push(
    'setInterval использует CLUB_REMOTE_REFRESH_MS как период — эта константа является TTL кэша, а не интервалом опроса',
  );
}

// ── 3. forceRemote только для pull-to-refresh ─────────────────────────────
const forceRemoteCalls = (code.match(/forceRemote:\s*true/g) || []).length;
if (forceRemoteCalls > 1) {
  failures.push(
    `forceRemote: true встречается ${forceRemoteCalls} раз(а) — допустим ТОЛЬКО в pull-to-refresh (осознанный жест пользователя). forceRemote обнуляет 6-часовой TTL и сбрасывает кэш группы`,
  );
}

if (failures.length > 0) {
  console.error('');
  console.error('⛔ ЗАМОК ВЛАДЕЛЬЦА: правка ломает 6-часовой кэш таблицы лиги.');
  console.error('');
  for (const failure of failures) console.error(`  • ${failure}`);
  console.error('');
  console.error('Правило владельца: чужие цифры обновляются НЕ ЧАЩЕ РАЗА В 6 ЧАСОВ');
  console.error('и ТОЛЬКО при заходе на экран клуба. Фоновых таймеров быть не должно.');
  console.error('Свои очки живые и без сети (withMyLivePoints, 0 чтений Firestore).');
  console.error('');
  console.error('Инцидент 2026-08-17: снапшот-коммит e7eb7d316 занизил TTL до 45 секунд');
  console.error('и добавил setInterval с forceRemote — открытый экран перечитывал');
  console.error('Firestore каждые 45 секунд.');
  console.error('');
  console.error('Верните правило, а не удаляйте проверку.');
  console.error('Подробности: ____ЛИГИ_КЭШ_6_ЧАСОВ_НЕ_ЛОМАТЬ____.md');
  console.error('');
  process.exit(1);
}

process.exit(0);
