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
  // зачем (владелец 05.11 ~20:55 «КАК ПО МАКЕТУ»): детали одобренного макета docs/work/mockups/theme_sliders_exact.html закреплены
  it('по макету: ☀/☾ в сегменте, замок у «Plus», значок у сброса, кромка дорожки из темы, числа 15 px, размеры карточки/сброса', () => {
    expect(src).toContain("icon: 'sunny' as const");
    expect(src).toContain("icon: 'moon' as const");
    expect(src).toMatch(/appearance-plus-tag[\s\S]{0,200}name="lock-closed"/);
    expect(src).toMatch(/appearance-reset[\s\S]{0,400}name="refresh"/);
    expect((src.match(/edgeColor=\{glass\.line\}/g) ?? []).length).toBe(2);
    expect(src).toContain("sliderValue: { fontSize: 15, lineHeight: 22, fontWeight: '500', fontVariant: ['tabular-nums'] }");
    expect(src).toContain('reset: { marginTop: 12, height: 44, borderRadius: 22');
    expect(src).toContain('card: { marginTop: 16, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14, borderRadius: 28 }');
    expect(slider).toContain('const ROW_H = 34;');
    expect(slider).toContain('hitSlop({ top: HIT_SLOP_V, bottom: HIT_SLOP_V })');
  });
  it('ползунок: заперт без Plus (Pressable вместо жеста), доступность adjustable', () => {
    expect(slider).toContain('locked ? <Pressable');
    expect(slider).toContain('accessibilityRole="adjustable"');
    expect(slider).toContain('activeOffsetX([-4, 4])');
  });
});
