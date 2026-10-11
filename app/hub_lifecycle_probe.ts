/**
 * [HUB-LIFECYCLE] — журнал жизненного цикла хаба Карточек (только dev; вне `__DEV__` все функции пустые).
 *
 * зачем (координатор 12.10, 🔴 утечка памяти; факты Сверки MEM_LOOP_2026-10-11): цикл «Главная → хаб → назад» ×5 поднимает кучу JS
 * с 60 до 108 МБ (+~12 МБ на заход), сборка мусора не возвращает. По правилу «сперва логи» — на каждый mount/unmount хаба и его частей:
 * сколько экземпляров живо, сколько слушателей у DeviceEventEmitter по каждому событию, каков размер модульных кэшей цепочки хаба
 * и сколько занимает куча. Растущий счётчик или кэш с каждым заходом — и есть виновник. Чисел и названий — без id пользователей и текстов.
 */
import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { logMemory } from './mem_probe';

const LOG = '[HUB-LIFECYCLE]';

function probeActive(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

const live = new Map<string, number>();
const totalMounts = new Map<string, number>();
const caches = new Map<string, () => number | string>();

/** Модуль цепочки хаба сообщает размер своего кэша (читается только на mount/unmount проб). Вне dev — пусто. */
export function registerHubCacheProbe(name: string, size: () => number | string): void {
  if (!probeActive()) return;
  caches.set(name, size);
}

function cacheSizes(): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [name, size] of caches) {
    try { out[name] = size(); } catch (error) { out[name] = `ошибка: ${error instanceof Error ? error.message : String(error)}`; }
  }
  return out;
}

/** Слушатели DeviceEventEmitter по событиям (в них живёт onAppEvent): только события, у которых слушатели есть. */
function emitterListeners(): Record<string, number> {
  const out: Record<string, number> = {};
  try {
    const registry = (DeviceEventEmitter as unknown as { _registry?: Record<string, { size?: number } | undefined> })._registry;
    if (!registry) { out.__no_registry__ = 0; return out; }
    for (const [event, subs] of Object.entries(registry)) {
      const n = subs?.size ?? 0;
      if (n > 0) out[event] = n;
    }
  } catch (error) {
    out.__error__ = 0;
    console.warn(`${LOG} emitter registry read failed`, error instanceof Error ? error.message : String(error)); // guard-ok: причина в журнале
  }
  return out;
}

/** Общий снимок: живые экземпляры, кэши, слушатели, куча. */
export function logHubSnapshot(tag: string, extra: Record<string, unknown> = {}): void {
  if (!probeActive()) return;
  const liveNow: Record<string, number> = {};
  for (const [label, n] of live) liveNow[label] = n;
  console.log(`${LOG} ${tag}`, JSON.stringify({ live: liveNow, caches: cacheSizes(), emitter: emitterListeners(), ...extra }));
  logMemory(`hub_lifecycle:${tag}`);
}

/** mount/unmount части хаба с счётчиком живых экземпляров. Вне dev — ничего. */
export function useHubLifecycle(label: string, extra?: () => Record<string, unknown>): void {
  useEffect(() => {
    if (!probeActive()) return undefined;
    const mountNo = (totalMounts.get(label) ?? 0) + 1;
    totalMounts.set(label, mountNo);
    live.set(label, (live.get(label) ?? 0) + 1);
    logHubSnapshot(`mount ${label}#${mountNo}`, extra ? extra() : {});
    return () => {
      live.set(label, Math.max(0, (live.get(label) ?? 1) - 1));
      logHubSnapshot(`unmount ${label}#${mountNo}`, extra ? extra() : {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- журнал жизненного цикла: только mount/unmount
  }, [label]);
}

/** Подписки/эффекты, которые включаются и выключаются (фокус, таймеры, анимации): счётчик «сейчас включено». */
const activeSubs = new Map<string, number>();
export function noteHubSubscription(label: string, action: 'on' | 'off'): void {
  if (!probeActive()) return;
  const next = Math.max(0, (activeSubs.get(label) ?? 0) + (action === 'on' ? 1 : -1));
  activeSubs.set(label, next);
  console.log(`${LOG} sub ${label} ${action} active=${next}`);
}

/** Для тестов. */
export function resetHubLifecycleProbeForTests(): void {
  live.clear();
  totalMounts.clear();
  caches.clear();
  activeSubs.clear();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
