// Начисление XP за MAX-звонок из ответа maxVoiceSessionEnd.
//
// зачем (аудит MAX 2026-08-30, класс «награду посчитали — не выдали»): сервер
// считает XP урока (секунды речи × ставка CEFR, дневной кэп) и пишет его в
// voice_call_billing.xpAwarded, но клиент выбрасывал ответ end() — в XPSource
// не существовало источника, и платный урок не двигал ни уровень, ни серию.
//
// Здесь единственная точка входа значения в клиент:
//   • сервер — авторитет суммы (клиентские множители НЕ применяются:
//     'max_voice' намеренно не в isEarnedXP, иначе разъезд с billing);
//   • идемпотентность — стабильный eventId `max_voice:xp:<sessionId>`
//     (локальный ledger xp_manager + серверный дедуп прогресс-события);
//   • экран разбора подписывается и показывает «+N XP», когда ответ доехал.
//
// Модуль намеренно без React: ответ end() приходит во время teardown, когда
// экран звонка уже уводит на разбор — жизненный цикл компонента ему не хозяин.

import type { Lang } from '../constants/i18n';
import { registerXP } from './xp_manager';
import { DebugLogger } from './debug-logger';

export interface MaxVoiceXpAwardState {
  /** Сколько XP сервер насчитал за этот звонок (0 — ничего не положено). */
  serverXp: number;
  /** true — registerXP отработал (или сумма 0 и начислять нечего). */
  credited: boolean;
}

const MAX_TRACKED_SESSIONS = 8;

const states = new Map<string, MaxVoiceXpAwardState>();
const listeners = new Map<string, Set<(state: MaxVoiceXpAwardState) => void>>();
/** Сессии, для которых начисление уже запущено, — двойной end не даёт второй registerXP. */
const started = new Set<string>();

function rememberState(sessionId: string, state: MaxVoiceXpAwardState): void {
  states.delete(sessionId);
  states.set(sessionId, state);
  while (states.size > MAX_TRACKED_SESSIONS) {
    const oldest = states.keys().next().value as string | undefined;
    if (!oldest) break;
    states.delete(oldest);
  }
  const subs = listeners.get(sessionId);
  if (!subs) return;
  for (const cb of subs) {
    try {
      cb(state);
    } catch (e) {
      DebugLogger.error('max_voice_xp_award:notify', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
}

/** Синхронный снимок для первого кадра разбора (ответ обычно уже доехал). */
export function peekMaxVoiceXpAward(sessionId: string): MaxVoiceXpAwardState | null {
  return states.get(sessionId) ?? null;
}

export function subscribeMaxVoiceXpAward(
  sessionId: string,
  cb: (state: MaxVoiceXpAwardState) => void,
): () => void {
  const subs = listeners.get(sessionId) ?? new Set();
  subs.add(cb);
  listeners.set(sessionId, subs);
  return () => {
    subs.delete(cb);
    if (subs.size === 0) listeners.delete(sessionId);
  };
}

/**
 * Разбор ответа maxVoiceSessionEnd. Никогда не бросает: начисление награды не
 * имеет права уронить teardown звонка.
 *
 * alreadySettled=true — двойной end или гонка с watchdog: сервер вернул нули,
 * первый (настоящий) ответ уже начислил своё; такой ответ игнорируем молча.
 */
export function handleMaxVoiceSessionEndResult(args: {
  sessionId: string;
  response: unknown;
  lang: Lang;
}): void {
  const { sessionId, lang } = args;
  if (!sessionId || started.has(sessionId)) return;
  const res = args.response && typeof args.response === 'object'
    ? args.response as Record<string, unknown>
    : {};
  if (res.alreadySettled === true) return;
  const raw = Number(res.xpAwarded);
  const serverXp = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  started.add(sessionId);
  while (started.size > MAX_TRACKED_SESSIONS * 4) {
    const oldest = started.values().next().value as string | undefined;
    if (!oldest) break;
    started.delete(oldest);
  }
  if (serverXp <= 0) {
    rememberState(sessionId, { serverXp: 0, credited: true });
    return;
  }
  // guard-ok: не fire-and-forget — ниже прицеплены .then/.catch, ошибка
  // логируется и переводит состояние в credited:false; await здесь нельзя
  // (вызов идёт из teardown звонка, который не имеет права ждать сеть).
  void registerXP(serverXp, 'max_voice', '', lang, undefined, {
    eventId: `max_voice:xp:${sessionId}`,
    payload: { sessionId },
  }).then(() => {
    // finalDelta может быть 0 при дедупе (повторный запуск того же eventId) —
    // урок всё равно принёс serverXp, чип показывает именно его.
    rememberState(sessionId, { serverXp, credited: true });
  }).catch((e) => {
    // Начисление не прошло (хранилище/гонка аккаунтов) — чип не показываем,
    // чтобы не обещать невыданное; причина обязана попасть в лог.
    DebugLogger.error('max_voice_xp_award:registerXP', e instanceof Error ? e : new Error(String(e)), 'warning');
    rememberState(sessionId, { serverXp, credited: false });
  });
}

export function __resetMaxVoiceXpAwardForTests(): void {
  states.clear();
  listeners.clear();
  started.clear();
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
