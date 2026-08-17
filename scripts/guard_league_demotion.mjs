#!/usr/bin/env node
/**
 * ⛔ ЗАМОК ВЛАДЕЛЬЦА: понижение в лигах обязано работать.
 *
 * Инцидент 2026-08-17: владелец прислал скриншот — 27 место из 29, а модалка
 * пишет «Остаёшься в лиге». Выяснилось, что понижение не срабатывало НИ У КОГО
 * и уже давно.
 *
 * Механика бага. Ранг считается competition ranking'ом — «сколько человек
 * строго выше / строго ниже меня». В типичной комнате играют 3-5 человек, а
 * хвост (неактивные + жители без прироста) имеет РОВНО 0 очков. Тогда у игрока
 * с нулём:
 *   • строго ниже него нет НИКОГО      → bottomRank = 1
 *   • строго выше — только играющие    → myRank = 4 при зоне 4
 * то есть движок считал его кандидатом на ПОВЫШЕНИЕ, а ветка `&& !promoted`
 * гасила понижение. Понижение было выключено де-факто во всех комнатах, где
 * жителей больше, чем играющих, — а таких комнат большинство.
 *
 * Правило владельца (2026-08-17):
 *   1) повышение требует хотя бы ОДНОГО набранного очка;
 *   2) понижаются нижние 15% И ВСЕ с нулём очков;
 *   3) комната, где не играл никто, никого не понижает.
 *
 * ⚠️ Клиент и сервер обязаны быть ЗЕРКАЛЬНЫ. Если разойдутся — модалка покажет
 * один исход, а авторитетный крон запишет другой, и игрок увидит «повышение»,
 * которого не было. Поэтому сторож требует защиту в ОБОИХ файлах сразу.
 *
 * Сработал сторож — чините логику, а НЕ удаляйте проверку.
 *
 * Запуск: node scripts/guard_league_demotion.mjs
 * Подробности: ____ЛИГИ_ПОНИЖЕНИЕ_НЕ_ЛОМАТЬ____.md
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const CLIENT = 'app/league_engine.ts';
const SERVER = 'functions/src/league_finalize_cron.ts';

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
const touched = staged.filter((file) => file === CLIENT || file === SERVER);
if (touched.length === 0) process.exit(0);

const failures = [];

// ── Клиент: app/league_engine.ts ──────────────────────────────────────────
// Проверяем оба файла целиком, даже если тронут только один: расхождение
// клиента и сервера — это и есть тот класс бага, ради которого сторож живёт.
const clientSrc = stagedContent(CLIENT);
if (clientSrc) {
  // 1. Повышение требует набранных очков. Без этого игрок с нулём снова станет
  //    «четвёртым» в комнате из нулей и заберёт ложное повышение.
  if (!/\biScored\b/.test(clientSrc)) {
    failures.push(
      `${CLIENT}: пропал признак «я набрал очки» (iScored) — игрок с нулём очков снова получит ложное повышение`,
    );
  }
  // 2. Зона нулей: без неё понижение снова гасится веткой `&& !promoted`.
  if (!/\binZeroZone\b/.test(clientSrc)) {
    failures.push(
      `${CLIENT}: пропала зона нулевых очков (inZeroZone) — понижение перестанет наступать в комнатах с хвостом нулей`,
    );
  }
  // 3. «Никто не играл» — не соревнование. Без этого комната сплошных нулей
  //    понизила бы разом всех до единого (bottomRank=1 у каждого).
  if (!/\bsomeoneScored\b/.test(clientSrc)) {
    failures.push(
      `${CLIENT}: пропала проверка «в комнате кто-то играл» (someoneScored) — комната из одних нулей понизит всех подряд`,
    );
  }
}

// ── Сервер: functions/src/league_finalize_cron.ts ─────────────────────────
const serverSrc = stagedContent(SERVER);
if (serverSrc) {
  if (!/\bscored\b/.test(serverSrc)) {
    failures.push(
      `${SERVER}: пропал признак «участник набрал очки» (scored) — крон снова начнёт повышать игроков с нулём`,
    );
  }
  if (!/\binZeroZone\b/.test(serverSrc)) {
    failures.push(
      `${SERVER}: пропала зона нулевых очков (inZeroZone) — авторитетный итог недели перестанет понижать`,
    );
  }
  if (!/\bhasAnyScorer\b/.test(serverSrc)) {
    failures.push(
      `${SERVER}: пропала проверка «в комнате кто-то играл» (hasAnyScorer) — комната из одних нулей понизит всех подряд`,
    );
  }
}

if (failures.length > 0) {
  console.error('');
  console.error('⛔ ЗАМОК ВЛАДЕЛЬЦА: правка ломает понижение в лигах.');
  console.error('');
  for (const failure of failures) console.error(`  • ${failure}`);
  console.error('');
  console.error('Инцидент 2026-08-17: понижение не работало НИ У КОГО — в комнате');
  console.error('играли трое, у остальных 26 было ровно 0 очков, и движок считал');
  console.error('игрока с нулём кандидатом на повышение (27 место из 29 →');
  console.error('«Остаёшься в лиге»).');
  console.error('');
  console.error('Правило владельца: повышение требует очков; понижаются нижние 15%');
  console.error('И все с нулём; комната без единого игравшего никого не понижает.');
  console.error('Клиент и сервер обязаны быть зеркальны.');
  console.error('');
  console.error('Почините логику, а не удаляйте проверку.');
  console.error('Подробности: ____ЛИГИ_ПОНИЖЕНИЕ_НЕ_ЛОМАТЬ____.md');
  console.error('Тесты: tests/league_zero_points_demotion.test.ts');
  console.error('       functions/src/league_finalize_zero_points.test.ts');
  console.error('');
  process.exit(1);
}

process.exit(0);
