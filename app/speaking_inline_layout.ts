export type SpeakingInlineVariant = 'lesson' | 'trainer';

export type SpeakingInlineMetrics = {
  scale: number;
  slotHeight: number;
};

const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 844;
const BASE_SLOT_HEIGHT = 176;
const MIN_SCALE = 0.72;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Stable first-frame metrics shared by the reserved slot and its card. */
export function speakingInlineMetrics(
  viewportWidth: number,
  viewportHeight: number,
  variant: SpeakingInlineVariant,
): SpeakingInlineMetrics {
  const viewportScale = Math.min(
    viewportWidth / REFERENCE_WIDTH,
    viewportHeight / REFERENCE_HEIGHT,
    1,
  );
  const profileScale = variant === 'lesson' ? 0.82 : 1;
  const scale = Math.round(clamp(viewportScale * profileScale, MIN_SCALE, 1) * 100) / 100;
  return {
    scale,
    slotHeight: Math.round(BASE_SLOT_HEIGHT * scale),
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
