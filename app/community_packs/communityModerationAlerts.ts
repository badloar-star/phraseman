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

let flushRunning = false;

async function readAppLang(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem('app_lang');
    return (v || 'ru').trim().toLowerCase();
  } catch {
    return 'ru';
  }
}

function moderationTitle(result: string, lang: string): string {
  const uk = lang.startsWith('uk');
  const es = lang.startsWith('es');
  switch (result) {
    case 'approved':
      if (es) return 'Tu pack fue aprobado';
      return uk ? 'Твій набір схвалено' : 'Твой набор одобрен';
    case 'rejected':
      if (es) return 'Tu pack fue rechazado';
      return uk ? 'Твій набір відхилено' : 'Твой набор отклонён';
    case 'revision_requested':
      if (es) return 'Se necesitan cambios';
      return uk ? 'Потрібні правки' : 'Нужна доработка';
    case 'pack_removed':
      if (es) return 'Pack retirado de la venta';
      return uk ? 'Набір знято з продажу' : 'Набор снят с продажи';
    default:
      if (es) return 'Moderación';
      return uk ? 'Модерація' : 'Модерация';
  }
}

// зачем (аудит по Библии, 2026-08-26): «Понятно» — реакция, а не действие
// (Правило 1: глагол в кнопке). Алерт модерации просто закрывается.
function okButtonLabel(lang: string): string {
  if (lang.startsWith('es')) return 'Cerrar';
  return lang.startsWith('uk') ? 'Закрити' : 'Закрыть';
}

function moderationBody(ev: Record<string, unknown>, lang: string): string {
  const uk = lang.startsWith('uk');
  const es = lang.startsWith('es');
  const result = String(ev.result || '');
  const titleRu = String(ev.titleRu || '').trim();
  const titleUk = String(ev.titleUk || '').trim();
  const titleEs = String(ev.titleEs || '').trim();
  const packTitle = es ? (titleEs || titleUk || titleRu) : uk ? (titleUk || titleRu || titleEs) : (titleRu || titleUk || titleEs);
  const lines: string[] = [];
  if (packTitle) lines.push(packTitle);
  const sid = String(ev.submissionId || '').trim();
  const pid = String(ev.packId || '').trim();
  if (sid) {
    lines.push(es ? `Solicitud: ${sid}` : uk ? `Заявка: ${sid}` : `Заявка: ${sid}`);
  } else if (pid && !packTitle) {
    // Немає title в inbox і не вдалось підвантажити з Firestore — не показуємо сирий id.
    lines.push(
      es
        ? 'Abre Tarjetas: lo encontrarás en la lista de tus packs.'
        : uk ? 'Відкрий «Картки» — у списку своїх наборів знайдеш цей.' : 'Открой «Карточки» — в списке своих наборов найдёшь этот.',
    );
  }
  const msg = ev.message != null ? String(ev.message).trim() : '';
  if (msg) {
    lines.push(es ? `Comentario:\n${msg}` : uk ? `Коментар:\n${msg}` : `Комментарий:\n${msg}`);
  } else if (result === 'revision_requested') {
    lines.push(
      es
        ? 'Actualiza el pack y envíalo de nuevo.'
        : uk
        ? 'Онови набір і надішли знову.'
        : 'Доработай набор и отправь снова.',
    );
  } else if (result === 'approved') {
    lines.push(es ? 'Sin comentario adicional.' : uk ? 'Без додаткового коментаря.' : 'Без дополнительного комментария.');
  } else if (result === 'rejected') {
    lines.push(es ? 'Sin explicación del moderador.' : uk ? 'Без пояснення від модератора.' : 'Без пояснения от модератора.');
  }
  return lines.join('\n\n');
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
    if (!mod.length) return;
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
      await enqueueThemedBlockingInfoAlert(title, body, okButtonLabel(lang));
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
  await enqueueThemedBlockingInfoAlert(moderationTitle(result, lang), moderationBody(rec, lang), okButtonLabel(lang));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
