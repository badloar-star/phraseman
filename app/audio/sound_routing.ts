import type { AppEventMap } from '../events';
import type { SoundId } from './sound_manifest';

export const SOUND_ROUTED_APP_EVENTS = [
  'level_up_pending',
  'achievement_unlocked',
  'premium_activated',
  'gold_theme_unlocked',
  'shards_earned',
  'daily_task_completed',
  'daily_task_reward_claimed',
  'lesson_finished_once',
] as const satisfies readonly (keyof AppEventMap)[];

export function resolveSoundIdForAppEvent<K extends keyof AppEventMap>(
  event: K,
  payload?: AppEventMap[K],
): SoundId | null {
  switch (event) {
    case 'level_up_pending':
      return 'level.up';
    case 'achievement_unlocked':
      return 'achievement.unlocked';
    case 'premium_activated':
      return 'premium.activated';
    case 'gold_theme_unlocked':
      return 'theme.gold.unlocked';
    case 'daily_task_completed':
      return 'daily.task.completed';
    case 'daily_task_reward_claimed':
      return 'daily.reward.claimed';
    case 'lesson_finished_once':
      return 'lesson.completed';
    case 'shards_earned': {
      const amount = typeof payload === 'object' && payload && 'amount' in payload
        ? Number((payload as AppEventMap['shards_earned']).amount)
        : 0;
      if (amount >= 30) return 'shards.earned.large';
      if (amount >= 10) return 'shards.earned.medium';
      return 'shards.earned.small';
    }
    default:
      return null;
  }
}
