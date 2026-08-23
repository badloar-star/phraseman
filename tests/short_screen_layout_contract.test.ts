import fs from 'fs';
import path from 'path';

const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

/**
 * зачем (владелец, 2026-08-23): на iPhone SE/8 (667pt) элементы налезали друг
 * на друга — сначала в онбординге (макет телефона поверх заголовка), потом на
 * экране «Проверка интро» (сумма минимальных высот 698pt против 667 доступных).
 *
 * Общий корень: вёрстка нормировалась по ШИРИНЕ (computeUiScale = narrow/390),
 * а у SE ширина почти эталонная — короткая именно ВЫСОТА. Ширинная шкала этот
 * класс бага физически не видит, поэтому появилась отдельная шкала по высоте.
 *
 * Сторож фиксирует не пиксели (они меняются от дизайна), а сам МЕХАНИЗМ защиты.
 */
describe('short screen layout contract (iPhone SE / 667pt)', () => {
  it('exposes a height-based scale separate from the width-based one', () => {
    const scale = read('constants', 'layout-scale.ts');
    // Ширинная шкала остаётся — её трогать нельзя, на ней завязан ThemeContext.
    expect(scale).toContain('export function computeUiScale');
    // Высотная шкала — то, что закрывает этот класс бага.
    expect(scale).toContain('export function computeHeightScale');
    expect(scale).toContain('export function isShortScreen');
    expect(scale).toContain('REF_PHONE_HEIGHT = 844');
    // Целевой минимум владельца — iPhone SE/8. Порог ниже 667 сделал бы
    // сторожа бессмысленным: сам SE перестал бы считаться низким экраном.
    expect(scale).toMatch(/BP_SHORT_SCREEN = (7\d\d|68\d|67\d)/);
  });

  it('keeps the onboarding phone mock bounded by the space actually left over', () => {
    const src = read('components', 'CleanOnboarding.tsx');
    // Макет телефона — абсолютный фоновый слой: сам он про текст рядом не знает.
    // ScreenFrame обязан измерить соседей и отдать остаток вниз.
    expect(src).toContain('phoneAvailableHeight');
    expect(src).toContain('availableHeight');
    // Свободное место — ЖЁСТКИЙ потолок. Если минимум высоты применить ПОСЛЕ
    // ограничения (Math.max снаружи Math.min), корпус снова раздувается выше
    // доступного места и наложение возвращается — так и было в первой версии.
    expect(src).toMatch(/Math\.max\(200,\s*Math\.min\(desired/);
  });

  it('keeps the intro check screen scrollable and rhythm-compressed on short screens', () => {
    const src = read('app', 'learning_v2_session_intro_check.tsx');
    // Страховка на любой длине текста и крупном системном шрифте.
    expect(src).toContain('ScrollView');
    expect(src).toContain('contentContainerStyle');
    // Ужатый ритм, чтобы в типичном случае прокручивать не пришлось вовсе.
    expect(src).toContain('isShortScreen');
    expect(src).toContain('shortScreen && styles.contentShort');
    expect(src).toContain('questionCardShort');
    // content внутри ScrollView обязан быть flexGrow, а не flex — иначе
    // контент схлопывается и прокрутка не работает.
    expect(src).toMatch(/content: \{ flexGrow: 1/);
  });

  it('never compresses glyphs to fit — long text is solved by layout', () => {
    // Прямой запрет владельца: ужатие шрифта под контейнер даёт прыгающую
    // геометрию первого кадра и нечитаемый текст на длинных локалях.
    for (const f of [
      ['components', 'CleanOnboarding.tsx'],
      ['app', 'learning_v2_session_intro_check.tsx'],
    ]) {
      expect(read(...f)).not.toContain('adjustsFontSizeToFit');
    }
  });
});
