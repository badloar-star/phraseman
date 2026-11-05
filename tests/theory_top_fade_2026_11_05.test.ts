// Замечание Макетов 05.11: текст теории при прокрутке заезжает под статус-бар и кнопку «назад».
// Верх экрана теории растворяет текст в цвет фона (topFade ScreenGradient), «назад» остаётся выше маски.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('теория: верх при прокрутке', () => {
  const view = read('components/theory/TheoryLessonView.tsx');
  it('ScreenGradient получает topFade с scrollY, прокрутка пишет в него офсет', () => {
    expect(view).toContain("<ScreenGradient topFade={{ scrollY: topFadeScrollY, screen: 'lesson_theory' }}>");
    expect(view).toContain('onScroll={onTopFadeScroll}');
    expect(view).toContain('topFadeScrollY.setValue(e.nativeEvent.contentOffset.y)');
  });
  it('кнопка «назад» (zIndex 40) выше маски (zIndex 5 по умолчанию)', () => {
    expect(read('components/v2/ScreenBackButton.tsx')).toContain('zIndex: 40');
    expect(read('components/TopFadeMask.tsx')).toContain('zIndex = 5');
  });
});
