import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAchievements } from './achievements';
import { getXPMultiplier } from './club_boosts';
import { updateMultipleTaskProgress } from './daily_tasks';
import { DebugLogger } from './debug-logger';
import { addOrUpdateScore, streakMultiplier } from './hall_of_fame_utils';

/**
 * Типы источников опыта
 */
export type XPSource = 
  | 'lesson_complete' 
  | 'lesson_answer'
  | 'quiz_answer' 
  | 'daily_task_reward' 
  | 'bonus_chest' 
  | 'wager_bet'    // Отрицательный (трата)
  | 'wager_win'    // Положительный (выигрыш)
  | 'dialog_complete'
  | 'vocabulary_learned'
  | 'verb_learned'
  | 'review_answer'
  | 'diagnostic_test'
  | 'daily_login_bonus'
  | 'exam_complete';

interface XPResult {
  finalDelta: number;
  multiplier: number;
  isBonus: boolean;
}

/**
 * ЕДИНЫЙ МЕНЕДЖЕР ОПЫТА (XP Manager)
 * Центральный узел для всех изменений XP в приложении.
 */
export const registerXP = async (
  amount: number,
  source: XPSource,
  userName: string,
  lang: 'ru' | 'uk' = 'ru'
): Promise<XPResult> => {
  try {
    let finalDelta = amount;
    let totalMultiplier = 1;

    // 1. Множители применяются ТОЛЬКО к заработку (уроки, квизы, сундуки)
    // К наградам за задачи, ставкам и выигрышам по ставкам множители не применяются.
    const isEarnedXP = ['lesson_complete', 'lesson_answer', 'quiz_answer', 'bonus_chest', 'dialog_complete', 'vocabulary_learned', 'verb_learned', 'review_answer', 'exam_complete', 'diagnostic_test'].includes(source);

    if (isEarnedXP && amount > 0) {
      // А) Клубные бустеры (x1.5, x2.0) из club_boosts.ts
      const clubM = await getXPMultiplier();
      
      // Б) Множитель за стрик (x2, x3, x5)
      const streakRaw = await AsyncStorage.getItem('streak_count');
      const streakM = streakMultiplier(parseInt(streakRaw || '0'));

      // В) Comeback бонус (x2)
      const todayStr = new Date().toISOString().split('T')[0];
      const comebackRaw = await AsyncStorage.getItem('comeback_active');
      const comebackM = (comebackRaw === todayStr) ? 2 : 1;

      totalMultiplier = clubM * streakM * comebackM;
      finalDelta = Math.round(amount * totalMultiplier);
    }

    // 2. Обновляем основные структуры данных через hall_of_fame_utils
    // Это обновит: leaderboard, week_leaderboard, week_points_v2, daily_stats и стрик
    await addOrUpdateScore(userName, finalDelta, lang);

    // 3. Обновляем глобальный счетчик user_total_xp
    const totalXPRaw = await AsyncStorage.getItem('user_total_xp');
    const currentTotal = parseInt(totalXPRaw || '0');
    const newTotal = currentTotal + finalDelta;
    await AsyncStorage.setItem('user_total_xp', String(newTotal));

    // 4. ТРИГГЕРЫ: Автоматизация прогресса
    
    // А) Если это ответ в квизе или уроке — обновляем задачу "Всего ответов за день"
    if (source === 'quiz_answer' || source === 'lesson_complete' || source === 'lesson_answer') {
      await updateMultipleTaskProgress([{ type: 'total_answers', increment: 1 }]);
    }

    // Б) Проверка достижений по общему количеству XP (achievements.ts)
    if (finalDelta > 0) {
      await checkAchievements({ type: 'xp', totalXP: newTotal });
    }

    return {
      finalDelta,
      multiplier: totalMultiplier,
      isBonus: totalMultiplier > 1
    };
  } catch (error) {
    DebugLogger.error('xp_manager.ts:registerXP', error, 'critical');
    // Fallback: пишем как есть в случае критического сбоя
    await addOrUpdateScore(userName, amount, lang);
    return { finalDelta: amount, multiplier: 1, isBonus: false };
  }
};

/**
 * Получить текущий глобальный множитель игрока (для UI)
 */
export const getCurrentMultiplier = async (): Promise<number> => {
  const clubM = await getXPMultiplier();
  const streakRaw = await AsyncStorage.getItem('streak_count');
  const streakM = streakMultiplier(parseInt(streakRaw || '0'));
  
  const todayStr = new Date().toISOString().split('T')[0];
  const comebackRaw = await AsyncStorage.getItem('comeback_active');
  const comebackM = (comebackRaw === todayStr) ? 2 : 1;

  return clubM * streakM * comebackM;
};