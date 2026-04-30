import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueueThemedBlockingInfoAlert } from '../themed_blocking_alert_queue';
import {
  isCommunityPacksCloudEnabled,
  callCommunityListSellerInbox,
  callCommunityMarkSellerInboxSeen,
} from './functionsClient';
import { fetchCommunityPackMeta } from './communityFirestore';
import { getCanonicalUserId } from '../user_id_policy';

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
  switch (result) {
    case 'approved':
      return uk ? 'Ваш набір схвалено' : 'Ваш набор одобрен';
    case 'rejected':
      return uk ? 'Ваш набір відхилено' : 'Ваш набор отклонён';
    case 'revision_requested':
      return uk ? 'Потрібні правки' : 'Нужна доработка';
    case 'pack_removed':
      return uk ? 'Набір знято з продажу' : 'Набор снят с продажи';
    default:
      return uk ? 'Модерація' : 'Модерация';
  }
}

function okButtonLabel(lang: string): string {
  return lang.startsWith('uk') ? 'Зрозуміло' : 'Понятно';
}

function moderationBody(ev: Record<string, unknown>, lang: string): string {
  const uk = lang.startsWith('uk');
  const result = String(ev.result || '');
  const titleRu = String(ev.titleRu || '').trim();
  const titleUk = String(ev.titleUk || '').trim();
  const packTitle = uk ? (titleUk || titleRu) : (titleRu || titleUk);
  const lines: string[] = [];
  if (packTitle) lines.push(packTitle);
  const sid = String(ev.submissionId || '').trim();
  const pid = String(ev.packId || '').trim();
  if (sid) {
    lines.push(uk ? `Заявка: ${sid}` : `Заявка: ${sid}`);
  } else if (pid && !packTitle) {
    // Немає title в inbox і не вдалось підвантажити з Firestore — не показуємо сирий id.
    lines.push(uk ? 'Відкрий «Картки» — у списку своїх наборів знайдеш цей.' : 'Открой «Карточки» — в списке своих наборов найдёшь этот.');
  }
  const msg = ev.message != null ? String(ev.message).trim() : '';
  if (msg) {
    lines.push(uk ? `Коментар:\n${msg}` : `Комментарий:\n${msg}`);
  } else if (result === 'revision_requested') {
    lines.push(
      uk
        ? 'Оновіть набір і надішліть знову.'
        : 'Доработайте набор и отправьте снова.',
    );
  } else if (result === 'approved') {
    lines.push(uk ? 'Без додаткового коментаря.' : 'Без дополнительного комментария.');
  } else if (result === 'rejected') {
    lines.push(uk ? 'Без пояснення від модератора.' : 'Без пояснения от модератора.');
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
    } catch {
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
      if (pid && !tr && !tuk) {
        try {
          const meta = await fetchCommunityPackMeta(pid);
          if (meta) {
            rec.titleRu = meta.titleRu;
            rec.titleUk = meta.titleUk;
          }
        } catch {
          /* тіло повідомлення в moderationBody() без сирого id */
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
      } catch {
        /* non-critical */
      }
    }
  } finally {
    flushRunning = false;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
