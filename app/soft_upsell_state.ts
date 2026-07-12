import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  SOFT_UPSELL_CONTEXTS,
  type SoftUpsellContext,
  type SoftUpsellStudyTarget,
} from './soft_upsell_core';

const SCHEMA_VERSION = 1 as const;
const MAX_CONSUMED_MILESTONES = 32;

export interface SoftUpsellPersistedState {
  schemaVersion: typeof SCHEMA_VERSION;
  lastGlobalImpressionMs: number | null;
  contextDismissedAtMs: Partial<Record<SoftUpsellContext, number>>;
  consumedMilestones: string[];
}

let operationQueue: Promise<void> = Promise.resolve();
let sessionClaimed = false;

function emptyState(): SoftUpsellPersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    lastGlobalImpressionMs: null,
    contextDismissedAtMs: {},
    consumedMilestones: [],
  };
}

function storageKey(accountScope: string, studyTarget: SoftUpsellStudyTarget): string {
  return `soft_upsell_state_v1:${encodeURIComponent(accountScope)}:${studyTarget}`;
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function sanitizeMilestones(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const newestFirst: string[] = [];
  const seen = new Set<string>();
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const milestone = value[index];
    if (typeof milestone !== 'string' || milestone.length === 0 || seen.has(milestone)) continue;
    seen.add(milestone);
    newestFirst.push(milestone);
    if (newestFirst.length === MAX_CONSUMED_MILESTONES) break;
  }
  return newestFirst.reverse();
}

function parseState(raw: string | null): SoftUpsellPersistedState {
  if (raw == null) return emptyState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyState();
    const candidate = parsed as Record<string, unknown>;
    if (candidate.schemaVersion !== SCHEMA_VERSION) return emptyState();
    if (candidate.lastGlobalImpressionMs !== null && !isSafeTimestamp(candidate.lastGlobalImpressionMs)) {
      return emptyState();
    }
    if (!candidate.contextDismissedAtMs || typeof candidate.contextDismissedAtMs !== 'object'
      || Array.isArray(candidate.contextDismissedAtMs)) return emptyState();
    const milestones = sanitizeMilestones(candidate.consumedMilestones);
    if (milestones == null) return emptyState();

    const contextDismissedAtMs: Partial<Record<SoftUpsellContext, number>> = {};
    const rawContexts = candidate.contextDismissedAtMs as Record<string, unknown>;
    for (const context of SOFT_UPSELL_CONTEXTS) {
      if (!(context in rawContexts)) continue;
      const timestamp = rawContexts[context];
      if (!isSafeTimestamp(timestamp)) return emptyState();
      contextDismissedAtMs[context] = timestamp;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      lastGlobalImpressionMs: candidate.lastGlobalImpressionMs as number | null,
      contextDismissedAtMs,
      consumedMilestones: milestones,
    };
  } catch {
    return emptyState();
  }
}

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation);
  operationQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function readUnqueued(accountScope: string, studyTarget: SoftUpsellStudyTarget): Promise<SoftUpsellPersistedState> {
  return parseState(await AsyncStorage.getItem(storageKey(accountScope, studyTarget)));
}

export function readSoftUpsellState(
  accountScope: string,
  studyTarget: SoftUpsellStudyTarget,
): Promise<SoftUpsellPersistedState> {
  return serialize(() => readUnqueued(accountScope, studyTarget));
}

export function claimSoftUpsell(_scope: {
  accountScope: string;
  studyTarget: SoftUpsellStudyTarget;
}): Promise<boolean> {
  return serialize(async () => {
    if (sessionClaimed) return false;
    sessionClaimed = true;
    return true;
  });
}

export function markSoftUpsellImpression(
  accountScope: string,
  studyTarget: SoftUpsellStudyTarget,
  _context: SoftUpsellContext,
  milestoneId: string,
  nowMs: number,
): Promise<void> {
  return serialize(async () => {
    if (!isSafeTimestamp(nowMs)) throw new TypeError('nowMs must be a finite safe timestamp');
    const state = await readUnqueued(accountScope, studyTarget);
    const consumedMilestones = sanitizeMilestones([...state.consumedMilestones, milestoneId]) ?? [];
    await AsyncStorage.setItem(storageKey(accountScope, studyTarget), JSON.stringify({
      ...state,
      lastGlobalImpressionMs: nowMs,
      consumedMilestones,
    }));
  });
}

export function markSoftUpsellDismissed(
  accountScope: string,
  studyTarget: SoftUpsellStudyTarget,
  context: SoftUpsellContext,
  nowMs: number,
): Promise<void> {
  return serialize(async () => {
    if (!isSafeTimestamp(nowMs)) throw new TypeError('nowMs must be a finite safe timestamp');
    const state = await readUnqueued(accountScope, studyTarget);
    await AsyncStorage.setItem(storageKey(accountScope, studyTarget), JSON.stringify({
      ...state,
      contextDismissedAtMs: { ...state.contextDismissedAtMs, [context]: nowMs },
    }));
  });
}

export function resetSoftUpsellSessionForTests(): void {
  sessionClaimed = false;
  operationQueue = Promise.resolve();
}
