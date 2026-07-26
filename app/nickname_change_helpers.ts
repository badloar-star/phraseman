// ════════════════════════════════════════════════════════════════════════════
// nickname_change_helpers.ts — общая логика смены ника вне экрана настроек.
//
// зачем: экран «Аккаунт» (модальный лист) редактирует ник так же, как настройки:
// валидация, обновление локальных упоминаний имени, фоновая синхронизация арены.
// Логика вынесена в модуль, чтобы новый экран не тянул код из settings.tsx
// (тяжёлый экран-вкладка) и не копировал его внутрь компонента. В settings.tsx
// пока живёт своя историческая копия — файл правится в параллельных сессиях,
// перевод его на этот модуль — отдельная задача.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';

const BAD_WORDS = ['хуй', 'піздець', 'пизда', 'блядь', 'бляд', 'ёбан', 'єбан', 'єбать', 'ебать', 'ебал', 'залупа', 'мудак', 'мудила', 'сука', 'пидор', 'пидар', 'хуйня', 'піздюк', 'нахуй', 'нахій', 'сучка', 'мразь', 'тварь', 'ублюдок', 'ёб', 'йоб', 'fuck', 'shit', 'bitch', 'cunt', 'dick', 'ass', 'asshole', 'faggot', 'nigger', 'bastard'];

export function containsBadWord(value: string): boolean {
  const low = value.toLowerCase();
  return BAD_WORDS.some((w) => low.includes(w));
}

/**
 * Переименовать локальные упоминания старого ника (кэши лидербордов и лиги),
 * чтобы после смены имени старое не «просвечивало» в закэшированных списках.
 */
export async function updateLocalNameReferences(fromName: string, toName: string): Promise<void> {
  try {
    const lb = await AsyncStorage.getItem('leaderboard');
    if (lb) {
      const arr = JSON.parse(lb);
      const updated = arr.map((e: { name?: string }) => (e.name === fromName ? { ...e, name: toName } : e));
      await AsyncStorage.setItem('leaderboard', JSON.stringify(updated));
    }
  } catch (error) {
    DebugLogger.error('nickname_change_helpers:leaderboard', error, 'warning');
  }

  try {
    const wlb = await AsyncStorage.getItem('week_leaderboard');
    if (wlb) {
      const arr = JSON.parse(wlb);
      const updated = arr.map((e: { name?: string }) => (e.name === fromName ? { ...e, name: toName } : e));
      await AsyncStorage.setItem('week_leaderboard', JSON.stringify(updated));
    }
  } catch (error) {
    DebugLogger.error('nickname_change_helpers:weekLeaderboard', error, 'warning');
  }

  try {
    const ls = await AsyncStorage.getItem('league_state_v3');
    if (ls) {
      const state = JSON.parse(ls);
      if (state.group) {
        state.group = state.group.map((m: { isMe?: boolean }) => (m.isMe ? { ...m, name: toName } : m));
        await AsyncStorage.setItem('league_state_v3', JSON.stringify(state));
      }
    }
  } catch (error) {
    DebugLogger.error('nickname_change_helpers:leagueState', error, 'warning');
  }

  try {
    const lrp = await AsyncStorage.getItem('league_result_pending');
    if (lrp) {
      const result = JSON.parse(lrp);
      if (result.group) {
        result.group = result.group.map((m: { isMe?: boolean }) => (m.isMe ? { ...m, name: toName } : m));
        await AsyncStorage.setItem('league_result_pending', JSON.stringify(result));
      }
    }
  } catch (error) {
    DebugLogger.error('nickname_change_helpers:leagueResultPending', error, 'warning');
  }
}

/** Фоновая синхронизация ника в профиле арены (best-effort, ошибки только в лог). */
export async function syncArenaDisplayName(displayName: string): Promise<void> {
  try {
    const { CLOUD_SYNC_ENABLED, IS_EXPO_GO } = await import('./config');
    if (CLOUD_SYNC_ENABLED && !IS_EXPO_GO) {
      const { ensureArenaAuthUid } = await import('./user_id_policy');
      const uid = await ensureArenaAuthUid();
      if (uid) {
        const firestore = (await import('@react-native-firebase/firestore')).default;
        await firestore()
          .collection('arena_profiles')
          .doc(uid)
          .set({ displayName, updatedAt: Date.now() }, { merge: true });
      }
    }
  } catch (error) {
    DebugLogger.error('nickname_change_helpers:arenaProfile', error, 'warning');
  }
}
