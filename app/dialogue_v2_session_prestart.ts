/**
 * Фоновый старт сессии Диалога V2 на брифинге (владелец 01.10: диалоги «ДОЛЖНЫ»
 * открываться без ожидания).
 *
 * Пока человек читает брифинг, сервер уже создаёт сессию (dialogueV2SessionStart).
 * Здесь — только реестр в памяти процесса: обещание старта по ключу язык:сцена,
 * одноразовое (забирает экран сессии), с запасом до истечения. Сеть сюда не входит:
 * сетевой старт передаётся снаружи (app/dialogue_v2_turn_client.ts), поэтому нет
 * кругового импорта.
 *
 * ⚠️ Энергия и дневной/месячный лимит здесь НЕ тратятся: энергия — на «Начать»
 * (решение владельца 30.09), квота ответов — сервером на первом ходе ученика.
 * Ушёл, не начав, — серверная сессия истекает сама (TTL 24 ч), ИИ не вызывался.
 */
export type DialogueV2PrestartSelection = Readonly<{ studyTarget: string; scenarioId: string }>;
export type DialogueV2PrestartedSession = Readonly<{ ok: true; sessionId: string; expiresAtMs: number }>;

type Entry = {
  promise: Promise<DialogueV2PrestartedSession | null>;
  startedAtMs: number;
  settled: DialogueV2PrestartedSession | null | 'pending' | 'failed';
};

const LOG = '[DIALOGUE-V2] prestart';
/** Сессия, которой осталось меньше 10 минут, не берётся — стартуем заново. */
export const DIALOGUE_V2_PRESTART_MIN_REMAINING_MS = 10 * 60 * 1000;
/** Обещание старше часа выбрасывается даже без ответа (зависшая сеть). */
const PRESTART_MAX_AGE_MS = 60 * 60 * 1000;

const entries = new Map<string, Entry>();
const taps = new Map<string, number>();

function keyOf(selection: DialogueV2PrestartSelection): string {
  return `${selection.studyTarget}:${selection.scenarioId}`;
}

/**
 * Запомнить фоновый старт. Повторный вызов для той же сцены, пока прежний жив,
 * ничего не делает (дедуп: заход-выход-заход не плодит сессии и записи).
 */
export function registerDialogueV2Prestart(
  selection: DialogueV2PrestartSelection,
  start: () => Promise<DialogueV2PrestartedSession | null>,
  nowMs: number,
): boolean {
  const key = keyOf(selection);
  const existing = entries.get(key);
  if (existing && reusable(existing, nowMs)) {
    console.log(LOG, JSON.stringify({ event: 'dedup', key, ageMs: nowMs - existing.startedAtMs }));
    return false;
  }
  const entry: Entry = { promise: Promise.resolve(null), startedAtMs: nowMs, settled: 'pending' };
  entry.promise = start().then((session) => {
    entry.settled = session;
    console.log(LOG, JSON.stringify({ event: session ? 'ready' : 'empty', key, tookMs: Date.now() - nowMs }));
    return session;
  }, (error: unknown) => {
    entry.settled = 'failed';
    console.warn(LOG, JSON.stringify({ event: 'failed', key, message: error instanceof Error ? error.message : String(error) }));
    return null;
  });
  entries.set(key, entry);
  console.log(LOG, JSON.stringify({ event: 'started', key }));
  return true;
}

function reusable(entry: Entry, nowMs: number): boolean {
  if (entry.settled === 'failed' || entry.settled === null) return false;
  if (entry.settled === 'pending') return nowMs - entry.startedAtMs < PRESTART_MAX_AGE_MS;
  return entry.settled.expiresAtMs - nowMs > DIALOGUE_V2_PRESTART_MIN_REMAINING_MS;
}

/**
 * Забрать фоновый старт для экрана сессии (одноразово). null — его нет или он
 * непригоден (провалился, истекает) — тогда экран стартует сессию сам.
 */
export function takeDialogueV2Prestart(
  selection: DialogueV2PrestartSelection,
  nowMs: number,
): Readonly<{ promise: Promise<DialogueV2PrestartedSession | null>; state: 'ready' | 'pending' }> | null {
  const key = keyOf(selection);
  const entry = entries.get(key);
  entries.delete(key);
  if (!entry) {
    console.log(LOG, JSON.stringify({ event: 'miss', key }));
    return null;
  }
  if (!reusable(entry, nowMs)) {
    console.log(LOG, JSON.stringify({ event: 'discarded', key, settled: typeof entry.settled === 'object' ? 'session_expiring' : entry.settled }));
    return null;
  }
  const state = entry.settled === 'pending' ? 'pending' : 'ready';
  console.log(LOG, JSON.stringify({ event: 'hit', key, state, ageMs: nowMs - entry.startedAtMs }));
  return Object.freeze({ promise: entry.promise, state });
}

/** Отметка тапа «Начать» — для замера «тап → готовность первого хода». */
export function markDialogueV2StartTap(selection: DialogueV2PrestartSelection, nowMs: number): void {
  taps.set(keyOf(selection), nowMs);
}

/** Сколько прошло от тапа «Начать» (null — тапа не было, например повтор старта). */
export function consumeDialogueV2StartTapAgeMs(selection: DialogueV2PrestartSelection, nowMs: number): number | null {
  const key = keyOf(selection);
  const tapAt = taps.get(key);
  taps.delete(key);
  return tapAt === undefined ? null : nowMs - tapAt;
}

/** Только для тестов. */
export function resetDialogueV2PrestartForTests(): void {
  entries.clear();
  taps.clear();
}
