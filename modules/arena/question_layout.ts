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

/**
 * Height-only responsive contract for the two immersive tasks.
 *
 * At 320 pt landscape (and when the system font is 1.5x) the task keeps its
 * HUD and CTA outside bounded internal scroll regions. The tray cannot shrink
 * below 68 pt: one 48 pt chip plus its vertical padding must remain tappable.
 */
export function arenaQuestionViewportLayout(
  windowHeight: number,
  systemFontScale: number,
): Readonly<{
  compactHeight: boolean;
  answerTrayMaxHeight: number;
}> {
  const height = Number.isFinite(windowHeight) && windowHeight > 0 ? windowHeight : 320;
  const fontScale = Number.isFinite(systemFontScale) && systemFontScale > 0 ? systemFontScale : 1;
  const compactHeight = height <= 420 || fontScale >= 1.5;
  return {
    compactHeight,
    answerTrayMaxHeight: compactHeight
      ? Math.max(68, Math.min(80, Math.round(height * 0.22)))
      : 132,
  };
}
