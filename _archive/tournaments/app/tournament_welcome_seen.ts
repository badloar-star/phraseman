// ═══════════════════════════════════════════════════════════════════════════
// tournament_welcome_seen.ts — флаг «приветственный модал турниров уже показан».
//
// зачем 2026-08-04 (владелец: «первый раз открыл раздел турниры — красивый
// анимированный модал, один раз после онбординга и больше никогда, у старых
// игроков тоже»): чисто клиентская метка, без Firestore — это не то состояние,
// которое нужно синхронизировать между устройствами или видеть в админке.
// Один AsyncStorage-флаг, тот же паттерн, что markWarningSeen в
// user_warning_check.ts. Старые игроки НЕ получают миграцию флага в true —
// раз владелец прямо сказал «у старых юзеров тоже», ключ просто отсутствует
// у всех до первого показа, новых и старых это не различает.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = 'tournament_welcome_seen_v1';

let cachedSeen: boolean | null = null;

/**
 * Синхронный первый кадр из памяти — null означает «ещё не читали AsyncStorage».
 *
 * зачем 2026-08-04 (аудит нашёл критичную инверсию): раньше peek возвращал
 * boolean и схлопывал null → false, из-за чего welcomeVisible инициализировался
 * в true на КАЖДОМ холодном старте — модал лез поверх экрана даже тем, кто его
 * уже закрыл, и глушил тапы/скролл под собой (Modal перехватывает жесты, даже
 * если контент внутри не видно). Правильный tri-state паттерн уже есть в
 * lesson_menu.tsx (peekPrepHintSeen) — null здесь обязателен, чтобы вызывающий
 * код мог держать модал СКРЫТЫМ, пока флаг не подтверждён из хранилища.
 */
export function peekTournamentWelcomeSeen(): boolean | null {
  return cachedSeen;
}

export async function loadTournamentWelcomeSeen(): Promise<boolean> {
  if (cachedSeen !== null) return cachedSeen;
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    cachedSeen = raw === '1';
  } catch {
    cachedSeen = false;
  }
  return cachedSeen;
}

export async function markTournamentWelcomeSeen(): Promise<void> {
  cachedSeen = true;
  try {
    await AsyncStorage.setItem(SEEN_KEY, '1');
  } catch {}
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
