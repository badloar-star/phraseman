import { createHash } from 'node:crypto';
import {
  TOURNAMENT_ENTRY_WINDOW_MS,
  dateKeyInTimezone,
  tournamentRoomId,
  type TournamentSlotConfig,
} from './tournament_core';
import { DEFAULT_TOURNAMENT_ECONOMY } from './tournament_economy';

export const TOURNAMENT_ALL_DAY_SLOT_ID = 'all_day';
export const TOURNAMENT_ALL_DAY_ENTRY_WINDOW_MS = 24 * 60 * 60 * 1000;
const TOURNAMENT_ALL_DAY_COHORT_MS = 30 * 1000;

type ScheduleWriteInput = {
  readonly slots: readonly TournamentSlotConfig[];
  readonly timezone: string;
  readonly freeWeeklyEntry: boolean;
  readonly ticketGemValue: number;
  readonly testingEnabled: boolean;
  readonly allDayEnabled: boolean;
};

type ScheduleWrite = {
  config: {
    slots: readonly TournamentSlotConfig[];
    scheduledSlots: readonly TournamentSlotConfig[];
    allDayEnabled: boolean;
    freeWeeklyEntry: boolean;
    ticketGemValue: number;
    entryGems: number;
    testingEnabled: boolean;
    updatedAtMs: number;
  };
  economy: {
    tournamentEntryWindowMs: number;
    entryGems: number;
    botEntryGems: number;
    updatedAtMs: number;
  };
};

export function buildTournamentScheduleWrite(input: ScheduleWriteInput, updatedAtMs: number): ScheduleWrite {
  const scheduledSlots = input.slots.map((slot) => ({ ...slot }));
  const slots = input.allDayEnabled
    ? [{
      slotId: TOURNAMENT_ALL_DAY_SLOT_ID,
      localTime: '00:00',
      timezone: input.timezone,
      ticketsRequired: 1,
      enabled: true,
    }]
    : scheduledSlots;
  return {
    config: {
      slots,
      scheduledSlots,
      allDayEnabled: input.allDayEnabled,
      freeWeeklyEntry: input.freeWeeklyEntry,
      ticketGemValue: input.ticketGemValue,
      entryGems: DEFAULT_TOURNAMENT_ECONOMY.entryGems,
      testingEnabled: input.testingEnabled,
      updatedAtMs,
    },
    economy: {
      tournamentEntryWindowMs: input.allDayEnabled
        ? TOURNAMENT_ALL_DAY_ENTRY_WINDOW_MS
        : TOURNAMENT_ENTRY_WINDOW_MS,
      entryGems: DEFAULT_TOURNAMENT_ECONOMY.entryGems,
      botEntryGems: DEFAULT_TOURNAMENT_ECONOMY.botEntryGems,
      updatedAtMs,
    },
  };
}

export function tournamentEntryWindowMsFromEconomy(raw: unknown): number {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return TOURNAMENT_ENTRY_WINDOW_MS;
  const value = Number((raw as Record<string, unknown>).tournamentEntryWindowMs);
  return Number.isSafeInteger(value) && value >= TOURNAMENT_ENTRY_WINDOW_MS
    && value <= TOURNAMENT_ALL_DAY_ENTRY_WINDOW_MS
    ? value
    : TOURNAMENT_ENTRY_WINDOW_MS;
}

export function tournamentAllDayRoomId(nowMs: number, timezone: string): string {
  const cohort = Math.floor(nowMs / TOURNAMENT_ALL_DAY_COHORT_MS);
  const opaque = createHash('sha256').update(`${timezone}:${cohort}`).digest('hex').slice(0, 20);
  return tournamentRoomId(
    `all-day-${opaque}`,
    timezone,
    dateKeyInTimezone(nowMs, timezone),
  );
}
