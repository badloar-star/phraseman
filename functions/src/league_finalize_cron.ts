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
import { isResidentMember } from './league_residents';

const CLUBS_MAX_ID = 11;
const LEAGUE_RESULT_ZONE_RATIO = 0.15;
const PAGE_SIZE = 200;
const BATCH_LIMIT = 400;

// XP-режим повышения (remote_config/app). Должен совпадать с клиентом
// (app/league_engine.ts computeLeagueResult, app/remote_flags.ts defaults),
// иначе сервер понизит юзера, которому клиент уже показал бейдж «Переход».
const DEFAULT_XP_PROMOTION_ENABLED = false;
const DEFAULT_XP_PROMOTION_THRESHOLD = 1000;
const XP_PROMOTION_THRESHOLD_MIN = 1;
const XP_PROMOTION_THRESHOLD_MAX = 1000000;

type XpPromotionConfig = { enabled: boolean; threshold: number };

// Читаем флаги XP-режима один раз за запуск крона. Отсутствие/битый док → дефолты
// (rank-режим), т.е. поведение как раньше.
async function loadXpPromotionConfig(
  db: FirebaseFirestore.Firestore,
): Promise<XpPromotionConfig> {
  try {
    const snap = await db.collection('remote_config').doc('app').get();
    const raw = snap.exists ? snap.data() : null;
    const bools = raw && typeof raw.bools === 'object' && raw.bools ? raw.bools : {};
    const numbers = raw && typeof raw.numbers === 'object' && raw.numbers ? raw.numbers : {};
    const enabledRaw = (bools as Record<string, unknown>).league_xp_promotion_enabled;
    const thresholdRaw = Number((numbers as Record<string, unknown>).league_xp_promotion_threshold);
    const enabled = typeof enabledRaw === 'boolean' ? enabledRaw : DEFAULT_XP_PROMOTION_ENABLED;
    const threshold = Number.isFinite(thresholdRaw)
      ? Math.max(XP_PROMOTION_THRESHOLD_MIN, Math.min(XP_PROMOTION_THRESHOLD_MAX, Math.trunc(thresholdRaw)))
      : DEFAULT_XP_PROMOTION_THRESHOLD;
    return { enabled, threshold };
  } catch (err) {
    console.error('leagueFinalizeCron: failed to load remote_config/app, using defaults', err);
    return { enabled: DEFAULT_XP_PROMOTION_ENABLED, threshold: DEFAULT_XP_PROMOTION_THRESHOLD };
  }
}

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

export function computeGroupResults(
  members: Record<string, {
    points?: unknown;
    uid?: unknown;
    isResident?: unknown;
    identityHidden?: unknown;
  }>,
  leagueId: number,
  xpPromotion: XpPromotionConfig,
): Record<string, MemberResult> {
  // Жители — реальные соперники в таблице: они входят в total, ранг и зоны
  // повышения/понижения. Но самим жителям не создаём итоговые документы,
  // не меняем лигу и не выдаём награды. Это разделяет «участвует в соревновании»
  // и «является получателем награды».
  const entries = Object.entries(members)
    .filter(([, m]) => (m as Record<string, unknown>)?.identityHidden !== true)
    .map(([uid, m]) => ({
      uid,
      points: Math.max(0, Math.trunc(Number((m as Record<string, unknown>).points ?? 0)) || 0),
      isResident: isResidentMember(uid, m as Record<string, unknown>),
    }))
    .sort((a, b) => b.points - a.points || a.uid.localeCompare(b.uid));

  const total = entries.length;
  const zoneSize = getLeagueResultZoneSize(total);
  // зачем (владелец, 2026-08-17): в типичной комнате играют 3-5 человек, а хвост —
  // сплошные нули (неактивные + жители без прироста). Competition ranking считает
  // «строго больше/строго меньше», поэтому у игрока с 0 очков строго меньше нет
  // НИКОГО → bottomRank=1, а строго больше — только играющие → rank попадал в зону
  // повышения, и ветка `&& !promoted` гасила понижение. Итог: понижение не
  // происходило вообще (скриншот владельца: 27 место из 29, «Остаёшься в лиге»).
  // Правило владельца: понижаются нижние 15% И ВСЕ с нулём очков; повышение
  // требует хотя бы одного набранного очка.
  const hasAnyScorer = entries.some((candidate) => candidate.points > 0);
  const results: Record<string, MemberResult> = {};

  entries.forEach((e) => {
    // Бот участвует в местах, но не является получателем итога/награды.
    if (e.isResident) return;
    const rank = 1 + entries.filter((candidate) => candidate.points > e.points).length;
    const bottomRank = 1 + entries.filter((candidate) => candidate.points < e.points).length;
    const scored = e.points > 0;
    // XP-режим (зеркало app/league_engine.ts): повышение по набранным
    // очкам, БЕЗ понижения — чтобы сервер совпал с клиентским бейджем «Переход».
    // Иначе — обычный rank-режим (топ-15% ↑, низ-15% ↓).
    const promoted = xpPromotion.enabled
      ? e.points >= xpPromotion.threshold && leagueId < CLUBS_MAX_ID
      : scored && total >= 2 && rank <= zoneSize && leagueId < CLUBS_MAX_ID;
    // Комната, где не играл НИКТО, — не соревнование: там понижать некого,
    // поэтому hasAnyScorer гасит и зонную ветку тоже (иначе в комнате сплошных
    // нулей bottomRank=1 понизил бы разом всех до единого).
    const inZeroZone = !scored && hasAnyScorer;
    const demoted = xpPromotion.enabled
      ? false
      : hasAnyScorer
        && (inZeroZone || (total >= 2 && bottomRank <= zoneSize))
        && leagueId > 0
        && !promoted;
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
    const xpPromotion = await loadXpPromotionConfig(db);
    console.log(
      `leagueFinalizeCron: weekId=${weekId} xpPromotion=${xpPromotion.enabled} threshold=${xpPromotion.threshold}`,
    );

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

        const results = computeGroupResults(members, leagueId, xpPromotion);

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
