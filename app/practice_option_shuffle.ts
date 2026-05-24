import { shuffle } from './utils_shuffle';

type PracticeOptionWithId = { id: string };

export function shufflePracticeOptions<T>(
  options: readonly T[],
  random: () => number = Math.random,
): T[] {
  return shuffle(options, random);
}

function randomDifferentIndex(
  currentIndex: number,
  length: number,
  random: () => number,
): number {
  if (length <= 1) return currentIndex;
  const offset = 1 + Math.floor(Math.max(0, Math.min(0.999999999999, random())) * (length - 1));
  return (currentIndex + offset) % length;
}

export function shufflePracticeOptionsAvoidingSameCorrectSlot<T extends PracticeOptionWithId>(
  options: readonly T[],
  correctAnswerId: string,
  previousCorrectIndex: number | null,
  random: () => number = Math.random,
): T[] {
  const shuffled = shufflePracticeOptions(options, random);
  if (previousCorrectIndex === null || shuffled.length <= 1) return shuffled;

  const correctIndex = shuffled.findIndex((option) => option.id === correctAnswerId);
  if (correctIndex < 0 || correctIndex !== previousCorrectIndex) return shuffled;

  const nextIndex = randomDifferentIndex(correctIndex, shuffled.length, random);
  [shuffled[correctIndex], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[correctIndex]];
  return shuffled;
}

export function buildPracticeOptionsByStepId<TOption extends PracticeOptionWithId>(
  steps: readonly { id: string; answerOptions: readonly TOption[]; correctAnswerId: string }[],
  random: () => number = Math.random,
): Map<string, TOption[]> {
  const map = new Map<string, TOption[]>();
  let previousCorrectIndex: number | null = null;

  for (const step of steps) {
    const options: TOption[] = shufflePracticeOptionsAvoidingSameCorrectSlot(
      step.answerOptions,
      step.correctAnswerId,
      previousCorrectIndex,
      random,
    );
    map.set(step.id, options);
    const correctIndex = options.findIndex((option: TOption) => option.id === step.correctAnswerId);
    previousCorrectIndex = correctIndex >= 0 ? correctIndex : null;
  }

  return map;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
