// зачем ([BLEND-AUDIT], координатор 18.10, правило владельца «кнопки нигде не сливаются», все темы, светлые и тёмные): расчёт контраста по токенам
// для новинок 17.10: 4 плитки Главной (включая Пик), BackButton, карточка «Продолжить», шторка голосового лимита, поле пар Пика, плитки хаба Карточек.
// Порог: заливка кнопки к фону ≥ 3:1 (графика) или явный тон ≥ 1,5:1 (контейнеры-плашки отделены тенью — считаем только подпись), текст ≥ 4,5:1.
// Общий модуль для теста (tests/blend_1018_audit.test.ts) и отчёта (scripts/blend_1018_report.cjs). «Было» — токены до исправлений 17.10 (before), «стало» — текущие (after). BLEND_WRITE=1 пишет таблицу «тема × элемент × контраст» в docs/phraseman-2.0/evidence/blend_1018.md.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { lowChargeInk } from '../constants/energy_low_ink';
import { streakStageColors } from '../components/streak/moments/streak_stage_colors';
import { dialogueCtaPaint } from '../components/dialogs/glass/dialogue_cta_paint';
import { streakSublineInk } from '../components/streak/moments/streak_subline_ink';
import { feedbackInkSoftForLight } from '../constants/learningV2ModeFeedbackPalette';

type Tok = Record<string, string>;
const parse = (c: string): { rgb: number[]; a: number } => {
  if (c.startsWith('rgba')) {
    const m = c.match(/rgba\(([^)]+)\)/)![1]!.split(',').map((x) => parseFloat(x));
    return { rgb: [m[0]!, m[1]!, m[2]!], a: m[3]! };
  }
  const h = c.replace('#', '');
  return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
};
const over = (top: string, base: number[] | string, alpha?: number): number[] => {
  const t = parse(top);
  const a = alpha ?? t.a;
  const b = typeof base === 'string' ? parse(base).rgb : base;
  return t.rgb.map((v, i) => v * a + b[i]! * (1 - a));
};
const solid = (c: string): number[] => parse(c).rgb;
const lumRgb = (rgb: number[]): number => {
  const c = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: number[], b: number[]): number => {
  const [x, y] = [lumRgb(a), lumRgb(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

// ── хаб Карточек: стопка и значки рисуются НЕ plateGradient, а stackFill/iconGlass (CardsHubV2.tsx:62-87,107): повторяем формулы кода
function mixDarkHex(hex: string, base: string, t: number): number[] {
  const c = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = c(hex.length >= 7 ? hex : '#888888');
  const b = c(base);
  return a.map((v, i) => Math.round(v * t + b[i]! * (1 - t)));
}
function themePairOf(t: Tok & { bgGlow?: unknown; accentGradient?: unknown }): readonly [string, string] {
  const glow = t.bgGlow as readonly string[] | undefined;
  if (glow && glow[0] && glow[1] && glow[0].slice(1, 7) !== '000000' && glow[1].slice(1, 7) !== '000000') return [glow[0].slice(0, 7), glow[1].slice(0, 7)];
  const gr = t.accentGradient as readonly string[] | undefined;
  if (gr && gr.length >= 2) return [gr[0]!, gr[gr.length - 1]!];
  return [t.accentGraphic!, t.accentBorder!];
}
const hexOf = (rgb: number[]): string => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
function stackLayers(t: Tok): number[][] {
  const [a, b] = themePairOf(t);
  const l2 = solid(t.deepBaseAlt!);
  return [mixDarkHex(a, t.deepBase!, 0.5), l2, mixDarkHex(b, hexOf(l2), 0.38)];
}
function iconLayers(t: Tok): number[][] {
  const [a, b] = themePairOf(t);
  return [mixDarkHex(a, t.deepBase!, 0.6), mixDarkHex(b, t.deepBaseAlt!, 0.32)];
}
const faceInkOf = (t: Tok): string => (String(t.isLight) === 'true' ? t.text! : t.mediaInk!);
const worstOver = (fg: string, layers: number[][]): number => Math.min(...layers.map((l) => ratio(solid(fg), l)));

// ── панель обратной связи режимов Learning V2 (modules/learning-v2/modes/mode_feedback_v1.tsx): тинт 12 % поверх страницы или карточки
const FB_TINTS = ['rgba(43, 138, 94, 0.12)', 'rgba(190, 118, 28, 0.12)'] as const; // correctTint / wrongTint
const fbWorst = (fg: string, t: Tok): number => Math.min(...FB_TINTS.flatMap((tint) => [ratio(solid(fg), over(tint, solid(t.bg!))), ratio(solid(fg), over(tint, solid(t.opaqueCard!)))]));

// ── моменты (Шпиль/серия): ореол `.glowspot` (moment_glow_math.ts) — центр accentSoft с итоговой альфой min(собственная, эталон × 0,78); тексты лежат на фоне страницы или странице-верху
const haloOver = (t: Tok, base: string): number[] => {
  const own = parse(t.accentSoft!).a;
  const target = (String(t.isLight) === 'true' ? 0.3 : 0.24) * 0.78;
  return own > 0 ? over(t.accentSoft!, solid(base), Math.min(own, target)) : solid(base);
};
const haloWorst = (fg: string, t: Tok): number => Math.min(...[t.bg!, t.bgTop!].flatMap((base) => [ratio(solid(fg), haloOver(t, base)), ratio(solid(fg), solid(base))]));
const STAGES = [1, 2, 3, 4, 5] as const;
const stageColorsOf = (t: Tok, stage: 1 | 2 | 3 | 4 | 5) => streakStageColors(stage, { themeId: t.themeId!, accentGraphic: t.accentGraphic!, text: t.text!, bg: t.bg!, gold: t.warn! })!;
const PLATE_RGB = [8, 10, 14];
const plateOver = (under: string): number[] => [0, 1, 2].map((i) => PLATE_RGB[i]! * 0.82 + solid(under)[i]! * 0.18);

const TONE = 1.5;
const GRAPHIC = 3;
const TEXT = 4.5;
const plate = (t: Tok): number[] => over(t.plateFillFrom!, solid(t.bg!), 0.5); // плашка Главной: plateFillFrom с альфой 0,5

export type Pair = Readonly<{ element: string; what: string; min: number; /** Зафиксированный пол для известного дефицита (цель — min): сторож краснеет ниже пола. */ floor?: number; after: (t: Tok) => number; before?: (t: Tok) => number }>;
export const PAIRS: readonly Pair[] = [
  // ── 4 плитки Главной (Диалоги / Карточки / Видео / Пик): плашка отделена тенью, проверяем подпись и бейдж места Пика
  { element: 'Главная: плитка', what: 'название к плашке', min: TEXT, after: (t) => ratio(solid(t.text!), plate(t)) },
  { element: 'Главная: плитка Пик', what: 'бейдж места: заливка к плашке', min: GRAPHIC, after: (t) => ratio(solid(t.ctaFill!), plate(t)) },
  { element: 'Главная: плитка Пик', what: 'бейдж места: подпись к заливке', min: TEXT, after: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  // ── BackButton (круг buttonFill, значок text)
  { element: 'BackButton', what: 'круг к странице (тон)', min: TONE, before: (t) => ratio(solid(t.opaqueControl!), solid(t.bg!)), after: (t) => ratio(solid(t.buttonFill!), solid(t.bg!)) },
  { element: 'BackButton', what: 'значок к кругу', min: GRAPHIC, after: (t) => ratio(solid(t.text!), solid(t.buttonFill!)) },
  // ── карточка «Продолжить»
  { element: 'Продолжить', what: 'название к плашке', min: TEXT, after: (t) => ratio(solid(t.text!), plate(t)) },
  { element: 'Продолжить', what: 'дорожка полосы к плашке (тон)', min: TONE, before: (t) => ratio(solid(t.opaqueControl!), plate(t)), after: (t) => ratio(solid(t.buttonFill!), plate(t)) },
  { element: 'Продолжить', what: 'заливка полосы к дорожке', min: GRAPHIC, before: (t) => ratio(solid(t.accentGraphic!), solid(t.opaqueControl!)), after: (t) => ratio(solid(t.accentGraphic!), solid(t.buttonFill!)) },
  { element: 'Продолжить', what: 'плашка на арте: подпись (белый арт)', min: TEXT, before: (t) => ratio(solid(t.text!), over(t.opaqueControl!, [255, 255, 255], 0.5)), after: (t) => ratio(solid(t.text!), over(t.opaqueControl!, [255, 255, 255], 0.9)) },
  { element: 'Продолжить', what: 'плашка на арте: подпись (чёрный арт)', min: TEXT, before: (t) => ratio(solid(t.text!), over(t.opaqueControl!, [0, 0, 0], 0.5)), after: (t) => ratio(solid(t.text!), over(t.opaqueControl!, [0, 0, 0], 0.9)) },
  // ── шторка занятия: круг g.text, значок play — g.opaqueSheet (раньше g.ctaInk)
  { element: 'Шторка занятия', what: 'значок play к кругу', min: GRAPHIC, before: (t) => ratio(solid(t.ctaInk!), solid(t.text!)), after: (t) => ratio(solid(t.opaqueSheet!), solid(t.text!)) },
  // ── шторка голосового лимита
  { element: 'Шторка голоса', what: 'значок микрофона к плитке', min: GRAPHIC, before: (t) => ratio(solid(t.accent!), over(t.accentSoft!, solid(t.opaqueCard!))), after: (t) => ratio(solid(t.accentGraphic!), over(t.accentSoft!, solid(t.opaqueCard!))) },
  { element: 'Шторка голоса', what: 'пилюля счётчика к листу (тон)', min: TONE, before: (t) => ratio(solid(t.opaqueControl!), solid(t.opaqueCard!)), after: (t) => ratio(solid(t.buttonFill!), solid(t.opaqueCard!)) },
  { element: 'Шторка голоса', what: 'точки к пилюле', min: GRAPHIC, before: (t) => ratio(solid(t.accent!), solid(t.opaqueControl!)), after: (t) => ratio(solid(t.accentGraphic!), solid(t.buttonFill!)) },
  { element: 'Шторка голоса', what: 'главная кнопка к листу', min: GRAPHIC, after: (t) => ratio(solid(t.ctaFill!), solid(t.opaqueCard!)) },
  { element: 'Шторка голоса', what: 'подпись главной кнопки', min: TEXT, after: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  // ── поле пар Пика (плитки лежат на странице; обычная — opaqueCard с тенью nested, выбранная — accentGraphic 16 % поверх страницы)
  { element: 'Поле пар', what: 'подпись на обычной плитке', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.opaqueCard!)) },
  { element: 'Поле пар', what: 'подпись на выбранной плитке', min: TEXT, after: (t) => ratio(solid(t.text!), over(t.accentGraphic!, solid(t.bg!), 0.32)) },
  { element: 'Поле пар', what: 'подпись на плитке «неверно»', min: TEXT, after: (t) => ratio(solid(t.text!), over('#F05454', solid(t.bg!), 0.12)) },
  { element: 'Поле пар', what: 'подпись на плитке «верно»', min: TEXT, after: (t) => ratio(solid(t.text!), over('#47C870', solid(t.bg!), 0.12)) },
  { element: 'Поле пар', what: 'выбранная к обычной плитке (тон)', min: TONE, before: (t) => ratio(over(t.accentGraphic!, solid(t.bg!), 0.16), solid(t.opaqueCard!)), after: (t) => ratio(over(t.accentGraphic!, solid(t.bg!), 0.32), solid(t.opaqueCard!)) },
  // ── обратная связь режимов: основной текст (был жёсткий #17332A, стал g.text) и приглушённый (был #355148, стал g.secondary)
  { element: 'Обратная связь режимов', what: 'основной текст к тинту', min: TEXT, before: (t) => fbWorst('#17332A', t), after: (t) => fbWorst(t.text!, t) },
  { element: 'Обратная связь режимов', what: 'приглушённый текст к тинту (светлые — токен вторичного, тёмные — g.text)', min: TEXT, before: (t) => fbWorst('#355148', t), after: (t) => fbWorst(String(t.isLight) === 'true' ? feedbackInkSoftForLight(t as never) : t.text!, t) },
  // ── панель обратной связи V2 без обводки (8c4b052de): отличие панели от страницы держит только тинт 12 % — считаем честно, пол 1,03 (цель 1,5 недостижима тинтом 12 %: решение Макетов — тень или плотнее тинт)
  { element: 'Обратная связь режимов', what: 'панель (тинт 12 %) к странице — тон', min: TONE, floor: 1.02, after: (t) => Math.min(...FB_TINTS.map((tint) => ratio(over(tint, solid(t.bg!)), solid(t.bg!)))) },
  { element: 'Обратная связь режимов', what: '«верно» к «неверно» — различие панелей', min: 1.05, floor: 1.0, after: (t) => ratio(over(FB_TINTS[0], solid(t.bg!)), over(FB_TINTS[1], solid(t.bg!))) },
  // ── хаб Карточек: главная кнопка «Тренироваться» (ctaFill) и её соседка — плитка
  { element: 'Хаб Карточек: кнопка', what: 'ctaFill к странице', min: GRAPHIC, after: (t) => ratio(solid(t.ctaFill!), solid(t.bg!)) },
  { element: 'Хаб Карточек: кнопка', what: 'подпись ctaFillInk к кнопке', min: TEXT, after: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  { element: 'Хаб Карточек: кнопка', what: 'кнопка к плашке плитки (соседка)', min: GRAPHIC, after: (t) => ratio(solid(t.ctaFill!), solid(t.plateFillFrom!)) },
  // ── LegacyBonusHero и окно бонуса (лист opaqueSheet): подписи героя, кнопка
  { element: 'LegacyBonus', what: 'подпись «Всего» (secondary) к листу', min: TEXT, after: (t) => ratio(solid(t.secondary!), solid(t.opaqueSheet!)) },
  { element: 'LegacyBonus', what: 'число (text) к листу', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.opaqueSheet!)) },
  { element: 'LegacyBonus', what: 'кнопка ctaFill к листу', min: GRAPHIC, after: (t) => ratio(solid(t.ctaFill!), solid(t.opaqueSheet!)) },
  { element: 'LegacyBonus', what: 'подпись кнопки к кнопке', min: TEXT, after: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  { element: 'LegacyBonus', what: 'плашка строк (opaqueCard) к листу — тон', min: 1.0, after: (t) => ratio(solid(t.opaqueCard!), solid(t.opaqueSheet!)) },
  // ── «Из видео» (flashcards_video_packs / VideoPackRow): кнопка-миниатюра buttonFill, название, число фраз на странице
  { element: 'Из видео', what: 'миниатюра-кнопка (buttonFill) к странице — тон', min: TONE, after: (t) => ratio(solid(t.buttonFill!), solid(t.bg!)) },
  { element: 'Из видео', what: 'название к странице', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.bg!)) },
  { element: 'Из видео', what: 'число фраз (secondary) к странице', min: TEXT, after: (t) => ratio(solid(t.secondary!), solid(t.bg!)) },
  { element: 'Из видео', what: 'число фраз в карточке набора (accentText) к странице', min: TEXT, after: (t) => ratio(solid(t.accentText!), solid(t.bg!)) },
  // ── хаб Карточек: стопка (слово, транскрипция) и значки плиток — по настоящим слоям stackFill / iconGlass (сверено с CardsHubV2.tsx 18.10)
  { element: 'Хаб Карточек: стопка', what: 'слово (36/700, крупный текст ≥3) к худшему слою stackFill', min: GRAPHIC, after: (t) => worstOver(faceInkOf(t), stackLayers(t)) },
  // транскрипция 16 italic — обычный текст, цель 4,5; фактически 4,10–4,49 в 26 из 230 сочетаний (светлые темы при низком ползунке, graphite|тёмная|0–0,5): слой stackFill светлеет от цвета темы 50 % по макету; пол 4,0, решение — Макеты/координатор (доля 0,5→0,4 или транскрипция крупнее)
  { element: 'Хаб Карточек: стопка', what: 'транскрипция (16 italic) к худшему слою stackFill', min: TEXT, floor: 4.0, after: (t) => worstOver(faceInkOf(t), stackLayers(t)) },
  { element: 'Хаб Карточек: значок плитки', what: 'значок к худшему слою iconGlass', min: GRAPHIC, after: (t) => worstOver(faceInkOf(t), iconLayers(t)) },
  // ── плитки хаба Карточек (плашка с градиентом plateFillFrom→plateFillTo и тенью): число и название
  { element: 'Хаб Карточек: плитка', what: 'число/название к началу градиента', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.plateFillFrom!)) },
  { element: 'Хаб Карточек: плитка', what: 'число/название к концу градиента', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.plateFillTo!)) },
  // ── «Все уроки» по эталону 1.6 (LearningV2AllLessonsList.tsx, f95474baf): чипы A1–B2, «Классический курс», кольцо, ключ/замок, закрытые строки (opacity 0,62 на всю строку)
  { element: 'Все уроки: чип', what: 'выбранный (ctaFill) к невыбранному (buttonFill) — тон', min: TONE, before: (t) => ratio(solid(t.cta!), solid(t.buttonFill!)), after: (t) => ratio(solid(t.ctaFill!), solid(t.buttonFill!)) },
  { element: 'Все уроки: чип', what: 'выбранный к странице', min: GRAPHIC, before: (t) => ratio(solid(t.cta!), solid(t.bg!)), after: (t) => ratio(solid(t.ctaFill!), solid(t.bg!)) },
  { element: 'Все уроки: чип', what: 'подпись выбранного', min: TEXT, before: (t) => ratio(solid(t.ctaInk!), solid(t.cta!)), after: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  { element: 'Все уроки: чип', what: 'невыбранный к странице — тон', min: TONE, after: (t) => ratio(solid(t.buttonFill!), solid(t.bg!)) },
  { element: 'Все уроки: чип', what: 'подпись невыбранного и «Классического курса» к buttonFill', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.buttonFill!)) },
  { element: 'Все уроки: кольцо', what: 'дуга (text) к плашке строки', min: GRAPHIC, after: (t) => ratio(solid(t.text!), solid(t.plateFillFrom!)) },
  { element: 'Все уроки: кольцо', what: 'дорожка (text 16 %) к плашке строки — тон', min: TONE, floor: 1.2, after: (t) => ratio(over(t.text!, solid(t.plateFillFrom!), 0.16), solid(t.plateFillFrom!)) },
  { element: 'Все уроки: строка', what: 'название (text) к плашке', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.plateFillFrom!)) },
  { element: 'Все уроки: строка', what: 'метка и шеврон (mutedText) к плашке', min: TEXT, after: (t) => ratio(solid(t.mutedText!), solid(t.plateFillFrom!)) },
  { element: 'Все уроки: закрытая строка', what: 'название к плашке (обе под opacity 0,62 над страницей)', min: TEXT, after: (t) => ratio(over(t.text!, solid(t.bg!), 0.62), over(t.plateFillFrom!, solid(t.bg!), 0.62)) },
  { element: 'Все уроки: закрытая строка', what: 'метка (g.text) к плашке под opacity', min: TEXT, before: (t) => ratio(over(t.mutedText!, solid(t.bg!), 0.62), over(t.plateFillFrom!, solid(t.bg!), 0.62)), after: (t) => ratio(over(t.text!, solid(t.bg!), 0.62), over(t.plateFillFrom!, solid(t.bg!), 0.62)) },
  { element: 'Все уроки: закрытая строка', what: 'замок/ключ (g.text) к плашке под opacity', min: GRAPHIC, before: (t) => ratio(over(t.mutedText!, solid(t.bg!), 0.62), over(t.plateFillFrom!, solid(t.bg!), 0.62)), after: (t) => ratio(over(t.text!, solid(t.bg!), 0.62), over(t.plateFillFrom!, solid(t.bg!), 0.62)) },
  { element: 'Все уроки: закрытая строка', what: 'шеврон (g.text) к плашке под opacity', min: GRAPHIC, before: (t) => ratio(over(t.secondary!, solid(t.bg!), 0.62), over(t.plateFillFrom!, solid(t.bg!), 0.62)), after: (t) => ratio(over(t.text!, solid(t.bg!), 0.62), over(t.plateFillFrom!, solid(t.bg!), 0.62)) },
  { element: 'Все уроки: закрытая строка', what: 'отличима от открытой: название закрытой к названию открытой', min: 1.2, after: (t) => ratio(solid(t.text!), over(t.text!, solid(t.bg!), 0.62)) },
  // ── Диалоги (2c0675a0f, ce1222c47): пилюля «N/30» и капсула энергии — заливка opaqueControl на странице
  { element: 'Диалоги: пилюля N/30', what: 'заливка к странице — тон', min: TONE, before: (t) => ratio(solid(t.opaqueControl!), solid(t.bg!)), after: (t) => ratio(solid(t.buttonFill!), solid(t.bg!)) },
  { element: 'Диалоги: пилюля N/30', what: 'число и значок (text) к заливке buttonFill', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.buttonFill!)) },
  { element: 'Диалоги: капсула энергии', what: 'заливка к странице — тон', min: TONE, after: (t) => ratio(solid(t.buttonFill!), solid(t.bg!)) },
  { element: 'Диалоги: капсула энергии', what: 'число и молния (text) к заливке buttonFill', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.buttonFill!)) },
  // ── бейдж лимита в шапке сессии диалога (DialogQuotaBadge: плашка plateFillFrom с тенью, значок iconTint: тёмная — accentBright, светлая «Спокойно» — secondary)
  { element: 'Диалоги: бейдж лимита (шапка сессии)', what: 'плашка к странице — тон (плашка отделена тенью)', min: TONE, floor: 1.05, after: (t) => ratio(solid(t.plateFillFrom!), solid(t.bg!)) },
  { element: 'Диалоги: бейдж лимита (шапка сессии)', what: '«—/30», «N/30» (text) к плашке', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.plateFillFrom!)) },
  { element: 'Диалоги: бейдж лимита (шапка сессии)', what: 'значок к плашке', min: GRAPHIC, after: (t) => ratio(solid(String(t.isLight) === 'true' ? t.secondary! : t.accentBright!), solid(t.plateFillFrom!)) },
  { element: 'Диалоги: бейдж лимита (шапка сессии)', what: 'срок сброса (secondary) к плашке', min: TEXT, after: (t) => ratio(solid(t.secondary!), solid(t.plateFillFrom!)) },
  { element: 'Диалоги: капсула энергии', what: 'низкий заряд (красный из токена темы, сдвинут по яркости) к заливке buttonFill', min: GRAPHIC, before: (t) => ratio(solid(t.bad!), solid(t.buttonFill!)), after: (t) => ratio(solid(lowChargeInk(t.bad!, t.buttonFill!, t.text!)), solid(t.buttonFill!)) },
  // ── комбо урока: молния m08 (2f796870d, accentGraphic) и кольцо нагрева на 3/5/10 (ComboHeatSlot: «Искра» accentGraphic, «Молния» warn, «Гроза» bad); страница = bg
  { element: 'Комбо урока: молния m08', what: 'штрих (accentGraphic) к странице', min: GRAPHIC, after: (t) => ratio(solid(t.accentGraphic!), solid(t.bg!)) },
  { element: 'Комбо урока: кольцо нагрева', what: '3 «Искра» (accentGraphic) к странице', min: GRAPHIC, after: (t) => ratio(solid(t.accentGraphic!), solid(t.bg!)) },
  { element: 'Комбо урока: кольцо нагрева', what: '5 «Молния» (warn) к странице', min: GRAPHIC, after: (t) => ratio(solid(t.warn!), solid(t.bg!)) },
  { element: 'Комбо урока: кольцо нагрева', what: '10 «Гроза» (bad) к странице', min: GRAPHIC, after: (t) => ratio(solid(t.bad!), solid(t.bg!)) },
  { element: 'Комбо урока: цифра нагрева', what: '3 «Искра» (accentTextSafe) к странице', min: TEXT, after: (t) => ratio(solid(t.accentTextSafe!), solid(t.bg!)) },
  { element: 'Комбо урока: цифра нагрева', what: '5 «Молния» (warn) к странице', min: TEXT, after: (t) => ratio(solid(t.warn!), solid(t.bg!)) },
  { element: 'Комбо урока: цифра нагрева', what: '10 «Гроза» (bad) к странице', min: TEXT, after: (t) => ratio(solid(t.bad!), solid(t.bg!)) },
  // ── новинки 18.10 (20a6bf2ce «Не отправлено»/«Повторить», 9be415d23 «Сейчас недоступно», 6aaad5cea тост лайка, 27d17576e счётчик «0 /19»)
  { element: 'Диалоги: «Не отправлено»', what: 'пометка (secondary 13px) к фону', min: TEXT, after: (t) => Math.min(...['bg', 'bgTop', 'bgBottom'].map((k) => ratio(solid(t.secondary!), solid(t[k]!)))) },
  { element: 'Диалоги: плашка ошибки', what: 'текст (secondary) к плашке', min: TEXT, after: (t) => Math.min(ratio(solid(t.secondary!), solid(t.plateFillFrom!)), ratio(solid(t.secondary!), solid(t.plateFillTo!))) },
  { element: 'Диалоги: «Повторить»', what: 'заливка к фону и плашке (dialogueCtaPaint)', min: GRAPHIC, before: (t) => Math.min(ratio(solid(t.accent!), solid(t.bg!)), ratio(solid(t.accent!), solid(t.plateFillFrom!)), ratio(solid(t.accent!), solid(t.plateFillTo!))), after: (t) => { const f = dialogueCtaPaint(t as never).fill; return Math.min(ratio(solid(f), solid(t.bg!)), ratio(solid(f), solid(t.plateFillFrom!)), ratio(solid(f), solid(t.plateFillTo!))); } },
  { element: 'Диалоги: «Повторить»', what: 'подпись к заливке (dialogueCtaPaint)', min: TEXT, after: (t) => { const p = dialogueCtaPaint(t as never); return ratio(solid(p.ink), solid(p.fill)); } },
  // Владелец 18.10 «вариант Г» + «обязаны слушаться цвета темы»: кольцо «Продолжить» на плашке Главной (plateFillFrom 50 % поверх bg/bgTop) — дуга accentGraphic, дорожка buttonFill
  { element: 'Главная: кольцо «Продолжить»', what: 'дуга к дорожке', min: GRAPHIC, after: (t) => Math.min(...['bg', 'bgTop'].map((k) => { const card = over(t.plateFillFrom!, solid(t[k]!), 0.5); return ratio(over(t.accentGraphic!, card), over(t.buttonFill!, card)); })) },
  { element: 'Главная: кольцо «Продолжить»', what: 'дуга к плашке', min: GRAPHIC, after: (t) => Math.min(...['bg', 'bgTop'].map((k) => { const card = over(t.plateFillFrom!, solid(t[k]!), 0.5); return ratio(over(t.accentGraphic!, card), card); })) },
  { element: 'Главная: кольцо «Продолжить»', what: 'дорожка к плашке', min: 1.5, after: (t) => Math.min(...['bg', 'bgTop'].map((k) => { const card = over(t.plateFillFrom!, solid(t[k]!), 0.5); return ratio(over(t.buttonFill!, card), card); })) },
  { element: 'Главная: кольцо «Продолжить»', what: 'название и «9 / 50 · Урок 1» к плашке', min: TEXT, after: (t) => Math.min(...['bg', 'bgTop'].flatMap((k) => { const card = over(t.plateFillFrom!, solid(t[k]!), 0.5); return [ratio(over(t.text!, card), card), ratio(over(t.secondary!, card), card)]; })) },
  // Ревизор 18.10: кнопки «Закрыть» / «Открыть» в шторках «Задания» и «Почему так» (DialogGoalsSheet, DialogWhySheet) лежат на opaqueSheet
  { element: 'Диалоги: кнопка шторок «Задания»/«Почему так»', what: 'заливка к шторке opaqueSheet (dialogueCtaPaint)', min: GRAPHIC, before: (t) => ratio(solid(t.accent!), solid(t.opaqueSheet!)), after: (t) => ratio(solid(dialogueCtaPaint(t as never, [t.opaqueSheet!]).fill), solid(t.opaqueSheet!)) },
  { element: 'Диалоги: кнопка шторок «Задания»/«Почему так»', what: 'подпись к заливке (dialogueCtaPaint)', min: TEXT, after: (t) => { const p = dialogueCtaPaint(t as never, [t.opaqueSheet!]); return ratio(solid(p.ink), solid(p.fill)); } },
  { element: 'Карточки: «Сейчас недоступно»', what: 'заголовок и подпись к фону', min: TEXT, after: (t) => Math.min(...['bg', 'bgTop', 'bgBottom'].flatMap((k) => [ratio(solid(t.text!), solid(t[k]!)), ratio(solid(t.secondary!), solid(t[k]!))])) },
  { element: 'Карточки: «Сейчас недоступно»', what: 'значок к плитке opaqueControl', min: GRAPHIC, after: (t) => ratio(solid(t.text!), solid(t.opaqueControl!)) },
  { element: 'Карточки: «Попробовать снова»', what: 'заливка ctaFill к фону', min: GRAPHIC, after: (t) => Math.min(...['bg', 'bgTop', 'bgBottom'].map((k) => ratio(solid(t.ctaFill!), solid(t[k]!)))) },
  { element: 'Тост «Не удалось поставить лайк»', what: 'текст и подпись к карточке/плитке тоста', min: TEXT, after: (t) => Math.min(...['opaqueCard', 'opaqueControl'].flatMap((k) => [ratio(solid(t.text!), solid(t[k]!)), ratio(solid(t.secondary!), solid(t[k]!))])) },
  { element: 'Тост «Не удалось поставить лайк»', what: 'значок ошибки (bad) к карточке', min: GRAPHIC, after: (t) => ratio(solid(t.bad!), solid(t.opaqueCard!)) },
  { element: 'Диалоги: счётчик «0 /19»', what: 'число (text) и «/19» (secondary) к плашке', min: TEXT, after: (t) => Math.min(...['plateFillFrom', 'plateFillTo'].flatMap((k) => [ratio(solid(t.text!), solid(t[k]!)), ratio(solid(t.secondary!), solid(t[k]!))])) },
  // ── последние коммиты 18.10 07:00: тост рубежа Моментов (43fba2781: cardRaised = opaqueControl, p.text / p.textSecondary), плашка-подсказка m08 (bgSurface2 = opaqueSheet, текст g.text), окно согласия на ИИ (6962201b0: «Не сейчас» на buttonFill по opaqueSheet)
  { element: 'Тост рубежа серии', what: 'заголовок (text) и подзаголовок (secondary) к плашке opaqueControl', min: TEXT, after: (t) => Math.min(ratio(solid(t.text!), solid(t.opaqueControl!)), ratio(solid(t.secondary!), solid(t.opaqueControl!))) },
  { element: 'Тост рубежа серии', what: 'плашка (opaqueControl) к фону — тон (отделена тенью)', min: TONE, floor: 1.0, after: (t) => Math.min(ratio(solid(t.opaqueControl!), solid(t.bg!)), ratio(solid(t.opaqueControl!), solid(t.bgTop!))) },
  { element: 'Комбо урока: плашка m08', what: 'текст (text) к плашке bgSurface2 = opaqueSheet', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.opaqueSheet!)) },
  { element: 'Окно согласия на ИИ', what: 'абзац (text, 700) к листу opaqueSheet', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.opaqueSheet!)) },
  { element: 'Окно согласия на ИИ', what: '«Не сейчас»: плашка buttonFill к листу — тон', min: TONE, after: (t) => ratio(solid(t.buttonFill!), solid(t.opaqueSheet!)) },
  { element: 'Окно согласия на ИИ', what: '«Не сейчас»: подпись (text) к buttonFill', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.buttonFill!)) },
  // ── моменты серии (StreakMilestoneScreen): ореол шире и тусклее (095137518), золото d1000 = warn, звёзды d365 (f83d12491)
  { element: 'Момент серии', what: 'надпись-оверлайн (accentTextSafe) к фону и ореолу', min: TEXT, after: (t) => haloWorst(t.accentTextSafe!, t) },
  { element: 'Момент серии', what: 'заголовок (text) к фону и ореолу', min: TEXT, after: (t) => haloWorst(t.text!, t) },
  { element: 'Момент серии', what: 'подзаголовок (streakSublineInk: secondary или text) к фону и ореолу', min: TEXT, after: (t) => haloWorst(streakSublineInk(t as never), t) },
  { element: 'Момент серии', what: 'цифра огня (белая) к тёмной плашке над худшим цветом огня стадий 1–5', min: TEXT, after: (t) => Math.min(...STAGES.flatMap((st) => { const c = stageColorsOf(t, st); return [c.outer, c.core].map((col) => ratio([255, 255, 255], plateOver(col))); })) },
  { element: 'Момент серии', what: 'огонь: внешний цвет стадий 1–5 к фону (худшая стадия)', min: GRAPHIC, floor: 1.0, after: (t) => Math.min(...STAGES.map((st) => ratio(solid(stageColorsOf(t, st).outer), solid(t.bg!)))) },
  { element: 'Момент серии', what: 'золото d1000 (warn) к фону', min: GRAPHIC, after: (t) => ratio(solid(t.warn!), solid(t.bg!)) },
  { element: 'Момент серии', what: 'звёзды d365 (text) к фону', min: GRAPHIC, after: (t) => ratio(solid(t.text!), solid(t.bg!)) },
];

const INTENSITIES = [0, 0.25, 0.5, 0.75, 1];
type Cell = { min: number; at: string };

export function run() {
  const worstAfter = new Map<string, Map<string, Cell>>(); // тема → элемент|что → худшее
  let failsBefore = 0;
  let failsAfter = 0;
  const failList: string[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const intensity of INTENSITIES) {
        const t = { ...(liquidGlassTokens(id as never, { intensity, appearance } as never) as unknown as Tok), themeId: id };
        for (const p of PAIRS) {
          const key = `${p.element} | ${p.what}`;
          const a = p.after(t);
          const b = (p.before ?? p.after)(t);
          const need = p.floor ?? p.min;
          if (b < need) failsBefore += 1;
          if (a < need) { failsAfter += 1; failList.push(`${id}|${appearance}|${intensity} ${key}: ${a.toFixed(2)} < ${need}`); }
          const row = worstAfter.get(id) ?? new Map<string, Cell>();
          const prev = row.get(key);
          if (!prev || a < prev.min) row.set(key, { min: a, at: `${appearance}|${intensity}` });
          worstAfter.set(id, row);
        }
      }
    }
  }
  return { worstAfter, failsBefore, failsAfter, failList };
}

