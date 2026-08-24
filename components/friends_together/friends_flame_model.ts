import type { WeeklyChestModel, WeeklyChestState } from '../../app/friends_together/weekly_chest_model';

export type FriendsFlameStage = 1 | 2 | 3;

export type FriendsFlameVisual = Readonly<{
  stage: FriendsFlameStage;
  scale: number;
  animated: boolean;
  ready: boolean;
}>;

type FlameModelInput = Pick<WeeklyChestModel, 'tier' | 'percent'> & Readonly<{ state: WeeklyChestState }>;

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
const normalizeTier = (value: number): number => Math.max(0, Math.min(3, Number.isFinite(value) ? Math.floor(value) : 0));

export function friendsFlameVisual(model: FlameModelInput): FriendsFlameVisual {
  const progress = clampPercent(model.percent) / 100;
  const tier = normalizeTier(model.tier);
  const stage: FriendsFlameStage = tier >= 3 ? 3 : tier >= 2 ? 2 : 1;
  const scale = tier <= 0
    ? 0.78 + progress * 0.06
    : tier === 1
      ? 0.84 + progress * 0.08
      : tier === 2
        ? 0.92 + progress * 0.08
        : model.state === 'ready'
          ? 1.08
          : 1.02;
  return {
    stage,
    scale: Number(scale.toFixed(2)),
    animated: model.state === 'active' || model.state === 'ready',
    ready: model.state === 'ready',
  };
}
