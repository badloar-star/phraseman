/**
 * Состояние отложенного восстановления на старте (пункт (а)): «свежие» ключи и ворота отправки в облако.
 *
 * зачем (координатор 11.10; ревью Opus):
 *  1. Защита «последняя запись»: ключи, записанные локально, пока восстановление ждало старта, облако в ветке
 *     «облако главнее» не перезаписывает. Список виден ТОЛЬКО во время своего восстановления и только тому же
 *     поколению аккаунта: при смене/стирании аккаунта (multiRemove тоже идёт через шину записей) — null.
 *  2. Ворота отправки: пока восстановление ЖДЁТ старта, отправка в облако не уходит (иначе локальная версия
 *     целиком заменила бы облачную, сделанную на другом устройстве, ещё до чтения облака). Запрос отправки сам
 *     запускает восстановление; отложенная отправка уходит, когда восстановление закончилось.
 * Модуль без зависимостей от cloud_sync — его импортирует cloud_sync.
 */
import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { subscribeStorageMutations } from './storage_mutation_bus';

type Phase = 'idle' | 'waiting' | 'running';

let phase: Phase = 'idle';
let dirty: Set<string> | null = null;
let allKeysTouched = false;
let token: AccountGenerationToken | null = null;
let unsubscribe: (() => void) | null = null;
let starter: ((reason: string) => void) | null = null;
let docRead = false;
let docReadWaiters: Array<() => void> = [];
const settledListeners = new Set<() => void>();

/** Решение «откладываем»: начать запоминать записи и закрыть отправку до старта. starter — запуск восстановления. */
export function armBootRestoreDirtyTracking(start: (reason: string) => void): void {
  if (phase !== 'idle') return;
  phase = 'waiting';
  docRead = false;
  dirty = new Set();
  allKeysTouched = false;
  token = captureAccountGeneration();
  starter = start;
  unsubscribe = subscribeStorageMutations((event) => {
    if (event.phase !== 'end' || !dirty) return;
    if (event.keys === 'all') {
      allKeysTouched = true;
      return;
    }
    for (const key of event.keys) dirty.add(key);
  });
}

/** Старт восстановления: записи дальше не считаем (свои записи восстановления — не «свежие» локальные). */
export function freezeBootRestoreDirtyKeys(): { count: number; allKeysTouched: boolean } {
  unsubscribe?.();
  unsubscribe = null;
  starter = null;
  if (phase === 'waiting') phase = 'running';
  return { count: dirty?.size ?? 0, allKeysTouched };
}

/**
 * Что защищать в ветке «облако главнее». null — обычное восстановление, другое поколение аккаунта или хранилище
 * перезаписывали целиком (список ненадёжен — вызывающий не фильтрует).
 */
export function peekBootRestoreDirtyKeys(): ReadonlySet<string> | null {
  if (phase !== 'running' || !dirty || allKeysTouched || !token) return null;
  if (!isCurrentAccountGeneration(token, token.stableId)) return null;
  return dirty;
}

/** Восстановление закончилось (или отменено): список и ворота сняты, ждущие отправки — отпущены. */
export function clearBootRestoreDirtyKeys(): void {
  unsubscribe?.();
  unsubscribe = null;
  starter = null;
  dirty = null;
  allKeysTouched = false;
  token = null;
  const wasActive = phase !== 'idle';
  phase = 'idle';
  docRead = false;
  const docWaiters = docReadWaiters;
  docReadWaiters = [];
  for (const resolve of docWaiters) resolve();
  if (!wasActive) return;
  for (const listener of settledListeners) {
    try {
      listener();
    } catch (error) {
      console.warn('[BOOT-RESTORE-DEFER] слушатель завершения упал', error instanceof Error ? error.message : String(error));
    }
  }
}

/** Отложенное восстановление ждёт или идёт (повторный вход в bootstrap переиспользует его промис). */
export function isDeferredBootRestoreActive(): boolean {
  return phase !== 'idle';
}

/** Отправка в облако закрыта: восстановление ещё не стартовало. */
export function isDeferredBootRestoreWaiting(): boolean {
  return phase === 'waiting';
}

/** Запустить ожидающее восстановление сейчас (запрос отправки, уход в фон, размонтирование). */
export function requestDeferredBootRestoreStart(reason: string): void {
  if (phase !== 'waiting' || !starter) return;
  starter(reason);
}

/**
 * Восстановление прочитало документ облака (cloud_sync, точка user_doc_read). Дальше отправка не может затереть
 * то, чего восстановление ещё не видело, — предотправке больше ждать незачем (ревью Opus: ждать до конца применения
 * съедало 20 с предотправки при смене аккаунта).
 */
export function markBootRestoreUserDocRead(): void {
  if (phase !== 'running' || docRead) return;
  docRead = true;
  const waiters = docReadWaiters;
  docReadWaiters = [];
  for (const resolve of waiters) resolve();
}

/** Дождаться, пока отложенное восстановление прочитает документ (или закончится, или потолок). */
export function whenDeferredBootRestoreDocRead(ceilingMs: number): Promise<'doc_read' | 'settled' | 'ceiling' | 'not_active'> {
  if (phase === 'idle') return Promise.resolve('not_active');
  if (docRead) return Promise.resolve('doc_read');
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('ceiling'), ceilingMs);
    docReadWaiters = [...docReadWaiters, () => { // guard-ok: список ждущих в памяти, не запись данных
      clearTimeout(timer);
      resolve(docRead ? 'doc_read' : 'settled');
    }];
  });
}

/** Подписка на «восстановление закончилось» (отложенная отправка догоняет). */
export function onDeferredBootRestoreSettled(listener: () => void): () => void {
  settledListeners.add(listener);
  return () => { settledListeners.delete(listener); };
}

/* expo-router: keep this utility from being treated as a screen */
export default function __BootRestoreDirtyKeysRouteShim() {
  return null;
}
