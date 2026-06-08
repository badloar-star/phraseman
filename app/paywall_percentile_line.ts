/**
 * paywall_percentile_line.ts — социальное сравнение на пейволе (план #4).
 *
 * Показывает строку «твой результат лучше N% учеников» в момент покупки —
 * social proof + гордость (Стиль 2 Игра по Библии, gain-framing, НЕ угроза).
 *
 * Осторожно (см. план): прямого отраслевого прецедента «перцентиль на пейволе»
 * нет, поэтому:
 *   - показываем ТОЛЬКО при хорошем перцентиле (≥ MIN_VISIBLE_PERCENTILE = 50);
 *   - для low-performer молчим (демотивация хуже молчания);
 *   - только в релевантных high-value контекстах.
 *
 * Тексты по Библии: гордость за достижение + мост к Premium. БЕЗ «не откатись»,
 * БЕЗ «потеряешь место».
 */
import type { AllPercentiles } from './leaderboard_stats';
import type { PremiumContext } from './premium_context';
import { visiblePercentile } from './stats_percentile_display';
import type { Lang } from '../constants/i18n';

/** Текущие личные показатели, нужные для формулировки строки. */
export interface PercentileLineStats {
  streak: number;
}

type TriCopy = { ru: string; uk: string; es: string };

// TODO(i18n): пока покрыты ru/uk/es; pt-BR/vi/id/tr/pl осознанно падают в ru-фоллбэк
// (строка опциональна и показывается только при хорошем перцентиле). Доперевести при расширении рынков.
function tri(lang: Lang, copy: TriCopy): string {
  if (lang === 'uk') return copy.uk;
  if (lang === 'es') return copy.es;
  return copy.ru;
}

/**
 * Подбирает строку социального сравнения для контекста пейвола.
 * Возвращает null, если показывать нечего (нет данных / низкий перцентиль /
 * нерелевантный контекст).
 */
export function pickPercentileLine(
  ctx: PremiumContext,
  percentiles: AllPercentiles | null,
  stats: PercentileLineStats,
  lang: Lang,
): string | null {
  if (!percentiles) return null;

  // streak-контексты → гордимся серией
  if (ctx === 'streak') {
    const p = visiblePercentile(percentiles.streak, stats.streak > 0);
    if (p === null || stats.streak <= 0) return null;
    return tri(lang, {
      ru: `Твоя серия ${stats.streak} дн. — лучше, чем у ${p}% учеников.`,
      uk: `Твоя серія ${stats.streak} дн. — краще, ніж у ${p}% учнів.`,
      es: `Tu racha de ${stats.streak} días supera al ${p}% de los alumnos.`,
    });
  }

  // конец интро / экран перцентилей → гордимся недельным темпом
  if (ctx === 'intro_ended' || ctx === 'percentiles') {
    const p = visiblePercentile(percentiles.weekXp);
    if (p === null) return null;
    const top = Math.max(1, 100 - p);
    return tri(lang, {
      ru: `Твой темп за неделю — в топ-${top}% учеников.`,
      uk: `Твій темп за тиждень — у топ-${top}% учнів.`,
      es: `Tu ritmo semanal está en el top-${top}% de los alumnos.`,
    });
  }

  return null;
}
