// Запуск: npx tsx scripts/cards_dialogs_contrast_measure.ts > out.md
// зачем (координатор 25.10): контраст Карточек (хаб, колода, свайп, «Мои наборы») и Диалогов (хаб, пузыри, подсказки, «Перевести»)
// во ВСЕХ темах: 29 тем × светлая/тёмная × Спокойно/Акцент/Максимум. Пары «цвет / фон» — как в коде экранов; полупрозрачные
// заливки сводятся на свою подложку. Порог: текст 4,5, графика (значки, дорожки) 3,0.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { dialogsHubTokens, dialogsWorldArt } from '../components/dialogs/scene/dialogs_hub_tokens';
import { hexHue } from '../components/learning-v2/season/season_art';

type G = ReturnType<typeof liquidGlassTokens>;
// копии формул экранов (их модули тянут React Native); скрипт падает, если исходник изменился
const SRC = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
for (const [file, line] of [
  ['app/flashcards/CardsHubV2.tsx', 'const stackFill = (g: GlassTokens, a: string, b: string) => [mixDark(a, g.deepBase, 0.45), g.deepBaseAlt, mixDark(b, g.deepBaseAlt, 0.38)] as const;'],
  ['app/flashcards/CardsHubV2.tsx', 'const faceInk = g.isLight ? g.text : g.mediaInk;'],
  ['app/flashcards/CardsHubV2.tsx', "return [glow[0].slice(0, 7), glow[1].slice(0, 7)];"],
  ['components/dialogs/glass/DialogueGlassChat.tsx', '? { backgroundColor: glass.lightTint }'],
  ['components/dialogs/glass/DialogueGlassChat.tsx', 'return colorContrast(glass.ctaInk, tint) >= 4.5 ? glass.ctaInk : glass.bg;'],
  ['components/dialogs/DialogBubbleActions.tsx', 'backgroundColor: options?.active ? t.accentBg : t.bgSurface2,'],
  ['components/dialogs/DialogBubbleActions.tsx', "color={options?.active ? t.accentText : t.textMuted}"],
  ['app/flashcards/CollectionListView.tsx', 'backgroundColor: LV2_BAD,'],
  ['components/learning-v2/LearningV2Glass.tsx', "export const LV2_BAD = '#F2766B';"],
  ['components/dialogs/glass/DialogueGlassSessionParts.tsx', 'style={[styles.fixButtonText, { color: glass.secondary }]}'],
] as const) if (!SRC(file).includes(line)) throw new Error(`исходник изменился: в ${file} нет «${line}» — обнови копию в этом скрипте`);
const mixDark = (hex: string, base: string, t: number): string => {
  const c = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = c(hex.length >= 7 ? hex : '#888888'); const b = c(base);
  return `#${a.map((v, i) => Math.round(v * t + b[i]! * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
};
const themePair = (g: G): [string, string] => {
  const glow = g.bgGlow;
  if (glow && glow[0] && glow[1] && glow[0].slice(1, 7) !== '000000' && glow[1].slice(1, 7) !== '000000') return [glow[0].slice(0, 7), glow[1].slice(0, 7)];
  const gr = g.accentGradient; if (gr && gr.length >= 2) return [gr[0]!, gr[gr.length - 1]!];
  return [g.accentGraphic, g.accentBorder];
};
const bubbleInk = (g: G): string => { const tint = /^#[0-9a-f]{8}$/i.test(g.lightTint) ? g.lightTint.slice(0, 7) : g.lightTint; return contrastRatio(g.ctaInk, tint) >= 4.5 ? g.ctaInk : g.bg; };

type Role = { id: string; area: string; what: string; pair: string; min: 4.5 | 3; fn: (g: G) => [string, string[]] };
const scr = (g: G): string => flattenOver(g.bg, '#000000');
const on = (g: G, surface: string): string => flattenOver(surface, scr(g));
const ROLES: Role[] = [
  // ── Карточки ──
  { id: 'C1', area: 'Карточки', what: 'Хаб: заголовок и слово на фоне', pair: '`text` на bg', min: 4.5, fn: (g) => [g.text, [scr(g)]] },
  { id: 'C2', area: 'Карточки', what: 'Хаб: подзаголовок, счётчики на фоне', pair: '`secondary` на bg', min: 4.5, fn: (g) => [g.secondary, [scr(g)]] },
  { id: 'C3', area: 'Карточки', what: 'Хаб: стопка — слово и транскрипция на заливке стопки', pair: 'text (светлая) / mediaInk (тёмная) на stackFill', min: 4.5, fn: (g) => { const [a, b] = themePair(g); return [g.isLight ? g.text : g.mediaInk, [mixDark(a, g.deepBase, 0.45), g.deepBaseAlt, mixDark(b, g.deepBaseAlt, 0.38)]]; } },
  { id: 'C4', area: 'Карточки', what: 'Плитки категорий и наборов: подпись и счётчик', pair: '`text` / `secondary` на opaqueControl', min: 4.5, fn: (g) => [g.secondary, [on(g, g.opaqueControl)]] },
  { id: 'C5', area: 'Карточки', what: 'Плашки и строки списка: текст', pair: '`text` на plateFillFrom', min: 4.5, fn: (g) => [g.text, [on(g, g.plateFillFrom)]] },
  { id: 'C6', area: 'Карточки', what: 'Строки списка: вторичный и приглушённый', pair: '`mutedText` на plateFillFrom / opaqueCard', min: 4.5, fn: (g) => [g.mutedText, [on(g, g.plateFillFrom), on(g, g.opaqueCard)]] },
  { id: 'C7', area: 'Карточки', what: 'Кнопка «Тренировать»: подпись', pair: '`ctaFillInk` на ctaFill', min: 4.5, fn: (g) => [g.ctaFillInk, [g.ctaFill]] },
  { id: 'C8', area: 'Карточки', what: 'Вторичные кнопки: подпись', pair: '`text` на buttonFill', min: 4.5, fn: (g) => [g.text, [on(g, g.buttonFill)]] },
  { id: 'C9', area: 'Карточки', what: 'Выбранный фильтр/чип: текст', pair: '`text` на selected поверх bg', min: 4.5, fn: (g) => [g.text, [on(g, g.selected)]] },
  { id: 'C10', area: 'Карточки', what: 'Шторка выбора колоды/режима: текст', pair: '`secondary` на opaqueSheet', min: 4.5, fn: (g) => [g.secondary, [on(g, g.opaqueSheet)]] },
  { id: 'C11', area: 'Карточки', what: 'Акцентная подпись на карточке', pair: '`accentText` на opaqueCard', min: 4.5, fn: (g) => [g.accentText, [on(g, g.opaqueCard)]] },
  { id: 'C12', area: 'Карточки', what: 'Свайп «удалить»: белая подпись на красном (сейчас постоянный LV2_BAD #F2766B)', pair: '`mediaInk` на LV2_BAD', min: 4.5, fn: (g) => [g.mediaInk, ['#F2766B']] },
  { id: 'C12*', area: 'Карточки', what: 'ЗАМЕНА: свайп «удалить» — пара темы dangerInk на dangerFill', pair: '`dangerInk` на `dangerFill`', min: 4.5, fn: (g) => [g.dangerInk, [g.dangerFill]] },
  { id: 'C13*', area: 'Карточки', what: 'ЗАМЕНА: длительность и кнопка видео на scrimStrong поверх белого кадра', pair: '`mediaInk` на scrimStrong поверх белого', min: 4.5, fn: (g) => [g.mediaInk, [flattenOver(g.scrimStrong, '#FFFFFF')]] },
  { id: 'C13', area: 'Карточки', what: 'Видео: длительность и кнопка на mediaScrim (худший случай — светлый кадр)', pair: '`mediaInk` на mediaScrim поверх белого', min: 4.5, fn: (g) => [g.mediaInk, [flattenOver(g.mediaScrim, '#FFFFFF')]] },
  // ── Диалоги: хаб ──
  { id: 'D1', area: 'Диалоги, хаб', what: 'Плитка: подпись / счётчик', pair: 'tile.label / tile.count на tile.bg', min: 4.5, fn: (g) => { const t = dialogsHubTokens(g); return [t.tile.count, [on(g, t.tile.bg)]]; } },
  { id: 'D2', area: 'Диалоги, хаб', what: 'Плитка: значок', pair: 'tile.icon на tile.bg', min: 3, fn: (g) => { const t = dialogsHubTokens(g); return [t.tile.icon, [on(g, t.tile.bg)]]; } },
  { id: 'D3', area: 'Диалоги, хаб', what: 'Значок Plus', pair: 'plus.ink на plus.bg', min: 4.5, fn: (g) => { const t = dialogsHubTokens(g); return [t.plus.ink, [t.plus.bg]]; } },
  { id: 'D4', area: 'Диалоги, хаб', what: 'Переключатель тем: невыбранный пункт', pair: 'pill.idleInk на pill.track', min: 4.5, fn: (g) => { const t = dialogsHubTokens(g); return [t.pill.idleInk, [on(g, t.pill.track)]]; } },
  { id: 'D5', area: 'Диалоги, хаб', what: 'Переключатель тем: выбранный пункт', pair: 'pill.selectedInk на pill.selectedBg', min: 4.5, fn: (g) => { const t = dialogsHubTokens(g); return [t.pill.selectedInk, [t.pill.selectedBg]]; } },
  { id: 'D6', area: 'Диалоги, хаб', what: 'Карточка диалога: подпись (обычная и текущая)', pair: 'card.sub на fill / fillCurrent', min: 4.5, fn: (g) => { const t = dialogsHubTokens(g); return [t.card.sub, [on(g, t.card.fill), on(g, t.card.fillCurrent)]]; } },
  { id: 'D7', area: 'Диалоги, хаб', what: 'Карточка: «пройдено»', pair: 'card.doneInk на fill / fillCurrent', min: 4.5, fn: (g) => { const t = dialogsHubTokens(g); return [t.card.doneInk, [on(g, t.card.fill), on(g, t.card.fillCurrent)]]; } },
  { id: 'D8', area: 'Диалоги, хаб', what: 'Закрытая строка: название и подпись', pair: 'row.lockedTitle на lockedFill', min: 4.5, fn: (g) => { const t = dialogsHubTokens(g); return [t.row.lockedTitle, [on(g, t.row.lockedFill)]]; } },
  { id: 'D9', area: 'Диалоги, хаб', what: 'Чип уровня', pair: 'row.levelInk на row.levelBg', min: 4.5, fn: (g) => { const t = dialogsHubTokens(g); return [t.row.levelInk, [on(g, t.row.levelBg)]]; } },
  { id: 'D10', area: 'Диалоги, хаб', what: 'Плитка мира: заливка прогресса на дорожке', pair: 'worldTile.fill на track поверх tile.bg', min: 3, fn: (g) => { const t = dialogsHubTokens(g); return [t.worldTile.fill, [flattenOver(t.worldTile.track, on(g, t.tile.bg))]]; } },
  { id: 'D11', area: 'Диалоги, хаб', what: 'Плитка мира: белый текст на градиенте мира (4 мира) — пока не используется в экране', pair: '#FFFFFF на from / to / glow 45 %', min: 4.5, fn: (g) => { const h = hexHue(g.accent); const bgs: string[] = []; for (let w = 0; w < 4; w += 1) { const a = dialogsWorldArt(h, w, g.isLight ? 'light' : 'dark'); bgs.push(a.from, a.to, flattenOver(`${a.glow}73`, a.from)); } return ['#FFFFFF', bgs]; } },
  // ── Диалоги: чат ──
  { id: 'D12', area: 'Диалоги, чат', what: 'Пузырь собеседника: текст', pair: '`text` на plateFillFrom', min: 4.5, fn: (g) => [g.text, [on(g, g.plateFillFrom)]] },
  { id: 'D13', area: 'Диалоги, чат', what: 'Пузырь «Вы»: текст (lightTint с прозрачностью поверх фона)', pair: 'ctaInk или bg на lightTint', min: 4.5, fn: (g) => [bubbleInk(g), [on(g, g.lightTint)]] },
  { id: 'D14', area: 'Диалоги, чат', what: 'Имя и отметка под пузырём', pair: '`secondary` на bg', min: 4.5, fn: (g) => [g.secondary, [scr(g)]] },
  { id: 'D15', area: 'Диалоги, чат', what: 'Кнопки «Озвучить / Перевести»: значок', pair: 'secondary на opaqueSheet; accentText на accentSoft', min: 3, fn: (g) => [g.secondary, [on(g, g.opaqueSheet)]] },
  { id: 'D16', area: 'Диалоги, чат', what: '«Перевести» нажато: значок', pair: 'accentText на accentSoft', min: 3, fn: (g) => [g.accentText, [on(g, g.accentSoft)]] },
  { id: 'D17', area: 'Диалоги, чат', what: 'Подсказки «Как сказать»: фраза и смысл', pair: '`text` / `secondary` на opaqueControl', min: 4.5, fn: (g) => [g.secondary, [on(g, g.opaqueControl)]] },
  { id: 'D18', area: 'Диалоги, чат', what: 'Цель: надзаголовок на ступени тона', pair: '`secondary` на text 8 % поверх bg', min: 4.5, fn: (g) => [g.secondary, [flattenOver(`${g.text.slice(0, 7)}14`, scr(g))]] },
  { id: 'D18*', area: 'Диалоги, чат', what: 'ЗАМЕНА: надзаголовок цели — text на ступени тона', pair: '`text` на text 8 % поверх bg', min: 4.5, fn: (g) => [g.text, [flattenOver(`${g.text.slice(0, 7)}14`, scr(g))]] },
  { id: 'D19', area: 'Диалоги, чат', what: 'Кнопка «Исправить»: подпись', pair: '`secondary` на buttonFill', min: 4.5, fn: (g) => [g.secondary, [on(g, g.buttonFill)]] },
  { id: 'D19*', area: 'Диалоги, чат', what: 'ЗАМЕНА: «Исправить» — text на buttonFill (как ответы-кнопки)', pair: '`text` на buttonFill', min: 4.5, fn: (g) => [g.text, [on(g, g.buttonFill)]] },
  { id: 'D20', area: 'Диалоги, чат', what: 'Кнопка микрофона/отправки (живая)', pair: '`ctaInk` на cta', min: 4.5, fn: (g) => [g.ctaInk, [g.cta]] },
];
type Hit = { role: Role; theme: string; app: string; level: string; ratio: number };
const hits: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level, appearance: app } as never);
  for (const r of ROLES) { const [fg, bgs] = r.fn(g); hits.push({ role: r, theme: id, app, level, ratio: Math.min(...bgs.map((b) => contrastRatio(flattenOver(fg, b), b))) }); }
}
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');
console.log('| № | Раздел | Элемент | Пара | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of ROLES) {
  const hs = hits.filter((h) => h.role === r); const w = hs.reduce((a, b) => (b.ratio < a.ratio ? b : a)); const n = hs.filter((h) => h.ratio < r.min).length;
  console.log(`| ${r.id} | ${r.area} | ${r.what} | ${r.pair} | ${f2(r.min)} | ${f2(w.ratio)} | ${w.theme} · ${ap(w.app)} · ${w.level} | ${n ? `**${n} из ${hs.length}**` : `0 из ${hs.length}`} |`);
}
console.log('\nНАРУШЕНИЯ');
for (const r of ROLES) { const b = hits.filter((h) => h.role === r && h.ratio < r.min); if (b.length) console.log(`${r.id}: ${b.length} — ${b.slice(0, 40).map((h) => `${h.theme}/${ap(h.app)}/${h.level} ${f2(h.ratio)}`).join('; ')}`); }
console.log('\nВСЕГО', hits.length, 'пар, нарушений', hits.filter((h) => h.ratio < h.role.min).length);
