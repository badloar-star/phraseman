/**
 * Плашка-предупреждение «Наборы от пользователей» в разделе Сообщество — логика без интерфейса.
 *
 * зачем (макет утверждён владельцем 04.11; слово владельца): честное предупреждение с юмором над списком наборов сообщества.
 * Текст — один из 5, по номеру ISO-недели по ЛОКАЛЬНОЙ дате телефона mod 5 (без сети и Firebase). Крестик «понял» скрывает плашку НАВСЕГДА:
 * один флаг на владельца в стираемой семье `story_events_v1:` (чистится вместе с остальным при выходе/удалении), ни на новой неделе,
 * ни после перезапуска она не возвращается. Ключи прогресса не трогаем. Лог: [COMMUNITY-NOTICE].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const COMMUNITY_NOTICE_COUNT = 5;
export const COMMUNITY_NOTICE_FLAG_KEY_PREFIX = 'story_events_v1:community_notice_closed';
export const communityNoticeFlagKey = (owner: string): string => `${COMMUNITY_NOTICE_FLAG_KEY_PREFIX}:${owner}`;

/** Номер ISO-недели (1..53) по локальной дате: неделя с четвергом года, понедельник — первый день. */
export function isoWeekNumber(date: Date): number {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7; // воскресенье = 7
  day.setUTCDate(day.getUTCDate() + 4 - weekday); // четверг этой недели
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  return Math.ceil(((day.getTime() - yearStart) / 86400000 + 1) / 7);
}

/** Какой из пяти текстов показывать сейчас (0..4). */
export function communityNoticeIndex(date: Date): number {
  return isoWeekNumber(date) % COMMUNITY_NOTICE_COUNT;
}

export type CommunityNoticeStore = Readonly<{
  read: (owner: string) => Promise<boolean>;
  write: (owner: string) => Promise<void>;
}>;

export const asyncStorageNoticeStore: CommunityNoticeStore = {
  read: async (owner) => (await AsyncStorage.getItem(communityNoticeFlagKey(owner))) === '1',
  write: async (owner) => { await AsyncStorage.setItem(communityNoticeFlagKey(owner), '1'); },
};

/** Закрыта ли плашка владельцем. Ошибка чтения → плашка покажется (безвредный шум), причина в журнале. */
export async function readCommunityNoticeClosed(owner: string, store: CommunityNoticeStore = asyncStorageNoticeStore): Promise<boolean> {
  try {
    const closed = await store.read(owner);
    console.log('[COMMUNITY-NOTICE] read', JSON.stringify({ closed })); // guard-ok: значение, решившее показ
    return closed;
  } catch (error) {
    console.warn('[COMMUNITY-NOTICE] чтение флага не удалось — плашка покажется', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
    return false;
  }
}

/** Запомнить «понял» навсегда. Ошибка записи не откатывает интерфейс (плашка исчезла мгновенно), но пишет причину. */
export async function closeCommunityNoticeForever(owner: string, store: CommunityNoticeStore = asyncStorageNoticeStore): Promise<boolean> {
  try {
    await store.write(owner);
    console.log('[COMMUNITY-NOTICE] closed forever'); // guard-ok: разовое событие
    return true;
  } catch (error) {
    console.warn('[COMMUNITY-NOTICE] запись флага не удалась — после перезапуска плашка вернётся', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
    return false;
  }
}

/** Владелец флага: стабильный id активного аккаунта; до входа — общий ключ устройства. */
export async function communityNoticeOwner(): Promise<string> {
  try {
    const { captureAccountGeneration } = await import('./account_generation');
    const token = captureAccountGeneration();
    if (token.phase === 'active' && token.stableId) return token.stableId;
    console.log('[COMMUNITY-NOTICE] owner → device', JSON.stringify({ phase: token.phase })); // guard-ok: ветка и значение
    return 'device';
  } catch (error) {
    console.warn('[COMMUNITY-NOTICE] владелец не определён — ключ устройства', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
    return 'device';
  }
}
