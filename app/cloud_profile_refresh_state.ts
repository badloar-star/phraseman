/**
 * «Данные догружаются после входа» — тихий флаг для интерфейса.
 *
 * зачем (релизный пол 10.10, решение координатора): после входа окно закрывается
 * сразу, а прогресс/монеты/серия догружаются в фоне до ~20 с
 * (auth_provider.scheduleSameStablePostAuthRefresh). Человек видел старые цифры
 * без признака, что они сейчас обновятся. Флаг питает тихий KitSpinner на месте
 * уже показанных данных (шапка Главной) — без блокировки экрана.
 * Только память процесса; страховка гасит флаг сама, если догрузка зависла.
 */
import { useSyncExternalStore } from 'react';

const SAFETY_MS = 30_000;

let active = 0;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Начать догрузку; вернёт функцию завершения (повторный вызов безвреден). */
export function beginCloudProfileRefresh(stage: string): () => void {
  active += 1;
  console.log(`[CLOUD-REFRESH-UI] start stage=${stage} active=${active}`);
  notify();
  let ended = false;
  const end = (reason: string) => {
    if (ended) return;
    ended = true;
    clearTimeout(safety);
    active = Math.max(0, active - 1);
    console.log(`[CLOUD-REFRESH-UI] end stage=${stage} reason=${reason} active=${active}`);
    notify();
  };
  const safety = setTimeout(() => end('safety_timeout'), SAFETY_MS);
  (safety as { unref?: () => void })?.unref?.();
  return () => end('done');
}

export function isCloudProfileRefreshing(): boolean {
  return active > 0;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useCloudProfileRefreshing(): boolean {
  return useSyncExternalStore(subscribe, isCloudProfileRefreshing, isCloudProfileRefreshing);
}

/** Только для тестов. */
export function __resetCloudProfileRefreshForTests(): void {
  active = 0;
  notify();
}
