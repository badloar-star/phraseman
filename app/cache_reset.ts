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
import { isDevCacheClearHold, isDevSettingsFail } from './dev_social_state';
import { Image } from 'expo-image';
import { REFERRAL_STATE_STORAGE_KEY } from './referrals_cache';
import { FRIENDS_TAB_SWR_CACHE_KEY, FRIEND_PROFILES_CACHE_KEY } from './friends_tab_swr_warm';
import { DebugLogger } from './debug-logger';

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
  // Перцентили рейтинга (leaderboard_stats.ts удалён 04.10, PM-252) — стереть остатки.
  'leaderboard_stats_cache_v2',
  'leaderboard_stats_absent_v1',
  'leaderboard_cache_v1',
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
  // как источник правды. Клиент биржи удалён (D70/D78) — ключи остаются в списке
  // только ради очистки у тех, у кого кэш уже лежит.
  'coin_exchange_quote_cache_v1',
  'coin_exchange_history_cache_v1',

  // Фраза дня с сервера: при промахе кеша есть детерминированный локальный
  // фолбэк getTodayPhraseSync(), поэтому пустой экран невозможен.
  'daily_phrase_remote_cache_v1',
  // Отметка «сегодня на сервере фразы нет» (№45 шаг 6) — сброс просто вернёт один запрос.
  'daily_phrase_remote_miss_v1',

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
  // AI-объяснения: закешированный текст, уже показанный ученику. Промах кеша
  // тихий — сервер ответит заново (см. explain_local_cache.ts).
  'ai_explain_local_cache_v1:',
  ...APP_MESSAGES_CACHE_PREFIXES,
  // Каталог маркета наборов на диске (PM-252 п.7) — публичный, пересобирается из сети.
  'community_catalog_v1:',
] as const;

// зачем: PM-199-A2 — раньше при сбое хранилища функция всё равно возвращала успех,
// и настройки показывали «Готово», хотя кеш не стёрт. Теперь `ok:false` говорит
// правду; картинки чистим в любом случае (это заявленное поведение кнопки).
export async function clearAppCaches(): Promise<{ removedKeys: number; ok: boolean }> {
  let removedKeys = 0;
  let ok = true;
  try {
    // зачем (координатор 12.10, R1 «нет пути»): dev `cache=failed` — «Не удалось» при очистке кеша: сбой хранилища до удаления, ничего не стирается; в стор-сборке геттер выключен.
    if (isDevSettingsFail('cache_clear')) throw new Error('dev_cache_clear_failed');
    // зачем (Авторизация 13.10, settings-gap-007): dev `cache=hold` — строка держит «чистим…», ничего не стирается; в сторе геттер выключен
    if (isDevCacheClearHold()) {
      console.log('[CACHE-RESET] [DEV-STATE] cache=hold — чистка удержана, хранилище не трогаем'); // guard-ok: dev-ветка
      return await new Promise<{ removedKeys: number; ok: boolean }>(() => undefined);
    }
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
  } catch (e) {
    // хранилище недоступно — картинки всё равно чистим, но честно сообщаем о сбое
    ok = false;
    console.warn('[CACHE-RESET] storage failed', JSON.stringify({ reason: e instanceof Error ? e.message : String(e), removedKeys }));
    DebugLogger.error('cache_reset:doomed', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
  await Promise.all([
    Image.clearMemoryCache().catch((e) => {
      console.warn('[CACHE-RESET] image memory cache failed', JSON.stringify({ reason: e instanceof Error ? e.message : String(e) }));
      return false;
    }),
    Image.clearDiskCache().catch((e) => {
      console.warn('[CACHE-RESET] image disk cache failed', JSON.stringify({ reason: e instanceof Error ? e.message : String(e) }));
      return false;
    }),
  ]);
  console.log('[CACHE-RESET] done', JSON.stringify({ ok, removedKeys }));
  return { removedKeys, ok };
}

/* expo-router route shim: utility module under app/ */
export default function __RouteShim() {
  return null;
}
