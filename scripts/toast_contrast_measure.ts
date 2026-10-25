// Запуск: npx tsx scripts/toast_contrast_measure.ts > out.md
// зачем (координатор 25.10): тосты и всплывашки по всему приложению во всех 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум.
// Энергия («последняя», «восстановилась»), награды, ошибки сети, «сохранено», подсказки урока, BillingIssue и StreakRisk идут ОДНИМ
// компонентом ActionToast (событие action_toast): тип тоста меняет значок, а не цвета — поэтому мерим две формы этого компонента
// (карточка и строка сверху top_line) плюс отдельные всплывашки: тост медали (medalToastStyleFromTokens) и снекбар удаления Карточек.
// Тексты станут длиннее: у ActionToast нет numberOfLines, карточка растёт по высоте, а её градиент растягивается на всю высоту —
// подложка под второй строкой лежит между теми же двумя краями. Поэтому «две строки» = худший из краёв градиента, его и меряем.
// Пороги: текст 4,5 (сообщения 13–16, мелкий текст — без поблажки крупного), значки 3,0.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { medalToastStyleFromTokens } from '../components/medalToastThemeStylesFromTokens';

type G = ReturnType<typeof liquidGlassTokens>;
const SRC = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
for (const [file, line] of [
  ['components/ActionToast.tsx', 'cardColors: [glass.opaqueCard, glass.opaqueControl, glass.opaqueControl] as [string, string, string],'],
  ['components/ActionToast.tsx', 'accentSoft: glass.selected,'],
  ['components/ActionToast.tsx', 'title: glass.text,'],
  ['components/ActionToast.tsx', 'closeBg: glass.selected,'],
  ['components/ActionToast.tsx', 'const bloomStyle = useAnimatedStyle(() => ({ opacity: bloom.value * 0.5 }));'],
  ['components/ActionToast.tsx', "style={[styles.line, { backgroundColor: actionToastGlass.opaqueControl,"],
  ['components/ActionToast.tsx', "<View style={[styles.lineTile, { backgroundColor: actionToastGlass.opaqueCard }]}>"],
  ['components/ActionToast.tsx', "lineCopy: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, fontWeight: '700' },"],
  ['app/flashcards/CollectionListView.tsx', 'backgroundColor: g.opaqueControl,'],
  ['app/flashcards/CollectionListView.tsx', "<Text style={{ color: g.ctaFillInk, fontSize: 16, lineHeight: 20, fontWeight: '600' }}>"],
] as const) if (!SRC(file).includes(line)) throw new Error(`исходник изменился: в ${file} нет «${line}» — обнови модель в этом скрипте`);

const MEDAL = SRC('components/MedalToast.tsx');
// зачем: подложки медали — карточка-градиент + аура и текстура акцента; где они лежат, читаем из MedalToast, чтобы не придумывать
if (!MEDAL.includes('medalToastStyleFromTokens(glassTokens)')) throw new Error('MedalToast больше не строит стиль из токенов — обнови модель медали');

const alpha = (c: string, a: number): string => `${c.slice(0, 7)}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
const screen = (g: G): string => flattenOver(g.bg, '#000000');
const edges = (g: G): string[] => [flattenOver(g.opaqueCard, screen(g)), flattenOver(g.opaqueControl, screen(g))];
// награда: светлая подложка selected с прозрачностью до 0,5 поверх карточки (bloom) — меряем и без неё, и на пике
const rewardEdges = (g: G): string[] => edges(g).flatMap((e) => [e, flattenOver(alpha(g.selected, Math.min(1, (parseInt(g.selected.slice(7, 9) || 'ff', 16) / 255) * 0.5)), e)]);
const closeBtn = (g: G): string[] => edges(g).map((e) => flattenOver(g.selected, e));
// медаль: карточка opaqueControl → opaqueCard, аура accent 10/14 %, текстура accent 5 % × 0,4/0,52 — всё поверх
const medalEdges = (g: G): string[] => {
  const m = medalToastStyleFromTokens(g);
  return m.cardBgColors.map((c) => {
    let b = flattenOver(c, screen(g));
    b = flattenOver(m.auraColor, b);
    b = flattenOver(alpha(m.textureColor, (parseInt(m.textureColor.slice(7, 9) || 'ff', 16) / 255) * m.textureOpacity), b);
    return b;
  });
};
const tierAccents = (g: G): string[] => Object.values(medalToastStyleFromTokens(g).tierAccents);

type Role = { id: string; area: string; what: string; pair: string; min: number; fn: (g: G) => [string[], string[]] };
const ROLES: Role[] = [
  // ── ActionToast, карточка (по умолчанию) ──
  { id: 'T1', area: 'Тост-карточка', what: 'Сообщение (16, одна или несколько строк) — сеть, «сохранено», подсказка, энергия', pair: '`text` на градиенте opaqueCard → opaqueControl', min: 4.5, fn: (g) => [[g.text], edges(g)] },
  { id: 'T2', area: 'Тост-карточка', what: 'Значок тона', pair: '`text` на том же градиенте', min: 3, fn: (g) => [[g.text], edges(g)] },
  { id: 'T3', area: 'Тост-карточка', what: 'Награда: сообщение на вспышке (selected × 0,5)', pair: '`text` на градиенте + selected', min: 4.5, fn: (g) => [[g.text], rewardEdges(g)] },
  { id: 'T4', area: 'Тост-карточка', what: 'Кнопка действия («Повторить», 13)', pair: '`text` на selected поверх градиента', min: 4.5, fn: (g) => [[g.text], closeBtn(g)] },
  // ── ActionToast, строка сверху (top_line: энергия и сквозные) ──
  { id: 'L1', area: 'Строка сверху', what: '«Последняя энергия», «Энергия восстановилась» (13 жирный)', pair: '`text` на opaqueControl', min: 4.5, fn: (g) => [[g.text], [flattenOver(g.opaqueControl, screen(g))]] },
  { id: 'L2', area: 'Строка сверху', what: 'Значок на плитке', pair: '`text` на opaqueCard', min: 3, fn: (g) => [[g.text], [flattenOver(g.opaqueCard, screen(g))]] },
  // ── тост медали ──
  { id: 'M1', area: 'Тост медали', what: 'Название медали', pair: '`text` на карточке + аура + текстура', min: 4.5, fn: (g) => [[g.text], medalEdges(g)] },
  { id: 'M2', area: 'Тост медали', what: 'Подпись («Ступень 2», описание)', pair: '`secondary` на той же подложке', min: 4.5, fn: (g) => [[g.secondary], medalEdges(g)] },
  { id: 'M3', area: 'Тост медали', what: 'Подпись ступени без повышения (badgeDownColor, текст)', pair: '`accentText` на той же подложке', min: 4.5, fn: (g) => [[g.accentText], medalEdges(g)] },
  { id: 'M4', area: 'Тост медали', what: 'Подпись ступени при повышении — текст цветом бронзы / серебра / золота', pair: 'tierAccents на той же подложке', min: 4.5, fn: (g) => [tierAccents(g), medalEdges(g)] },
  // зачем: замены только из токенов — тот же цвет, доведённый legibleOn к `text` по обоим краям подложки медали (как paywallPlanRowPaint)
  { id: 'M2*', area: 'Тост медали', what: 'подпись после доводки (замена)', pair: 'legibleOn(secondary → text, края медали, 4.55)', min: 4.5, fn: (g) => [[legibleOn(g.secondary, g.text, medalEdges(g), 4.55)], medalEdges(g)] },
  { id: 'M3*', area: 'Тост медали', what: 'подпись ступени без повышения после доводки (замена)', pair: 'legibleOn(accentText → text, края медали, 4.55)', min: 4.5, fn: (g) => [[legibleOn(g.accentText, g.text, medalEdges(g), 4.55)], medalEdges(g)] },
  { id: 'M4*', area: 'Тост медали', what: 'подпись ступени при повышении после доводки (замена)', pair: 'legibleOn(tierAccent → text, края медали, 4.55)', min: 4.5, fn: (g) => [tierAccents(g).map((c) => legibleOn(c, g.text, medalEdges(g), 4.55)), medalEdges(g)] },
  // ── снекбар удаления Карточек ──
  { id: 'C1', area: 'Снекбар Карточек', what: '«Удалено» (16) и значок корзины', pair: '`text` на opaqueControl', min: 4.5, fn: (g) => [[g.text], [flattenOver(g.opaqueControl, screen(g))]] },
  { id: 'C2', area: 'Снекбар Карточек', what: 'Кнопка «Вернуть»: подпись', pair: '`ctaFillInk` на ctaFill', min: 4.5, fn: (g) => [[g.ctaFillInk], [g.ctaFill]] },
  { id: 'C3', area: 'Снекбар Карточек', what: 'Кнопка «Вернуть» видна на снекбаре', pair: '`ctaFill` на opaqueControl', min: 3, fn: (g) => [[g.ctaFill], [flattenOver(g.opaqueControl, screen(g))]] },
];
type Hit = { role: Role; theme: string; app: string; level: string; v: number };
const hits: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level, appearance: app } as never);
  for (const r of ROLES) {
    const [fgs, bgs] = r.fn(g);
    hits.push({ role: r, theme: id, app, level, v: Math.min(...fgs.flatMap((fg) => bgs.map((b) => contrastRatio(flattenOver(fg, b), b)))) });
  }
}
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');
console.log('| № | Где | Элемент | Пара | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of ROLES) {
  const hs = hits.filter((h) => h.role === r); const w = hs.reduce((a, b) => (b.v < a.v ? b : a)); const n = hs.filter((h) => h.v < r.min).length;
  console.log(`| ${r.id} | ${r.area} | ${r.what} | ${r.pair} | ${f2(r.min)} | ${f2(w.v)} | ${w.theme} · ${ap(w.app)} · ${w.level} | ${n ? `**${n} из ${hs.length}**` : `0 из ${hs.length}`} |`);
}
console.log('\nНАРУШЕНИЯ');
for (const r of ROLES) { const b = hits.filter((h) => h.role === r && h.v < r.min); if (b.length) console.log(`${r.id}: ${b.length} — ${b.slice(0, 24).map((h) => `${h.theme}/${ap(h.app)}/${h.level} ${f2(h.v)}`).join('; ')}`); }
console.log('\nВСЕГО', hits.length, 'пар, нарушений', hits.filter((h) => h.v < h.role.min).length);
