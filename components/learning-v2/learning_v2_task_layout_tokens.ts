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
