export type AppSoundCategory = 'action' | 'reward' | 'ceremony' | 'system';

export type AppSoundManifestEntry = {
  id: string;
  label: string;
  group: string;
  category: AppSoundCategory;
  priority: 0 | 1 | 2 | 3;
  durationMs: number;
  assetPath: string;
  preload: boolean;
  throttleMs: number;
  defaultVolume: number;
};

export const SOUND_MANIFEST = [
  {
    id: 'answer.correct',
    label: 'Correct answer',
    group: 'Learning',
    category: 'action',
    priority: 1,
    durationMs: 180,
    assetPath: 'assets/sounds/ui/answer_correct.wav',
    preload: true,
    throttleMs: 120,
    defaultVolume: 0.42,
  },
  {
    id: 'answer.wrong',
    label: 'Wrong answer',
    group: 'Learning',
    category: 'action',
    priority: 1,
    durationMs: 260,
    assetPath: 'assets/sounds/ui/answer_wrong.wav',
    preload: true,
    throttleMs: 180,
    defaultVolume: 0.38,
  },
  {
    id: 'achievement.unlocked',
    label: 'Achievement unlocked',
    group: 'Rewards',
    category: 'reward',
    priority: 2,
    durationMs: 1100,
    assetPath: 'assets/sounds/reward/achievement_unlocked.wav',
    preload: true,
    throttleMs: 900,
    defaultVolume: 0.72,
  },
  {
    id: 'shards.earned.small',
    label: 'Shards earned small',
    group: 'Rewards',
    category: 'reward',
    priority: 2,
    durationMs: 520,
    assetPath: 'assets/sounds/reward/shards_earned_small.wav',
    preload: true,
    throttleMs: 500,
    defaultVolume: 0.58,
  },
  {
    id: 'shards.earned.medium',
    label: 'Shards earned medium',
    group: 'Rewards',
    category: 'reward',
    priority: 2,
    durationMs: 820,
    assetPath: 'assets/sounds/reward/shards_earned_medium.wav',
    preload: true,
    throttleMs: 700,
    defaultVolume: 0.64,
  },
  {
    id: 'shards.earned.large',
    label: 'Shards earned large',
    group: 'Rewards',
    category: 'reward',
    priority: 2,
    durationMs: 1250,
    assetPath: 'assets/sounds/reward/shards_earned_large.wav',
    preload: false,
    throttleMs: 900,
    defaultVolume: 0.72,
  },
  {
    id: 'daily.task.completed',
    label: 'Daily task completed',
    group: 'Daily',
    category: 'reward',
    priority: 1,
    durationMs: 620,
    assetPath: 'assets/sounds/reward/daily_task_completed.wav',
    preload: false,
    throttleMs: 700,
    defaultVolume: 0.52,
  },
  {
    id: 'daily.reward.claimed',
    label: 'Daily reward claimed',
    group: 'Daily',
    category: 'reward',
    priority: 2,
    durationMs: 980,
    assetPath: 'assets/sounds/reward/daily_reward_claimed.wav',
    preload: true,
    throttleMs: 900,
    defaultVolume: 0.68,
  },
  {
    id: 'lesson.completed',
    label: 'Lesson completed',
    group: 'Learning',
    category: 'reward',
    priority: 2,
    durationMs: 1500,
    assetPath: 'assets/sounds/reward/lesson_completed.wav',
    preload: false,
    throttleMs: 1200,
    defaultVolume: 0.66,
  },
  {
    id: 'level.up',
    label: 'Level up',
    group: 'Ceremony',
    category: 'ceremony',
    priority: 3,
    durationMs: 2200,
    assetPath: 'assets/sounds/ceremony/level_up.wav',
    preload: true,
    throttleMs: 1800,
    defaultVolume: 0.78,
  },
  {
    id: 'premium.activated',
    label: 'Premium activated',
    group: 'Ceremony',
    category: 'ceremony',
    priority: 3,
    durationMs: 4200,
    assetPath: 'assets/sounds/ceremony/premium_activated.wav',
    preload: false,
    throttleMs: 3500,
    defaultVolume: 0.82,
  },
  {
    id: 'theme.gold.unlocked',
    label: 'Gold theme unlocked',
    group: 'Ceremony',
    category: 'ceremony',
    priority: 3,
    durationMs: 2800,
    assetPath: 'assets/sounds/ceremony/theme_gold_unlocked.wav',
    preload: false,
    throttleMs: 2500,
    defaultVolume: 0.8,
  },
  {
    id: 'league.chest.open',
    label: 'League chest open',
    group: 'Ceremony',
    category: 'ceremony',
    priority: 3,
    durationMs: 2400,
    assetPath: 'assets/sounds/ceremony/league_chest_open.wav',
    preload: false,
    throttleMs: 2200,
    defaultVolume: 0.78,
  },
  {
    id: 'rank.up',
    label: 'Rank up',
    group: 'Arena',
    category: 'ceremony',
    priority: 3,
    durationMs: 2200,
    assetPath: 'assets/sounds/arena/rank_up.wav',
    preload: false,
    throttleMs: 2000,
    defaultVolume: 0.76,
  },
  {
    id: 'arena.match.found',
    label: 'Arena match found',
    group: 'Arena',
    category: 'ceremony',
    priority: 3,
    durationMs: 1100,
    assetPath: 'assets/sounds/arena/arena_match_found.wav',
    preload: true,
    throttleMs: 1800,
    defaultVolume: 0.74,
  },
  {
    id: 'arena.result.win',
    label: 'Arena win',
    group: 'Arena',
    category: 'ceremony',
    priority: 3,
    durationMs: 1650,
    assetPath: 'assets/sounds/arena/arena_result_win.wav',
    preload: false,
    throttleMs: 1700,
    defaultVolume: 0.74,
  },
  {
    id: 'arena.result.loss',
    label: 'Arena loss',
    group: 'Arena',
    category: 'reward',
    priority: 2,
    durationMs: 1050,
    assetPath: 'assets/sounds/arena/arena_result_loss.wav',
    preload: false,
    throttleMs: 1200,
    defaultVolume: 0.5,
  },
  {
    id: 'pack.card.reveal',
    label: 'Pack card reveal',
    group: 'Cards',
    category: 'action',
    priority: 1,
    durationMs: 340,
    assetPath: 'assets/sounds/ui/pack_card_reveal.wav',
    preload: false,
    throttleMs: 220,
    defaultVolume: 0.46,
  },
] as const satisfies readonly AppSoundManifestEntry[];

export type SoundId = (typeof SOUND_MANIFEST)[number]['id'];

const SOUND_MANIFEST_BY_ID = new Map<SoundId, (typeof SOUND_MANIFEST)[number]>(
  SOUND_MANIFEST.map(item => [item.id, item]),
);

export const PRELOAD_SOUND_IDS = SOUND_MANIFEST
  .filter(item => item.preload)
  .map(item => item.id);

export function getSoundManifestEntry(id: SoundId) {
  return SOUND_MANIFEST_BY_ID.get(id);
}

