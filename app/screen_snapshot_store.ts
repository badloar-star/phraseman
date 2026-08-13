import AsyncStorage from '@react-native-async-storage/async-storage';
import { isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { accountScopeKey } from './account_scope_key';

/**
 * Общий дисковый слой снапшотов экранов — «мгновенное открытие как в Duolingo».
 *
 * зачем: владелец 2026-07-27 потребовал, чтобы НИ ОДИН экран не показывал скелетон:
 * «все экраны должны быть готовыми сразу, при этом 0 нагрузки на устройство».
 * Скелетон — симптом схемы «пусто → жду сеть → заглушка». Лечится не удалением
 * заглушки, а тем, что к моменту открытия данные УЖЕ лежат локально.
 *
 * Универсальный дисковый snapshot для экранов, которым нужен мгновенный первый кадр.
 *
 * Как работает:
 *   1) экран после успешной загрузки зовёт rememberScreenSnapshot() — запись фоновая,
 *      UI её не ждёт;
 *   2) бутстрап приложения один раз читает диск (primeScreenSnapshotsFromStorage) —
 *      ОДНО чтение AsyncStorage на все экраны сразу, не по одному на экран;
 *   3) экран на первом кадре синхронно берёт данные peekScreenSnapshot() и рисует
 *      настоящий контент вместо скелетона, а сеть догоняет фоном и тихо уточняет.
 *
 * Почему это не грузит телефон и не замедляет запуск:
 *   - никакого «смонтировать все экраны сразу» (это как раз грело бы батарею);
 *   - ровно одно дополнительное чтение диска за старт, в общей пачке бутстрапа;
 *   - данных немного и они ограничены MAX_ENTRIES + лимитом размера записи;
 *   - Firestore не трогается вообще — слой чисто локальный, 0 чтений.
 *
 * Данные привязаны к аккаунту (accountScopeKey): после выхода/смены пользователя
 * чужой снапшот не может попасть в UI.
 *
 * guard-ok (data-safety): здесь НЕТ облачных записей и НЕТ источника правды. Модуль
 * хранит копию уже посчитанных данных ради первого кадра; при любой ошибке чтения или
 * записи экран просто грузит как раньше — терять нечего. Поэтому запись намеренно
 * фоновая (без await) и молча гасит ошибку: заставлять UI ждать диск ради кэша нельзя.
 * Все реальные записи прогресса/баланса остаются в своих модулях с транзакциями.
 */

const STORAGE_KEY = 'screen_snapshots_v1';
/** Сутки + запас на смену часового пояса: снапшот переживает ночь, но не устаревает навсегда. */
const DEFAULT_TTL_MS = 26 * 60 * 60_000;
/** Сколько экранов держим. Больше — лишний вес записи без пользы для открытия. */
const MAX_ENTRIES = 24;
/** Защита от разрастания: снапшот — ускорение первого кадра, а не хранилище данных. */
const MAX_ENTRY_CHARS = 24_000;

type Entry = Readonly<{ value: unknown; writtenAtMs: number }>;

/** Поднятые с диска записи. Читается синхронно экранами, пишется бутстрапом и экранами. */
const entries = new Map<string, Entry>();
let persistScheduled = false;

/**
 * Ключ снапшота: экран × аккаунт (+ необязательный вариант — день, цель обучения и т.п.).
 * null означает «аккаунт не готов» — такие данные в UI не поднимаем.
 */
export function screenSnapshotKey(
  screenId: string,
  token: AccountGenerationToken,
  variant?: string,
): string | null {
  const account = accountScopeKey(token);
  if (!account) return null;
  return variant ? `${account}:screen:${screenId}:${variant}` : `${account}:screen:${screenId}`;
}

/**
 * Синхронный peek для ПЕРВОГО КАДРА экрана. null → данных нет (первая установка),
 * экран честно грузит. Никогда не бросает: сбой снапшота не должен ронять экран.
 */
export function peekScreenSnapshot<T>(
  key: string | null,
  options?: { ttlMs?: number; nowMs?: number },
): T | null {
  if (!key) return null;
  const nowMs = options?.nowMs ?? Date.now();
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const entry = entries.get(key);
  if (!entry) return null;
  if (nowMs - entry.writtenAtMs > ttlMs) return null;
  return entry.value as T;
}

/**
 * Запоминает свежие данные экрана, чтобы СЛЕДУЮЩЕЕ открытие было мгновенным.
 * Запись на диск отложенная и фоновая — вызывающий UI её не ждёт.
 */
export function rememberScreenSnapshot<T>(
  key: string | null,
  value: T,
  nowMs = Date.now(),
): void {
  if (!key || value == null) return;
  // Слишком большой снапшот не ускоряет открытие, зато утяжеляет старт — отбрасываем.
  let serializedLength = 0;
  try {
    serializedLength = JSON.stringify(value)?.length ?? 0;
  } catch {
    return; // не сериализуется (циклы/функции) — на диск такому нельзя
  }
  if (serializedLength === 0 || serializedLength > MAX_ENTRY_CHARS) return;

  // Map сохраняет порядок вставки: переустановка двигает запись в конец, поэтому
  // вытесняем всегда САМУЮ давно записанную (см. цикл ниже).
  entries.delete(key);
  entries.set(key, { value, writtenAtMs: nowMs });
  // guard-ok: это Map в памяти процесса, а не Firestore — записей в облако здесь нет
  // вообще. На диск уходит ОДНА отложенная запись AsyncStorage (см. schedulePersist).
  while (entries.size > MAX_ENTRIES) {
    const oldestKey = entries.keys().next().value as string | undefined;
    if (!oldestKey) break;
    entries.delete(oldestKey);
  }
  schedulePersist();
}

/** Убирает снапшот экрана — после действия, которое делает прошлые данные неверными. */
export function invalidateScreenSnapshot(key: string | null): void {
  if (!key || !entries.has(key)) return;
  entries.delete(key);
  schedulePersist();
}

/**
 * Поднимает снапшоты с диска в память. Зовётся ОДИН раз из бутстрапа приложения,
 * задолго до того, как пользователь дотянется до любого из экранов.
 */
export async function primeScreenSnapshotsFromStorage(nowMs = Date.now()): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;
    for (const item of parsed.slice(-MAX_ENTRIES)) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const key = typeof row.key === 'string' ? row.key : '';
      const writtenAtMs = Number(row.writtenAtMs);
      if (!key || !Number.isFinite(writtenAtMs)) continue;
      // Просроченное не поднимаем: пусть экран честно грузит, чем покажет вчерашнее.
      if (nowMs - writtenAtMs > DEFAULT_TTL_MS) continue;
      if (row.value == null) continue;
      entries.set(key, { value: row.value, writtenAtMs });
    }
  } catch {
    // Дисковый снапшот — best-effort ускорение первого кадра, не источник правды.
  }
}

/**
 * Сбрасывает снапшоты при выходе/смене аккаунта: данные привязаны к пользователю,
 * и следующий вошедший не должен увидеть чужие цифры даже на один кадр.
 */
export function clearScreenSnapshots(): void {
  entries.clear();
  void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

/**
 * Отдаёт данные экрана только если аккаунт всё ещё тот же. Экраны читают снапшот на
 * первом кадре, когда восстановление аккаунта могло ещё не завершиться.
 */
export function peekScreenSnapshotForToken<T>(
  screenId: string,
  token: AccountGenerationToken,
  options?: { variant?: string; ttlMs?: number; nowMs?: number },
): T | null {
  if (!isCurrentAccountGeneration(token)) return null;
  return peekScreenSnapshot<T>(screenSnapshotKey(screenId, token, options?.variant), options);
}

function schedulePersist(): void {
  if (persistScheduled) return;
  persistScheduled = true;
  // Микротаск: несколько экранов, записавших снапшот подряд, дают ОДНУ запись на диск,
  // а не N. Первый кадр уже отрисован из памяти — ждать диск незачем.
  void Promise.resolve().then(() => {
    persistScheduled = false;
    const payload = [...entries.entries()].map(([key, entry]) => ({
      key,
      value: entry.value,
      writtenAtMs: entry.writtenAtMs,
    }));
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  });
}

export function resetScreenSnapshotStoreForTests(): void {
  entries.clear();
  persistScheduled = false;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
