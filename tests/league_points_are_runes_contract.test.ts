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
    // Video participates in the Sunday wallet promotion, but remains outside
    // the competitive score: watching must never move weekEarned.
    expect(STAR_OP_CLASS.video_watch).toBe('grant');
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

describe('Super Sunday не создаёт второй клиентский слой награды', () => {
  const source = readFileSync(join(__dirname, '..', 'app', 'league_week_runes.ts'), 'utf8');

  it('не хранит и не начисляет старую надбавку поверх уже удвоенной операции', () => {
    expect(source).not.toContain('hotBonus');
    expect(source).not.toContain('resolveLeagueHotHoursMultiplier');
    expect(source).not.toContain("require('./league_hot_hours')");
  });
});

describe('реальный экран лиги показывает Super Sunday до сцены соревнования', () => {
  const club = readFileSync(join(__dirname, '..', 'app', 'club_screen.tsx'), 'utf8');
  const banner = readFileSync(
    join(__dirname, '..', 'components', 'league', 'LeagueSuperSundayBanner.tsx'),
    'utf8',
  );

  it('ставит полноширинную плашку непосредственно перед сценой', () => {
    expect(club.indexOf('<LeagueSuperSundayBanner')).toBeGreaterThan(-1);
    expect(club.indexOf('<LeagueSuperSundayBanner')).toBeLessThan(
      club.indexOf('<LeagueCompetitionScene'),
    );
    expect(banner).toContain('width: \'100%\'');
    expect(banner).toContain('league-super-sunday-banner');
  });

  it('использует только локальные часы и сохраняет обычный счётчик недели', () => {
    expect(club).toContain('<View testID="league-week-countdown"');
    expect(club).toContain('visibleWallClock.subscribe(update)');
    expect(banner).not.toMatch(/setInterval|loadData|firestore|httpsCallable/);
    expect(banner).toContain('СУПЕРВОСКРЕСЕНЬЕ');
    expect(banner).toContain('Руны за занятия, игры и видео удваиваются');
    expect(club).not.toContain('leagueClockMs');
    expect(club).toContain('setSuperSundayActive((previous) => (previous === nextSunday ? previous : nextSunday))');
    expect(banner).toContain('const [nowMs, setNowMs] = useState(() => Date.now())');
    expect(banner).toContain('visibleWallClock.subscribe(update)');
  });

  it('не запускает пульсацию вне воскресенья, без фокуса или при reduced motion', () => {
    expect(banner).toContain('const isFocused = useIsScreenFocused()');
    expect(banner).toContain('const reduceMotionPreference = useReduceMotionPreference()');
    expect(banner).toContain(
      'if (!activeSunday || !isFocused || !runtimeActive || reduceMotionPreference !== false)',
    );
    expect(banner).toContain('loop.stop()');
    expect(banner).toContain('pulse.setValue(1)');
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

  it('изолирует догон и финал недели по аккаунту', () => {
    expect(source).toContain('accountScopedLeagueRunesStorageKey(CATCHUP_KEY, ownerStableId)');
    expect(source).toContain('accountScopedLeagueRunesStorageKey(LAST_FINAL_KEY, ownerStableId)');
    expect(source).toContain('memoryCatchupOwnerStableId');
    expect(source).toContain('isCurrentAccountGeneration(token, ownerStableId)');
  });
});
