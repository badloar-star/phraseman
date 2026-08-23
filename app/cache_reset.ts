/**
 * «Очистить кеш» из настроек (Bevel-style «Clear cache & reload all data»).
 *
 * Сбрасывает ТОЛЬКО косметические/сетевые кеши: картинки expo-image (memory+disk)
 * и снапшоты, которые гарантированно пересоздаются (с сервера либо пересчётом из
 * локальных данных).
 *
 * НЕ трогаем: прогресс, аккаунт, stable_id, настройки, офлайн-очереди —
 * приложение local-first, «чистка» не должна ничего ломать.
 *
 * зачем: владелец заметил, что кнопка называется «кеш картинок», а чистит лишь
 * три ключа — мимо проходили рейтинги, топ-хелперы, сообщения, курс биржи и
 * AI-объяснения, и жалоба «показывает старое» кнопкой не лечилась.
 *
 * ПРАВИЛО ПОПОЛНЕНИЯ СПИСКА (не нарушать):
 *  1) ключ обязан быть ЧИСТЫМ кешем — его потеря максимум стоит одного фетча;
 *  2) НИКОГДА не чистить по широкому префиксу, если рядом лежат очереди и
 *     невостребованные награды (см. app_messages.ts: outbox-очереди видимости,
 *     personal-modal ack и report_reply_pending_claims живут на соседних
 *     префиксах — поэтому сообщения чистим ТОЧНЫМИ ключами, не префиксом);
 *  3) снапшот и его метку «когда обновляли» чистить ПАРОЙ — иначе экран
 *     останется пустым до истечения TTL (top_helpers/club: 3 ч).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { REFERRAL_STATE_STORAGE_KEY } from './referrals_cache';
import { FRIENDS_TAB_SWR_CACHE_KEY, FRIEND_PROFILES_CACHE_KEY } from './friends_tab_swr_warm';

const STATIC_CACHE_KEYS = [
  REFERRAL_STATE_STORAGE_KEY,
  FRIENDS_TAB_SWR_CACHE_KEY,
  FRIEND_PROFILES_CACHE_KEY,

  // Ленты друзей больше нет (2026-08-16); ключи оставлены, чтобы стереть старый
  // кэш у тех, кто обновился со старой версии.
  'friends_activity_feed_v2',
  'friends_activity_feed_v1',

  // Рейтинги/арена/клуб: снапшоты, которые перезапрашиваются с сервера.
  // Пары «снапшот + метка обновления» — см. правило 3 в шапке файла.
  'global_lb_cache_v4',
  'leaderboard_cache_v1',
  'leaderboard_stats_cache_v2',
  'arena_top100_snapshot_v8',
  'arena_top100_remote_at_v1',
  'arena_rating_screen_cache_v1',
  'club_remote_refresh_at_v2',
  // зачем ключи живут без экрана: борд «Топ хелперов» удалён 2026-08-23, но у
  // существующих пользователей его снапшот уже лежит в хранилище — без очистки
  // этот мусор остался бы навсегда.
  'top_helpers_snapshot_v2',
  'top_helpers_remote_at_v2',

  // Биржа монет: курс и история считаются ТОЛЬКО сервером, клиент их не хранит
  // как источник правды (см. coin_exchange_client.ts).
  'coin_exchange_quote_cache_v1',
  'coin_exchange_history_cache_v1',

  // Фраза дня с сервера: при промахе кеша есть детерминированный локальный
  // фолбэк getTodayPhraseSync(), поэтому пустой экран невозможен.
  'daily_phrase_remote_cache_v1',

  // Снапшот статистики «за всё время» — производная от локальных данных,
  // пересчитывается loadLifetimeProfileStats() без единого чтения Firestore.
  'lifetime_profile_stats_snapshot_v1',
] as const;

/**
 * Точные ключи кеша сообщений — они owner-scoped (`<prefix>:<uid>`), поэтому
 * чистим по префиксу С ДВОЕТОЧИЕМ, чтобы не зацепить соседние ключи-очереди.
 * Список намеренно узкий: только сам кеш и метка фонового обновления.
 */
const APP_MESSAGES_CACHE_PREFIXES = [
  'app_messages_cache_v2:',
  'app_messages_last_background_refresh_ms_v2:',
] as const;

/** Аккаунт-scoped ключи, которые безопасно сбросить (пересоздаются с сервера). */
const SCOPED_CACHE_PREFIXES = [
  'referral_spin_credits_v1:',
  // AI-объяснения: закешированный текст, уже показанный ученику. Промах кеша
  // тихий — сервер ответит заново (см. explain_local_cache.ts).
  'ai_explain_local_cache_v1:',
  ...APP_MESSAGES_CACHE_PREFIXES,
] as const;

export async function clearAppCaches(): Promise<{ removedKeys: number }> {
  let removedKeys = 0;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const doomed = keys.filter(
      (k) =>
        (STATIC_CACHE_KEYS as readonly string[]).includes(k) ||
        SCOPED_CACHE_PREFIXES.some((p) => k.startsWith(p)),
    );
    if (doomed.length > 0) {
      await AsyncStorage.multiRemove(doomed);
      removedKeys = doomed.length;
    }
  } catch { /* хранилище недоступно — просто чистим картинки */ }
  await Promise.all([
    Image.clearMemoryCache().catch(() => false),
    Image.clearDiskCache().catch(() => false),
  ]);
  return { removedKeys };
}

/* expo-router route shim: utility module under app/ */
export default function __RouteShim() {
  return null;
}
