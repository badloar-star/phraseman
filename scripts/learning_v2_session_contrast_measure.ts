// Запуск: npx tsx scripts/learning_v2_session_contrast_measure.ts > out.md
// зачем (координатор 25.10): контраст экранов занятия Learning V2 во ВСЕХ темах — вступление «Смысл / Схема / Ловушка» (роли цветов),
// задания (сборка фразы, выбор, «Послушай и выбери», «Вставь слово», «Найди пары», «Скажи вслух»), плашки «Верно / Неверно»,
// панель разбора, карточка нового слова, подвал и итог занятия V2DoneScreen. 29 тем × светлая/тёмная × Спокойно/Акцент/Максимум.
// Пары «цвет / фон» — как в коде; полупрозрачные заливки сводятся на подложку. Порог: текст 4,5, графика 3,0.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, type LiquidGlassThemeId } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { introTextRoles } from '../constants/liquidGlassIntroTextRoles';
import { semanticInk } from '../constants/liquidGlassSemanticInk';
import { MODE_FEEDBACK_ART, feedbackInkSoftForLight } from '../constants/learningV2ModeFeedbackPalette';
import { lv2TaskTokens } from '../components/learning-v2/learning_v2_task_theme_tokens';

type G = ReturnType<typeof liquidGlassTokens>;
// копии формул, чьи модули тянут React Native; скрипт падает, если исходник изменился
const SRC = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
for (const [file, line] of [
  ['components/learning-v2/LearningV2Glass.tsx', 'goodFill: lv2Alpha(g.good, 0.18),'],
  ['components/learning-v2/LearningV2Glass.tsx', 'badFill: lv2Alpha(g.bad, 0.18),'],
  ['components/learning-v2/LearningV2Glass.tsx', 'const ink = ok ? g.good : bad ? g.bad : g.text;'],
  ['components/learning-v2/learning_v2_task_layout_tokens.ts', "? { fill: 'rgba(190,118,28,0.12)', edge: 'rgba(190,118,28,0.45)' }"],
  ['components/learning-v2/learning_v2_task_layout_tokens.ts', ": { fill: 'rgba(230,160,60,0.14)', edge: 'rgba(230,160,60,0.45)' };"],
  ['components/learning-v2/learning_v2_task_layout_tokens.ts', "if (verdict === 'ok') return { backgroundColor: g.goodSoft, color: semanticInk(g).goodText,"],
  ['components/learning-v2/learning_v2_task_layout_tokens.ts', 'return { backgroundColor: ok ? g.goodSoft : lv2TaskAmber(g).fill, titleColor: ok ? g.good : g.text, bodyColor: g.secondary };'],
  ['modules/learning-v2/modes/mode_router_v1.tsx', 'ink={g.text} inkSoft={g.isLight ? feedbackInkSoftForLight(g) : g.text}'],
  ['modules/learning-v2/modes/speed_match_mode_v1.tsx', '<Text style={[sx.timerText, { color: timerLow ? g.bad : g.text }]}>'],
] as const) if (!SRC(file).includes(line)) throw new Error(`исходник изменился: в ${file} нет «${line}» — обнови копию в этом скрипте`);
const alpha = (hex: string, a: number): string => `${hex.slice(0, 7)}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
const amber = (g: G): string => (g.isLight ? 'rgba(190,118,28,0.12)' : 'rgba(230,160,60,0.14)');
const scr = (g: G): string => flattenOver(g.bg, '#000000');
const card = (g: G): string => flattenOver(g.opaqueCard, scr(g));
const over = (top: string, under: string): string => flattenOver(top, under);
const task = (g: G): ReturnType<typeof lv2TaskTokens> => lv2TaskTokens(g as never);

type Ctx = { g: G; id: LiquidGlassThemeId; level: 'calm' | 'accent' | 'max'; app: 'light' | 'dark' };
type Role = { id: string; area: string; what: string; pair: string; min: 4.5 | 3; fn: (c: Ctx) => [string, string[]] };
const tints = (g: G): string[] => [over(MODE_FEEDBACK_ART.correctTint, scr(g)), over(MODE_FEEDBACK_ART.wrongTint, scr(g)), over(MODE_FEEDBACK_ART.correctTint, card(g)), over(MODE_FEEDBACK_ART.wrongTint, card(g))];
const ROLES: Role[] = [
  { id: 'L1', area: 'Вступление', what: 'Английский (langText) на карточке и фоне', pair: 'introTextRoles.langText', min: 4.5, fn: ({ g, id, level, app }) => [introTextRoles(id, { level, appearance: app }).langText, [card(g), scr(g)]] },
  { id: 'L2', area: 'Вступление', what: 'Частица на подложке accentSoft', pair: 'introTextRoles.particle на particleSoft', min: 4.5, fn: ({ g, id, level, app }) => { const r = introTextRoles(id, { level, appearance: app }); return [r.particle, [over(r.particleSoft, card(g)), over(r.particleSoft, scr(g))]]; } },
  { id: 'L3', area: 'Вступление', what: 'Перевод (gloss)', pair: 'introTextRoles.gloss', min: 4.5, fn: ({ g, id, level, app }) => [introTextRoles(id, { level, appearance: app }).gloss, [card(g), scr(g)]] },
  { id: 'L4', area: 'Задание', what: 'Ситуация: надзаголовок на акценте 9 % поверх карточки', pair: '`secondary` на accentWash9', min: 4.5, fn: ({ g }) => [g.secondary, [over(task(g).accentWash9, card(g))]] },
  { id: 'L5', area: 'Задание', what: 'Ситуация: текст на акценте 9 % поверх карточки', pair: '`text` на accentWash9', min: 4.5, fn: ({ g }) => [g.text, [over(task(g).accentWash9, card(g))]] },
  { id: 'L6', area: 'Задание', what: 'Значок задания на плитке «текст 9 %»', pair: '`text` на text 9 % поверх фона', min: 3, fn: ({ g }) => [g.text, [over(alpha(g.text, 0.09), scr(g))]] },
  { id: 'L7', area: 'Плитки ответов', what: 'Нейтральная плитка', pair: '`text` на opaqueCard', min: 4.5, fn: ({ g }) => [g.text, [card(g)]] },
  { id: 'L8', area: 'Плитки ответов', what: 'Выбранная плитка', pair: '`text` на accentSoft', min: 4.5, fn: ({ g }) => [g.text, [over(g.accentSoft, scr(g))]] },
  { id: 'L9', area: 'Плитки ответов', what: 'Верная плитка', pair: 'semanticInk.goodText на goodSoft', min: 4.5, fn: ({ g }) => [semanticInk(g).goodText, [over(g.goodSoft, scr(g))]] },
  { id: 'L10', area: 'Плитки ответов', what: 'Неверная плитка (тёплый тон, вне темы)', pair: '`text` на amber', min: 4.5, fn: ({ g }) => [g.text, [over(amber(g), scr(g))]] },
  { id: 'L11', area: 'Блок «Правильно»', what: 'Верно: заголовок', pair: '`good` (сырой) на goodSoft', min: 4.5, fn: ({ g }) => [g.good, [over(g.goodSoft, scr(g)), over(g.goodSoft, card(g))]] },
  { id: 'L12', area: 'Блок «Правильно»', what: 'Верно / неверно: пояснение', pair: '`secondary` на goodSoft / amber', min: 4.5, fn: ({ g }) => [g.secondary, [over(g.goodSoft, scr(g)), over(amber(g), scr(g))]] },
  { id: 'L13', area: 'Блок «Правильно»', what: 'Неверно: заголовок', pair: '`text` на amber', min: 4.5, fn: ({ g }) => [g.text, [over(amber(g), scr(g)), over(amber(g), card(g))]] },
  { id: 'L14', area: 'Чипы', what: 'Обычный чип', pair: '`text` на controlSoft', min: 4.5, fn: ({ g }) => [g.text, [over(task(g).controlSoft, scr(g))]] },
  { id: 'L15', area: 'Чипы', what: 'Выбранный чип', pair: '`text` на accentWash14', min: 4.5, fn: ({ g }) => [g.text, [over(task(g).accentWash14, scr(g))]] },
  { id: 'L16', area: 'Чипы', what: 'Верный чип', pair: '`good` (сырой) на goodFill (good 18 %)', min: 4.5, fn: ({ g }) => [g.good, [over(alpha(g.good, 0.18), scr(g))]] },
  { id: 'L17', area: 'Чипы', what: 'Неверный чип', pair: '`bad` (сырой) на badFill (bad 18 %)', min: 4.5, fn: ({ g }) => [g.bad, [over(alpha(g.bad, 0.18), scr(g))]] },
  { id: 'L18', area: 'Сборка фразы', what: 'Подсказка в пустой строке ответа', pair: '`mutedText` на фоне / карточке', min: 4.5, fn: ({ g }) => [g.mutedText, [scr(g), card(g)]] },
  { id: 'L19', area: 'Сборка фразы', what: 'Кнопка звука: значок', pair: '`text` на controlSoft', min: 3, fn: ({ g }) => [g.text, [over(task(g).controlSoft, scr(g))]] },
  { id: 'L20', area: '«Найди пары»', what: 'Таймер на исходе', pair: '`bad` (сырой) на controlSoft', min: 4.5, fn: ({ g }) => [g.bad, [over(task(g).controlSoft, scr(g))]] },
  { id: 'L21', area: '«Найди пары»', what: 'Кнопка «Ещё раз» после таймаута', pair: '`accentInk` на accent', min: 4.5, fn: ({ g }) => [g.accentInk, [g.accent]] },
  { id: 'L22', area: 'Панель разбора', what: 'Основной текст на зелёном/жёлтом тинте 12 % (вне темы)', pair: '`text` на correctTint / wrongTint', min: 4.5, fn: ({ g }) => [g.text, tints(g)] },
  { id: 'L23', area: 'Панель разбора', what: 'Пояснение (inkSoft)', pair: 'secondary или text', min: 4.5, fn: ({ g }) => [g.isLight ? feedbackInkSoftForLight(g) : g.text, tints(g)] },
  { id: 'L24', area: 'Кнопка', what: 'Главная кнопка задания `.tcta` (цвет карточки на цвете текста)', pair: 'opaqueCard на text', min: 4.5, fn: ({ g }) => [task(g).ctaInk, [task(g).ctaFill]] },
  { id: 'L25', area: 'Подвал', what: 'Текст на подвале footerSolid (светлая — постоянный #EEEFFA)', pair: '`secondary` на footerSolid', min: 4.5, fn: ({ g }) => [g.secondary, [over(task(g).footerSolid, scr(g))]] },
  { id: 'L26', area: 'Новое слово', what: 'Белый текст на карточке слова (акцент + 60/80 % чёрного)', pair: '#FFFFFF на wordCardGradient', min: 4.5, fn: ({ g }) => ['#FFFFFF', [...task(g).wordCardGradient.colors]] },
  { id: 'L27', area: 'Итог занятия', what: 'Заголовок и числа', pair: '`text` на bg / plateFillFrom', min: 4.5, fn: ({ g }) => [g.text, [scr(g), over(g.plateFillFrom, scr(g))]] },
  { id: 'L28', area: 'Итог занятия', what: 'Подписи', pair: '`secondary` на bg / plateFillFrom / opaqueControl', min: 4.5, fn: ({ g }) => [g.secondary, [scr(g), over(g.plateFillFrom, scr(g)), over(g.opaqueControl, scr(g))]] },
  { id: 'L29', area: 'Итог занятия', what: 'Приглушённые подписи', pair: '`mutedText` на bg / plateFillFrom', min: 4.5, fn: ({ g }) => [g.mutedText, [scr(g), over(g.plateFillFrom, scr(g))]] },
  { id: 'L30', area: 'Итог занятия', what: 'Кнопка «Дальше»', pair: '`ctaFillInk` на ctaFill', min: 4.5, fn: ({ g }) => [g.ctaFillInk, [g.ctaFill]] },
  { id: 'L31', area: 'Итог занятия', what: 'Вторичная кнопка', pair: '`text` на buttonFill', min: 4.5, fn: ({ g }) => [g.text, [over(g.buttonFill, scr(g))]] },
];
type Hit = { role: Role; theme: string; app: string; level: string; ratio: number };
const hits: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level, appearance: app } as never);
  for (const r of ROLES) { const [fg, bgs] = r.fn({ g, id, level, app }); hits.push({ role: r, theme: id, app, level, ratio: Math.min(...bgs.map((b) => contrastRatio(flattenOver(fg, b), b))) }); }
}
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');
console.log('| № | Где | Элемент | Пара | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of ROLES) {
  const hs = hits.filter((h) => h.role === r); const w = hs.reduce((a, b) => (b.ratio < a.ratio ? b : a)); const n = hs.filter((h) => h.ratio < r.min).length;
  console.log(`| ${r.id} | ${r.area} | ${r.what} | ${r.pair} | ${f2(r.min)} | ${f2(w.ratio)} | ${w.theme} · ${ap(w.app)} · ${w.level} | ${n ? `**${n} из ${hs.length}**` : `0 из ${hs.length}`} |`);
}
console.log('\nНАРУШЕНИЯ');
for (const r of ROLES) { const b = hits.filter((h) => h.role === r && h.ratio < r.min); if (b.length) console.log(`${r.id}: ${b.length} — ${b.slice(0, 30).map((h) => `${h.theme}/${ap(h.app)}/${h.level} ${f2(h.ratio)}`).join('; ')}`); }
console.log('\nВСЕГО', hits.length, 'пар, нарушений', hits.filter((h) => h.ratio < h.role.min).length);
