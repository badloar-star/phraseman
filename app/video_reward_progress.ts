// video_reward_progress.ts — шкала «до награды +500» под видео: 70 % реального просмотра = «100 %» для человека.
// зачем (владелец 06.11 через координатора, TestFlight 150): человек видит, сколько осталось до +500 монет; считаем от того же накопленного времени, что и детектор
// useVideoFullWatch (порог videoFullTarget, перемотка не копится), поэтому шкала и начисление не расходятся. Чистые функции — проверяются без плеера.
export const VIDEO_REWARD_MILESTONES: readonly number[] = [0, 25, 50, 75, 100];

/** min(100, round(накоплено / порог · 100)); порог ≤ 0 или нет данных — 0. */
export function videoRewardProgressPercent(accumulatedSec: number, targetSec: number): number {
  if (!Number.isFinite(accumulatedSec) || !Number.isFinite(targetSec) || targetSec <= 0 || accumulatedSec <= 0) return 0;
  return Math.min(100, Math.round((accumulatedSec / targetSec) * 100));
}

/** Самая высокая отметка журнала (0/25/50/75/100), которую уже перешагнули при этом проценте. */
export function videoRewardMilestoneFor(percent: number): number {
  let reached = 0;
  for (const m of VIDEO_REWARD_MILESTONES) if (percent >= m) reached = m;
  return reached;
}

/** Показывать ли строку: не live/слишком короткий (percent=null) и награда за ролик ещё не получена (или получена прямо сейчас на этом экране). */
export function videoRewardRowVisible(input: Readonly<{ percent: number | null; rewardedBefore: boolean; grantedNow: boolean }>): boolean {
  if (input.percent === null) return false;
  return !input.rewardedBefore || input.grantedNow;
}

export default function __VideoRewardProgressRouteShim() {
  return null;
}
