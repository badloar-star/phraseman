// Pure-логика караоке-подсветки слов. Никакого React — только вычисление
// кадров по таймингам реплики и поиск активного слова по прошедшему времени.

import type { AhaLine, KaraokeFrame } from './aha_types';

/**
 * Строит кадры караоке из пословных таймингов реплики: один кадр на слово,
 * atMs = момент начала звучания слова (startMs). Слово подсвечивается
 * в этот момент и остаётся подсвеченным до следующего кадра (даже если
 * между словами есть зазор — см. work.say: "Sure," 0-980, "does" 1200-1840).
 */
export function buildKaraokeFrames(line: AhaLine): KaraokeFrame[] {
  return line.timings.map((timing, wordIndex) => ({
    wordIndex,
    atMs: timing.startMs,
  }));
}

/**
 * Индекс слова, подсвеченного к моменту elapsedMs. -1, если ещё не дошли
 * до первого слова. После последнего кадра остаётся индекс последнего слова.
 */
export function karaokeIndexAtTime(frames: readonly KaraokeFrame[], elapsedMs: number): number {
  let current = -1;
  for (const frame of frames) {
    if (elapsedMs >= frame.atMs) {
      current = frame.wordIndex;
    } else {
      break;
    }
  }
  return current;
}
