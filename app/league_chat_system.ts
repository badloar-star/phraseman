/**
 * league_chat_system.ts — чистая логика системных сообщений чата лиги.
 *
 * Вынесено из firestore_league_chat.ts, чтобы классификатор и константы
 * можно было импортировать без тяжёлых firebase-зависимостей (важно для
 * тестов и для UI-кода, которому не нужен сам firestore-клиент).
 *
 * Системные сообщения генерируются движком/сервером, а НЕ пользователями,
 * и в UI рендерятся иначе (по центру, мельче, с иконкой, без аватара).
 */

/** Тип системного события — управляет иконкой и текстом в UI. */
export type LeagueChatSystemType =
  | 'rank_up'        // кто-то поднялся в топ / обогнал
  | 'new_leader'     // новый лидер недели
  | 'member_joined'  // новый участник в группе
  | 'chest_unlocked' // группа открыла сундук
  | 'week_ending'    // неделя скоро заканчивается
  | 'generic';       // прочее системное

/** Зарезервированный uid автора для системных сообщений (нельзя подделать как обычное). */
export const LEAGUE_CHAT_SYSTEM_UID = '__league_system__';

/** true, если сообщение служебное (сгенерировано системой, а не пользователем). */
export function isSystemLeagueChatMessage(
  m: { kind?: 'user' | 'system'; authorUid?: string },
): boolean {
  return m.kind === 'system' || m.authorUid === LEAGUE_CHAT_SYSTEM_UID;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
