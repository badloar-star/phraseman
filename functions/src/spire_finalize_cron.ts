// ═══════════════════════════════════════════════════════════════════════════
// spire_finalize_cron.ts — недельный итог Шпиля (PM-276, TOWER.md §4.7).
//
// зачем (владелец 2026-09-24): в понедельник каждая комната Шпиля прошлой
// недели подводит итог — место по ступеням, переход в соседний шпиль, монеты
// за место и повышение. Логика одной комнаты — spire_finalize_core.ts.
//
// Отдельный крон для комнат Шпиля: они живут в своей коллекции
// `spire_groups` и имеют самостоятельный недельный итог.
//
// Что пишет на каждого ЖИВОГО участника (ботам — ничего):
//   users/{uid}/spire_week_results/{weekId}_{lang} — итог (место, зоны,
//     шпиль до/после, сколько монет положено). Клиент покажет его ФАКТОМ при
//     первом заходе в Шпиль (§4.7, закон «празднование не durable»): документ —
//     это сама награда/итог, а не «долг на показ».
//   leaderboard/{uid}.spireTiers.{lang} — новый шпиль, ТОЛЬКО если он
//     изменился. spireJoinRoom (PM-277) читает именно это поле при входе в
//     комнату следующей недели.
// И на комнату: spire_groups/{id}.finalizedAt + open:false — повторный запуск
// (ретрай крона) пропускает уже подведённые комнаты и не пишет второй раз.
//
// МОНЕТЫ (PM-280, закрывает О-276-1): сумма пишется в итог (rewardCoins,
// rewardStatus: 'pending_wallet'), затем payoutSpireWeekReward кладёт её в
// журнал рун (монеты = руны до PM-069) по ключу spire_week:{lang}_{weekId} и
// ставит rewardStatus: 'paid'. Порядок на комнату: итоги → flush → выплаты →
// отметка finalizedAt. Если хоть одна выплата комнаты не прошла, отметку НЕ
// ставим и в конце прогона бросаем ошибку: Cloud Scheduler повторит прогон
// (retryCount), ретрай пропустит подведённые комнаты, а выплаты идемпотентны.
//
// Firebase-экономия: 1 запуск в неделю; 1 чтение config/spire_v1; комнаты —
// одним запросом по weekId страницами по 200 (чтений = число комнат прошлой
// недели); записей — по 1 итогу на живого + 1 leaderboard только при смене
// шпиля + 1 отметка на комнату. Ботов — 0 чтений/записей (формула).
// Составной индекс не нужен: равенство weekId + порядок по __name__.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { withCronHeartbeat } from './cron_heartbeat';
import {
  SPIRE_CONFIG_COLLECTION,
  SPIRE_CONFIG_DOC_ID,
  spireConfigStatus,
  spireEffectiveRankBy,
  type SpireConfigDoc,
} from './spire_config_contract';
import { normalizeStars, starsWeekEarned } from './stars_ledger';
import { payoutSpireWeekReward } from './spire_week_payout';
import { SPIRE_GROUPS_COLLECTION, spireWeekId } from './spire_groups';
import { isSpireResidentMember, spireWeekStartMs } from './spire_residents';
import { runSpireWeekResultPush, type SpireWeekResultPushInput } from './spire_week_result_push';
import { spireEnergyDeltaForWeek } from '../../shared/spire_energy_bonus';
import {
  completeFrozenSpireRoom,
  freezeSpireRoom,
  loadFrozenSpireRoomResults,
} from './spire_finalization_freeze';

const LOG = '[SPIRE-FINALIZE]';
// зачем 200 комнат на страницу при выплатах: каждая комната теперь ещё и
// flush + до ~8 транзакций выплат; страница остаётся прежней, лимит времени
// 540 с — при росте числа комнат выплаты стоит вынести в отдельный крон.
const PAGE_SIZE = 200;
const BATCH_LIMIT = 400;
export const SPIRE_WEEK_RESULTS_SUBCOLLECTION = 'spire_week_results' as const;

/** Неделя, итог которой подводим: та, что закончилась к моменту запуска. */
export function spirePreviousWeek(nowMs: number): { weekId: string; weekStartMs: number } {
  const currentStart = spireWeekStartMs(nowMs);
  const prevStart = spireWeekStartMs(currentStart - 1);
  return { weekId: spireWeekId(new Date(prevStart)), weekStartMs: prevStart };
}

async function loadSpireConfig(db: admin.firestore.Firestore): Promise<SpireConfigDoc> {
  try {
    // guard-ok: одиночный документ config/spire_v1, не выборка коллекции.
    const snap = await db.collection(SPIRE_CONFIG_COLLECTION).doc(SPIRE_CONFIG_DOC_ID).get();
    const status = spireConfigStatus(snap.exists ? snap.data() : null);
    console.log(LOG, JSON.stringify({
      event: 'config', exists: status.exists, valid: status.valid, live: status.liveForPlayers,
      coins: status.config.coins, residents: status.config.residents,
    }));
    return status.config;
  } catch (err) {
    // Итог недели важнее точных сумм: на отказе конфига — дефолты TOWER.md §4.6.
    console.error(LOG, JSON.stringify({ event: 'config_read_failed', error: String((err as Error)?.message ?? err) }));
    return spireConfigStatus(null).config;
  }
}

/** getAll за раз — с запасом под лимит запроса; комната ≤ 30 мест, живых меньше. */
const WEEK_COINS_READ_CHUNK = 100;

/**
 * D162: монеты недели живых участников комнаты — сумма всех режимов из журнала (users.stars), ДО потолка.
 * зачем getAll с маской 'stars' (Firebase-экономия): одно чтение на живого в неделю и только поле журнала, без профиля.
 * starsWeekEarned читает и прошлую неделю (prevWeekEarned) — в понедельник неделя у многих уже перенесена.
 * Ошибка чтения не глотается: прогон падает и повторяется (retryCount), подведённые комнаты пропускаются.
 */
export async function spireReadWeekCoins(
  db: admin.firestore.Firestore,
  members: Readonly<Record<string, unknown>>,
  weekId: string,
): Promise<Record<string, number>> {
  const uids = Object.entries(members)
    .filter(([uid, raw]) => raw && typeof raw === 'object' && !isSpireResidentMember(uid, raw as Record<string, unknown>))
    .map(([uid]) => uid);
  const out: Record<string, number> = {};
  for (let i = 0; i < uids.length; i += WEEK_COINS_READ_CHUNK) {
    const refs = uids.slice(i, i + WEEK_COINS_READ_CHUNK).map((uid) => db.collection('users').doc(uid));
    if (refs.length === 0) continue;
    // guard-ok: точечные документы по id (участники комнаты), не листинг коллекции.
    const snaps = await db.getAll(...refs, { fieldMask: ['stars'] });
    for (const snap of snaps) {
      out[snap.id] = snap.exists ? starsWeekEarned(normalizeStars(snap.get('stars')), weekId) : 0;
    }
  }
  return out;
}

function membersOf(data: Record<string, unknown>): Record<string, unknown> {
  const m = data.members;
  return m && typeof m === 'object' && !Array.isArray(m) ? m as Record<string, unknown> : {};
}

export async function runSpireFinalizeCronHandler(
  db: admin.firestore.Firestore,
  startedAt = Date.now(),
): Promise<Record<string, number>> {
  const { weekId, weekStartMs } = spirePreviousWeek(startedAt);
  const weekEndMs = spireWeekStartMs(startedAt);
  let rooms = 0;
  let skipped = 0;
  let results = 0;
  let tierWrites = 0;
  let promoted = 0;
  let demoted = 0;
  let payoutsPaid = 0;
  let payoutsFailed = 0;
  let coinsPaid = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  const pushInputs: SpireWeekResultPushInput[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query: FirebaseFirestore.Query = db.collection(SPIRE_GROUPS_COLLECTION)
      .where('weekId', '==', weekId).orderBy('__name__').limit(PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];
    for (const doc of snap.docs) {
      const initial = doc.data() as Record<string, unknown>;
      if (initial.finalizedAt) { skipped++; continue; }
      const frozen = await freezeSpireRoom(db, doc.ref, weekStartMs);
      if (frozen.status === 'hold' || frozen.status === 'integrity_room_hold') {
        skipped++;
        payoutsFailed++;
        console.warn(LOG, JSON.stringify({
          event: 'room_incomplete', groupId: doc.id, weekId, lang: initial.lang, reason: frozen.reason ?? frozen.status,
        }));
        continue;
      }
      const loaded = await loadFrozenSpireRoomResults(db, doc.ref);
      if (loaded.status !== 'loaded') {
        skipped++;
        payoutsFailed++;
        console.warn(LOG, JSON.stringify({
          event: 'room_incomplete', groupId: doc.id, weekId, lang: initial.lang, reason: loaded.status,
        }));
        continue;
      }
      const lang = String(loaded.room.lang);
      let roomFailed = 0;
      const roomPushInputs: SpireWeekResultPushInput[] = [];
      for (const [uid, result] of Object.entries(loaded.results)) {
        results++;
        if (result.promoted) promoted++;
        if (result.demoted) demoted++;
        if (result.newTier !== result.prevTier) tierWrites++;
        try {
          const outcome = await payoutSpireWeekReward(db, {
            uid, groupId: doc.id, weekId, lang,
            resultRef: db.collection('users').doc(uid).collection(SPIRE_WEEK_RESULTS_SUBCOLLECTION).doc(`${weekId}_${lang}`),
            roomRef: doc.ref,
            weekEndMs,
          });
          if (outcome.status === 'paid') { payoutsPaid++; coinsPaid += outcome.coins; }
          if (outcome.status === 'rejected' || outcome.status.startsWith('skipped_') || outcome.status === 'integrity_room_hold') {
            roomFailed++;
            if (outcome.status === 'integrity_room_hold') break;
          }
        } catch (error) {
          roomFailed++;
          void error;
          console.error(LOG, JSON.stringify({
            event: 'payout_failed', groupId: doc.id, weekId, lang, reason: 'payout_exception',
          }));
        }
        roomPushInputs.push({
          uid, studyLang: lang, prevTier: result.prevTier, newTier: result.newTier,
          promoted: result.promoted, demoted: result.demoted,
        });
      }
      payoutsFailed += roomFailed;
      if (roomFailed > 0) continue;
      const completion = await completeFrozenSpireRoom(db, doc.ref);
      if (completion.status !== 'finalized' && completion.status !== 'already_finalized') {
        payoutsFailed++;
        console.warn(LOG, JSON.stringify({
          event: 'room_incomplete', groupId: doc.id, weekId, lang, reason: completion.status,
        }));
        continue;
      }
      pushInputs.push(...roomPushInputs);
      rooms++;
    }
  }

  let pushSent = 0;
  if (pushInputs.length > 0) {
    try { pushSent = (await runSpireWeekResultPush(db, pushInputs)).sent; }
    catch (error) {
      void error;
      console.error(LOG, JSON.stringify({ event: 'week_result_push_failed', reason: 'push_exception' }));
    }
  }
  const summary = { rooms, skipped, results, tierWrites, promoted, demoted, payoutsPaid, payoutsFailed, coinsPaid, pushSent };
  console.log(LOG, JSON.stringify({ event: 'done', weekId, ...summary, tookMs: Date.now() - startedAt }));
  if (payoutsFailed > 0) throw new Error(`spire_payouts_incomplete:${payoutsFailed}`);
  return summary;
}

export const spireFinalizeCron = onSchedule(
  {
    // зачем 00:01: отчёты последних 10 минут недели засчитываются уже в НОВУЮ
    // неделю (D61, О-275-3), так что комнаты прошлой недели после 00:00 не
    // меняются. Чем раньше итог — тем меньше людей успеют войти в комнату
    // новой недели со старым шпилем (см. открытый вопрос в evidence PM-276).
    schedule: 'every monday 00:01',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
    region: 'us-central1',
    // зачем (PM-280): упавшая выплата монет роняет прогон, чтобы его повторили.
    // Повтор безопасен: подведённые комнаты пропускаются, выплаты — по ключу.
    retryCount: 3,
  },
  withCronHeartbeat('spireFinalizeCron', async () => runSpireFinalizeCronHandler(admin.firestore())),
);
