/**
 * Голос на сегодня — общий дневной лимит голосовых попыток для Free (D165 Диалоги + D194 новый курс Learning V2).
 *
 * зачем (решение владельца 15.10 08:15, D194): Free — 3 голосовые попытки в день на ВСЁ приложение, ОДИН счётчик с Диалогами
 * (тот же ключ dialogue_v2_voice_attempts_v1, модуль app/dialogue_v2_voice_daily_limit.ts), локально, 0 чтений Firestore.
 * Лимит кончился посреди сессии курса — сессия идёт дальше, а тап по микрофону открывает Plus (та же стена, что в Диалогах).
 * Plus — без лимита. Только новый курс и Диалоги; обычные Уроки не трогаем.
 *
 * Попытка = НАЧАТАЯ запись (переход в «слушаю»), не тап: отказ микрофона и отмена до старта не списывают.
 * Защита от двойного списания: одна попытка = один attemptKey (повтор того же ключа не считается).
 * Смена суток — по местному времени (общий getLocalDayKey); хук сам перерисуется в полночь.
 * Журнал: [VOICE-LIMIT] — вход, решение и значение, которое его решило, списание, блок.
 */
import { useEffect, useMemo, useState } from 'react';

import { usePremium } from '../components/PremiumContext';
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

export type VoiceAllowanceSurface = 'course_v2' | 'dialogs';

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
export function voiceDailyAllowanceGate(surface: VoiceAllowanceSurface, access: Access): boolean {
  const count = peekCount();
  const decision = dialogVoiceLimitDecision({ ...access, count });
  const allowed = decision !== 'limit_reached';
  console.log(`${LOG} gate ${JSON.stringify({ surface, decision, count, limit: FREE_DIALOG_VOICE_DAILY_LIMIT, hydrated: isDialogVoiceAttemptsHydrated(), allowed })}`);
  return allowed;
}

const countedAttemptKeys: string[] = [];
const COUNTED_KEYS_MEMORY = 32;

/**
 * Списать попытку в момент НАЧАЛА записи. attemptKey — уникален на одну запись (например `${interactionId}:${номер попытки}`):
 * повтор того же ключа (двойной статус «слушаю», повторный рендер) не списывает второй раз. Plus не списывает.
 * Возвращает счётчик после списания (или текущий, если не списано).
 */
export function recordVoiceDailyAttempt(surface: VoiceAllowanceSurface, attemptKey: string, access: Access): number {
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
  useEffect(() => {
    const sync = () => setSnapshot((prev) => {
      const next = { count: peekCount(), hydrated: peekHydrated() };
      return prev.count === next.count && prev.hydrated === next.hydrated ? prev : next;
    });
    const unsubscribe = subscribeDialogVoiceAttempts(sync);
    devVoiceListeners.add(sync);
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
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, []);
  return useMemo(
    () => voiceDailyAllowanceFrom({ accessResolved, hasPremiumAccess, count: snapshot.count, hydrated: snapshot.hydrated }),
    [accessResolved, hasPremiumAccess, snapshot.count, snapshot.hydrated],
  );
}

/** Имя, под которым его ждёт плеер нового курса (Дизайн, D194): тот же хук, тот же общий счётчик. */
export const useLearningV2VoiceAllowance = useVoiceDailyAllowance;

/** Только для тестов. */
export function resetVoiceDailyAllowanceForTests(): void {
  countedAttemptKeys.length = 0;
  devVoiceRemaining = null;
}

/* expo-router: keep this utility from being treated as a screen */
export default function __VoiceDailyAllowanceRouteShim() {
  return null;
}
