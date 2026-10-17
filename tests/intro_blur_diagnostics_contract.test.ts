// зачем (координатор 17.10, владелец: «почему всё так размыто» — вступление занятия V2; правило «сперва логи»): пока причина не доказана на устройстве, экран вступления
// пишет [INTRO-BLUR]: стили текста и карточки на показ, размеры, итог анимации появления. Сторож не даёт убрать журнал до разбора и не даёт вернуть тень/размытие в текст.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/learning_v2_session_intro.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('вступление занятия V2: журнал [INTRO-BLUR] и резкий текст', () => {
  it('журнал: стили на показ страницы, размеры без округления, итог анимации появления', () => {
    expect(src).toContain("console.log('[INTRO-BLUR] page', JSON.stringify({");
    expect(src).toContain('textShadowRadius');
    expect(src).toContain("console.log('[INTRO-BLUR] layout'");
    expect(src).toContain("console.log('[INTRO-BLUR] entering done'");
    expect(src).toContain('runOnJS(logIntroEntering)(introBlurPage, finished === true)');
    expect(src).toContain("onLayout={logIntroLayout('card')}");
    expect(src).toContain("onLayout={logIntroLayout('slide')}");
  });

  it('в колбэке анимации нет захвата ref (сторож no_ref_captured_by_worklet): страница передаётся числом', () => {
    expect(src).toContain('const introBlurPage = safeIndex;');
    expect(src).not.toMatch(/withCallback\([\s\S]{0,200}\.current/);
  });

  it('в тексте вступления нет тени, размытия и обрезки', () => {
    // стили экрана (журнал выше читает textShadow*, но не задаёт их)
    const styleSheet = src.slice(src.indexOf('const styles = StyleSheet.create'));
    expect(styleSheet.length).toBeGreaterThan(100);
    expect(styleSheet).not.toMatch(/textShadow(Color|Offset|Radius)\s*:/);
    expect(src).not.toMatch(/BlurView|blurRadius\s*:|backdropFilter/);
    expect(src).not.toContain('numberOfLines');
    expect(src).not.toContain('adjustsFontSizeToFit');
  });
});
