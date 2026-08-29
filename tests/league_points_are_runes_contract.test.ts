/**
 * Сторож перехода лиги на руны (владелец, 2026-08-26: «весь раздел лига
 * переходит на руны, никакого ХП, только руны»).
 *
 * Ловит три класса регрессий, каждый из которых уже случался в этом проекте:
 *
 * 1. Клиент шлёт руны, сервер затирает их опытом. Так было до этой правки:
 *    getAuthoritativeLeagueWeekPoints считал недельный XP и перезаписывал
 *    присланное число, поэтому одной правки клиента не хватало.
 * 2. Подарок двигает лигу. Бонус 300 рун за вход — класс `grant`, он НЕ идёт
 *    в weekEarned. Если кто-то переведёт welcome_gift в `earn`, новичок
 *    попадёт в зону повышения, не сыграв ни одного занятия.
 * 3. Устаревший недельный счётчик читается как настоящий. Прошлая неделя в
 *    stars.weekKey обязана давать 0 за текущую, а не наследоваться.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// зачем не импорт модуля: stars_ledger тянет firebase-admin, и один этот
// импорт роняет jest в heap OOM (известный класс на этой машине). Таблица
// классов — простой литерал, читаем её из исходника.
const LEDGER_SOURCE = readFileSync(
  join(__dirname, '..', 'functions', 'src', 'stars_ledger.ts'),
  'utf8',
);

// Таблица разбирается ПОСТРОЧНО. Файл лежит с CRLF, поэтому строки режем по
// обоим вариантам перевода строки, а запись ищем якорем начала строки — так
// проверка не зависит от того, чем именно отбит перенос.
const SPLIT_RE = /\r?\n/;
const ENTRY_RE = /^\s*([a-z0-9_]+)\s*:\s*'(earn|grant|spend)'/;

const STAR_OP_CLASS: Record<string, string> = (() => {
  const start = LEDGER_SOURCE.indexOf('export const STAR_OP_CLASS');
  const table = LEDGER_SOURCE.slice(start, LEDGER_SOURCE.indexOf('});', start));
  const map: Record<string, string> = {};
  for (const line of table.split(SPLIT_RE)) {
    const match = line.match(ENTRY_RE);
    if (match) map[match[1]] = match[2];
  }
  if (Object.keys(map).length === 0) throw new Error('STAR_OP_CLASS не разобрался');
  return map;
})();

describe('очки лиги — это руны, а не опыт', () => {
  it('подарочные источники рун не попадают в заработок недели', () => {
    // weekEarned двигают только операции класса earn (stars_ledger:
    // `if (cls === 'earn') { after.earnedTotal += op.delta; ... }`).
    // Всё, что подарено, обязано остаться grant — иначе лига мерит подарки.
    expect(STAR_OP_CLASS.welcome_gift).toBe('grant');
    expect(STAR_OP_CLASS.level_spin_grant).toBe('grant');
    expect(STAR_OP_CLASS.coin_exchange).toBe('grant');
    expect(STAR_OP_CLASS.admin_grant).toBe('grant');
  });

  it('заработанное игрой двигает лигу', () => {
    // Обратная сторона: занятия, Арена и «Вместе» обязаны считаться, иначе
    // игрок учится, а строка в таблице стоит.
    expect(STAR_OP_CLASS.learning_v2_session).toBe('earn');
    expect(STAR_OP_CLASS.arena_match).toBe('earn');
    expect(STAR_OP_CLASS.friends_together_chest).toBe('earn');
  });

  it('трата рун не опускает игрока в таблице', () => {
    // Очки лиги считают ПРИТОК за неделю. Открытие занятия — spend, он
    // уменьшает баланс, но weekEarned не трогает.
    expect(STAR_OP_CLASS.learning_v2_unlock).toBe('spend');
    expect(STAR_OP_CLASS.spend_shop).toBe('spend');
  });
});

describe('серверные очки лиги берутся из журнала рун', () => {
  const source = readFileSync(
    join(__dirname, '..', 'functions', 'src', 'league_groups.ts'),
    'utf8',
  );

  it('авторитетное число собирается из stars.weekEarned', () => {
    expect(source).toContain('function getLeagueWeekRunes(');
    expect(source).toContain('stars.weekEarned');
  });

  it('недельный опыт больше не задаёт очки лиги', () => {
    // getLeagueWeekPoints остаётся экспортом (у него свои тесты), но внутри
    // getAuthoritativeLeagueWeekPoints его быть не должно.
    const fnStart = source.indexOf('function getAuthoritativeLeagueWeekPoints(');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = source.slice(fnStart, source.indexOf('\n}', fnStart));
    expect(fnBody).toContain('getLeagueWeekRunes');
    expect(fnBody).not.toMatch(/\bgetLeagueWeekPoints\s*\(/);
  });

  it('устаревшая неделя не читается как текущая', () => {
    // Без проверки weekKey прошлый счётчик выглядит как настоящее число.
    expect(source).toMatch(/sanitizeString\(stars\.weekKey, 16\) === weekId/);
  });
});

describe('клиент лиги не берёт недельный опыт', () => {
  const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

  it('firestore_leagues шлёт руны', () => {
    const source = read('app/firestore_leagues.ts');
    expect(source).toContain('getMyLeagueWeekRunes');
    // getMyWeekPoints (опыт) не должен вызываться — только упоминаться
    // в комментарии о том, кому он остался.
    expect(source).not.toMatch(/\bawait getMyWeekPoints\s*\(/);
  });

  it('экран лиги показывает руны', () => {
    const source = read('app/club_screen.tsx');
    expect(source).toContain('getMyLeagueWeekRunes');
    expect(source).not.toMatch(/\bgetMyWeekPoints\s*\(/);
  });

  it('резервный расчёт перехода считает руны', () => {
    const source = read('app/league_engine.ts');
    expect(source).toContain('getLastWeekLeagueRunes');
  });
});

describe('горячие 2 часа реально удваивают руны', () => {
  const source = readFileSync(join(__dirname, '..', 'app', 'league_week_runes.ts'), 'utf8');

  it('множитель применяется, а не только обещается на экране', () => {
    // Механика лежала написанной, но НИКТО её не вызывал: экран обещал ×2,
    // которого не происходило. Сторож ловит повторное отключение.
    expect(source).toContain('resolveLeagueHotHoursMultiplier');
    expect(source).toContain('getLeagueHotHoursMultiplierSync()');
  });

  it('надбавка хранится отдельно от догона', () => {
    // Лежи она в delta, первый же свежий серверный снимок стёр бы удвоение:
    // сервер про горячие часы не знает и отдаёт одинарные руны.
    expect(source).toContain('hotBonus');
    expect(source).toContain('function usableHotBonus');
  });

  it('сброс догона не стирает надбавку', () => {
    const start = source.indexOf('async function rebaseCatchup(');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('\n}', start));
    expect(body).toContain('hotBonus');
    expect(body).not.toMatch(/hotBonus:\s*0/);
  });

  it('множитель берётся лениво — без цикла импортов', () => {
    // league_hot_hours тянет league_engine, а тот — этот модуль. Статический
    // импорт замкнул бы цикл и отдал бы undefined на старте.
    expect(source).not.toMatch(/^import .*league_hot_hours/m);
    expect(source).toContain("require('./league_hot_hours')");
  });
});

describe('живой прогресс лиги не зависит от открытого кошелька', () => {
  const source = readFileSync(join(__dirname, '..', 'app', 'league_week_runes.ts'), 'utf8');

  it('слушает канонический снапшот рун, а не UI-событие кошелька', () => {
    const start = source.indexOf('export function startLeagueWeekRunesTracking');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('\n}', start));
    expect(body).toContain('subscribeRunesSnapshot');
    expect(body).toContain('leagueEarnedDelta');
    expect(body).not.toContain("onAppEvent('runes_balance_updated'");
  });

  it('будит локальную проекцию лиги после сохранения догона', () => {
    expect(source).toContain("emitAppEvent('league_local_state_updated')");
  });

  it('изолирует догон, hot bonus и финал недели по аккаунту', () => {
    expect(source).toContain('accountScopedLeagueRunesStorageKey(CATCHUP_KEY, ownerStableId)');
    expect(source).toContain('accountScopedLeagueRunesStorageKey(LAST_FINAL_KEY, ownerStableId)');
    expect(source).toContain('memoryCatchupOwnerStableId');
    expect(source).toContain('isCurrentAccountGeneration(token, ownerStableId)');
  });
});
