// ═══════════════════════════════════════════════════════════════════════════
// compass_chat_cron.ts — дневной пост Компаса в чат каждой активной лиги.
//
// Каждый день в 09:00 UTC крон проходит по всем группам ТЕКУЩЕЙ недели и пишет
// в league_chat_messages ровно ОДНО системное сообщение на группу (kind:'system',
// authorUid = LEAGUE_CHAT_SYSTEM_UID). Контент детерминирован по дню (см.
// compass_chat_content.pickCompassPostForDay) и несёт карту i18n со всеми
// языками — клиент рендерит свой.
//
// Стоимость: 1 write на группу/день. Read у юзеров не добавляется — пост
// читается тем же realtime-слушателем чата.
//
// Идемпотентность: id документа детерминирован (`compass_{weekId}_{groupId}_{daySeed}`),
// поэтому повторный запуск крона в тот же день НЕ создаёт дубль (set, не add).
//
// Паттерн пагинации/батчинга скопирован с league_finalize_cron.ts.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getDaySeed, pickCompassPostForDay } from './compass_chat_content';

const LEAGUE_CHAT_SYSTEM_UID = '__league_system__';
const PAGE_SIZE = 200;
const BATCH_LIMIT = 400;

/** ISO weekId текущей недели (UTC) — совпадает с league_groups.getWeekId. */
function getCurrentWeekId(now: Date = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Детерминированный id поста: один и тот же день+группа → один документ (без дублей). */
export function compassPostDocId(weekId: string, groupId: string, daySeed: number): string {
  const safeGroup = String(groupId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'group';
  return `compass_${weekId}_${safeGroup}_${daySeed}`;
}

/** Минимальный размер группы для поста — не засорять одиночные/пустые комнаты. */
const MIN_MEMBERS_FOR_POST = 2;

function countMembers(data: FirebaseFirestore.DocumentData | undefined): number {
  const members = data?.members;
  if (!members || typeof members !== 'object' || Array.isArray(members)) return 0;
  return Object.values(members).filter((m) => (m as Record<string, unknown>)?.identityHidden !== true).length;
}

export const compassChatDailyCron = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
    region: 'us-central1',
  },
  async () => {
    const db = admin.firestore();
    const now = new Date();
    const weekId = getCurrentWeekId(now);
    const daySeed = getDaySeed(now);
    const post = pickCompassPostForDay(daySeed);
    const createdAt = Date.now();
    console.log(`compassChatDailyCron: weekId=${weekId} daySeed=${daySeed} kind=${post.kind}`);

    let processed = 0;
    let written = 0;
    let skipped = 0;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let batch = db.batch();
    let batchCount = 0;

    const flushBatch = async () => {
      if (batchCount > 0) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let query: FirebaseFirestore.Query = db
        .collection('league_groups')
        .where('weekId', '==', weekId)
        .orderBy('__name__')
        .limit(PAGE_SIZE);
      if (lastDoc) query = query.startAfter(lastDoc);

      const snap = await query.get();
      if (snap.empty) break;
      lastDoc = snap.docs[snap.docs.length - 1];

      for (const doc of snap.docs) {
        processed++;
        const data = doc.data();
        if (countMembers(data) < MIN_MEMBERS_FOR_POST) {
          skipped++;
          continue;
        }

        const leagueId = Math.max(0, Math.trunc(Number(data.leagueId ?? 0)));
        const messageRef = db
          .collection('league_chat_messages')
          .doc(compassPostDocId(weekId, doc.id, daySeed));

        const payload: Record<string, unknown> = {
          groupId: doc.id,
          weekId,
          leagueId,
          authorUid: LEAGUE_CHAT_SYSTEM_UID,
          authorName: 'Compass',
          kind: 'system',
          systemType: post.systemType,
          compassKind: post.kind,
          text: post.i18n.ru, // дефолтный текст; клиент рендерит i18n[lang]
          i18n: post.i18n,
          status: 'visible',
          reportCount: 0,
          createdAt,
          updatedAt: createdAt,
        };
        if (post.poll) {
          payload.poll = post.poll;
          payload.pollVotes = {}; // счётчики голосов: { [optionKey]: number } через increment
        }

        // merge:false — но id детерминирован, поэтому повторный запуск перезапишет
        // тем же контентом (идемпотентно). pollVotes сбросится только при повторе
        // в тот же день, что безопасно (тот же daySeed → тот же пост).
        batch.set(messageRef, payload, { merge: false });
        batchCount++;
        written++;

        if (batchCount >= BATCH_LIMIT) {
          await flushBatch();
        }
      }
    }

    await flushBatch();
    console.log(`compassChatDailyCron: processed=${processed} groups, written=${written}, skipped=${skipped}`);
    return;
  },
);
