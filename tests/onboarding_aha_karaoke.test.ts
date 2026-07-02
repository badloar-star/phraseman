import { buildKaraokeFrames, karaokeIndexAtTime } from '../components/onboarding_aha/aha_karaoke';
import { AHA_SCENARIOS } from '../components/onboarding_aha/aha_scenes';
import type { AhaLine } from '../components/onboarding_aha/aha_types';

/** Все 12 реплик контента (hear + say на каждый из 6 сценариев). */
function allLines(): { label: string; line: AhaLine }[] {
  return Object.values(AHA_SCENARIOS).flatMap((scenario) => [
    { label: `${scenario.id}.hear`, line: scenario.hear },
    { label: `${scenario.id}.say`, line: scenario.say },
  ]);
}

describe('buildKaraokeFrames', () => {
  for (const { label, line } of allLines()) {
    it(`${label}: количество кадров равно числу слов`, () => {
      const frames = buildKaraokeFrames(line);
      expect(frames.length).toBe(line.timings.length);
    });

    it(`${label}: atMs неубывающие`, () => {
      const frames = buildKaraokeFrames(line);
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i].atMs).toBeGreaterThanOrEqual(frames[i - 1].atMs);
      }
    });

    it(`${label}: wordIndex по порядку с 0`, () => {
      const frames = buildKaraokeFrames(line);
      frames.forEach((frame, i) => expect(frame.wordIndex).toBe(i));
    });
  }
});

describe('karaokeIndexAtTime', () => {
  for (const { label, line } of allLines()) {
    it(`${label}: до первого слова = -1 (первое слово стартует на 0, поэтому проверяем отрицательный момент)`, () => {
      const frames = buildKaraokeFrames(line);
      expect(karaokeIndexAtTime(frames, -1)).toBe(-1);
    });

    it(`${label}: после последнего слова = последний индекс`, () => {
      const frames = buildKaraokeFrames(line);
      const lastIndex = line.timings.length - 1;
      expect(karaokeIndexAtTime(frames, line.durationMs)).toBe(lastIndex);
    });

    it(`${label}: ровно на старте каждого слова подсвечивается это слово`, () => {
      const frames = buildKaraokeFrames(line);
      line.timings.forEach((timing, i) => {
        expect(karaokeIndexAtTime(frames, timing.startMs)).toBe(i);
      });
    });
  }

  it('work.say: зазор 980→1200 — на 980..1199 остаётся подсвечено слово "Sure,"', () => {
    const line = AHA_SCENARIOS.work.say;
    const frames = buildKaraokeFrames(line);
    // "Sure," startMs=0, endMs=980; "does" startMs=1200.
    expect(karaokeIndexAtTime(frames, 0)).toBe(0);
    expect(karaokeIndexAtTime(frames, 980)).toBe(0);
    expect(karaokeIndexAtTime(frames, 1199)).toBe(0);
    expect(karaokeIndexAtTime(frames, 1200)).toBe(1);
  });

  it('нулевой момент времени = -1, когда первое слово начинается позже 0', () => {
    const frames: ReturnType<typeof buildKaraokeFrames> = [
      { wordIndex: 0, atMs: 100 },
      { wordIndex: 1, atMs: 400 },
    ];
    expect(karaokeIndexAtTime(frames, 0)).toBe(-1);
    expect(karaokeIndexAtTime(frames, 99)).toBe(-1);
    expect(karaokeIndexAtTime(frames, 100)).toBe(0);
    expect(karaokeIndexAtTime(frames, 399)).toBe(0);
    expect(karaokeIndexAtTime(frames, 400)).toBe(1);
    expect(karaokeIndexAtTime(frames, 100000)).toBe(1);
  });

  it('пустой список кадров всегда возвращает -1', () => {
    expect(karaokeIndexAtTime([], 0)).toBe(-1);
    expect(karaokeIndexAtTime([], 99999)).toBe(-1);
  });
});
