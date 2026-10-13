import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueueThemedBlockingInfoAlert } from '../themed_blocking_alert_queue';
import {
  isCommunityPacksCloudEnabled,
  callCommunityListSellerInbox,
  callCommunityMarkSellerInboxSeen,
} from './functionsClient';
import { fetchCommunityPackMeta } from './communityFirestore';
import { getCanonicalUserId } from '../user_id_policy';
import { DebugLogger } from '../debug-logger';
import { IS_STORE_RELEASE } from '../config';
import type { Lang } from '../../constants/i18n';
import { resolveNotificationLang } from '../notification_lang';
import { moderationBody, moderationOkLabel, moderationTitle } from './community_moderation_copy';

let flushRunning = false;

// зачем (координатор 13.10, аудит Авторизации a62d6bb0d): язык окна модерации выбирался только для ru/uk/es, остальные шесть видели русский, а ошибка чтения языка глоталась молча.
// Теперь — тот же разбор, что у пушей (resolveNotificationLang: язык интерфейса → запасной язык устройства); причина сбоя чтения пишется в журнал.
async function readAppLang(): Promise<Lang> {
  let stored: unknown = null;
  try {
    stored = await AsyncStorage.getItem('app_lang');
  } catch (error) {
    console.warn('[MOD-ALERT] app_lang не прочитан — язык по устройству —', error instanceof Error ? error.message : String(error)); // guard-ok: лог причины в catch
  }
  return resolveNotificationLang(stored, 'community_moderation_alert');
}

/**
 * зачем (смета Firebase R1, п.8): `communityListSellerInbox` звался на КАЖДОМ старте у ВСЕХ, хотя наборы присылает малая доля людей.
 * Пустой ответ (нет непрочитанных результатов модерации) помним 6 ч для автора — значение сверяет stableId. Есть письма — запись
 * снимается. Результат модерации доходит не позже чем через 6 ч. Ключ device_only (config/phone-state-legacy-inventory.v1.json).
 */
export const SELLER_INBOX_EMPTY_TTL_MS = 6 * 60 * 60 * 1000;

async function readSellerInboxEmptyAgeMs(authorStableId: string, nowMs: number): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem('community_seller_inbox_empty_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { authorStableId?: unknown; at?: unknown };
    if (parsed?.authorStableId !== authorStableId || typeof parsed.at !== 'number') return null;
    const age = nowMs - parsed.at;
    return age >= 0 && age < SELLER_INBOX_EMPTY_TTL_MS ? age : null;
  } catch (error) {
    console.warn('[MOD-ALERT] empty_cache read failed — иду в сеть:', error instanceof Error ? error.message : String(error)); // guard-ok: лог причины в catch
    return null;
  }
}

function writeSellerInboxEmptyCache(authorStableId: string | null): void {
  const op = authorStableId
    ? AsyncStorage.setItem('community_seller_inbox_empty_v1', JSON.stringify({ authorStableId, at: Date.now() }))
    : AsyncStorage.removeItem('community_seller_inbox_empty_v1');
  void op.catch((error: unknown) => {
    console.warn('[MOD-ALERT] empty_cache write failed:', error instanceof Error ? error.message : String(error)); // guard-ok: лог причины в catch
  });
}

/**
 * Непрочитанные moderation_result из community_seller_inbox — themed modal (очередь), затем mark seen.
 */
export async function flushCommunityModerationAlertsFromInbox(): Promise<void> {
  if (!isCommunityPacksCloudEnabled()) return;
  if (flushRunning) return;
  flushRunning = true;
  try {
    const authorStableId = await getCanonicalUserId();
    if (!authorStableId) return;
    const emptyAgeMs = await readSellerInboxEmptyAgeMs(authorStableId, Date.now());
    if (emptyAgeMs !== null) {
      console.log(`[MOD-ALERT] skip reason=empty_cached age=${Math.round(emptyAgeMs / 60_000)}m ttl=${SELLER_INBOX_EMPTY_TTL_MS / 60_000}m`);
      return;
    }
    const lang = await readAppLang();
    let events: Awaited<ReturnType<typeof callCommunityListSellerInbox>>['events'];
    try {
      const res = await callCommunityListSellerInbox({ authorStableId, limit: 50 });
      events = res.events || [];
    } catch (error) {
      // зачем: письмо о результате модерации не должно пропадать молча — причина в журнале (правило «сперва логи»)
      console.warn('[MOD-ALERT] list inbox failed —', error instanceof Error ? error.message : String(error)); // guard-ok: лог причины в catch
      return;
    }
    const mod = events
      .filter((e) => e && e.type === 'moderation_result' && e.seen === false)
      .sort((a, b) => Number(a.createdAt ?? 0) - Number(b.createdAt ?? 0));
    if (!mod.length) {
      writeSellerInboxEmptyCache(authorStableId);
      return;
    }
    writeSellerInboxEmptyCache(null);
    const seenIds: string[] = [];
    for (const ev of mod) {
      const rec: Record<string, unknown> = { ...(ev as Record<string, unknown>) };
      const pid = String(rec.packId || '').trim();
      const tr = String(rec.titleRu || '').trim();
      const tuk = String(rec.titleUk || '').trim();
      const tes = String(rec.titleEs || '').trim();
      if (pid && !tr && !tuk && !tes) {
        try {
          const eventStudyTarget = String(rec.studyTarget || '').trim();
          const meta = await fetchCommunityPackMeta(pid, eventStudyTarget);
          if (meta) {
            rec.titleRu = meta.titleRu;
            rec.titleUk = meta.titleUk;
            rec.titleEs = meta.titleEs;
          }
        } catch (e) {
      // тіло повідомлення в moderationBody() без сирого id
      DebugLogger.error('communityModerationAlerts:meta', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      }
      const result = String(rec.result || '');
      const title = moderationTitle(result, lang);
      const body = moderationBody(rec, lang);
      await enqueueThemedBlockingInfoAlert(title, body, moderationOkLabel(lang));
      seenIds.push(ev.id);
    }
    if (seenIds.length) {
      try {
        await callCommunityMarkSellerInboxSeen({ authorStableId, eventIds: seenIds });
      } catch (e) {
      // non-critical
      DebugLogger.error('communityModerationAlerts:body', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }
  } finally {
    flushRunning = false;
  }
}

/**
 * DEV-съёмка (R1 cards-gap-014…017, `dev_state?moderation=…`): то же окно решения модерации, но без чтения почтового ящика продавца и без
 * сети — тексты строят те же moderationTitle/moderationBody, что и у настоящего письма. В стор-сборке — отказ с логом.
 */
export async function devShowModerationAlert(result: 'approved' | 'rejected' | 'revision_requested' | 'pack_removed'): Promise<void> {
  if (typeof __DEV__ === 'undefined' || !__DEV__ || IS_STORE_RELEASE) {
    console.warn('[DEV-STATE] moderation отклонено: не dev-сборка'); // guard-ok: ранний выход логируется
    return;
  }
  const lang = await readAppLang();
  const message = result === 'rejected'
    ? 'Слишком мало примеров: добавь предложения с каждым словом.'
    : result === 'revision_requested'
      ? 'Добавь транскрипцию к каждой карточке.'
      : null;
  const rec: Record<string, unknown> = {
    result, titleRu: 'Путешествия', titleUk: 'Подорожі', titleEs: 'Viajes', submissionId: 'sub_dev_0001', packId: 'local_pack_dev_demo_travel', message,
  };
  console.log(`[DEV-STATE] moderation alert ${JSON.stringify({ result, lang })}`); // guard-ok: dev-ветка
  await enqueueThemedBlockingInfoAlert(moderationTitle(result, lang), moderationBody(rec, lang), moderationOkLabel(lang));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
