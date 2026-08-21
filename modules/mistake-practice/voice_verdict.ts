export type MistakeVoiceVerdict = 'PASS' | 'FAIL' | 'UNCERTAIN' | 'INVALID';

const UNCERTAINTY_POINTS = 5;

export function classifyMistakeVoiceVerdict(input: Readonly<{
  status: 'scored' | 'invalid';
  score: number | null;
  threshold: number;
}>): MistakeVoiceVerdict {
  if (input.status === 'invalid' || !Number.isFinite(input.score)) return 'INVALID';
  const score = Number(input.score);
  if (score >= input.threshold + UNCERTAINTY_POINTS) return 'PASS';
  if (score <= input.threshold - UNCERTAINTY_POINTS) return 'FAIL';
  return 'UNCERTAIN';
}
