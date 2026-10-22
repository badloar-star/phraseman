import type { GlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { colorWithAlpha } from './v2/plateAlpha';

/**
 * Цвета центра уведомлений — роли ТЕКУЩЕЙ темы.
 * зачем (закон владельца 22.10 «цвета — строго цвета и оттенки текущей темы»; координатор → МОМЕНТЫ, зона «Сообщения»): прежде — iOS-цвета
 * типов событий и зелёный/золотой «бренд» награды с пометкой theme-exempt. Теперь: «нравится» — bad темы, «друг принят» и ответ на жалобу —
 * good, зелёная награда — good с прежними плотностями (8 / 14 %), золото звёзд и монет — warn; подпись на зелёной кнопке — тот из фона
 * и белого темы, что читается на ней лучше (в тёмном оформлении good светлый, в светлом — тёмный).
 */
export function notificationTones(g: Pick<GlassTokens, 'good' | 'bad' | 'warn' | 'bg' | 'mediaInk' | 'shadowTint'>) {
  const good = g.good.slice(0, 7);
  const [onGood] = [g.bg.slice(0, 7), g.mediaInk].sort((a, b) => paletteContrast(b, good) - paletteContrast(a, good));
  return {
    like: g.bad,
    good: g.good,
    gold: g.warn,
    rewardIcon: { backgroundColor: colorWithAlpha(g.good, 0.14) },
    rewardLine: { backgroundColor: colorWithAlpha(g.good, 0.08) },
    rewardButton: { backgroundColor: g.good },
    rewardButtonInk: onGood ?? g.mediaInk,
    undoShadow: { shadowColor: colorWithAlpha(g.shadowTint, 1) },
  } as const;
}

export type NotificationTones = ReturnType<typeof notificationTones>;
