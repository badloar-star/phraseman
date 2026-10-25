// зачем (владелец 25.10, iPhone 2.0.2: подпись «Сдашь — откроется глава 2 · 12 вопросов…» видна ПОД капсулой таб-бара, хотя отступ низа уже учитывает таб-бар;
// координатор: сперва логи): [SEASON-LAYOUT] at:'caption' — где подпись под каруселью в окне против верха капсулы. Сторож держит журнал и отступ низа на месте.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Обучение»: подпись под каруселью против капсулы таб-бара', () => {
  const view = read('components/learning-v2/season/SeasonCourseView.tsx');

  it('журнал [SEASON-LAYOUT] caption: низ подписи, верх капсулы, перекрытие, отступы, прокрутка — на раскладке и на остановке прокрутки', () => {
    for (const part of [
      "at: 'caption'", 'capsuleTopY', 'overlapPx', 'captionBottom', 'bottomPadding', 'tabBottomPad', 'contentBottomPad', 'scrollY', 'contentH', 'viewportH',
      "verdict: bad ? 'CAPTION_UNDER_TABBAR_AT_END' : 'ok'", "logCaption('layout')", "logCaption('scroll_end')", "logCaption('drag_end')", "logCaption('content_size')",
      'seasonLayoutLog(',
    ]) expect(view).toContain(part);
  });

  it('под капсулой в КОНЦЕ прокрутки — ошибка (warn); в начале подпись ниже экрана — не дефект', () => {
    expect(view).toContain('const bad = overlapPx > 0 && atEnd;');
  });

  it('отступ низа с учётом таб-бара на месте (не ослаблен)', () => {
    expect(view).toContain('const contentBottomPad = isTabPage ? Math.max(props.bottomPadding, tabBottomPad) : props.bottomPadding;');
    expect(view).toContain('paddingBottom: contentBottomPad');
  });

  it('строки журнала без кириллицы в литералах (скан «русский текст в UI»)', () => {
    const body = view.slice(view.indexOf('const logCaption = useCallback'), view.indexOf('const onPageScroll'));
    const strip = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(strip.match(/['"`][^'"`\n]*[А-Яа-яЁё][^'"`\n]*['"`]/g) ?? []).toEqual([]);
  });
});
