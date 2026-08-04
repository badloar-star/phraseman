import {
  TOURNAMENT_ALL_DAY_ENTRY_WINDOW_MS,
  TOURNAMENT_ALL_DAY_SLOT_ID,
  buildTournamentScheduleWrite,
  tournamentAllDayRoomId,
  tournamentEntryWindowMsFromEconomy,
} from './tournament_all_day';
import { TOURNAMENT_ENTRY_WINDOW_MS, normalizeTournamentSchedule } from './tournament_core';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const regularSlots = [
  {
    slotId: 'daily_1200',
    localTime: '12:00',
    timezone: 'Europe/Moscow',
    ticketsRequired: 1,
    enabled: true,
  },
  {
    slotId: 'daily_1900',
    localTime: '19:00',
    timezone: 'Europe/Moscow',
    ticketsRequired: 1,
    enabled: false,
  },
];

describe('режим турниров «активно весь день»', () => {
  it('подменяет только эффективные слоты и сохраняет обычное расписание для отката', () => {
    const write = buildTournamentScheduleWrite({
      slots: regularSlots,
      timezone: 'Europe/Moscow',
      freeWeeklyEntry: true,
      ticketGemValue: 5,
      testingEnabled: false,
      allDayEnabled: true,
    }, 1234);

    expect(write.config.allDayEnabled).toBe(true);
    expect(write.config.scheduledSlots).toEqual(regularSlots);
    expect(write.config.slots).toEqual([{
      slotId: TOURNAMENT_ALL_DAY_SLOT_ID,
      localTime: '00:00',
      timezone: 'Europe/Moscow',
      ticketsRequired: 1,
      enabled: true,
    }]);
    expect((write.config as { entryGems?: number }).entryGems).toBe(5);
    expect(write.economy).toMatchObject({ entryGems: 5, botEntryGems: 5 });
    expect(write.economy.tournamentEntryWindowMs).toBe(TOURNAMENT_ALL_DAY_ENTRY_WINDOW_MS);
  });

  it('после выключения возвращает обычные слоты и стандартное окно', () => {
    const write = buildTournamentScheduleWrite({
      slots: regularSlots,
      timezone: 'Europe/Moscow',
      freeWeeklyEntry: true,
      ticketGemValue: 5,
      testingEnabled: false,
      allDayEnabled: false,
    }, 1234);

    expect(write.config.allDayEnabled).toBe(false);
    expect(write.config.slots).toEqual(regularSlots);
    expect(write.economy.tournamentEntryWindowMs).toBe(TOURNAMENT_ENTRY_WINDOW_MS);
  });

  it('читает серверное окно с безопасным откатом к 30 минутам', () => {
    expect(tournamentEntryWindowMsFromEconomy({
      tournamentEntryWindowMs: TOURNAMENT_ALL_DAY_ENTRY_WINDOW_MS,
    })).toBe(TOURNAMENT_ALL_DAY_ENTRY_WINDOW_MS);
    expect(tournamentEntryWindowMsFromEconomy({ tournamentEntryWindowMs: -1 }))
      .toBe(TOURNAMENT_ENTRY_WINDOW_MS);
    expect(tournamentEntryWindowMsFromEconomy(null)).toBe(TOURNAMENT_ENTRY_WINDOW_MS);
  });

  it('сажает живых игроков одного временного окна в общую комнату без uid в id', () => {
    const cohortRoomId = tournamentAllDayRoomId as unknown as (
      nowMs: number,
      timezone: string,
    ) => string;
    const first = cohortRoomId(1_000, 'Europe/Moscow');
    const sameCohort = cohortRoomId(29_000, 'Europe/Moscow');
    const nextCohort = cohortRoomId(31_000, 'Europe/Moscow');

    expect(first).toBe(sameCohort);
    expect(first).not.toBe(nextCohort);
    expect(first).not.toContain('private-user-123');
    expect(first).toMatch(/^all-day-[a-f0-9]{20}_Europe_Moscow_/);
  });

  it('серверный нормализатор сохраняет только явный all-day флаг', () => {
    expect(normalizeTournamentSchedule({ slots: regularSlots, allDayEnabled: true }).allDayEnabled)
      .toBe(true);
    expect(normalizeTournamentSchedule({ slots: regularSlots, allDayEnabled: 'true' }).allDayEnabled)
      .toBe(false);
  });

  it('боевой вход создаёт мгновенную платную комнату, а банк отдаёт 24-часовое окно', () => {
    const tournaments = readFileSync(path.resolve(__dirname, 'tournaments.ts'), 'utf8');
    const weekly = readFileSync(path.resolve(__dirname, 'tournament_weekly_payout.ts'), 'utf8');
    const app = readFileSync(path.resolve(__dirname, '../../app/(tabs)/tournaments.tsx'), 'utf8');
    const tickets = readFileSync(path.resolve(__dirname, '../../app/tournament_tickets.tsx'), 'utf8');
    const shardStart = tournaments.indexOf('async function createTournamentShardRoom');
    const shardEnd = tournaments.indexOf('async function ensureRoomPlayable', shardStart);
    const shardWriter = tournaments.slice(shardStart, shardEnd);

    expect(tournaments).toContain('config.allDayEnabled === true');
    expect(tournaments).toContain('tournamentAllDayRoomId(nowMs, slot.timezone)');
    expect(tournaments).not.toContain('tournamentAllDayRoomId(stableUid, nowMs, slot.timezone)');
    expect(tournaments).toContain('tournamentJoinTransaction(db, { ...joinIdentity, roomId: allDayRoomId, nowMs })');
    expect(shardWriter).toContain('botArrivalPotEvents(botPlan.players, 0, economySnapshot.botEntryGems)');
    expect(shardWriter).toContain('potGems: lobbyEvents.at(-1)?.potGemsAfter ?? 0');
    expect(weekly).toContain('entryWindowMs: tournamentEntryWindowMsFromEconomy(economySnap.data())');
    expect(app).toContain('const DEFAULT_ENTRY_GEMS = 5;');
    expect(app).toContain(
      'const entryGems = schedule?.entryGems ?? bankInfo?.entryGems ?? DEFAULT_ENTRY_GEMS;',
    );
    expect(tickets).toContain('const DEFAULT_ENTRY_GEMS = 5;');
  });

  /**
   * зачем 2026-08-04 (живой прогон на эмуляторе поймал баг): all-day комната
   * получает admissionMode 'scheduled' (её единственный слот числится enabled
   * в config.slots — см. tournamentRoomAdmissionMode в tournament_core.ts), а
   * room.slotId у неё ВСЕГДА один и тот же TOURNAMENT_ALL_DAY_SLOT_ID (roomId
   * ротируется каждые 30с через tournamentAllDayRoomId, slotId — нет). Без
   * исключения ПЕРВЫЙ вход писал slotKey в профиль игрока, и КАЖДЫЙ
   * следующий вход в тот же день падал slot_already_played — «В этом турнире
   * вы уже играли» на кнопке, которая обязана быть живой весь день. Владелец
   * это увидел вживую: кнопка «Играть» рисовала подтверждение, но сервер
   * отвечал отказом.
   */
  it('лимит «один слот в день» не блокирует повторный вход в all-day турнир', () => {
    const tournaments = readFileSync(path.resolve(__dirname, 'tournaments.ts'), 'utf8');
    expect(tournaments).toContain("admissionMode === 'scheduled' && room.slotId !== TOURNAMENT_ALL_DAY_SLOT_ID");
    // Проверка идёт в ОДНОМ условии со старым slot_already_played guard'ом,
    // а не отдельной веткой — иначе исключение легко потерять при рефакторинге.
    expect(tournaments).toMatch(
      /admissionMode === 'scheduled' && room\.slotId !== TOURNAMENT_ALL_DAY_SLOT_ID\s*&&\s*sanitizeString\(user\.tournament_last_slot_key, 200\) === slotKey\)\s*\{\s*throw new HttpsError\('failed-precondition', 'slot_already_played'\);/,
    );
  });
});
