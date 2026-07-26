export type PhraseProgressStatus =
  | 'start'
  | 'moving'
  | 'confident'
  | 'strong'
  | 'impressive'
  | 'expert'
  | 'outstanding';

const PHRASE_PROGRESS_THRESHOLDS: readonly { status: PhraseProgressStatus; min: number }[] = [
  { status: 'outstanding', min: 1000 },
  { status: 'expert', min: 700 },
  { status: 'impressive', min: 400 },
  { status: 'strong', min: 200 },
  { status: 'confident', min: 80 },
  { status: 'moving', min: 1 },
  { status: 'start', min: 0 },
];

/** Returns a motivational status for phrases retained through spaced repetition. */
export function phraseProgressStatusForCount(count: number): PhraseProgressStatus {
  const safeCount = Math.max(0, Math.floor(count));
  return PHRASE_PROGRESS_THRESHOLDS.find(({ min }) => safeCount >= min)?.status ?? 'start';
}
