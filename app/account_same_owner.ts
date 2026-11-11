/**
 * «Аккаунт тот же, что в начале операции?» — для действий, которые уходят на сервер или на диск ПОСЛЕ ожидания.
 *
 * зачем (F17, аудит, владелец 11.11: «исправить сейчас»): дуэль, «позвать друга» и недельная сводка собирали отправителя
 * уже в момент отправки. Если между тапом и отправкой аккаунт сменился (выход A → вход B), действие A уходило от имени B.
 * Сверяем номер поколения и владельца, снятые в начале операции, с текущими — прямо перед записью.
 * Фазу не сверяем намеренно: до входа (фаза не «active») приложение тоже работает, и блокировать его действия нельзя.
 */
import { captureAccountGeneration, type AccountGenerationToken } from './account_generation';

export type AccountOwnerMark = Pick<AccountGenerationToken, 'generation' | 'stableId'>;

/** Снять отметку в НАЧАЛЕ операции, до первого ожидания. */
export function markAccountOwner(): AccountOwnerMark {
  const token = captureAccountGeneration();
  return { generation: token.generation, stableId: token.stableId };
}

/** Проверить ПЕРЕД записью: тот же ли аккаунт. */
export function isSameAccountOwner(mark: AccountOwnerMark): boolean {
  const now = captureAccountGeneration();
  return now.generation === mark.generation && now.stableId === mark.stableId;
}

/* expo-router: keep this utility from being treated as a screen */
export default function __AccountSameOwnerRouteShim() {
  return null;
}
