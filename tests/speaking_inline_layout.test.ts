import { speakingInlineMetrics, speakingInlineSlotAlign } from '../app/speaking_inline_layout';

describe('speaking inline responsive metrics', () => {
  it('keeps practice spacious and lessons compact on a reference phone', () => {
    expect(speakingInlineMetrics(390, 844, 'trainer')).toEqual({ scale: 1, slotHeight: 176 });
    expect(speakingInlineMetrics(390, 844, 'lesson')).toEqual({ scale: 0.82, slotHeight: 144 });
  });

  it('shrinks proportionally on short or narrow screens without collapsing', () => {
    const narrow = speakingInlineMetrics(320, 568, 'lesson');
    const regular = speakingInlineMetrics(390, 844, 'lesson');
    expect(narrow.scale).toBe(0.72);
    expect(narrow.slotHeight).toBe(127);
    expect(narrow.slotHeight).toBeLessThan(regular.slotHeight);
  });

  it('never grows beyond the approved geometry on tablets', () => {
    expect(speakingInlineMetrics(1024, 1366, 'trainer')).toEqual({ scale: 1, slotHeight: 176 });
    expect(speakingInlineMetrics(1024, 1366, 'lesson')).toEqual({ scale: 0.82, slotHeight: 144 });
  });

  // зачем (§126, 04.10): в «Устно» на коротком экране прокрутка показывала от слота ~133 из 167 dp — низ карточки
  // речи, стоявшей по центру, срезался. На коротких экранах тренажёра карточка прижата к верху; эталон и урок — по центру.
  it('pins the trainer card to the top only on short screens', () => {
    expect(speakingInlineSlotAlign(800, 'trainer')).toBe('flex-start');
    expect(speakingInlineSlotAlign(844, 'trainer')).toBe('center');
    expect(speakingInlineSlotAlign(1366, 'trainer')).toBe('center');
    expect(speakingInlineSlotAlign(640, 'lesson')).toBe('center');
  });
});
