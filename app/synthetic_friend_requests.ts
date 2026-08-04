// ═══════════════════════════════════════════════════════════════════════════
// synthetic_friend_requests.ts — заявки в друзья к синтетическим персонажам.
//
// зачем (владелец, 2026-08-04): «у них такая же карточка как у других игроков,
// единственное что заявка в друзья таким жителям уйдёт в никуда (но юзер не
// должен догадаться)».
//
// Прямолинейное «молча ничего не делать» юзера как раз выдаёт: состояние
// кнопки в модалке живёт только в памяти, и после закрытия экрана она
// вернулась бы в «Добавить в друзья» — человек заметит, что его заявка
// исчезла. Поэтому факт отправки запоминается ЛОКАЛЬНО на устройстве: кнопка
// навсегда остаётся «Заявка отправлена», как у живого игрока, который её
// просто не принял. В сеть при этом не уходит ничего — ни одной записи в
// Firestore, ни одного чтения (и, кстати, ни копейки стоимости).
//
// Заявка намеренно НИКОГДА не принимается: «принявший» персонаж должен был бы
// появиться в списке друзей, в ленте активности и в чатах — там его отсутствие
// вскрылось бы мгновенно. Вечное ожидание выглядит куда естественнее.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

/** Ключ локального списка. Версия в имени — на случай смены формата. */
const STORAGE_KEY = 'synthetic_friend_requests_v1';

/** Префикс uid жителя лиги — зеркало RESIDENT_UID_PREFIX на сервере. */
const RESIDENT_UID_PREFIX = 'res_';

/** Формат посадочного id бота турнира: p_<hash36>. */
const TOURNAMENT_BOT_ID = /^p_[0-9a-z]+$/;

/**
 * Синтетический ли это участник (житель лиги или бот турнира).
 * Живой uid не может совпасть ни с одним из форматов: Firebase Auth выдаёт
 * идентификаторы другой формы.
 */
export function isSyntheticUid(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return uid.startsWith(RESIDENT_UID_PREFIX) || TOURNAMENT_BOT_ID.test(uid);
}

/** Кэш в памяти: чтение состояния кнопки не должно ждать диск. */
let cache: Set<string> | null = null;

/** Загружает локальный список (один раз за сессию). */
export async function loadSyntheticFriendRequests(): Promise<Set<string>> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []);
  } catch {
    // Битое хранилище не должно ломать экран — просто считаем список пустым.
    cache = new Set();
  }
  return cache;
}

/** Мгновенный синхронный доступ к уже загруженному списку (для первого кадра). */
export function peekSyntheticFriendRequests(): Set<string> {
  return cache ?? new Set();
}

/**
 * Запоминает «отправленную» заявку. Возвращает управление сразу — запись на
 * диск идёт фоном, интерфейс её не ждёт (Optimistic UI).
 */
export function rememberSyntheticFriendRequest(uid: string): void {
  if (!isSyntheticUid(uid)) return;
  const next = new Set(cache ?? []);
  next.add(uid);
  cache = next;
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {
    // Промах записи не откатываем: в памяти состояние уже верное, а следующая
    // заявка перезапишет файл целиком. Хуже показать откат кнопки.
  });
}

/** Была ли «отправлена» заявка этому персонажу. */
export function hasSyntheticFriendRequest(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return (cache ?? new Set()).has(uid);
}
