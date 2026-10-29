// Лесенка приглашений — серверная часть (владелец 29.10 ~09:20–09:22; защита — координатор).
//
// зачем: друг засчитывается за ПЕРВЫЙ пройденный урок, а не за покупку. Сразу 500 монет обоим, каждый 3-й засчитанный —
// Plus 14 дней пригласившему, история обоим. Всё автоматически, без кнопки «забрать». Решение «засчитать или нет» —
// чистая функция decideReferralLadder; здесь только транзакция и журналы. Повтор ничего не начисляет второй раз:
// монеты — журнал расписок (ключ на пару), Plus — plus_grant_ledger (ключ на ступень), друг — статус строки.
//
// Старая программа (прокрут за покупку) не трогается: строки, созданные до включения лесенки, живут по старым правилам.
// Новые строки при включённой лесенке помечаются program='ladder' (referralApply), и старый путь их пропускает.
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { writeAccessProjectionFromPatch } from './access_projection';
import { contestLessonsCompleted } from './community_month_tally';
import { grantPlusOnce } from './plus_grant';
import { getWeekKey, isoDateUtc } from './progress_events';
import {
  LADDER_COINS_PER_FRIEND,
  LADDER_FRIENDS_PER_TIER,
  LADDER_LESSON_WINDOW_MS,
  LADDER_MAX_FRIENDS_PER_MONTH,
  LADDER_PLUS_DAYS_PER_TIER,
  decideReferralLadder,
  ladderCoinsOpId,
  ladderPlusGrantKey,
  type LadderRefusal,
} from './referral_ladder';
import { policyTimestampMs, referralRoulettePolicyFromData } from './referral_roulette_policy';
import { beginStarLedgerTransactionAttempt, commitStarOperations, prepareStarOperations } from './stars_ledger';

const LOG = '[REF-LADDER]';
export const REFERRAL_LADDER_PROGRAM = 'ladder';
/** Счётчики пригласившего: всего засчитано, по месяцам, сколько ступеней Plus выдано. Пишет только сервер. */
export const REFERRAL_LADDER_STATS = 'referral_ladder_stats';
/** История награды (JSON v1) в progress; до телефона доходит через проекцию доступа (поле referralLastReward). */
export const REFERRAL_LADDER_STORY_FIELD = 'referral_last_reward';
const LADDER_RULE_VERSION = 1;

export type LadderRowState = 'waiting' | 'counted' | 'not_counted';
export type LadderTrigger = 'users_write' | 'apply' | 'list_retry';

/** Флаг лесенки: bools.referral_ladder_enabled (так читает клиент), numbers — запасной путь. Дефолт — выкл. */
export function referralLadderEnabledFromData(data: { bools?: Record<string, unknown>; numbers?: Record<string, unknown> } | undefined): boolean {
  return data?.bools?.referral_ladder_enabled === true || data?.numbers?.referral_ladder_enabled === true;
}

export function ladderMonthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Короткий хэш uid для журнала функций — сырых uid в логах нет (замечание Ревизора 29.10). */
export function ladderLogId(uid: string): string {
  return createHash('sha256').update(uid).digest('hex').slice(0, 10);
}

export type LadderStory = Readonly<{
  v: 1;
  kind: 'ladder';
  role: 'referrer' | 'referee';
  coins: number;
  plusDays: number;
  friendNumber: number;
  atMs: number;
}>;

export function referralLadderStoryValue(input: Omit<LadderStory, 'v' | 'kind'>): string {
  const story: LadderStory = { v: 1, kind: 'ladder', ...input };
  return JSON.stringify(story);
}

/** Отказы, после которых друг уже никогда не будет засчитан: строка закрывается как expired. */
const TERMINAL_REFUSALS: ReadonlySet<LadderRefusal> = new Set<LadderRefusal>([
  'self_referral', 'same_installation', 'account_not_fresh', 'account_age_unknown', 'lesson_window_expired',
]);

export type LadderStats = Readonly<{ countedTotal: number; months: Readonly<Record<string, number>>; plusTiersGranted: number }>;

export function readLadderStats(raw: unknown): LadderStats {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const int = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.trunc(Number(v))) : 0);
  const monthsRaw = (data.months && typeof data.months === 'object' ? data.months : {}) as Record<string, unknown>;
  const months: Record<string, number> = {};
  for (const [k, v] of Object.entries(monthsRaw)) if (/^\d{4}-\d{2}$/.test(k)) months[k] = int(v);
  return { countedTotal: int(data.countedTotal), months, plusTiersGranted: int(data.plusTiersGranted) };
}

/** Профиль: created_at, иначе время создания документа (метаданные Firestore, клиент не подделает). */
function accountCreatedAtMs(snap: admin.firestore.DocumentSnapshot): number | null {
  const profile = policyTimestampMs(snap.data()?.created_at);
  if (profile > 0) return profile;
  const doc = snap.createTime ? snap.createTime.toMillis() : 0;
  return doc > 0 ? doc : null;
}

export type LadderOutcome =
  | Readonly<{ status: 'counted'; friendNumber: number; plusTier: number | null }>
  | Readonly<{ status: 'refused'; reason: LadderRefusal | 'flag_off' | 'emergency_stop' }>
  | Readonly<{ status: 'skipped'; reason: string }>;

/**
 * Засчитать друга (refereeUid) за первый урок. Вызывается из триггера записи профиля (переход уроков 0 → ≥1),
 * сразу после ввода кода (урок уже был) и из списка приглашений (повтор после месячного лимита).
 */
export async function processReferralLadderLesson(
  db: admin.firestore.Firestore,
  refereeUid: string,
  trigger: LadderTrigger,
  nowMsInput?: number,
): Promise<LadderOutcome> {
  const tag = `referee=${ladderLogId(refereeUid)} trigger=${trigger}`;
  const attRef = db.collection('referral_attributions').doc(refereeUid);
  const pre = await attRef.get();
  const pre0 = pre.data() as { program?: string; status?: string; referrerStableId?: string } | undefined;
  if (!pre.exists || pre0?.program !== REFERRAL_LADDER_PROGRAM) {
    console.log(`${LOG} skip ${tag} reason=${pre.exists ? `program_${String(pre0?.program ?? 'roulette')}` : 'no_attribution'}`);
    return { status: 'skipped', reason: pre.exists ? 'not_ladder_row' : 'no_attribution' };
  }
  if (pre0.status !== 'pending') {
    console.log(`${LOG} skip ${tag} reason=status_${String(pre0.status)}`);
    return { status: 'skipped', reason: `status_${String(pre0.status)}` };
  }
  const referrerUid = String(pre0.referrerStableId ?? '').trim();
  if (!referrerUid) {
    console.warn(`${LOG} skip ${tag} reason=no_referrer`);
    return { status: 'skipped', reason: 'no_referrer' };
  }
  const refTag = `${tag} referrer=${ladderLogId(referrerUid)}`;
  const configRef = db.collection('remote_config').doc('app');
  const refereeRef = db.collection('users').doc(refereeUid);
  const referrerRef = db.collection('users').doc(referrerUid);
  const statsRef = db.collection(REFERRAL_LADDER_STATS).doc(referrerUid);

  let outcome: LadderOutcome;
  try {
    outcome = await db.runTransaction(async (tx): Promise<LadderOutcome> => {
      // зачем: SDK повторяет колбэк с тем же tx при конфликте — без сброса защита журнала монет сочла бы повтор двойным
      beginStarLedgerTransactionAttempt(tx);
      const [configSnap, attSnap, refereeSnap, referrerSnap, statsSnap] = await Promise.all([
        tx.get(configRef), tx.get(attRef), tx.get(refereeRef), tx.get(referrerRef), tx.get(statsRef),
      ]);
      const nowMs = nowMsInput ?? Date.now();
      const config = configSnap.data() as { bools?: Record<string, unknown>; numbers?: Record<string, unknown> } | undefined;
      if (!referralLadderEnabledFromData(config)) return { status: 'refused', reason: 'flag_off' };
      if (referralRoulettePolicyFromData(config).emergencyStop) return { status: 'refused', reason: 'emergency_stop' };
      const att = attSnap.data() as Record<string, unknown> | undefined;
      if (!attSnap.exists || att?.program !== REFERRAL_LADDER_PROGRAM || att?.status !== 'pending') {
        return { status: 'skipped', reason: 'row_changed' };
      }
      if (!refereeSnap.exists || !referrerSnap.exists) return { status: 'skipped', reason: 'user_missing' };

      const appliedAtMs = policyTimestampMs(att.createdAtMs) || policyTimestampMs(att.createdAt);
      // зачем: урок, упёршийся в месячный лимит, засчитываем позже по ВРЕМЕНИ УРОКА, а не повтора — иначе лимит
      // съедал бы окно 30 дней у честного друга.
      const lessonAtMs = policyTimestampMs(att.ladderLessonPassedAtMs) || nowMs;
      const refereeProgress = (refereeSnap.data()?.progress ?? {}) as Record<string, unknown>;
      const stats = readLadderStats(statsSnap.data());
      const monthKey = ladderMonthKey(nowMs);
      const decision = decideReferralLadder({
        referrerUid,
        refereeUid,
        // зачем: идентификатора установки на сервере пока нет — 147/148 его не присылают (сообщено координатору).
        referrerInstallationId: null,
        refereeInstallationId: null,
        appliedAtMs,
        refereeCreatedAtMs: accountCreatedAtMs(refereeSnap),
        refereeLessonsCompleted: contestLessonsCompleted(refereeProgress),
        lessonAtMs,
        alreadyCounted: false,
        referrerCountedThisMonth: stats.months[monthKey] ?? 0,
        referrerCountedTotal: stats.countedTotal,
      });

      if (!decision.ok) {
        console.log(`${LOG} refuse ${refTag} reason=${decision.reason} detail=${JSON.stringify(decision.detail)} appliedAtMs=${appliedAtMs} lessonAtMs=${lessonAtMs}`);
        if (decision.reason === 'monthly_cap') {
          // остаётся в ожидании: засчитается в следующем месяце (повтор — из списка приглашений пригласившего)
          tx.set(attRef, { ladder: 'waiting' as LadderRowState, ladderLessonPassedAtMs: lessonAtMs, ladderCapWaiting: true, updatedAtMs: nowMs }, { merge: true });
        } else if (TERMINAL_REFUSALS.has(decision.reason)) {
          // причина хранится только на сервере; клиенту уходит лишь «не засчитан» (контракт с Дизайном)
          tx.set(attRef, {
            status: 'expired', ladder: 'not_counted' as LadderRowState, ladderReason: decision.reason,
            expiredAtMs: nowMs, expiryReason: `ladder_${decision.reason}`, ladderCapWaiting: false, updatedAtMs: nowMs,
          }, { merge: true });
        }
        return { status: 'refused', reason: decision.reason };
      }

      const ctx = { nowMs, activeSeasonId: '', weekKeyNow: getWeekKey(isoDateUtc(new Date(nowMs))), authUid: 'referral_ladder' };
      const coinOp = (side: 'referrer' | 'referee') => ({
        opId: ladderCoinsOpId(referrerUid, refereeUid, side),
        delta: decision.coinsEach,
        reason: 'referral_ladder' as const,
        sourceKind: 'referral_ladder',
        sourceId: createHash('sha256').update(`${referrerUid}|${refereeUid}`).digest('hex').slice(0, 40),
        ruleVersion: LADDER_RULE_VERSION,
        earnedAtMs: nowMs,
      });
      const referrerPrepared = await prepareStarOperations(tx, db, referrerUid, referrerSnap, [coinOp('referrer')], ctx);
      const refereePrepared = await prepareStarOperations(tx, db, refereeUid, refereeSnap, [coinOp('referee')], ctx);
      const bad = [...referrerPrepared.outcomes, ...refereePrepared.outcomes].find((o) => o.status === 'rejected');
      if (bad) {
        console.error(`${LOG} coins_rejected ${refTag} code=${String(bad.errorCode)}`);
        throw new Error(`ladder_coins_rejected:${String(bad.errorCode)}`);
      }

      const referrerStory = referralLadderStoryValue({
        role: 'referrer', coins: decision.coinsEach, plusDays: decision.plusDays, friendNumber: decision.friendNumber, atMs: nowMs,
      });
      const refereeStory = referralLadderStoryValue({
        role: 'referee', coins: decision.coinsEach, plusDays: 0, friendNumber: decision.friendNumber, atMs: nowMs,
      });
      const referrerProgress = (referrerSnap.data()?.progress ?? {}) as Record<string, unknown>;
      commitStarOperations(tx, referrerPrepared, { progress: { [REFERRAL_LADDER_STORY_FIELD]: referrerStory } });
      commitStarOperations(tx, refereePrepared, { progress: { [REFERRAL_LADDER_STORY_FIELD]: refereeStory } });
      // проекция собирается из progress целиком (merge:false) — без этого история не дойдёт до телефона
      writeAccessProjectionFromPatch(tx, referrerRef, referrerProgress, { [REFERRAL_LADDER_STORY_FIELD]: referrerStory }, nowMs);
      writeAccessProjectionFromPatch(tx, refereeRef, refereeProgress, { [REFERRAL_LADDER_STORY_FIELD]: refereeStory }, nowMs);

      tx.set(attRef, {
        status: 'rewarded', rewardKind: 'ladder', ladder: 'counted' as LadderRowState,
        lessonPassedAtMs: lessonAtMs, rewardedAtMs: nowMs, friendNumber: decision.friendNumber, ladderCapWaiting: false, updatedAtMs: nowMs,
      }, { merge: true });
      tx.set(statsRef, {
        countedTotal: stats.countedTotal + 1,
        months: { ...stats.months, [monthKey]: (stats.months[monthKey] ?? 0) + 1 },
        updatedAtMs: nowMs,
      }, { merge: true });
      return { status: 'counted', friendNumber: decision.friendNumber, plusTier: decision.plusTier };
    });
  } catch (error) {
    console.warn(`${LOG} failed ${refTag} reason=${error instanceof Error ? error.message.slice(0, 160) : String(error)}`);
    throw error;
  }
  console.log(`${LOG} result ${refTag} ${JSON.stringify(outcome)}`);
  if (outcome.status === 'counted' && outcome.plusTier) {
    await grantLadderPlusTier(db, referrerUid, outcome.plusTier, outcome.friendNumber);
  }
  return outcome;
}

/** Plus за ступень: идемпотентно (plus_grant_ledger), сбой не теряет награду — повтор из списка приглашений. */
export async function grantLadderPlusTier(
  db: admin.firestore.Firestore,
  referrerUid: string,
  tier: number,
  friendNumber: number,
): Promise<boolean> {
  const tag = `referrer=${ladderLogId(referrerUid)} tier=${tier}`;
  try {
    const nowMs = Date.now();
    const result = await grantPlusOnce(db, {
      uid: referrerUid,
      grantKey: ladderPlusGrantKey(referrerUid, tier),
      duration: { days: LADDER_PLUS_DAYS_PER_TIER },
      plan: 'referral_ladder',
      source: 'referral_ladder',
      extraProgress: {
        [REFERRAL_LADDER_STORY_FIELD]: referralLadderStoryValue({
          role: 'referrer', coins: LADDER_COINS_PER_FRIEND, plusDays: LADDER_PLUS_DAYS_PER_TIER, friendNumber, atMs: nowMs,
        }),
      },
      // зачем (Моменты 29.10): у бессрочного Plus продлевать нечего — история без строки про Plus (plusDays 0),
      // как у истории победителю конкурса; иначе кадр обещал бы «+14 дней Plus», которых не было
      extraProgressLifetime: {
        [REFERRAL_LADDER_STORY_FIELD]: referralLadderStoryValue({
          role: 'referrer', coins: LADDER_COINS_PER_FRIEND, plusDays: 0, friendNumber, atMs: nowMs,
        }),
      },
    });
    console.log(`${LOG} plus ${tag} status=${result.status}`);
    if (result.status === 'user_missing') return false;
    await db.collection(REFERRAL_LADDER_STATS).doc(referrerUid).set({ plusTiersGranted: tier, updatedAtMs: nowMs }, { merge: true });
    return true;
  } catch (error) {
    console.warn(`${LOG} plus_failed ${tag} reason=${error instanceof Error ? error.message.slice(0, 160) : String(error)}`);
    return false;
  }
}

export type LadderSummary = Readonly<{
  countedFriends: number;
  plusGrants: number;
  coinsPerFriend: number;
  plusDaysPerGrant: number;
  friendsPerGrant: number;
  monthCounted: number;
  monthlyCap: number;
  lessonWindowDays: number;
}>;

/** Поле ladder ответа referralListMyInvites (контракт с Дизайном 29.10). */
export function ladderSummary(stats: LadderStats, nowMs: number): LadderSummary {
  return {
    countedFriends: stats.countedTotal,
    plusGrants: Math.floor(stats.countedTotal / LADDER_FRIENDS_PER_TIER),
    coinsPerFriend: LADDER_COINS_PER_FRIEND,
    plusDaysPerGrant: LADDER_PLUS_DAYS_PER_TIER,
    friendsPerGrant: LADDER_FRIENDS_PER_TIER,
    monthCounted: stats.months[ladderMonthKey(nowMs)] ?? 0,
    monthlyCap: LADDER_MAX_FRIENDS_PER_MONTH,
    lessonWindowDays: Math.round(LADDER_LESSON_WINDOW_MS / (24 * 60 * 60 * 1000)),
  };
}

/** Переход «уроков не было → появился», ради которого стоит идти в базу. Без чтений. */
export function ladderLessonTransition(
  before: Readonly<Record<string, unknown>> | undefined,
  after: Readonly<Record<string, unknown>> | undefined,
): boolean {
  return contestLessonsCompleted(after) >= 1 && contestLessonsCompleted(before) < 1;
}

/**
 * Повторы для пригласившего (вызов из referralListMyInvites, у которого свой кэш 60 с):
 *  - ступени Plus, выдача которых сорвалась (склейка аккаунта и т. п.) — по журналу plus_grant_ledger повтор безопасен;
 *  - друзья, упёршиеся в месячный лимит, — в новом месяце засчитываются по времени своего урока.
 * Дёшево: 1 чтение счётчиков + запрос только строк с флагом ladderCapWaiting (лимит 3).
 */
export async function retryReferralLadderForReferrer(db: admin.firestore.Firestore, referrerUid: string): Promise<void> {
  const tag = `referrer=${ladderLogId(referrerUid)}`;
  try {
    const statsSnap = await db.collection(REFERRAL_LADDER_STATS).doc(referrerUid).get();
    // нет счётчиков — лесенка этому человеку ещё ничего не засчитывала и не упиралась в лимит: повторять нечего
    if (!statsSnap.exists) return;
    const stats = readLadderStats(statsSnap.data());
    const dueTiers = Math.floor(stats.countedTotal / LADDER_FRIENDS_PER_TIER);
    for (let tier = stats.plusTiersGranted + 1; tier <= Math.min(dueTiers, stats.plusTiersGranted + 2); tier += 1) {
      console.log(`${LOG} retry_plus ${tag} tier=${tier} granted=${stats.plusTiersGranted} due=${dueTiers}`);
      await grantLadderPlusTier(db, referrerUid, tier, tier * LADDER_FRIENDS_PER_TIER);
    }
    const monthCounted = stats.months[ladderMonthKey(Date.now())] ?? 0;
    if (monthCounted >= LADDER_MAX_FRIENDS_PER_MONTH) return;
    const waiting = await db.collection('referral_attributions')
      .where('referrerStableId', '==', referrerUid)
      .where('ladderCapWaiting', '==', true)
      .limit(3)
      .get();
    for (const doc of waiting.docs) {
      console.log(`${LOG} retry_cap ${tag} referee=${ladderLogId(doc.id)} monthCounted=${monthCounted}`);
      const outcome = await processReferralLadderLesson(db, doc.id, 'list_retry');
      if (outcome.status === 'refused' && outcome.reason === 'monthly_cap') break;
    }
  } catch (error) {
    // повтор — не причина ронять список приглашений: человек увидит прежнее состояние, следующий заход повторит
    console.warn(`${LOG} retry_failed ${tag} reason=${error instanceof Error ? error.message.slice(0, 160) : String(error)}`);
  }
}
