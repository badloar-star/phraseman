/**
 * Склейка записей согласий в облако: серия быстрых тапов по тумблеру → ОДНА запись, последнее положение.
 *
 * зачем (Дизайн через координатора 12.10, R1_SETTINGS_OPTIMISTIC_UI.md E-2): экран «Приватность» писал в облако на каждый
 * тап. Пять щелчков подряд — пять вызовов функции, и порядок ответов не гарантирован. Тумблер и локальная запись остаются
 * мгновенными (источник правды — телефон), а облако догоняет одним вызовом через 1,5 с после ПОСЛЕДНЕГО тапа (trailing).
 * Склейка живёт на уровне модуля — уход с экрана её не обрывает; при уходе приложения в фон отправляем сразу, чтобы
 * свёрнутое приложение не потеряло запись. Досылка после закрытия — у владельцев записи (ai_consent_factory,
 * age_consent_cloud), здесь только склейка.
 */
import { AppState, type AppStateStatus } from 'react-native';

export const CONSENT_CLOUD_COALESCE_MS = 1500;

const LOG = '[PRIVACY-CONSENT]';

type PendingRecord = Readonly<{
  timer: ReturnType<typeof setTimeout>;
  send: () => Promise<unknown>;
  taps: number;
  firstAt: number;
}>;

const pendingByKey = new Map<string, PendingRecord>();
let appStateSubscribed = false;

function describeResult(result: unknown): string {
  if (result === true) return 'delivered';
  if (result === false) return 'not_delivered (владелец записи оставит отметку и дошлёт при входе)';
  return `done result=${String(result)}`;
}

function fire(key: string, reason: string): void {
  const pending = pendingByKey.get(key);
  if (!pending) {
    console.log(`${LOG} ${key}: отправка reason=${reason} — нечего отправлять (уже ушло)`);
    return;
  }
  clearTimeout(pending.timer);
  pendingByKey.delete(key);
  const startedAt = Date.now();
  console.log(`${LOG} ${key}: отправка в облако reason=${reason} taps=${pending.taps} склеено_за_мс=${startedAt - pending.firstAt}`);
  let sending: Promise<unknown>;
  try {
    sending = pending.send();
  } catch (error: unknown) {
    console.warn(`${LOG} ${key}: отправка упала синхронно reason=${error instanceof Error ? error.message : String(error)} (локально сохранено)`);
    return;
  }
  sending.then(
    (result) => {
      console.log(`${LOG} ${key}: ответ облака ${describeResult(result)} за ${Date.now() - startedAt} мс`);
    },
    (error: unknown) => {
      console.warn(`${LOG} ${key}: запись в облако не удалась за ${Date.now() - startedAt} мс reason=${error instanceof Error ? error.message : String(error)} (локально сохранено)`);
    },
  );
}

function ensureBackgroundFlush(): void {
  if (appStateSubscribed) return;
  appStateSubscribed = true;
  try {
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' || pendingByKey.size === 0) return;
      flushConsentCloudRecords(`app_${state}`);
    });
  } catch (error: unknown) {
    // Без подписки склейка всё равно отправит по таймеру; теряется только мгновенная отправка при сворачивании.
    console.warn(`${LOG} подписка на AppState не удалась reason=${error instanceof Error ? error.message : String(error)} — только таймер`);
  }
}

/**
 * Запланировать запись согласия `key` в облако. Повторный вызов до срабатывания заменяет отправку на новую
 * (последнее положение) и переносит срок: одна запись на серию тапов.
 */
export function scheduleConsentCloudRecord(
  key: string,
  send: () => Promise<unknown>,
  delayMs: number = CONSENT_CLOUD_COALESCE_MS,
): void {
  ensureBackgroundFlush();
  const previous = pendingByKey.get(key);
  if (previous) clearTimeout(previous.timer);
  const taps = (previous?.taps ?? 0) + 1;
  const firstAt = previous?.firstAt ?? Date.now();
  const timer = setTimeout(() => fire(key, 'trailing'), delayMs);
  pendingByKey.set(key, { timer, send, taps, firstAt });
  console.log(`${LOG} ${key}: запись в облако ${previous ? 'склеена с предыдущей' : 'запланирована'} taps=${taps} через ${delayMs} мс`);
}

/** Отправить все отложенные записи сейчас (уход в фон, закрытие экрана по требованию). */
export function flushConsentCloudRecords(reason: string): void {
  const keys = [...pendingByKey.keys()];
  if (keys.length === 0) return;
  console.log(`${LOG} сброс отложенных записей reason=${reason} keys=${keys.join(',')}`);
  keys.forEach((key) => fire(key, reason));
}

/** Только для тестов: есть ли отложенная запись по ключу. */
export function hasPendingConsentCloudRecordForTest(key: string): boolean {
  return pendingByKey.has(key);
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
