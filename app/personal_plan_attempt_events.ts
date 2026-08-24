import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';

import {
  sanitizePlanAttemptPayload,
  validatePlanAttemptEventContract,
  type PlanAttemptEvent,
} from './personal_plan_engine_contracts';
import {
  commitPhoneStatePracticeFact,
  mergePhoneStatePracticeFacts,
} from './phone_state_practice_bridge';

const PLAN_ATTEMPT_EVENTS_STORAGE_KEY = 'personal_plan_attempt_events_v1';

function compactTags(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeStoredAttemptEvent(event: PlanAttemptEvent): PlanAttemptEvent {
  const selectedAnswer = event.selectedAnswerKnown
    ? event.selectedAnswer?.trim() || undefined
    : undefined;
  const sanitizedPayload = sanitizePlanAttemptPayload(event.sanitizedPayload);

  return {
    ...event,
    planInstanceId: event.planInstanceId.trim(),
    expectedAnswer: event.expectedAnswer?.trim() || undefined,
    selectedAnswer,
    selectedAnswerKnown: Boolean(selectedAnswer),
    grammarTags: compactTags(event.grammarTags),
    vocabularyTags: compactTags(event.vocabularyTags),
    mistakeTags: compactTags(event.mistakeTags),
    sanitizedPayload,
  };
}

function parseStoredAttemptEvents(raw: string | null): PlanAttemptEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((event): event is PlanAttemptEvent => (
      event &&
      typeof event === 'object' &&
      typeof event.id === 'string' &&
      typeof event.planInstanceId === 'string'
    ));
  } catch {
    return [];
  }
}

async function readStoredAttemptEvents(): Promise<PlanAttemptEvent[]> {
  const legacy = parseStoredAttemptEvents(await AsyncStorage.getItem(PLAN_ATTEMPT_EVENTS_STORAGE_KEY));
  const merged = await mergePhoneStatePracticeFacts(
    'attempt',
    Object.fromEntries(legacy.map((event) => [event.id, event])),
  );
  return Object.values(merged);
}

async function writeStoredAttemptEvents(events: PlanAttemptEvent[]): Promise<void> {
  await AsyncStorage.setItem(PLAN_ATTEMPT_EVENTS_STORAGE_KEY, JSON.stringify(events));
}

export function personalPlanAttemptEventsStorageKey(): string {
  return PLAN_ATTEMPT_EVENTS_STORAGE_KEY;
}

export async function appendPersonalPlanAttemptEvent(event: PlanAttemptEvent): Promise<PlanAttemptEvent> {
  const generation = captureAccountGeneration();
  const normalized = normalizeStoredAttemptEvent(event);
  const issues = validatePlanAttemptEventContract(normalized);
  if (issues.length > 0) {
    throw new Error(`Invalid personal plan attempt event: ${issues.join(', ')}`);
  }

  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(generation)) throw new Error('stale_account_generation');
    const events = await readStoredAttemptEvents();
    if (!isCurrentAccountGeneration(generation)) throw new Error('stale_account_generation');
    const withoutDuplicate = events.filter((stored) => stored.id !== normalized.id);
    await commitPhoneStatePracticeFact('attempt', normalized.id, normalized);
    if (!isCurrentAccountGeneration(generation)) throw new Error('stale_account_generation');
    await writeStoredAttemptEvents([...withoutDuplicate, normalized]);
    return normalized;
  });
}

export async function listPersonalPlanAttemptEvents(planInstanceId: string): Promise<PlanAttemptEvent[]> {
  const instanceId = planInstanceId.trim();
  if (!instanceId) return [];
  const events = await readStoredAttemptEvents();
  return events.filter((event) => event.planInstanceId === instanceId);
}

export async function clearPersonalPlanAttemptEvents(planInstanceId: string): Promise<void> {
  const generation = captureAccountGeneration();
  const instanceId = planInstanceId.trim();
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(generation)) throw new Error('stale_account_generation');
    const events = await readStoredAttemptEvents();
    if (!isCurrentAccountGeneration(generation)) throw new Error('stale_account_generation');
    if (!instanceId) {
      await writeStoredAttemptEvents([]);
      return;
    }
    await writeStoredAttemptEvents(events.filter((event) => event.planInstanceId !== instanceId));
  });
}
