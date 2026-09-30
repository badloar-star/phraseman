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
 * Переименовать локальные упоминания старого ника в оставшемся кэше.
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

}

/** Фоновая синхронизация ника в профиле арены (best-effort, ошибки только в лог). */
