// ════════════════════════════════════════════════════════════════════════════
// learning_v2_task_layout_tokens.ts — ОБЩИЕ токены раскладки заданий Learning V2 (одобренный макет learning-v2-tasks-review.html, «Предлагаем»).
//
// зачем (координатор 21.10, «Сверка»: ни один из 8 типов не совпал с макетом): раскладку делят две сессии — «2 · ДИЗАЙН» (общая шапка, HUD,
// подвал, «Найди пары», «Собери фразу») и «4 · ТЕМЫ» («Ситуация», плитки ответов, банк слов, «Новое слово», «Скажи вслух», вступление).
// Размеры и заливки, которые должны совпасть у обеих, живут ТОЛЬКО здесь: ни в одном экране нельзя заводить свою копию.
// Размеры — из CSS макета (.tvtop, .tvx, .tvtrk, .tvn, .hud, .hp, .foot, .todo), заливки — токены темы (useLv2Glass), не цвета.
// Тени — единый стиль «Тень» (components/v2/ShadowSurface): рельефный край плитки — это plateBoxShadow, второй копии нет.
// ════════════════════════════════════════════════════════════════════════════
import type { ViewStyle } from 'react-native';

import { plateBoxShadow } from '../v2/ShadowSurface';
import { lv2Alpha, type Lv2Glass } from './LearningV2Glass';

export const LV2_TASK_LAYOUT = {
  /** `.tvtop`: gap 12, высота от 54, отступ сверху 2. */
  topBar: { gap: 12, minHeight: 54, marginTop: 2 },
  /** `.tvx`: круглая плита 44, значок 22; плита — заливка карточки и тень плиты. */
  close: { size: 44, icon: 22 },
  /** `.tvtrk` 6 / радиус 3; `.tvn` 13/17 700, отступ 5. */
  progress: { height: 6, radius: 3, labelSize: 13, labelLine: 17, labelGap: 5, minFill: 4 },
  /** `.hud` gap 6; `.hp`: 34, поля 10, радиус 17, gap 4, текст 15/700, значок 15, монета 18. */
  hud: { groupGap: 6, pillHeight: 34, padH: 10, gap: 4, textSize: 15, textLine: 20, icon: 15, coin: 18 },
  /** `.todo`: gap 12, отступ 6; `.ti` 40 / радиус 12 / значок 21; `.tt` 22/27 800, межбуквенный −0.3. */
  title: { gap: 12, marginTop: 6, tile: 40, tileRadius: 12, tileIcon: 21, textSize: 22, textLine: 27, letterSpacing: -0.3 },
  /** `.foot`: поля 8/10/34, три действия от 44, значок 26, подпись 13/17 600, gap 3, недоступное — .3. */
  footer: { padTop: 8, padH: 10, item: 44, gap: 3, icon: 26, labelSize: 13, labelLine: 17, offOpacity: 0.3 },
} as const;

/** Плита шапки: круглая «закрыть» и таблетки HUD — заливка карточки + тень плиты (в стиле «Тень» обводок нет). */
export function lv2TaskPlateStyle(g: Lv2Glass): ViewStyle {
  return { backgroundColor: g.opaqueCard, boxShadow: plateBoxShadow(g) };
}

/**
 * Рельефный край плитки ответа (`--sh` макета) для «4 · ТЕМЫ»: сегодня это plateBoxShadow темы; выносим под одним именем,
 * чтобы плитки ответов, банк слов и мои таблетки/плиты не разошлись, если тень плиты поменяется.
 */
export function lv2TaskTileRelief(g: Lv2Glass): ReturnType<typeof plateBoxShadow> {
  return plateBoxShadow(g);
}

/** Дорожка прогресса: заметна на любой теме (в тёмной opaqueControl почти сливалась с фоном — «Сверка» 21.10). */
export function lv2TaskTrackColor(g: Lv2Glass): string {
  return lv2Alpha(g.text, 0.16);
}

/** Тон плитки-значка у названия задания (`.ti`: 9 % цвета текста). */
export function lv2TaskTitleTileColor(g: Lv2Glass): string {
  return lv2Alpha(g.text, 0.09);
}

// ════════════════════════════════════════════════════════════════════════════
// Плитки ответов и блок разбора — ЭТАЛОН ЭКЗАМЕНА (chapter-exam-season.html; владелец 21.10: «мне нравится именно вот тень — вообще очень красиво, и цвета да!»).
// зачем: это эталон плиток ответов для ВСЕХ заданий V2. Значения — из CSS экзамена (.opt/.opt.ok/.opt.no/.lane/.rv/--amber), общие для «2 · ДИЗАЙН» и «4 · ТЕМЫ».
// Неверный ответ и блок «Правильно: …» у экзамена — ТЁПЛЫЙ бледный (--amber), а не розовый: берём как в макете, не из токена bad.
// ════════════════════════════════════════════════════════════════════════════

/** `.opt`: высота от 58, радиус 14, текст 16 жирный по центру, поля 0 48 (место под отметку), `.opts` gap 13; выбранная приподнята на 2; `.mk` 20 на right 16. */
export const LV2_TASK_TILE = {
  minHeight: 58, radius: 14, gap: 13, padH: 48, textSize: 16, textWeight: '700', lift: 2, markSize: 20, markRight: 16, dimOpacity: 0.45,
} as const;

/** `.lane` / `.rv`: блок разбора — радиус 18, поля 14/16, заголовок 16/22, пояснение 15/21 (`.rv`-карточка: радиус 20, 14/16). */
export const LV2_TASK_VERDICT_BLOCK = { radius: 18, padV: 14, padH: 16, marginTop: 18, titleSize: 16, titleLine: 22, bodySize: 15, bodyLine: 21, bodyGap: 4 } as const;

export type Lv2TaskTileVerdict = 'neutral' | 'selected' | 'ok' | 'no';

/**
 * `--amber` и кольцо неверного: тёмная («Океан») rgba(230,160,60,.14), светлая («Чернила») rgba(190,118,28,.12); линия — тот же цвет с α .45.
 * Тёплый тон не часть темы: одинаков во всех светлых и во всех тёмных.
 */
export function lv2TaskAmber(g: Lv2Glass): { fill: string; edge: string } {
  return g.isLight
    ? { fill: 'rgba(190,118,28,0.12)', edge: 'rgba(190,118,28,0.45)' } // theme-exempt: --amber эталона экзамена (светлый)
    : { fill: 'rgba(230,160,60,0.14)', edge: 'rgba(230,160,60,0.45)' }; // theme-exempt: --amber эталона экзамена (тёмный)
}

export type Lv2TaskTileLook = Readonly<{
  backgroundColor: string;
  /** Цвет текста: верная — зелёный (--good), остальные — основной. */
  color: string;
  /** Тонкая линия-кольцо исхода (inset 1px) — только у верной/неверной, иначе null; на плитке нейтральной её нет. */
  edgeColor: string | null;
  /** Рельефный нижний край (--sh) — у нейтральной и выбранной; у исхода вместо него линия. */
  boxShadow: ReturnType<typeof plateBoxShadow> | undefined;
  /** Приподнятость выбранной (translateY −lift). */
  lifted: boolean;
}>;

/** Вид плитки ответа: нейтральная — светлый тон карточки + рельефный край; верная — бледно-зелёный + зелёный текст; неверная — бледно-тёплый. */
export function lv2TaskTileLook(g: Lv2Glass, verdict: Lv2TaskTileVerdict): Lv2TaskTileLook {
  if (verdict === 'ok') return { backgroundColor: g.goodSoft, color: g.good, edgeColor: g.goodEdge, boxShadow: undefined, lifted: false };
  if (verdict === 'no') return { backgroundColor: lv2TaskAmber(g).fill, color: g.text, edgeColor: lv2TaskAmber(g).edge, boxShadow: undefined, lifted: false };
  if (verdict === 'selected') {
    return { backgroundColor: g.accentSoft, color: g.text, edgeColor: null, boxShadow: lv2TaskTileRelief(g), lifted: true };
  }
  return { backgroundColor: g.opaqueCard, color: g.text, edgeColor: null, boxShadow: lv2TaskTileRelief(g), lifted: false };
}

/** Блок «Правильно: … / объяснение» (`.lane`): верный — бледно-зелёный с зелёным заголовком, неверный — тот же тёплый бледный тон; без рамки. */
export function lv2TaskVerdictBlockLook(g: Lv2Glass, ok: boolean): Readonly<{ backgroundColor: string; titleColor: string; bodyColor: string }> {
  return { backgroundColor: ok ? g.goodSoft : lv2TaskAmber(g).fill, titleColor: ok ? g.good : g.text, bodyColor: g.secondary };
}
