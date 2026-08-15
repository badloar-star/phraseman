import { ARENA_QUESTION_COUNT, ARENA_TASK_MODES, type ArenaTaskMode } from './contract';

/** Two questions per reused Tournament mode: one duel is always ten questions. */
export const ARENA_DUEL_BLUEPRINT: readonly ArenaTaskMode[] = [
  ...ARENA_TASK_MODES,
  ...ARENA_TASK_MODES,
];

export function seededArenaBlueprint(seed: number): readonly ArenaTaskMode[] {
  // The seed is deliberately accepted for API symmetry with task-content
  // generation. Mode order is a product contract and must never be shuffled.
  void seed;
  return [...ARENA_DUEL_BLUEPRINT];
}

export function isValidArenaBlueprint(value: readonly ArenaTaskMode[]): boolean {
  if (value.length !== ARENA_QUESTION_COUNT) return false;
  return ARENA_TASK_MODES.every((mode) => value.filter((item) => item === mode).length === 2);
}
