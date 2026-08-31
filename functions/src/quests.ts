// ════════════════════════════════════════════════════════════════════════════
// quests.ts — «Задания»: callable-обёртки поверх чистого ядра quests_core.ts.
//
// Транзакции и firebase-admin только здесь (образец: shard_survey.ts).
//
// Экономика наград НЕ дублируется: сервер записывает факт «награда положена»
// (reward_claims + external_economy_events), а фактическое зачисление жемчуга,
// рун и спинов выполняет клиент теми же путями, что и подарки Пути дня
// (app/daily_journey_gift_activation.ts). Единственное исключение — дни Plus:
// доступ живёт только на сервере (progress.premium_*), клиент его не пишет.
//
// Логи: единый префикс [QUESTS] на всю задачу, каждый ранний выход и каждый
// catch называет причину (правило владельца «сперва логи, потом починка»).
// ════════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { appendExternalEconomyEvent } from './external_economy_events';
import {
  parseQuestConfig,
  parseQuestProgress,
  validateQuestConfigForWrite,
  buildPublicQuestSnapshot,
  resolveQueuePromotion,
  resolveQuestPhase,
  questIsComplete,
  questExpiryMs,
  questProgressValue,
  QUEST_KIND_IS_DELTA,
  QUEST_SCHEMA_VERSION,
  type QuestConfig,
  type QuestKind,
  type QuestProgressState,
  type PublicQuestSnapshot,
} from './quests_core';

const USERS = 'users';
const QUESTS = 'quests';
const QUEST_PROGRESS = 'quest_progress';
const QUEST_STATS = 'quest_stats';
const REWARD_CLAIMS = 'reward_claims';
const LOG = '[QUESTS]';

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function int(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Сериализация конфига в документ. Одна форма на запись и на активацию. */
function questDocument(config: QuestConfig): Record<string, unknown> {
  return {
    schemaVersion: QUEST_SCHEMA_VERSION,
    questId: config.questId,
    status: config.status,
    kind: config.kind,
    target: config.target,
    title: config.title,
    body: config.body,
    rewards: config.rewards.map((r) => ({ kind: r.kind, amount: r.amount })),
    durationHours: config.durationHours,
    queueOrder: config.queueOrder,
    scheduledStartMs: config.scheduledStartMs,
    activatedAtMs: config.activatedAtMs,
    expiresAtMs: config.expiresAtMs,
    createdAtMs: config.createdAtMs,
    updatedAtMs: config.updatedAtMs,
    updatedBy: config.updatedBy,
  };
}

/**
 * Разбор очереди: истёкшее активное закрывается, следующее поднимается.
 *
 * зачем экономия: читаем ТОЛЬКО документы со статусами active/queued
 * (обычно 1 + несколько), а не всю коллекцию заданий. Вызывается при заходе
 * игрока на Главную, поэтому крон не нужен — очередь двигается сама.
 */
async function settleQuestQueue(
  db: admin.firestore.Firestore,
  nowMs: number,
): Promise<QuestConfig | null> {
  const [activeSnap, queuedSnap] = await Promise.all([
    db.collection(QUESTS).where('status', '==', 'active').limit(4).get(),
    db.collection(QUESTS).where('status', '==', 'queued').orderBy('queueOrder').limit(20).get(),
  ]);

  const active = activeSnap.docs.map((d) => parseQuestConfig(d.data())).find((c): c is QuestConfig => c !== null) ?? null;
  const queued = queuedSnap.docs
    .map((d) => parseQuestConfig(d.data()))
    .filter((c): c is QuestConfig => c !== null);

  const decision = resolveQueuePromotion({ active, queued, nowMs });

  if (decision.action === 'keep_active') return active;
  if (decision.action === 'idle') {
    console.log(`${LOG} queue_idle active=none queued=${queued.length}`);
    return null;
  }

  const batch = db.batch();
  let promotedId: string | null = null;

  if (decision.action === 'expire_and_promote') {
    batch.set(
      db.collection(QUESTS).doc(decision.expireQuestId),
      { status: 'expired', updatedAtMs: nowMs },
      { merge: true },
    );
    console.log(`${LOG} queue_expire quest=${decision.expireQuestId} nowMs=${nowMs}`);
    promotedId = decision.promoteQuestId;
  } else {
    promotedId = decision.promoteQuestId;
  }

  if (!promotedId) {
    await batch.commit();
    return null;
  }

  const promotedConfig = queued.find((q) => q.questId === promotedId) ?? null;
  if (!promotedConfig) {
    await batch.commit();
    console.warn(`${LOG} queue_promote_missing quest=${promotedId}`);
    return null;
  }
  const activated: QuestConfig = Object.freeze({
    ...promotedConfig,
    status: 'active' as const,
    activatedAtMs: nowMs,
    expiresAtMs: questExpiryMs(promotedConfig, nowMs),
    updatedAtMs: nowMs,
  });
  batch.set(db.collection(QUESTS).doc(promotedId), questDocument(activated), { merge: true });
  await batch.commit();
  console.log(`${LOG} queue_promote quest=${promotedId} expiresAtMs=${activated.expiresAtMs}`);
  return activated;
}

// ────────────────────────────────────────────────────────────────────────────
// Счётчики прогресса.
//
// Значения берём из уже существующих полей users/{uid} — новых писателей не
// создаём. Это принципиально: чужой писатель мог бы разойтись с источником
// правды и «врать нулями» (класс бага из CLAUDE.md про Джарвиса).
// ────────────────────────────────────────────────────────────────────────────
function counterForKind(kind: QuestKind, user: Record<string, unknown>): number {
  const progress = record(user.progress);
  const stars = record(user.stars);
  switch (kind) {
    case 'earn_runes':
      return int(stars.earnedTotal);
    case 'earn_xp':
      return Math.max(int(progress.user_total_xp), int(record(user.progressServerState).totalXp));
    case 'complete_lessons': {
      const direct = int(progress.lessons_completed);
      if (direct > 0) return direct;
      const completed = progress.completed_lessons;
      if (Array.isArray(completed)) return completed.length;
      if (completed && typeof completed === 'object') return Object.keys(completed).length;
      return 0;
    }
    case 'streak_days':
      return Math.max(int(progress.current_streak), int(progress.streak_days));
    default:
      // Событийные типы (спины, видео, друзья, набор, арена, карточки) сервер
      // не вычисляет из профиля: их присылает клиент через questReportProgress,
      // и хранится их счётчик в самом документе прогресса.
      return -1;
  }
}

/** Типы, чей счётчик присылает клиент событием, а не выводится из профиля. */
function isClientReportedKind(kind: QuestKind): boolean {
  return counterForKind(kind, {}) === -1;
}

async function loadActiveQuest(
  db: admin.firestore.Firestore,
  nowMs: number,
): Promise<QuestConfig | null> {
  return settleQuestQueue(db, nowMs);
}

function progressDocument(state: QuestProgressState): Record<string, unknown> {
  return {
    questId: state.questId,
    baseline: state.baseline,
    current: state.current,
    completedAtMs: state.completedAtMs,
    claimedAtMs: state.claimedAtMs,
    startedAtMs: state.startedAtMs,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// questGetActive — активное задание + личный прогресс.
// Один вызов при заходе на Главную; клиент кэширует ответ.
// ────────────────────────────────────────────────────────────────────────────
export const questGetActive = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);
  const lang = text(request.data?.lang, 12) || 'ru';
  const nowMs = Date.now();

  const config = await loadActiveQuest(db, nowMs);
  if (!config) {
    console.log(`${LOG} get_active none uid=${stableUid.slice(0, 8)}`);
    return { ok: true, quest: null };
  }

  const userRef = db.collection(USERS).doc(stableUid);
  const progressRef = userRef.collection(QUEST_PROGRESS).doc(config.questId);
  const [userSnap, progressSnap] = await Promise.all([userRef.get(), progressRef.get()]);
  const user = record(userSnap.data());

  let state = parseQuestProgress(progressSnap.data(), config.questId, nowMs);

  // Первое знакомство с заданием: фиксируем baseline для дельта-целей, иначе
  // «заработай 1000 рун» закрылось бы мгновенно у игрока с большим балансом.
  if (!progressSnap.exists) {
    const counter = counterForKind(config.kind, user);
    const baseline = QUEST_KIND_IS_DELTA[config.kind] && counter >= 0 ? counter : 0;
    state = Object.freeze({
      ...state,
      baseline,
      current: counter >= 0 ? counter : 0,
      startedAtMs: nowMs,
    });
    await progressRef.set(progressDocument(state), { merge: true });
    console.log(`${LOG} progress_init uid=${stableUid.slice(0, 8)} quest=${config.questId} kind=${config.kind} baseline=${baseline}`);
  } else if (!isClientReportedKind(config.kind)) {
    // Профильные счётчики обновляем на чтении: писателя нет, есть источник.
    const counter = counterForKind(config.kind, user);
    if (counter >= 0 && counter !== state.current) {
      state = Object.freeze({ ...state, current: counter });
      await progressRef.set({ current: counter }, { merge: true });
    }
  }

  // Момент выполнения фиксируем один раз — он нужен статистике админки
  // («сколько человек выполнило»), даже если награду не забрали.
  if (state.completedAtMs === 0 && questIsComplete(config, state)) {
    state = Object.freeze({ ...state, completedAtMs: nowMs });
    await Promise.all([
      progressRef.set({ completedAtMs: nowMs }, { merge: true }),
      db.collection(QUEST_STATS).doc(config.questId).set({
        questId: config.questId,
        completedCount: admin.firestore.FieldValue.increment(1),
        updatedAtMs: nowMs,
      }, { merge: true }),
    ]);
    console.log(`${LOG} completed uid=${stableUid.slice(0, 8)} quest=${config.questId} value=${questProgressValue(config, state)}/${config.target}`);
  }

  const snapshot: PublicQuestSnapshot = buildPublicQuestSnapshot(config, state, lang, nowMs);
  console.log(`${LOG} get_active uid=${stableUid.slice(0, 8)} quest=${config.questId} phase=${snapshot.phase} progress=${snapshot.progress}/${snapshot.target}`);
  return { ok: true, quest: snapshot };
});

// ────────────────────────────────────────────────────────────────────────────
// questReportProgress — событийный инкремент (спин, минуты видео, набор, друг).
//
// Идемпотентность по eventId: повтор того же события не двигает счётчик.
// ────────────────────────────────────────────────────────────────────────────
export const questReportProgress = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);
  const questId = text(request.data?.questId, 64);
  const eventId = text(request.data?.eventId, 180);
  const amount = Math.max(1, Math.min(10_000, int(request.data?.amount) || 1));
  if (!questId || !eventId) {
    console.warn(`${LOG} report_reject uid=${stableUid.slice(0, 8)} reason=missing_ids questId=${questId} eventId=${eventId}`);
    throw new HttpsError('invalid-argument', 'quest_id_and_event_id_required');
  }
  const nowMs = Date.now();

  const questRef = db.collection(QUESTS).doc(questId);
  const userRef = db.collection(USERS).doc(stableUid);
  const progressRef = userRef.collection(QUEST_PROGRESS).doc(questId);
  const eventRef = progressRef.collection('events').doc(eventId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 140));

  return db.runTransaction(async (tx) => {
    const [questSnap, progressSnap, eventSnap] = await Promise.all([
      tx.get(questRef), tx.get(progressRef), tx.get(eventRef),
    ]);
    if (eventSnap.exists) {
      const state = parseQuestProgress(progressSnap.data(), questId, nowMs);
      console.log(`${LOG} report_replay uid=${stableUid.slice(0, 8)} quest=${questId} event=${eventId} current=${state.current}`);
      return { ok: true, replay: true, current: state.current };
    }
    const config = parseQuestConfig(questSnap.data());
    if (!config) {
      console.warn(`${LOG} report_reject uid=${stableUid.slice(0, 8)} reason=quest_not_found quest=${questId}`);
      throw new HttpsError('not-found', 'quest_not_found');
    }
    if (config.status !== 'active' || (config.expiresAtMs > 0 && config.expiresAtMs <= nowMs)) {
      console.warn(`${LOG} report_reject uid=${stableUid.slice(0, 8)} reason=quest_inactive quest=${questId} status=${config.status} expiresAtMs=${config.expiresAtMs}`);
      throw new HttpsError('failed-precondition', 'quest_inactive');
    }
    if (!isClientReportedKind(config.kind)) {
      console.warn(`${LOG} report_reject uid=${stableUid.slice(0, 8)} reason=kind_not_reportable kind=${config.kind}`);
      throw new HttpsError('failed-precondition', 'quest_kind_not_reportable');
    }

    const before = parseQuestProgress(progressSnap.data(), questId, nowMs);
    const next: QuestProgressState = Object.freeze({
      ...before,
      current: Math.min(before.current + amount, config.target * 4),
    });
    const nowComplete = next.completedAtMs === 0 && questIsComplete(config, next);
    const withCompletion: QuestProgressState = nowComplete
      ? Object.freeze({ ...next, completedAtMs: nowMs })
      : next;

    tx.set(progressRef, progressDocument(withCompletion), { merge: true });
    tx.create(eventRef, { amount, createdAtMs: nowMs });
    if (nowComplete) {
      tx.set(db.collection(QUEST_STATS).doc(questId), {
        questId,
        completedCount: admin.firestore.FieldValue.increment(1),
        updatedAtMs: nowMs,
      }, { merge: true });
    }
    console.log(`${LOG} report_applied uid=${stableUid.slice(0, 8)} quest=${questId} kind=${config.kind} +${amount} current=${withCompletion.current}/${config.target} complete=${nowComplete}`);
    return {
      ok: true,
      replay: false,
      current: questProgressValue(config, withCompletion),
      complete: questIsComplete(config, withCompletion),
    };
  });
});

// ────────────────────────────────────────────────────────────────────────────
// questClaimReward — забрать награду.
//
// Сервер: пишет расписку (reward_claims), внешние экономические события и
// выдаёт дни Plus. Жемчуг/руны/спины зачисляет клиент по этой расписке —
// теми же путями, что подарки Пути дня.
// ────────────────────────────────────────────────────────────────────────────
export const questClaimReward = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId, { requireKnownIdentity: true });
  const questId = text(request.data?.questId, 64);
  if (!questId) throw new HttpsError('invalid-argument', 'quest_id_required');
  const nowMs = Date.now();

  const questRef = db.collection(QUESTS).doc(questId);
  const userRef = db.collection(USERS).doc(stableUid);
  const progressRef = userRef.collection(QUEST_PROGRESS).doc(questId);
  const claimRef = userRef.collection(REWARD_CLAIMS).doc(`quest_${questId}`);

  return db.runTransaction(async (tx) => {
    const [questSnap, userSnap, progressSnap, claimSnap] = await Promise.all([
      tx.get(questRef), tx.get(userRef), tx.get(progressRef), tx.get(claimRef),
    ]);

    // Повторный забор возвращает ту же расписку — двойной выдачи быть не может.
    if (claimSnap.exists) {
      const response = record(claimSnap.data()?.response);
      console.log(`${LOG} claim_replay uid=${stableUid.slice(0, 8)} quest=${questId}`);
      return { ...response, alreadyClaimed: true };
    }

    const config = parseQuestConfig(questSnap.data());
    if (!config) {
      console.warn(`${LOG} claim_reject uid=${stableUid.slice(0, 8)} reason=quest_not_found quest=${questId}`);
      throw new HttpsError('not-found', 'quest_not_found');
    }
    const state = parseQuestProgress(progressSnap.data(), questId, nowMs);
    const phase = resolveQuestPhase(config, state, nowMs);
    if (phase === 'expired') {
      console.warn(`${LOG} claim_reject uid=${stableUid.slice(0, 8)} reason=quest_expired quest=${questId} expiresAtMs=${config.expiresAtMs} nowMs=${nowMs}`);
      throw new HttpsError('failed-precondition', 'quest_expired');
    }
    if (phase !== 'ready') {
      console.warn(`${LOG} claim_reject uid=${stableUid.slice(0, 8)} reason=not_complete quest=${questId} value=${questProgressValue(config, state)}/${config.target}`);
      throw new HttpsError('failed-precondition', 'quest_not_complete');
    }

    const user = record(userSnap.data());
    const progress = record(user.progress);
    const rewards = config.rewards;
    const response: Record<string, unknown> = {
      ok: true,
      questId,
      rewards: rewards.map((r) => ({ kind: r.kind, amount: r.amount })),
      claimedAtMs: nowMs,
    };

    // Жемчуг — внешний экономический факт (клиент зачислит по нему баланс,
    // как делает Путь дня). Свой баланс сервер не считает и не пишет.
    const pearls = rewards.filter((r) => r.kind === 'pearls').reduce((sum, r) => sum + r.amount, 0);
    if (pearls > 0) {
      appendExternalEconomyEvent(tx, userRef, {
        source: 'quest',
        eventId: questId,
        ownerStableId: stableUid,
        delta: pearls,
        reason: 'quest_reward',
        kind: 'quest_reward',
        subjectId: questId,
        payload: { questId, kind: config.kind },
        createdAtMs: nowMs,
      });
      tx.set(userRef.collection('shard_log').doc(), {
        ts: new Date(nowMs).toISOString(), type: 'earn', amount: pearls,
        reason: 'quest_reward', authority: 'external_event', questId,
      });
    }

    // Дни Plus — единственная награда, которую обязан выдать сервер: доступ
    // живёт в progress.premium_*, клиент его не пишет. Продлеваем от большего
    // из «сейчас» и текущего конца доступа, чтобы не срезать оплаченное.
    const plusDays = rewards.filter((r) => r.kind === 'plus_days').reduce((sum, r) => sum + r.amount, 0);
    if (plusDays > 0) {
      const currentExpiry = int(progress.premium_expiry);
      const base = Math.max(nowMs, currentExpiry);
      const nextExpiry = base + plusDays * 86_400_000;
      const storeBacked = ['monthly', 'yearly', 'annual'].includes(text(progress.premium_plan, 40).toLowerCase());
      tx.set(userRef, {
        progress: {
          // Магазинную подписку не перетираем — иначе подарок понизил бы
          // платящего пользователя до грантового плана.
          ...(storeBacked ? {} : { premium_plan: 'admin_grant' }),
          premium_expiry: String(nextExpiry),
          admin_premium_override: 'true',
        },
      }, { merge: true });
      response.plusExpiryMs = nextExpiry;
      console.log(`${LOG} claim_plus uid=${stableUid.slice(0, 8)} quest=${questId} days=${plusDays} expiry=${nextExpiry} storeBacked=${storeBacked}`);
    }

    tx.set(progressRef, { claimedAtMs: nowMs }, { merge: true });
    // guard-ok: расписка создаётся ровно один раз (выше стоит ранний выход по
    // claimSnap.exists), затирать в ней нечего — это полный снимок выдачи.
    tx.set(claimRef, { source: 'quest', questId, createdAt: nowMs, response });
    tx.set(db.collection(QUEST_STATS).doc(questId), {
      questId,
      claimedCount: admin.firestore.FieldValue.increment(1),
      updatedAtMs: nowMs,
    }, { merge: true });

    console.log(`${LOG} claim_ok uid=${stableUid.slice(0, 8)} quest=${questId} rewards=${JSON.stringify(response.rewards)}`);
    return response;
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Админка.
// ────────────────────────────────────────────────────────────────────────────
function requireAdmin(request: { auth?: { uid?: string; token?: Record<string, unknown> } }): string {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  if (request.auth?.token?.admin !== true) throw new HttpsError('permission-denied', 'admin_required');
  return authUid;
}

/** adminWriteQuest — создать/изменить задание (всегда в очередь, не активируя). */
export const adminWriteQuest = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const authUid = requireAdmin(request);
  const db = admin.firestore();

  const validation = validateQuestConfigForWrite(request.data?.quest);
  if (!validation.ok) {
    console.warn(`${LOG} admin_write_reject reason=${validation.reason}`);
    throw new HttpsError('invalid-argument', validation.reason);
  }
  const parsed = validation.config;
  const nowMs = Date.now();
  const ref = db.collection(QUESTS).doc(parsed.questId);
  const existingSnap = await ref.get();
  const existing = parseQuestConfig(existingSnap.data());

  // Активное задание нельзя переписать в очередь на ходу: у людей уже идёт
  // отсчёт и копится прогресс. Меняем содержимое, статус и сроки сохраняем.
  const keepLive = existing?.status === 'active';
  const merged: QuestConfig = Object.freeze({
    ...parsed,
    status: keepLive ? 'active' as const : parsed.status,
    activatedAtMs: keepLive ? existing!.activatedAtMs : parsed.activatedAtMs,
    expiresAtMs: keepLive ? existing!.expiresAtMs : parsed.expiresAtMs,
    createdAtMs: existing?.createdAtMs || nowMs,
    updatedAtMs: nowMs,
    updatedBy: authUid,
  });

  await ref.set(questDocument(merged), { merge: true });
  console.log(`${LOG} admin_write quest=${merged.questId} status=${merged.status} keepLive=${keepLive}`);
  return { ok: true, questId: merged.questId, status: merged.status };
});

/**
 * adminActivateQuest — активировать задание немедленно.
 *
 * Правило владельца: одновременно активно НЕ БОЛЕЕ ОДНОГО. Если активное уже
 * есть — отказываем с понятной причиной, а не тихо подменяем.
 */
export const adminActivateQuest = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  requireAdmin(request);
  const db = admin.firestore();
  const questId = text(request.data?.questId, 64);
  if (!questId) throw new HttpsError('invalid-argument', 'quest_id_required');
  const nowMs = Date.now();

  const activeSnap = await db.collection(QUESTS).where('status', '==', 'active').limit(4).get();
  const liveActive = activeSnap.docs
    .map((d) => parseQuestConfig(d.data()))
    .filter((c): c is QuestConfig => c !== null)
    .filter((c) => c.expiresAtMs <= 0 || c.expiresAtMs > nowMs)
    .filter((c) => c.questId !== questId);
  if (liveActive.length > 0) {
    const other = liveActive[0];
    const hoursLeft = Math.max(0, Math.ceil((other.expiresAtMs - nowMs) / 3_600_000));
    console.warn(`${LOG} admin_activate_reject quest=${questId} reason=active_exists other=${other.questId} hoursLeft=${hoursLeft}`);
    throw new HttpsError(
      'failed-precondition',
      `Уже активно задание «${other.title.ru}» — осталось ${hoursLeft} ч. Поставьте новое в очередь или снимите текущее.`,
    );
  }

  const ref = db.collection(QUESTS).doc(questId);
  const snap = await ref.get();
  const config = parseQuestConfig(snap.data());
  if (!config) throw new HttpsError('not-found', 'quest_not_found');

  const activated: QuestConfig = Object.freeze({
    ...config,
    status: 'active' as const,
    activatedAtMs: nowMs,
    expiresAtMs: questExpiryMs(config, nowMs),
    updatedAtMs: nowMs,
  });
  await ref.set(questDocument(activated), { merge: true });
  console.log(`${LOG} admin_activate quest=${questId} expiresAtMs=${activated.expiresAtMs}`);
  return { ok: true, questId, expiresAtMs: activated.expiresAtMs };
});

/** adminArchiveQuest — снять задание (активное или из очереди). */
export const adminArchiveQuest = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  requireAdmin(request);
  const db = admin.firestore();
  const questId = text(request.data?.questId, 64);
  if (!questId) throw new HttpsError('invalid-argument', 'quest_id_required');
  const nowMs = Date.now();
  await db.collection(QUESTS).doc(questId).set({ status: 'archived', updatedAtMs: nowMs }, { merge: true });
  console.log(`${LOG} admin_archive quest=${questId}`);
  return { ok: true, questId };
});

/** adminDeleteQuest — удалить задание из очереди (статистика остаётся). */
export const adminDeleteQuest = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  requireAdmin(request);
  const db = admin.firestore();
  const questId = text(request.data?.questId, 64);
  if (!questId) throw new HttpsError('invalid-argument', 'quest_id_required');
  const snap = await db.collection(QUESTS).doc(questId).get();
  const config = parseQuestConfig(snap.data());
  if (config?.status === 'active') {
    throw new HttpsError('failed-precondition', 'Активное задание нельзя удалить — сначала снимите его.');
  }
  await db.collection(QUESTS).doc(questId).delete();
  console.log(`${LOG} admin_delete quest=${questId}`);
  return { ok: true, questId };
});

/**
 * adminListQuests — список заданий со статистикой выполнения.
 *
 * Статистика — счётчики агрегата (два числа на задание), а не пересчёт по
 * пользователям: пересчёт стоил бы чтения всей базы (правило экономии).
 */
export const adminListQuests = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  requireAdmin(request);
  const db = admin.firestore();
  const nowMs = Date.now();

  const [questsSnap, statsSnap] = await Promise.all([
    db.collection(QUESTS).orderBy('createdAtMs', 'desc').limit(200).get(),
    db.collection(QUEST_STATS).limit(200).get(),
  ]);
  const statsById = new Map(statsSnap.docs.map((d) => [d.id, d.data()]));

  const quests = questsSnap.docs.map((doc) => {
    const config = parseQuestConfig(doc.data());
    if (!config) return null;
    const stats = record(statsById.get(config.questId));
    return {
      ...questDocument(config),
      completedCount: int(stats.completedCount),
      claimedCount: int(stats.claimedCount),
      hoursLeft: config.status === 'active' && config.expiresAtMs > nowMs
        ? Math.ceil((config.expiresAtMs - nowMs) / 3_600_000)
        : 0,
    };
  }).filter((q): q is NonNullable<typeof q> => q !== null);

  console.log(`${LOG} admin_list count=${quests.length}`);
  return { ok: true, quests, nowMs };
});
