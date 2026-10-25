// Запуск: npx tsx scripts/zone_contrast_manual_pairs.ts
// зачем (координатор 25.10, зоны Настройки / Карточки / Друзья): пары, где подложку автомат zone_contrast_measure не нашёл, — подложка найдена по коду вручную; плюс замены.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
type G = ReturnType<typeof liquidGlassTokens>;
const scr = (g: G) => flattenOver(g.bg, '#000000'); const card = (g: G) => flattenOver(g.opaqueCard, scr(g));
const P: [string, number, (g: G) => [string, string[]]][] = [
  ['Карточки CollectionListView:775 «Создать набор» недоступно: secondary на buttonFill', 4.5, (g) => [g.secondary, [flattenOver(g.buttonFill, scr(g)), flattenOver(g.buttonFill, card(g))]]],
  ['Карточки CollectionGalleryView:255 плашка лимита: secondary на hairlineSoft', 4.5, (g) => [g.secondary, [flattenOver(g.hairlineSoft, scr(g)), flattenOver(g.hairlineSoft, card(g))]]],
  ['  замена: text на hairlineSoft', 4.5, (g) => [g.text, [flattenOver(g.hairlineSoft, scr(g)), flattenOver(g.hairlineSoft, card(g))]]],
  ['  замена: legibleOn(secondary → text) на hairlineSoft', 4.5, (g) => { const s = [flattenOver(g.hairlineSoft, scr(g)), flattenOver(g.hairlineSoft, card(g))]; return [legibleOn(g.secondary, g.text, s, 4.55), s]; }],
  ['  замена: CollectionListView «Создать набор» недоступно — buttonInkDisabled на buttonFillDisabled', 4.5, (g) => [g.buttonInkDisabled, [g.buttonFillDisabled]]],
  ['Карточки SpeakHoldButton:197 значок микрофона #07110A на accent', 3, (g) => ['#07110A', [g.accent]]],
  ['  замена: accentInk на accent', 3, (g) => [g.accentInk, [g.accent]]],
  ['Друзья FriendEventMarker:77 ctaFillInk на accentGraphic (вспышка)', 3, (g) => [g.ctaFillInk, [g.accentGraphic]]],
  ['  замена: accentInk на accent', 3, (g) => [g.accentInk, [g.accent]]],
];
for (const [name, thr, fn] of P) {
  let min = 99, bad = 0, w = '';
  for (const app of ['light', 'dark']) for (const level of ['calm', 'accent', 'max']) for (const id of LIQUID_GLASS_THEME_IDS) {
    const g = liquidGlassTokens(id, { level, appearance: app } as never); const [fg, bgs] = fn(g);
    const v = Math.min(...bgs.map((b) => contrastRatio(flattenOver(fg, b), b))); if (v < thr) bad++; if (v < min) { min = v; w = `${id}/${app}/${level}`; }
  }
  console.log(`${name} — порог ${thr}, минимум ${min.toFixed(2)} (${w}), нарушений ${bad} из 174`);
}
