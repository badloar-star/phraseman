// зачем (Темы 25.10, docs/work/zones-contrast-2026-10-25.md; координатор: «чини сам»): четыре места Карточек и Друзей красили текст или
// значок не парой темы — значок микрофона #07110A на заливке акцента (до 1,13), подпись плашки лимита secondary на hairlineSoft (до 3,88),
// неактивная «Создать набор» secondary на buttonFill (до 2,67), молния ctaFillInk на accentGraphic (2,98). Сторож: новые пары держат порог
// во всех 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум, а код берёт именно их.
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

const src = (rel: string): string => readFileSync(join(__dirname, '..', rel), 'utf8');
const k = (a: string, b: string): number => paletteContrast(a.slice(0, 7), b.slice(0, 7));

describe('Карточки и Друзья: пары темы вместо постоянных цветов (25.10)', () => {
  it('код берёт новые пары', () => {
    const mic = src('app/flashcards/SpeakHoldButton.tsx');
    expect(mic).not.toMatch(/'#07110A'/);
    expect(mic).toContain('colorContrast(g.ctaInk, accent) >= colorContrast(g.accentInk, accent) ? g.ctaInk : g.accentInk');
    expect(mic).toContain('allowance.colors.spentInk : iconInk}');
    const gallery = src('app/flashcards/CollectionGalleryView.tsx');
    expect(gallery).toContain('legibleOn(g.secondary, g.text, [flattenOver(g.hairlineSoft, screen), flattenOver(g.hairlineSoft, flattenOver(g.opaqueCard, screen))], 4.55)');
    expect(gallery).toContain('<Text style={[styles.limitSub, { color: limitSubInk }]}>');
    const list = src('app/flashcards/CollectionListView.tsx');
    expect(list).toContain('backgroundColor: canCreatePack ? g.cta : g.buttonFillDisabled');
    expect(list).toContain('color: canCreatePack ? g.ctaInk : g.buttonInkDisabled');
    const marker = src('components/friends_together/FriendEventMarker.tsx');
    expect(marker).toContain('<View style={[styles.flash, { backgroundColor: g.accent, borderColor: g.opaqueCard }]}><Ionicons name="flash" size={11} color={g.accentInk} /></View>');
  });

  it('новые пары держат порог во всех 174 сочетаниях', () => {
    const bad: string[] = [];
    let n = 0;
    for (const appearance of ['dark', 'light'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      const where = `${appearance}/${id}/${level}`;
      n++;
      // микрофон: заливка в плеере урока — cta; на accent выбор тот же
      for (const fill of [g.cta, g.accent]) {
        const ink = k(g.ctaInk, fill) >= k(g.accentInk, fill) ? g.ctaInk : g.accentInk;
        if (k(ink, fill) < 3) bad.push(`${where} значок микрофона на ${fill}: ${k(ink, fill).toFixed(2)}`);
      }
      const plates = [flattenOver(g.hairlineSoft, g.bg), flattenOver(g.hairlineSoft, flattenOver(g.opaqueCard, g.bg))];
      const sub = legibleOn(g.secondary, g.text, plates, 4.55);
      for (const p of plates) if (k(sub, p) < 4.5) bad.push(`${where} подпись лимита на ${p}: ${k(sub, p).toFixed(2)}`);
      if (k(g.buttonInkDisabled, g.buttonFillDisabled) < 4.5) bad.push(`${where} неактивная «Создать набор»: ${k(g.buttonInkDisabled, g.buttonFillDisabled).toFixed(2)}`);
      if (k(g.accentInk, g.accent) < 3) bad.push(`${where} молния: ${k(g.accentInk, g.accent).toFixed(2)}`);
    }
    expect(n).toBe(174);
    expect(bad).toEqual([]);
  });
});
