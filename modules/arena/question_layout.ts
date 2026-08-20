import type { ArenaTaskMode } from './contract';

export type ArenaQuestionInstructionKey = 'matchInstruction' | 'builderInstruction';

/** Pure mode-to-layout contract consumed by both the screen and the question. */
export function arenaQuestionLayout(mode: ArenaTaskMode): Readonly<{
  immersive: boolean;
  instructionKey: ArenaQuestionInstructionKey | null;
}> {
  if (mode === 'speed_match') return { immersive: true, instructionKey: 'matchInstruction' };
  if (mode === 'translate_build') return { immersive: true, instructionKey: 'builderInstruction' };
  return { immersive: false, instructionKey: null };
}
