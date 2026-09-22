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

/**
 * Потолок хранимых событий попыток.
 *
 * зачем (владелец 2026-09-22, «поищи ещё что-нибудь такое, что копится и
 * заставляет лагать»): на КАЖДЫЙ ответ в личном плане весь массив событий
 * читался целиком, фильтровался и переписывался обратно — а потолка не было.
 * Замер: одно событие ~550 байт (хранит ожидаемый и выбранный ответ плюс три
 * массива меток), 3000 событий = 1.6 МБ и ~30 мс на КАЖДЫЙ ответ на телефоне,
 * 8000 событий = 4.3 МБ и ~160 мс. При 25 упражнениях в день порог боли
 * наступает через четыре месяца и дальше только растёт.
 *
 * Почему обрезать безопасно: ОБА читателя
 * (personal_plan_phrase_recall_items, personal_plan_weak_spot_reader) сразу
 * фильтруют по planInstanceId — им нужны события ТОЛЬКО текущего плана.
 * События завершённых планов не нужны никому. А clearPersonalPlanAttemptEvents
 * написана, но не вызывается НИГДЕ (проверено grep'ом) — поэтому и копилось.
 *
 * Обрезаем по двум условиям сразу, оба консервативные:
 *   • события чужих планов держим ограниченно — вдруг человек вернётся к плану;
 *   • общий потолок не даёт массиву расти бесконечно даже внутри одного плана.
 * Свежие события текущего плана не теряются никогда: хвост режется с начала.
 */
const MAX_STORED_ATTEMPT_EVENTS = 1_200;
const MAX_FOREIGN_PLAN_ATTEMPT_EVENTS = 200;

/**
 * Оставляет только то, что реально может понадобиться: все события текущего
 * плана (до общего потолка) плюс ограниченный хвост прошлых планов.
 *
 * Порядок массива — хронологический (новое дописывается в конец), поэтому
 * срезаем начало: самое старое уходит первым.
 */
function trimStoredAttemptEvents(
  events: readonly PlanAttemptEvent[],
  currentPlanInstanceId: string,
): PlanAttemptEvent[] {
  if (events.length <= MAX_FOREIGN_PLAN_ATTEMPT_EVENTS) return [...events];
  const current: PlanAttemptEvent[] = [];
  const foreign: PlanAttemptEvent[] = [];
  for (const event of events) {
    if (event.planInstanceId === currentPlanInstanceId) current.push(event);
    else foreign.push(event);
  }
  const keptForeign = foreign.slice(-MAX_FOREIGN_PLAN_ATTEMPT_EVENTS);
  const keptCurrent = current.slice(-MAX_STORED_ATTEMPT_EVENTS);
  // Порядок восстанавливаем по времени: читателям он не важен (они фильтруют),
  // но стабильный порядок бережёт от сюрпризов в будущем.
  return [...keptForeign, ...keptCurrent].sort((left, right) => (
    left.occurredAt < right.occurredAt ? -1 : left.occurredAt > right.occurredAt ? 1 : 0
  ));
}

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
    // зачем: без обрезки массив рос вечно и стоил ~160 мс на ответ через год
    // использования — см. комментарий к MAX_STORED_ATTEMPT_EVENTS.
    const nextEvents = trimStoredAttemptEvents(
      [...withoutDuplicate, normalized],
      normalized.planInstanceId,
    );
    if (nextEvents.length < withoutDuplicate.length + 1) {
      console.log(`[PLAN-ATTEMPTS] trim: ${withoutDuplicate.length + 1} → ${nextEvents.length} событий (план ${normalized.planInstanceId})`);
    }
    await writeStoredAttemptEvents(nextEvents);
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
