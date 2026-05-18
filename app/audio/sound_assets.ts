import type { SoundId } from './sound_manifest';

export const SOUND_ASSETS: Record<SoundId, number> = {
  'answer.correct': require('../../assets/sounds/ui/answer_correct.wav'),
  'answer.wrong': require('../../assets/sounds/ui/answer_wrong.wav'),
  'achievement.unlocked': require('../../assets/sounds/reward/achievement_unlocked.wav'),
  'shards.earned.small': require('../../assets/sounds/reward/shards_earned_small.wav'),
  'shards.earned.medium': require('../../assets/sounds/reward/shards_earned_medium.wav'),
  'shards.earned.large': require('../../assets/sounds/reward/shards_earned_large.wav'),
  'daily.task.completed': require('../../assets/sounds/reward/daily_task_completed.wav'),
  'daily.reward.claimed': require('../../assets/sounds/reward/daily_reward_claimed.wav'),
  'lesson.completed': require('../../assets/sounds/reward/lesson_completed.wav'),
  'level.up': require('../../assets/sounds/ceremony/level_up.wav'),
  'premium.activated': require('../../assets/sounds/ceremony/premium_activated.wav'),
  'theme.gold.unlocked': require('../../assets/sounds/ceremony/theme_gold_unlocked.wav'),
  'league.chest.open': require('../../assets/sounds/ceremony/league_chest_open.wav'),
  'rank.up': require('../../assets/sounds/arena/rank_up.wav'),
  'arena.match.found': require('../../assets/sounds/arena/arena_match_found.wav'),
  'arena.result.win': require('../../assets/sounds/arena/arena_result_win.wav'),
  'arena.result.loss': require('../../assets/sounds/arena/arena_result_loss.wav'),
  'pack.card.reveal': require('../../assets/sounds/ui/pack_card_reveal.wav'),
};

