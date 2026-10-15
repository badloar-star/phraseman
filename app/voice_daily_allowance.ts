/**
 * Голос на сегодня — общий дневной лимит голосовых попыток для Free (D165 Диалоги + D194 новый курс + D196 все микрофоны).
 *
 * зачем (решение владельца 15.10 08:15, D194): Free — 3 голосовые попытки в день на ВСЁ приложение, ОДИН счётчик с Диалогами
 * (тот же ключ dialogue_v2_voice_attempts_v1, модуль app/dialogue_v2_voice_daily_limit.ts), локально, 0 чтений Firestore.
 * Лимит кончился посреди сессии курса — сессия идёт дальше, а тап по микрофону открывает Plus (та же стена, что в Диалогах).
 * Plus — без лимита.
 * D196 (владелец 15.10 ~11:10, «лимит и цифра ВЕЗДЕ»): тот же счётчик на ВСЕ микрофоны — курс, Диалоги и звонок, ИИ-диалог,
 * обычные Уроки (отменяет «Уроки не трогаем»), «Мои ошибки», Карточки и их разговорная тренировка. Исключений нет
 * (в онбординге микрофона нет — владелец 15.10).
 *
 * Попытка = НАЧАТАЯ запись (переход в «слушаю»), не тап: отказ микрофона и отмена до старта не списывают.
 * Защита от двойного списания: одна попытка = один attemptKey (повтор того же ключа не считается).
 * Смена суток — по местному времени (общий getLocalDayKey); хук сам перерисуется в полночь.
 * Журнал: [VOICE-LIMIT] — вход, решение и значение, которое его решило, списание, блок.
 */
import { useEffect, useMemo, useState } from 'react';

import { usePremium } from '../components/PremiumContext';
import { onAccountOwnerChanged } from './account_owner_change';
import {
  FREE_DIALOG_VOICE_DAILY_LIMIT,
  dialogVoiceLimitDecision,
  hydrateDialogVoiceAttempts,
  isDialogVoiceAttemptsHydrated,
  peekDialogVoiceAttempts,
  recordDialogVoiceAttempt,
  subscribeDialogVoiceAttempts,
} from './dialogue_v2_voice_daily_limit';

const LOG = '[VOICE-LIMIT]';

export type VoiceAllowanceSurface =
  | 'course_v2'
  | 'dialogs'
  | 'dialog_call'
  | 'ai_dialog'
  | 'lessons'
  | 'mistakes'
  | 'cards'
  | 'cards_speaking';

/** D196: все микрофоны приложения — один дневной счётчик Free; список для подключения цифры на каждой иконке (Дизайн). */
export const VOICE_ALLOWANCE_SURFACES: readonly VoiceAllowanceSurface[] = Object.freeze([
  'course_v2', 'dialogs', 'dialog_call', 'ai_dialog', 'lessons', 'mistakes', 'cards', 'cards_speaking',
]);

/**
 * DEV (съёмка D194, Сверка): dev_state?lv2voice=3|1|0 — сколько голосовых попыток «осталось сегодня» на экране; off — снять.
 * зачем: робот не делает три настоящие записи, чтобы снять «1» и «PLUS». Только __DEV__ и память; диск счётчика не трогается.
 */
let devVoiceRemaining: number | null = null;
const devVoiceListeners = new Set<() => void>();

export function setDevVoiceRemaining(remaining: number | null): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  devVoiceRemaining = remaining === null ? null : Math.max(0, Math.min(FREE_DIALOG_VOICE_DAILY_LIMIT, Math.floor(remaining)));
  console.log(`[DEV-STATE] lv2voice=${devVoiceRemaining === null ? 'off' : devVoiceRemaining}`); // guard-ok: dev-ветка
  for (const listener of devVoiceListeners) listener();
  return true;
}

/** Счётчик попыток с учётом dev-подмены (в стор-сборке подмена всегда null). */
function peekCount(): number {
  return devVoiceRemaining === null ? peekDialogVoiceAttempts() : FREE_DIALOG_VOICE_DAILY_LIMIT - devVoiceRemaining;
}

function peekHydrated(): boolean {
  return devVoiceRemaining !== null || isDialogVoiceAttemptsHydrated();
}

/** Контекст пейвола на исчерпанном лимите: «Бесплатно — 3 голосом в день. С Plus говори сколько хочешь.» */
export const VOICE_LIMIT_PAYWALL_CONTEXT = 'ai_voice_input';

export type VoiceDailyAllowance = Readonly<{
  /** plus — без лимита; limited — Free и счётчик известен; unknown — ещё не знаем (цифру не рисуем, не мигаем). */
  kind: 'plus' | 'limited' | 'unknown';
  /** Осталось на сегодня (0…3) или null при plus/unknown. */
  remaining: number | null;
  exhausted: boolean;
  limit: number;
}>;

type Access = Readonly<{ accessResolved: boolean; hasPremiumAccess: boolean }>;

/** Чистое решение: что показать на микрофоне. Экспорт — для тестов и не-React мест. */
export function voiceDailyAllowanceFrom(input: Access & Readonly<{ count: number; hydrated: boolean }>): VoiceDailyAllowance {
  const decision = dialogVoiceLimitDecision({ accessResolved: input.accessResolved, hasPremiumAccess: input.hasPremiumAccess, count: input.count });
  if (decision === 'plus_unlimited') return { kind: 'plus', remaining: null, exhausted: false, limit: FREE_DIALOG_VOICE_DAILY_LIMIT };
  if (decision === 'limit_reached') return { kind: 'limited', remaining: 0, exhausted: true, limit: FREE_DIALOG_VOICE_DAILY_LIMIT };
  // доступ ещё не проверен или счётчик не прочитан с диска — не рисуем цифру (Plus не должен увидеть «3» из-за медленной проверки)
  if (decision === 'access_unknown' || !input.hydrated) return { kind: 'unknown', remaining: null, exhausted: false, limit: FREE_DIALOG_VOICE_DAILY_LIMIT };
  return {
    kind: 'limited',
    remaining: Math.max(0, FREE_DIALOG_VOICE_DAILY_LIMIT - input.count),
    exhausted: false,
    limit: FREE_DIALOG_VOICE_DAILY_LIMIT,
  };
}

/**
 * Можно ли начинать запись. false → вызывающий открывает пейвол (VOICE_LIMIT_PAYWALL_CONTEXT) и запись не стартует.
 * «Доступ неизвестен» пропускает: блокировать Plus из-за медленной проверки хуже, чем дать одну лишнюю попытку.
 */
/**
 * Ревизор R1-c (15.10): признак «доступ выяснен» наблюдали только через ~94 с, а без сети он может не выставиться вовсе — тогда
 * гейт в access_unknown пускал Free без лимита весь запуск. Для лимита голоса (и только для него) доступ, неизвестный дольше
 * ACCESS_UNKNOWN_GRACE_MS от запуска, считаем Free. Plus с сохранённым статусом сюда не попадает: hasPremiumAccess берётся из снимка сразу.
 */
const ACCESS_UNKNOWN_GRACE_MS = 8_000;
// зачем (Ревизор R1-c-2 15.10): отсчёт 8 с — от НАЧАЛА текущего ожидания доступа, а не от загрузки модуля. Вход в свой Plus
// посреди запуска сбрасывает доступ (resetPremiumUiForAccountTransition: resolved=false, premium=false); при отсчёте от
// старта окно давно истекло бы, и платящий сразу увидел бы цифру и пейвол, пока подписка резолвится.
let accessWaitStartedAtMs = Date.now();
let lastRawAccessKnown = false;
let accessFallbackLogged = false;

function restartAccessWait(reason: string, nowMs: number): void {
  accessWaitStartedAtMs = nowMs;
  accessFallbackLogged = false;
  console.log(`${LOG} access_wait_restart ${JSON.stringify({ reason, graceMs: ACCESS_UNKNOWN_GRACE_MS })}`);
}

/** Доступ неизвестен дольше ACCESS_UNKNOWN_GRACE_MS — лимит голоса работает как у Free (отложенные — только в памяти). */
function isAccessFallback(access: Access, nowMs: number): boolean {
  if (access.accessResolved || access.hasPremiumAccess) {
    lastRawAccessKnown = true;
    return false;
  }
  if (lastRawAccessKnown) {
    // был известен → снова неизвестен: смена аккаунта / сброс премиума — ждём заново, а не сразу Free
    lastRawAccessKnown = false;
    restartAccessWait('access_reset', nowMs);
  }
  return nowMs - accessWaitStartedAtMs >= ACCESS_UNKNOWN_GRACE_MS;
}

export function effectiveVoiceAccess(access: Access, nowMs: number = Date.now()): Access {
  if (!isAccessFallback(access, nowMs)) return access;
  if (!accessFallbackLogged) {
    accessFallbackLogged = true;
    console.warn(`[ACCESS-RESOLVE] voice_fallback_free ${JSON.stringify({ waitedMs: nowMs - accessWaitStartedAtMs, graceMs: ACCESS_UNKNOWN_GRACE_MS })}`); // guard-ok: причина резолва для лимита
  }
  return { accessResolved: true, hasPremiumAccess: false };
}

/** Сколько ещё ждать до запасного режима (для перерисовки значка); 0 — уже наступил или не нужен. */
export function msUntilVoiceAccessFallback(access: Access, nowMs: number = Date.now()): number {
  if (access.accessResolved || access.hasPremiumAccess) return 0;
  return Math.max(0, ACCESS_UNKNOWN_GRACE_MS - (nowMs - accessWaitStartedAtMs));
}

/** Отложенные до выяснения доступа попытки; в запасном режиме входят в лимит (на диск не пишутся). */
function pendingCountFor(rawAccess: Access, nowMs: number): number {
  return isAccessFallback(rawAccess, nowMs) ? pendingUnresolvedKeys.length : 0;
}
const pendingListeners = new Set<() => void>();
function emitPending(): void {
  for (const listener of pendingListeners) listener();
}

export function voiceDailyAllowanceGate(surface: VoiceAllowanceSurface, rawAccess: Access): boolean {
  const nowMs = Date.now();
  const access = effectiveVoiceAccess(rawAccess, nowMs);
  const pending = pendingCountFor(rawAccess, nowMs);
  const count = peekCount() + pending;
  const decision = dialogVoiceLimitDecision({ ...access, count });
  const allowed = decision !== 'limit_reached';
  console.log(`${LOG} gate ${JSON.stringify({ surface, decision, count, pendingInMemory: pending, fallback: access !== rawAccess, limit: FREE_DIALOG_VOICE_DAILY_LIMIT, hydrated: isDialogVoiceAttemptsHydrated(), allowed })}`);
  return allowed;
}

const countedAttemptKeys: string[] = [];
const COUNTED_KEYS_MEMORY = 32;

/**
 * Списать попытку в момент НАЧАЛА записи. attemptKey — уникален на одну запись (например `${interactionId}:${номер попытки}`):
 * повтор того же ключа (двойной статус «слушаю», повторный рендер) не списывает второй раз. Plus не списывает.
 * Возвращает счётчик после списания (или текущий, если не списано).
 */
export function recordVoiceDailyAttempt(surface: VoiceAllowanceSurface, attemptKey: string, rawAccess: Access): number {
  const nowMs = Date.now();
  // отложенные решает только НАСТОЯЩИЙ ответ о доступе, не запасной режим (Ревизор R1-c-2)
  if (rawAccess.accessResolved) settleVoiceAttemptsAfterAccess(rawAccess);
  if (!rawAccess.accessResolved && !rawAccess.hasPremiumAccess) {
    // зачем (Ревизор 15.10 🟡 + R1-c-2): пока доступ не выяснен, это может быть Plus — на диск не списываем, держим в памяти
    // и решаем, когда доступ станет известен (Plus — отбросить, Free — засчитать). В запасном режиме (ждём > 8 с) эти
    // попытки входят в лимит из памяти: офлайн Free не говорит без лимита, а Plus не получит списаний на диске.
    if (!pendingUnresolvedKeys.some((p) => p.attemptKey === attemptKey) && !countedAttemptKeys.includes(attemptKey)) {
      pendingUnresolvedKeys.push({ surface, attemptKey });
      emitPending();
    }
    const fallback = isAccessFallback(rawAccess, nowMs);
    console.log(`${LOG} attempt:deferred ${JSON.stringify({ surface, reason: 'access_unknown', fallback, pending: pendingUnresolvedKeys.length })}`);
    return peekDialogVoiceAttempts() + (fallback ? pendingUnresolvedKeys.length : 0);
  }
  const access = rawAccess;
  if (access.hasPremiumAccess) {
    console.log(`${LOG} attempt:not_counted ${JSON.stringify({ surface, reason: 'plus_unlimited' })}`);
    return peekDialogVoiceAttempts();
  }
  if (countedAttemptKeys.includes(attemptKey)) {
    console.log(`${LOG} attempt:not_counted ${JSON.stringify({ surface, reason: 'same_attempt_key', count: peekDialogVoiceAttempts() })}`);
    return peekDialogVoiceAttempts();
  }
  countedAttemptKeys.push(attemptKey);
  if (countedAttemptKeys.length > COUNTED_KEYS_MEMORY) countedAttemptKeys.shift();
  const count = recordDialogVoiceAttempt();
  console.log(`${LOG} attempt:counted ${JSON.stringify({ surface, count, limit: FREE_DIALOG_VOICE_DAILY_LIMIT, accessResolved: access.accessResolved })}`);
  return count;
}

const pendingUnresolvedKeys: { surface: VoiceAllowanceSurface; attemptKey: string }[] = [];
// зачем (Ревизор R1-b): отложенные попытки и ключи принадлежат владельцу — при смене аккаунта попытка A не должна засчитаться B.
onAccountOwnerChanged('voice_daily_allowance', () => {
  const dropped = pendingUnresolvedKeys.length;
  pendingUnresolvedKeys.length = 0;
  countedAttemptKeys.length = 0;
  console.log(`${LOG} owner_changed ${JSON.stringify({ droppedPending: dropped })}`);
  lastRawAccessKnown = false;
  restartAccessWait('owner_changed', Date.now());
  emitPending();
});

/** Доступ выяснен: отложенные попытки Plus отбрасываются, Free — засчитываются (каждая один раз по attemptKey). */
export function settleVoiceAttemptsAfterAccess(access: Access): void {
  if (!access.accessResolved || pendingUnresolvedKeys.length === 0) return;
  const pending = pendingUnresolvedKeys.splice(0, pendingUnresolvedKeys.length);
  emitPending();
  if (access.hasPremiumAccess) {
    console.log(`${LOG} attempt:deferred_dropped ${JSON.stringify({ reason: 'plus_unlimited', dropped: pending.length })}`);
    return;
  }
  for (const item of pending) {
    if (countedAttemptKeys.includes(item.attemptKey)) continue;
    countedAttemptKeys.push(item.attemptKey);
    if (countedAttemptKeys.length > COUNTED_KEYS_MEMORY) countedAttemptKeys.shift();
    const count = recordDialogVoiceAttempt();
    console.log(`${LOG} attempt:counted ${JSON.stringify({ surface: item.surface, count, limit: FREE_DIALOG_VOICE_DAILY_LIMIT, deferred: true })}`);
  }
}

function msUntilNextLocalMidnight(nowMs: number): number {
  const next = new Date(nowMs);
  next.setHours(24, 0, 0, 0);
  return Math.max(1_000, next.getTime() - nowMs + 500);
}

/**
 * Голос на сегодня для экрана: первый кадр — синхронно из памяти (без мигания), диск догоняет фоном, после списания и в местную
 * полночь — перерисовка. 0 чтений Firestore: Plus — из общего usePremium, счётчик — локальный.
 */
export function useVoiceDailyAllowance(): VoiceDailyAllowance {
  const { accessResolved, hasPremiumAccess } = usePremium();
  const [snapshot, setSnapshot] = useState(() => ({ count: peekCount(), hydrated: peekHydrated() }));
  // отложенные в памяти попытки (запасной режим) — перерисовать цифру сразу после записи
  const [pendingTick, setPendingTick] = useState(0);
  useEffect(() => {
    const sync = () => setSnapshot((prev) => {
      const next = { count: peekCount(), hydrated: peekHydrated() };
      return prev.count === next.count && prev.hydrated === next.hydrated ? prev : next;
    });
    const unsubscribe = subscribeDialogVoiceAttempts(sync);
    devVoiceListeners.add(sync);
    const syncPending = () => setPendingTick((tick) => tick + 1);
    pendingListeners.add(syncPending);
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;
    const armMidnight = () => {
      midnightTimer = setTimeout(() => {
        console.log(`${LOG} day_rollover ${JSON.stringify({ count: peekDialogVoiceAttempts() })}`);
        sync();
        armMidnight();
      }, msUntilNextLocalMidnight(Date.now()));
    };
    armMidnight();
    void hydrateDialogVoiceAttempts().then(sync, (error: unknown) => {
      console.warn(`${LOG} hydrate_failed ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}`);
    });
    return () => {
      unsubscribe();
      devVoiceListeners.delete(sync);
      pendingListeners.delete(syncPending);
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, []);
  // зачем (Ревизор R1-c): доступ так и не выяснился — через 8 с от запуска значок перерисуется в режиме Free (цифра видна)
  const [fallbackTick, setFallbackTick] = useState(0);
  useEffect(() => {
    const waitMs = msUntilVoiceAccessFallback({ accessResolved, hasPremiumAccess });
    if (waitMs <= 0) return undefined;
    const timer = setTimeout(() => setFallbackTick((tick) => tick + 1), waitMs + 50);
    return () => clearTimeout(timer);
  }, [accessResolved, hasPremiumAccess]);
  const access = useMemo(
    () => effectiveVoiceAccess({ accessResolved, hasPremiumAccess }),
    // fallbackTick — перечитать время после истечения запасного окна
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accessResolved, hasPremiumAccess, fallbackTick],
  );
  // зачем (Ревизор 15.10 🟡): доступ выяснился — решаем отложенные попытки (Plus — отбросить, Free — засчитать)
  useEffect(() => {
    // только настоящий ответ о доступе решает отложенные (запасной режим держит их в памяти — Ревизор R1-c-2)
    if (accessResolved) settleVoiceAttemptsAfterAccess({ accessResolved, hasPremiumAccess });
  }, [accessResolved, hasPremiumAccess]);
  return useMemo(
    () => voiceDailyAllowanceFrom({
      ...access,
      count: snapshot.count + pendingCountFor({ accessResolved, hasPremiumAccess }, Date.now()),
      hydrated: snapshot.hydrated,
    }),
    // pendingTick — пересчитать отложенные в памяти
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [access, snapshot.count, snapshot.hydrated, pendingTick],
  );
}

/** Имя, под которым его ждёт плеер нового курса (Дизайн, D194): тот же хук, тот же общий счётчик. */
export const useLearningV2VoiceAllowance = useVoiceDailyAllowance;

/** Только для тестов. */
export function resetVoiceDailyAllowanceForTests(): void {
  countedAttemptKeys.length = 0;
  pendingUnresolvedKeys.length = 0;
  devVoiceRemaining = null;
  accessWaitStartedAtMs = Date.now();
  lastRawAccessKnown = false;
  accessFallbackLogged = false;
}

/* expo-router: keep this utility from being treated as a screen */
export default function __VoiceDailyAllowanceRouteShim() {
  return null;
}
