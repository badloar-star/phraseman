import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { LEVEL_UP_BONUS_OUTBOX_KEY } from './level_up_storage_keys';

const SCHEMA_VERSION = 'level-up-bonus-intent.v1' as const;
const MAX_PENDING_INTENTS = 64;

export type LevelUpBonusIntent = Readonly<{
  schemaVersion: typeof SCHEMA_VERSION;
  ownerStableId: string;
  level: number;
  lang: Lang;
  eventId: string;
  createdAtMs: number;
}>;

type LevelUpBonusAward = (
  intent: LevelUpBonusIntent,
  accountToken: AccountGenerationToken,
) => Promise<void>;

function tokenCurrent(token: AccountGenerationToken): boolean {
  return !!token.stableId && isCurrentAccountGeneration(token, token.stableId);
}

function normalizeLang(value: unknown): Lang {
  return value === 'uk' || value === 'es' ? value : 'ru';
}

function eventIdForLevel(level: number): string {
  return `level_up:${level}:bonus`;
}

function parseQueue(raw: string | null): LevelUpBonusIntent[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((candidate): LevelUpBonusIntent[] => {
      if (!candidate || typeof candidate !== 'object') return [];
      const value = candidate as Partial<LevelUpBonusIntent>;
      const ownerStableId = String(value.ownerStableId ?? '').trim();
      const level = Number(value.level);
      if (!ownerStableId || !Number.isInteger(level) || level < 2 || level > 60) return [];
      return [{
        schemaVersion: SCHEMA_VERSION,
        ownerStableId,
        level,
        lang: normalizeLang(value.lang),
        eventId: eventIdForLevel(level),
        createdAtMs: Math.max(0, Number(value.createdAtMs) || 0),
      }];
    });
  } catch {
    return [];
  }
}

async function readQueue(): Promise<LevelUpBonusIntent[]> {
  return parseQueue(await AsyncStorage.getItem(LEVEL_UP_BONUS_OUTBOX_KEY));
}

export async function loadPendingLevelUpBonusIntents(): Promise<LevelUpBonusIntent[]> {
  const token = captureAccountGeneration();
  if (!tokenCurrent(token)) return [];
  const queue = await readQueue();
  if (!tokenCurrent(token)) return [];
  return queue.filter((intent) => intent.ownerStableId === token.stableId);
}

export async function persistLevelUpBonusIntent(level: number, lang: Lang): Promise<boolean> {
  if (!Number.isInteger(level) || level < 2 || level > 60) return false;
  const token = captureAccountGeneration();
  if (!tokenCurrent(token) || !token.stableId) return false;
  return withAccountTransitionLock(async () => {
    if (!tokenCurrent(token) || !token.stableId) return false;
    const owned = (await readQueue()).filter((intent) => intent.ownerStableId === token.stableId);
    if (!tokenCurrent(token)) return false;
    if (owned.some((intent) => intent.level === level)) return true;
    const next: LevelUpBonusIntent[] = [...owned, {
      schemaVersion: SCHEMA_VERSION,
      ownerStableId: token.stableId,
      level,
      lang: normalizeLang(lang),
      eventId: eventIdForLevel(level),
      createdAtMs: Date.now(),
    }].slice(-MAX_PENDING_INTENTS);
    await AsyncStorage.setItem(LEVEL_UP_BONUS_OUTBOX_KEY, JSON.stringify(next));
    return tokenCurrent(token);
  });
}

let drainInFlight: Promise<number> | null = null;

export function drainPendingLevelUpBonusIntents(award: LevelUpBonusAward): Promise<number> {
  if (drainInFlight) return drainInFlight;
  drainInFlight = (async () => {
    let drained = 0;
    while (true) {
      const token = captureAccountGeneration();
      if (!tokenCurrent(token) || !token.stableId) return drained;
      const intent = await withAccountTransitionLock(async () => {
        if (!tokenCurrent(token) || !token.stableId) return null;
        const queue = await readQueue();
        if (!tokenCurrent(token)) return null;
        return queue.find((candidate) => candidate.ownerStableId === token.stableId) ?? null;
      });
      if (!intent || !tokenCurrent(token)) return drained;

      await award(intent, token);
      if (!tokenCurrent(token)) return drained;

      const removed = await withAccountTransitionLock(async () => {
        if (!tokenCurrent(token)) return false;
        const queue = await readQueue();
        if (!tokenCurrent(token)) return false;
        const next = queue.filter((candidate) => !(
          candidate.ownerStableId === intent.ownerStableId
          && candidate.level === intent.level
          && candidate.eventId === intent.eventId
        ));
        if (next.length === queue.length) return false;
        await AsyncStorage.setItem(LEVEL_UP_BONUS_OUTBOX_KEY, JSON.stringify(next));
        return tokenCurrent(token);
      });
      if (!removed) return drained;
      drained += 1;
    }
  })().finally(() => {
    drainInFlight = null;
  });
  return drainInFlight;
}

