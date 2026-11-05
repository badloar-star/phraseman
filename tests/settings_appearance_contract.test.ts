// theme_sliders_v1: контракт экрана «Оформление» (settings_appearance.tsx) — флаг, Plus-замок, превью/запись, журнал, никаких обводок и цветов мимо токенов.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/settings_appearance.tsx'), 'utf8').replace(/\r\n/g, '\n');
const slider = fs.readFileSync(path.join(__dirname, '..', 'components/settings/TuneSlider.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('settings_appearance: контракт', () => {
  it('при выключенном флаге экран пустой и уходит назад, причина в журнале', () => {
    expect(src).toContain('THEME_SLIDERS_V1_ENABLED');
    expect(src).toContain('if (!THEME_SLIDERS_V1_ENABLED) return null;');
    expect(src).toContain('экран открыт при выключенном флаге');
  });
  it('сегмент Светлая/Тёмная — всем, ползунки и сброс — только Plus (пейвол вместо жеста)', () => {
    expect(src).toContain('const locked = !hasPremiumAccess;');
    expect(src).toContain("openPremiumPaywall(router as never, { context: 'generic', source: 'appearance_tune' });");
    expect(src).toContain('locked={locked}');
    expect(src).toContain('if (locked) { onLockedPress(); return; }');
    expect(src).not.toMatch(/V2SegmentedControl[^\n]*locked/);
  });
  it('превью при жесте без записи, одна запись при отпускании, превью снимается при уходе', () => {
    expect(src).toContain('setPreviewLiquidGlassThemeId(themeTuneId(next))');
    expect(src).toContain('setLiquidGlassThemeId(id);');
    expect(src).toContain('useEffect(() => () => setPreviewLiquidGlassThemeId(null)');
  });
  it('журнал [THEME-SLIDERS]: вход, запись, запертый ползунок, смена оформления', () => {
    for (const marker of ["'screen'", "'commit'", 'ползунок заперт без Plus', "'appearance'"]) expect(src).toContain(marker);
  });
  it('без обводок контейнеров и без adjustsFontSizeToFit', () => {
    expect(src).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit/);
    expect(slider).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit/);
  });
  it('девять языков у каждой подписи', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      const count = (src.match(new RegExp(`${lang.includes("'") ? lang : `\\b${lang}:`}`, 'g')) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(7);
    }
  });
  it('ползунок: заперт без Plus (Pressable вместо жеста), доступность adjustable', () => {
    expect(slider).toContain('locked ? <Pressable');
    expect(slider).toContain('accessibilityRole="adjustable"');
    expect(slider).toContain('activeOffsetX([-4, 4])');
  });
});
