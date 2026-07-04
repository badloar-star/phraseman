// ════════════════════════════════════════════════════════════════════════════
// net_status.ts — лёгкая офлайн-детекция без нативных зависимостей.
//
// В проекте нет NetInfo/expo-network (нативная зависимость = пересборка +
// правка занятого package-lock), поэтому статус сети определяем сами:
//   • активный probe: GET generate_204 с таймаутом — стандартная проверка
//     связности (любой HTTP-ответ = сеть есть; ошибка/таймаут = сети нет);
//   • пассивные сигналы: любой модуль может сообщить reportNetworkSuccess /
//     reportNetworkFailure по итогам своих запросов — статус обновляется
//     без лишних probe.
// Probe крутится ТОЛЬКО пока есть подписчики (баннер смонтирован) и app active.
// ════════════════════════════════════════════════════════════════════════════

import { AppState, type AppStateStatus } from 'react-native';

const PROBE_URL = 'https://clients3.google.com/generate_204';
const PROBE_TIMEOUT_MS = 5000;
// Онлайн подтверждать часто незачем; из офлайна выходить хочется быстро.
const PROBE_INTERVAL_ONLINE_MS = 60_000;
const PROBE_INTERVAL_OFFLINE_MS = 10_000;

export type NetStatus = 'online' | 'offline' | 'unknown';

let status: NetStatus = 'unknown';
const listeners = new Set<(online: boolean) => void>();
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let probeInFlight = false;
let appStateSub: { remove: () => void } | null = null;
let appActive = true;

function setStatus(next: Exclude<NetStatus, 'unknown'>): void {
  if (status === next) return;
  status = next;
  const online = next === 'online';
  listeners.forEach((cb) => {
    try {
      cb(online);
    } catch {
      // подписчик не должен ронять рассылку
    }
  });
}

async function probeOnce(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // cache: 'no-store' — статус связности, а не контент; любой ответ = онлайн.
    await fetch(PROBE_URL, { method: 'GET', cache: 'no-store', signal: controller.signal });
    setStatus('online');
    return true;
  } catch {
    setStatus('offline');
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function scheduleNextProbe(): void {
  if (probeTimer) clearTimeout(probeTimer);
  probeTimer = null;
  if (listeners.size === 0 || !appActive) return;
  const delay = status === 'offline' ? PROBE_INTERVAL_OFFLINE_MS : PROBE_INTERVAL_ONLINE_MS;
  probeTimer = setTimeout(() => {
    void runProbe();
  }, delay);
}

async function runProbe(): Promise<void> {
  if (probeInFlight) return;
  probeInFlight = true;
  try {
    await probeOnce();
  } finally {
    probeInFlight = false;
    scheduleNextProbe();
  }
}

function ensureAppStateSub(): void {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
    appActive = next === 'active';
    if (appActive && listeners.size > 0) {
      // Возврат в приложение — сразу перепроверяем (сеть могла смениться в фоне).
      void runProbe();
    } else if (probeTimer) {
      clearTimeout(probeTimer);
      probeTimer = null;
    }
  });
}

/** Текущий известный статус (unknown до первого probe/сигнала). */
export function getNetStatus(): NetStatus {
  return status;
}

/**
 * Подписка на смену онлайн/офлайн. Пока есть хотя бы один подписчик,
 * работает фоновый probe. Возвращает отписку.
 */
export function subscribeNetStatus(cb: (online: boolean) => void): () => void {
  listeners.add(cb);
  ensureAppStateSub();
  if (listeners.size === 1) void runProbe();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && probeTimer) {
      clearTimeout(probeTimer);
      probeTimer = null;
    }
  };
}

/** Принудительная проверка «есть ли сеть прямо сейчас» (для retry-кнопок). */
export function checkOnlineNow(): Promise<boolean> {
  return probeOnce();
}

/** Пассивный сигнал: чей-то сетевой запрос прошёл — мы точно онлайн. */
export function reportNetworkSuccess(): void {
  setStatus('online');
}

/**
 * Пассивный сигнал: чей-то запрос упал ПОХОЖЕ на офлайн (timeout/abort/
 * network request failed). Серверные ошибки (HTTP 4xx/5xx) сюда слать нельзя.
 */
export function reportNetworkFailure(): void {
  if (listeners.size > 0) {
    // Не верим одиночному сбою слепо — перепроверяем probe'ом.
    void runProbe();
  } else {
    setStatus('offline');
  }
}

// Required by Expo Router — not a screen
export default {};
