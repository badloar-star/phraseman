// зачем (Сверка 24.10 через координатора: «выбранная тема „Затмение“ без галочки ни в одном списке»): галочка и тап экрана тем идут от ПОКАЗАННОЙ темы
// (liquidGlassThemeId), а не от сохранённого выбора — у того, кто ещё не выбирал, показана тема по умолчанию, а сохранённое значение другое.
// Новичок (T4 9 · САЙТ, замок владельца 24.10) видит «Сумерки» (ink) — галочка стоит на ink. Каждая тема реестра стоит в одном из списков экрана.
// Прокрутку экран НЕ делает: открывается сверху, особые темы — первым видимым выбором (решение координатора 24.10, задумка Codex).
import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { pickSystemDefaultTheme } from '../app/theme_first_run_default';
import { readSource } from './helpers/read_source';

const screen = readSource('app/settings_themes.tsx');

describe('экран тем: показанная тема отмечена', () => {
  it('галочка и тап — по показанной теме, а не по сохранённому выбору', () => {
    expect(screen).toContain('const shownThemeId = liquidGlassThemeId;');
    expect(screen).not.toContain('appliedLiquidGlassThemeId');
    expect((screen.match(/applied=\{item\.mode === shownThemeId\}/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(screen).toContain('if (mode === shownThemeId) return;');
  });

  it('новичок видит «Сумерки» (ink) — галочка у новичка стоит на ink, и ink есть в списке', () => {
    expect(pickSystemDefaultTheme('dark').themeId).toBe('ink');
    expect(pickSystemDefaultTheme('light').themeId).toBe('ink');
    expect(screen).toContain("{ mode: 'ink' }");
  });

  it('каждая тема реестра стоит в списке экрана', () => {
    const listed = new Set<string>();
    for (const m of screen.matchAll(/\{ mode: '([a-z_]+)' \}/g)) listed.add(m[1]!);
    expect(screen).toContain('LIQUID_GLASS_GRADIENT_THEME_IDS.map(mode => ({ mode }))');
    const { LIQUID_GLASS_GRADIENT_THEME_IDS } = require('../constants/liquidGlassGradientThemes') as { LIQUID_GLASS_GRADIENT_THEME_IDS: readonly string[] };
    for (const id of LIQUID_GLASS_GRADIENT_THEME_IDS) listed.add(id);
    // исключение одно — «Оливковая» (grad_full_olive): скрыта из выбора до назначения достижения владельцем (30.09 «темы не продаются», координатор 24.10);
    // у кого она уже выдана, строка показывается (фильтр по premiumEntitlements.unlocked)
    expect(screen).toContain("const HIDDEN_UNTIL_ACHIEVEMENT: ReadonlySet<string> = new Set<string>(['grad_full_olive']);");
    expect(screen).toContain('!HIDDEN_UNTIL_ACHIEVEMENT.has(item.mode) || premiumEntitlements.unlocked.has(item.mode as never)');
    expect((LIQUID_GLASS_THEME_IDS as readonly string[]).filter((id) => !listed.has(id))).toEqual([]);
  });
});
