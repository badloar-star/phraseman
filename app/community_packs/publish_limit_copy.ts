/**
 * зачем: Q55 / PM-018-A2 — сервер пускает не больше 3 НОВЫХ публикаций наборов
 * в сутки на человека (functions/src/pack_publish_limit.ts). Отказ приходит как
 * resource-exhausted с причиной publish_daily_limit; человеку нужно понятное
 * «сегодня больше нельзя, попробуй завтра», а не общее «не удалось отправить».
 * Один текст на все языки — общий для обоих экранов, где можно публиковать.
 */
export const PACK_PUBLISH_DAILY_LIMIT_REASON = 'publish_daily_limit';

export const PACK_PUBLISH_DAILY_LIMIT_COPY = {
  ru: 'Сегодня можно опубликовать не больше 3 наборов, попробуй завтра.',
  uk: 'Сьогодні можна опублікувати не більше 3 наборів, спробуй завтра.',
  en: 'You can publish up to 3 packs per day. Try again tomorrow.',
  es: 'Hoy solo puedes publicar hasta 3 packs. Inténtalo mañana.',
  'pt-BR': 'Hoje você pode publicar no máximo 3 pacotes. Tente amanhã.',
  vi: 'Hôm nay bạn chỉ có thể đăng tối đa 3 bộ thẻ. Hãy thử lại vào ngày mai.',
  id: 'Hari ini kamu hanya bisa memublikasikan maksimal 3 paket. Coba lagi besok.',
  tr: 'Bugün en fazla 3 paket yayınlayabilirsin. Yarın tekrar dene.',
  pl: 'Dziś możesz opublikować najwyżej 3 zestawy. Spróbuj jutro.',
} as const;

/** Отказ сервера «суточный лимит публикаций исчерпан». */
export function isPublishDailyLimitError(error: unknown): boolean {
  const e = error as { code?: string; message?: string; details?: { reason?: string } } | null;
  const code = String(e?.code ?? '');
  const message = String(e?.message ?? '');
  if (e?.details?.reason === PACK_PUBLISH_DAILY_LIMIT_REASON) return true;
  return /resource-exhausted/i.test(code + message) && message.includes(PACK_PUBLISH_DAILY_LIMIT_REASON);
}
