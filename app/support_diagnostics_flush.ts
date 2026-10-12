/**
 * Планировщик сброса журнала диагностики на диск: через 30 с после первого несброшенного события и при уходе приложения в фон.
 *
 * зачем (координатор 12.10, правило «ничего не замедлять»): кольцо журнала (support_diagnostics.ts) копит события в памяти; здесь —
 * единственный таймер и подписка на AppState, вынесенные из кольца (сторож privacy запрещает таймеры в кольце, чтобы там не появилась
 * фоновая отправка). Отправки нет и здесь: только локальная запись на устройство.
 * Импорт регистрирует слушателя в памяти (без побочных эффектов ввода-вывода); AppState подписывается лениво при первом событии.
 */
import { AppState, type AppStateStatus } from 'react-native';

import { flushSupportDiagnostics, onSupportDiagnosticPending } from './support_diagnostics';

export const SUPPORT_DIAGNOSTIC_FLUSH_DELAY_MS = 30_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let appStateSubscribed = false;

function runFlush(reason: string): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  void flushSupportDiagnostics(reason).catch((error: unknown) => {
    console.warn('[SUPPORT-DIAG] сброс журнала не удался', reason, error instanceof Error ? error.message : String(error)); // guard-ok: немого catch нет
  });
}

function onAppStateChange(state: AppStateStatus): void {
  if (state === 'background' || state === 'inactive') runFlush(`app_${state}`);
}

/** Появилось несброшенное событие: один отложенный сброс на окно 30 с (повторные события таймер не переставляют). */
export function scheduleSupportDiagnosticFlush(): void {
  if (!appStateSubscribed) {
    appStateSubscribed = true;
    AppState.addEventListener('change', onAppStateChange);
  }
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    runFlush('timer_30s');
  }, SUPPORT_DIAGNOSTIC_FLUSH_DELAY_MS);
}

onSupportDiagnosticPending(scheduleSupportDiagnosticFlush);

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
