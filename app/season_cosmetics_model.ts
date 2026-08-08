import { SEASON_AVATAR_AURA_IDS } from '../constants/avatar_auras';

export const SEASON1_FRAME_ID = 'season1_frame';

export function seasonAuraIdForStage(stage: number): typeof SEASON_AVATAR_AURA_IDS[number] {
  const normalizedStage = Math.max(1, Math.min(4, Math.round(Number(stage) || 1)));
  return SEASON_AVATAR_AURA_IDS[normalizedStage - 1]!;
}

export function resolveSeasonProfileFrameVisible(input: {
  isMe: boolean;
  ownedFrameIds: readonly string[];
  publicFrameId?: string;
  devOverride?: boolean;
}): boolean {
  if (input.devOverride !== undefined) return input.devOverride;
  return input.isMe
    ? input.ownedFrameIds.includes(SEASON1_FRAME_ID)
    : input.publicFrameId === SEASON1_FRAME_ID;
}

/** DEV override remains authoritative even after the async real snapshot reloads. */
export function resolveProfileCardDisplayLevel(input: {
  realLevel: number;
  inCardPreviewLevel: number | null;
  devOverride?: number;
}): number {
  const chosen = input.devOverride !== undefined
    ? input.devOverride
    : (input.inCardPreviewLevel ?? input.realLevel);
  return Math.max(0, Math.min(5, Math.floor(Number(chosen) || 0)));
}
