// ═══════════════════════════════════════════════════════════════════════════
// league_finalize_cron.ts — серверная финализация лиги в конце недели.
//
// Проблема: клиент сохранял результат (повышение/понижение) только на основе
// локального/закэшированного снапшота группы. Если снапшот устарел — итоги
// неверные: пользователи получают не тот результат.
//
// Решение: каждый понедельник в 00:05 UTC кроны считают итоги по ВСЕМ группам
// прошедшей недели и записывают каждому участнику:
//   users/{uid}/league_week_results/{weekId} = { rank, total, promoted, demoted,
//                                               newLeagueId, prevLeagueId }
//
// Клиент checkLeagueOnAppOpen затем проверяет этот документ вместо пересчёта
// локально. Если документа нет (кроны ещё не сработали или новый юзер) —
// fallback на старое поведение.
//
// Порядок: одна страница league_groups (500 doc), батч-запись,
//          пагинация по lastDoc. Ожидаемое время: <30сек для 50к групп.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const CLUBS_MAX_ID = 11;
const LEAGUE_RESULT_ZONE_RATIO = 0.15;
const PAGE_SIZE = 200;
const BATCH_LIMIT = 400;

function getLeagueResultZoneSize(total: number): number {
  return total >= 2 ? Math.max(1, Math.round(total * LEAGUE_RESULT_ZONE_RATIO)) : 0;
}

function getPreviousWeekId(now: Date = new Date()): string {
  // ISO week: понедельник = начало недели
  const utcDay = now.getUTCDay(); // 0=Sun
  const daysSinceMonday = (utcDay + 6) % 7;
  // Прошлый понедельник = этот понедельник - 7 дней
  const prevMon = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday - 7,
  ));
  const d = new Date(prevMon.getTime());
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

type MemberResult = {
  rank: number;
  total: number;
  promoted: boolean;
  demoted: boolean;
  prevLeagueId: number;
  newLeagueId: number;
  points: number;
};

function computeGroupResults(
  members: Record<string, { points?: unknown; uid?: unknown }>,
  leagueId: number,
): Record<string, MemberResult> {
  const entries = Object.entries(members)
    .filter(([, m]) => (m as Record<string, unknown>)?.identityHidden !== true)
    .map(([uid, m]) => ({
      uid,
      points: Math.max(0, Math.trunc(Number((m as Record<string, unknown>).points ?? 0)) || 0),
    }))
    .sort((a, b) => b.points - a.points);

  const total = entries.length;
  const zoneSize = getLeagueResultZoneSize(total);
  const results: Record<string, MemberResult> = {};

  entries.forEach((e, idx) => {
    const rank = idx + 1;
    const promoted = total >= 2 && rank <= zoneSize && leagueId < CLUBS_MAX_ID;
    const demoted = total >= 2 && rank >= total - zoneSize + 1 && leagueId > 0 && !promoted;
    results[e.uid] = {
      rank,
      total,
      promoted,
      demoted,
      prevLeagueId: leagueId,
      newLeagueId: promoted ? leagueId + 1 : demoted ? leagueId - 1 : leagueId,
      points: e.points,
    };
  });

  return results;
}

export const leagueFinalizeCron = onSchedule(
  {
    schedule: 'every monday 00:05',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
    region: 'us-central1',
  },
  async () => {
    const db = admin.firestore();
    const weekId = getPreviousWeekId();
    console.log(`leagueFinalizeCron: weekId=${weekId}`);

    let processed = 0;
    let written = 0;
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
        const data = doc.data();
        const leagueId = Math.max(0, Math.trunc(Number(data.leagueId ?? 0)));
        const members = data.members && typeof data.members === 'object' && !Array.isArray(data.members)
          ? data.members as Record<string, { points?: unknown; uid?: unknown }>
          : {};

        const results = computeGroupResults(members, leagueId);

        for (const [uid, result] of Object.entries(results)) {
          const resultRef = db
            .collection('users')
            .doc(uid)
            .collection('league_week_results')
            .doc(weekId);

          batch.set(resultRef, {
            ...result,
            weekId,
            groupId: doc.id,
            finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: false });

          batchCount++;
          written++;

          if (batchCount >= BATCH_LIMIT) {
            await flushBatch();
          }
        }

        processed++;
      }
    }

    await flushBatch();
    console.log(`leagueFinalizeCron: processed=${processed} groups, written=${written} user results`);
    return;
  },
);
