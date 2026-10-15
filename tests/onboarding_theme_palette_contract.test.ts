// зачем (координатор 15.10): онбординг новичка рисуется цветами дефолтных тем по системе — светлая «Сумерки» (ink), тёмная «Океан» (marine).
// Проверяем контраст ролей палитры в обеих темах (главная кнопка ≥ 3:1 к фону, подпись на ней и текст ≥ 4,5:1) и что в файле онбординга
// не осталось статической таблицы стилей и фиксированных цветов вне разрешённых (телефон с пушем, тени, подложки, конфетти).
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { buildOnboardingPalette, onboardingContrast } from '../components/onboarding_palette';
import { NEW_USER_SYSTEM_PAIR } from '../app/theme_first_run_default';

const PAIRS = [
  { name: 'светлая система', id: NEW_USER_SYSTEM_PAIR.light, appearance: 'light' as const },
  { name: 'тёмная система', id: NEW_USER_SYSTEM_PAIR.dark, appearance: 'dark' as const },
];

describe.each(PAIRS)('онбординг в цветах темы — $name', ({ id, appearance }) => {
  const g = liquidGlassTokens(id, { level: 'accent', appearance, intensity: 1 });
  const p = buildOnboardingPalette(g, `${id}|${appearance}`);
  it('главная кнопка: ≥ 3:1 к фону (верх и низ), подпись ≥ 4,5:1', () => {
    expect(onboardingContrast(p.ctaFill, p.bgTop)).toBeGreaterThanOrEqual(3);
    expect(onboardingContrast(p.ctaFill, p.bgBottom)).toBeGreaterThanOrEqual(3);
    expect(onboardingContrast(p.ctaInk, p.ctaFill)).toBeGreaterThanOrEqual(4.5);
  });
  it('отключённая главная: подпись ≥ 4,5:1 к своей заливке', () => {
    expect(onboardingContrast(p.ctaInkDisabled, p.ctaFillDisabled)).toBeGreaterThanOrEqual(4.5);
  });
  it('текст: основной и вторичный ≥ 4,5:1 на фоне и на карточке, зелёный текст на карточке ≥ 4,5:1', () => {
    for (const surface of [p.bgTop, p.bgBottom, p.card]) {
      expect(onboardingContrast(p.text, surface)).toBeGreaterThanOrEqual(4.5);
      expect(onboardingContrast(p.secondary, surface)).toBeGreaterThanOrEqual(4.5);
    }
    expect(onboardingContrast(p.goodText, p.card)).toBeGreaterThanOrEqual(4.5);
  });
  it('карточка отличима от фона', () => {
    expect(Math.max(onboardingContrast(p.card, p.bgTop), onboardingContrast(p.card, p.bgBottom))).toBeGreaterThan(1.02);
  });
});

describe('онбординг — исходник', () => {
  const src = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'components/CleanOnboarding.tsx'), 'utf8'));
  it('стили строятся из палитры темы, статической таблицы нет', () => {
    expect(src).toContain('const createStyles = memoStylesByPalette((P: OnboardingPalette) => StyleSheet.create({');
    expect(src).not.toMatch(/^const styles = StyleSheet\.create/m);
  });
  it('полоса статуса и кнопки входа следуют поверхности темы', () => {
    expect(src).not.toContain('barStyle="dark-content"');
    expect(src).toContain("barStyle={P.isLight ? 'dark-content' : 'light-content'}");
  });
  it('экран уровня включён', () => {
    expect(src).toContain('const SHOW_ONBOARDING_LEVEL_STEP = true;');
  });
  it('ответ экрана уровня уходит в серверную статистику: лениво, фоном, level = null при пропуске; белый список журнала активности не расширен', () => {
    expect(src).toContain("import('../app/onboarding_level_stats')");
    expect(src).toContain('m.recordOnboardingLevelAnswer({ level: level ?? null, target: studyTarget })');
    expect(src).toContain("writeToFirestore: action === 'onboarding_source_select',");
  });
  it('вне иллюстрации телефона и таблицы стилей фиксированных светлых цветов «Bevel» нет', () => {
    const bevel = ['#F5F6FA', '#0C111B', '#5B6270', '#596170', '#17191F', '#E6E8EE', '#EDEFF4', '#C9CDD7'];
    const withoutShadow = src.split("softShadow({ color: '#0C111B'").join('softShadow({');
    // единственное исключение - заголовок пуша на фиксированной иллюстрации телефона (phonePushTitle)
    const hits = bevel.filter((c) => withoutShadow.split(`'${c}'`).length - 1 > (c === '#0C111B' ? 1 : 0));
    expect(hits).toEqual([]);
  });
});

describe.each(PAIRS)('плашка варианта (макет 15.10) — $name', ({ id, appearance }) => {
  const g = liquidGlassTokens(id, { level: 'accent', appearance, intensity: 1 });
  const p = buildOnboardingPalette(g, `${id}|${appearance}|plate`);
  it('роли плашки берутся из токенов темы; пустой квадратик - opaqueControl в светлой, buttonFill в тёмной', () => {
    expect(p.raisedFrom).toBe(g.raisedFillFrom);
    expect(p.raisedTo).toBe(g.raisedFillTo);
    expect(p.selectedLayer).toBe(g.selected);
    expect(p.radioEmpty.toUpperCase()).toBe((appearance === 'light' ? g.opaqueControl : g.buttonFill).slice(0, 7).toUpperCase());
  });
  it('значок и текст на плашке различимы (значок ≥ 3:1, как нетекстовый элемент)', () => {
    expect(onboardingContrast(p.iconMuted, p.raisedFrom.slice(0, 7))).toBeGreaterThanOrEqual(3);
  });
});
