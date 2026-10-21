// ═══════════════════════════════════════════════════════════════════════════
// spire_groups.ts — комнаты Шпиля: по 30, своя на каждый язык, набор по дню
// входа в неделю (PM-277, T15, T24, T25).
//
// зачем (владелец 2026-09-24): Шпиль заменяет Лигу. Комната — как у лиги
// (документ с картой members, пишет только сервер, клиент читает раз в 6 ч при
// заходе), но:
//   • у каждого изучаемого языка свои комнаты (T15) — en/es/de/fr из
//     ARENA_STUDY_TARGETS, того же реестра, что делит пул заданий;
//   • понедельничные не смешиваются с поздними (T24) — cohortDay в ключе
//     подбора;
//   • новые комнаты содержат только реальных участников; roster пуст.
//
// ПОЧЕМУ отдельная коллекция spire_groups, а не legacy group records (как предлагал
// черновик TOWER_CONTRACT.md §2.2): пока Лига жива, её кроны читают
// legacy group records по одному weekId — legacy resident cron дописал бы в комнату
// Шпиля жителей со score; прежний конкурентный итог больше не используется, а
// findGroupWithSpace legacy (фильтр weekId+leagueId без языка) посадил бы
// игрока лиги в комнату Шпиля. Отдельная коллекция — ноль риска для Лиги
// (правило задачи: Лигу не ломать). Форма документа совместима с legacy group records,
// слить коллекции можно при удалении Лиги.
//
// Firebase-экономия: вызов ОДИН раз в неделю на язык (при первом заходе в
// Шпиль). Повторный заход — 1 чтение leaderboard + 1 чтение комнаты, без
// записей. Поиск комнаты — только равенства (weekId, lang, tier, cohortDay,
// open) с limit: такой запрос обслуживается слиянием одиночных индексов,
// составной индекс в firestore.indexes.json не нужен.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolveArenaStudyTarget, type ArenaStudyTarget } from './arena_target_registry';
import { normalizeStars, starsWeekEarned } from './stars_ledger';
import { isRealPlusActive } from './premium_status';
import {
  SPIRE_ROOM_SIZE,
  spireCohortDay,
  spireWeekStartMs,
} from './spire_residents';

export const SPIRE_GROUPS_COLLECTION = 'spire_groups' as const;
/** T16/T29: 12 шпилей-камней, 0 = Гранит … 11 = Алмаз. */
export const SPIRE_MAX_TIER = 11;
/** Сколько открытых комнат смотрим за один подбор — предохранитель по чтениям. */
const ROOM_QUERY_LIMIT = 10;
const JOIN_ATTEMPTS = 3;
const LOG = '[SPIRE-ROOM]';

type SpireMember = {
  uid: string;
  name: string;
  avatar: string | null;
  frame: string | null;
  aura: string | null;
  /** Очки = пройденные ступени (§4.5). Пишет PM-275 (spireReportSteps). */
  steps: number;
  /** Ничья: раньше добрался — выше (§4.5). */
  reachedAtMs: number;
  totalMs: number;
  joinedAtMs: number;
  /** Ранг монеты 0…19 — аватар-монета соперника (владелец 13.10); присылает клиент, иначе null. */
  coinRank: number | null;
  /**
   * D162: монеты недели всех режимов из журнала (users.stars) на момент последнего входа/отчёта — только для показа соседям.
   * Итог недели берёт свежее значение из журнала, а не этот снимок.
   */
  weekCoins: number;
  /** Plus у игрока — кольцо у монеты для соседей (владелец 21.10, «Plus виден другим»). Пишет только сервер. */
  isPremium: boolean;
};

/**
 * Настоящий Plus по уже прочитанному users/{uid} — 0 лишних чтений.
 * зачем (владелец 21.10, реестр №6): кольцо Plus — только у покупки (вкл. пожизненный), выдачи админом и VIP;
 * вводный 72-часовой доступ (isGiftAccessActive) кольца НЕ даёт — так же решает клиент (isPremium || isVip || isPro).
 */
export function spireIsPlusOf(userData: Record<string, unknown> | undefined, nowMs: number): boolean {
  // Одно правило на сервере: isRealPlusActive (premium_status.ts) — его же пишет public_profiles.isPlus.
  return isRealPlusActive((userData?.progress ?? {}) as Record<string, unknown>, nowMs);
}

/** D162: монеты недели игрока по уже прочитанному users/{uid} — 0 лишних чтений. */
export function spireWeekCoinsOf(userData: Record<string, unknown> | undefined, weekId: string): number {
  return starsWeekEarned(normalizeStars(userData?.stars), weekId);
}

/** Ранг монеты от клиента: только целое 0…19, иначе null (как public_profiles.coinRank). */
export function spireCoinRankOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 19 ? value : null;
}

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** ISO-неделя — тот же формат, что у лиги (legacy group records.ts getWeekId). */
export function spireWeekId(at: Date): string {
  const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function clampSpireTier(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(SPIRE_MAX_TIER, n)) : 0;
}

/**
 * Шпиль игрока по языку. Источник — leaderboard/{uid}.spireTiers.{lang}:
 * его заполнит перенос мест лиги (PM-278) и итог недели (PM-276). Пока поля
 * нет — Гранит (T16: остальные языки начинают с Гранита).
 */
export function resolveSpireTier(leaderboard: Record<string, unknown> | undefined, lang: ArenaStudyTarget): number {
  const tiers = leaderboard?.spireTiers;
  if (!tiers || typeof tiers !== 'object') return 0;
  return clampSpireTier((tiers as Record<string, unknown>)[lang]);
}

/** Сохранённая комната текущей недели по языку, если есть. */
export function savedSpireGroupId(
  leaderboard: Record<string, unknown> | undefined,
  lang: ArenaStudyTarget,
  weekId: string,
): string | null {
  const groups = leaderboard?.spireGroups;
  if (!groups || typeof groups !== 'object') return null;
  const entry = (groups as Record<string, unknown>)[lang];
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as Record<string, unknown>;
  if (e.weekId !== weekId) return null;
  const groupId = sanitizeString(e.groupId, 200);
  return groupId || null;
}

export function makeSpireGroupId(
  weekId: string,
  lang: ArenaStudyTarget,
  tier: number,
  cohortDay: number,
  stableUid: string,
  nowMs: number,
): string {
  const safeUid = stableUid.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12) || 'user';
  return `${weekId}_${lang}_t${tier}_d${cohortDay}_${nowMs}_${safeUid}`;
}

function liveCount(members: unknown): number {
  return members && typeof members === 'object' ? Object.keys(members).length : 0;
}

function memberNameFrom(userData: Record<string, unknown> | undefined, stableUid: string): string {
  const progress = userData?.progress && typeof userData.progress === 'object'
    ? userData.progress as Record<string, unknown>
    : {};
  const name = sanitizeString(progress.user_name, 48);
  if (name) return name;
  // Тот же запасной вид, что у лиги (leagueFallbackName): никаких «Без имени».
  return `Player ${sanitizeString(stableUid, 180).slice(-4).toUpperCase() || 'USER'}`;
}

function buildMember(
  stableUid: string,
  userData: Record<string, unknown> | undefined,
  raw: Record<string, unknown>,
  nowMs: number,
  weekId: string,
): SpireMember {
  return {
    uid: stableUid,
    // Имя — серверное (из профиля), косметика — выбор игрока, как в лиге.
    name: memberNameFrom(userData, stableUid),
    avatar: sanitizeString(raw.avatar, 64) || null,
    frame: sanitizeString(raw.frame, 64) || null,
    aura: sanitizeString(raw.aura, 64) || null,
    steps: 0,
    reachedAtMs: 0,
    totalMs: 0,
    joinedAtMs: nowMs,
    coinRank: spireCoinRankOrNull(raw.coinRank),
    weekCoins: spireWeekCoinsOf(userData, weekId),
    isPremium: spireIsPlusOf(userData, nowMs),
  };
}

/**
 * Поля обновления своей строки комнаты после отчёта о ступенях — для PM-275
 * (spireReportSteps пишет их той же транзакцией, что и progress; TOWER_CONTRACT
 * §5 «1 запись в группу + 1 в progress»). groupId берётся из
 * savedSpireGroupId(leaderboard, lang, weekId). Только tx.update — точечный
 * путь members.<uid> понимает только update.
 * Ступени не уменьшаются: поздний/повторный отчёт не откатывает строку.
 */
export function spireMemberStepsUpdate(
  stableUid: string,
  current: Readonly<{ steps?: unknown; coinRank?: unknown; weekCoins?: unknown; isPremium?: unknown }> | undefined,
  next: Readonly<{ steps: number; reachedAtMs: number; totalMs: number }>,
  nowMs: number,
  coinRank: number | null = null,
  weekCoins: number | null = null,
  isPremium: boolean | null = null,
): Record<string, number | boolean> | null {
  const prev = Math.max(0, Math.trunc(Number(current?.steps)) || 0);
  const steps = Math.max(0, Math.trunc(next.steps) || 0);
  // зачем (владелец 13.10, аватар-монета): ранг едет той же записью, что ступени; отдельная запись — только если ранг сменился
  // без новых ступеней (повышение ранга — редкость), иначе null: лишних записей нет.
  const rank = coinRank !== null && current?.coinRank !== coinRank ? { [`members.${stableUid}.coinRank`]: coinRank } : {};
  // зачем (D162): монеты недели едут той же записью; отдельная запись без новых ступеней — только если сумма изменилась.
  const coins = weekCoins !== null && Number(current?.weekCoins) !== weekCoins ? { [`members.${stableUid}.weekCoins`]: weekCoins } : {};
  // зачем (владелец 21.10, кольцо Plus у соседей): статус едет той же записью; отдельная — только если он сменился.
  const plus = isPremium !== null && (current?.isPremium === true) !== isPremium ? { [`members.${stableUid}.isPremium`]: isPremium } : {};
  const extra = { ...rank, ...coins, ...plus };
  if (steps <= prev) return Object.keys(extra).length > 0 ? { ...extra, updatedAt: nowMs } : null;
  return {
    [`members.${stableUid}.steps`]: steps,
    [`members.${stableUid}.reachedAtMs`]: Math.max(0, Math.trunc(next.reachedAtMs) || 0),
    [`members.${stableUid}.totalMs`]: Math.max(0, Math.trunc(next.totalMs) || 0),
    ...extra,
    updatedAt: nowMs,
  };
}

export type SpireJoinCandidate = Readonly<{ id: string; n: number }>;

/**
 * Кандидаты на подсадку: только неполные, самая заполненная первой (живые собираются вместе, а не по одиночке).
 * зачем (владелец 21.10, №49 В1): «все комнаты должны заполняться, даже если там уже все продвинулись» — прогресс
 * соседей и день их входа не фильтр; при равенстве — по id, чтобы порядок был детерминированным.
 */
export function pickSpireJoinCandidates(
  docs: readonly Readonly<{ id: string; members: unknown }>[],
  roomSize: number = SPIRE_ROOM_SIZE,
): SpireJoinCandidate[] {
  return docs
    .map((d) => ({ id: d.id, n: liveCount(d.members) }))
    .filter((c) => c.n < roomSize)
    .sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));
}

type JoinResult = {
  ok: true;
  groupId: string;
  weekId: string;
  lang: ArenaStudyTarget;
  tier: number;
  cohortDay: number;
  status: 'existing' | 'joined' | 'created';
};

export const spireJoinRoom = onCall(HOT_CALLABLE_OPTIONS, async (request): Promise<JoinResult> => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const lang = resolveArenaStudyTarget(request.data?.lang);
  if (!lang) {
    console.warn(LOG, JSON.stringify({ event: 'reject', reason: 'bad_lang', lang: String(request.data?.lang ?? '').slice(0, 8) }));
    throw new HttpsError('invalid-argument', 'spire_bad_lang');
  }
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId, {
    requireKnownIdentity: true,
    repairLinks: false,
  });

  const nowMs = Date.now();
  const weekId = spireWeekId(new Date(nowMs));
  const clientWeekId = sanitizeString(request.data?.weekId, 16);
  if (clientWeekId && clientWeekId !== weekId) {
    console.warn(LOG, JSON.stringify({ event: 'reject', reason: 'stale_week', clientWeekId, weekId }));
    throw new HttpsError('failed-precondition', 'stale_week');
  }

  const lbRef = db.collection('leaderboard').doc(stableUid);
  const [userSnap, bannedSnap, lbSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get(),
    db.collection('banned_users').doc(stableUid).get(),
    lbRef.get(),
  ]);
  const userData = userSnap.data();
  if (bannedSnap.exists || userData?.banned === true) {
    console.warn(LOG, JSON.stringify({ event: 'reject', reason: 'banned', lang }));
    throw new HttpsError('permission-denied', 'user_banned');
  }
  let lbData = lbSnap.data();

  const tier = resolveSpireTier(lbData, lang);

  // 1) Уже в комнате этой недели по этому языку — когорта закреплена первым
  //    входом (T24), повторный заход ничего не пишет.
  const savedId = savedSpireGroupId(lbData, lang, weekId);
  if (savedId) {
    const savedSnap = await db.collection(SPIRE_GROUPS_COLLECTION).doc(savedId).get();
    const saved = savedSnap.data();
    if (savedSnap.exists && saved?.weekId === weekId && saved?.lang === lang && saved?.members?.[stableUid]) {
      console.log(LOG, JSON.stringify({ event: 'existing', groupId: savedId, lang, tier: saved.tier, cohortDay: saved.cohortDay }));
      // зачем (D162): соседи видят монеты недели из снимка; обновляем его при входе, только если сумма изменилась
      // (0 чтений — users уже прочитан выше; запись — лишь при изменении). Сбой записи не мешает входу — причина в журнале.
      const weekCoins = spireWeekCoinsOf(userData, weekId);
      // зачем (владелец 21.10, кольцо Plus у соседей): статус Plus обновляется той же записью, что и монеты, — только при смене.
      const isPremium = spireIsPlusOf(userData, nowMs);
      const coinsChanged = Number(saved.members[stableUid]?.weekCoins) !== weekCoins;
      const plusChanged = (saved.members[stableUid]?.isPremium === true) !== isPremium;
      if (coinsChanged || plusChanged) {
        try {
          await savedSnap.ref.update({
            ...(coinsChanged ? { [`members.${stableUid}.weekCoins`]: weekCoins } : {}),
            ...(plusChanged ? { [`members.${stableUid}.isPremium`]: isPremium } : {}),
            updatedAt: nowMs,
          });
          console.log(LOG, JSON.stringify({ event: 'week_coins_snapshot', groupId: savedId, weekCoins, isPremium, coinsChanged, plusChanged }));
        } catch (error) {
          console.warn(LOG, JSON.stringify({ event: 'week_coins_snapshot_failed', groupId: savedId, reason: String((error as Error)?.message ?? error).slice(0, 160) }));
        }
      }
      return { ok: true, groupId: savedId, weekId, lang, tier: clampSpireTier(saved.tier), cohortDay: Number(saved.cohortDay) || 0, status: 'existing' };
    }
    console.warn(LOG, JSON.stringify({ event: 'saved_room_invalid', groupId: savedId, exists: savedSnap.exists, weekId: saved?.weekId ?? null, lang: saved?.lang ?? null }));
  }

  const cohortDay = spireCohortDay(nowMs);
  const member = buildMember(stableUid, userData, (request.data?.member || {}) as Record<string, unknown>, nowMs, weekId);
  const leaderboardPatch = (groupId: string) => ({
    spireGroups: { [lang]: { groupId, weekId, tier, cohortDay } },
  });

  // 2) Открытая комната той же недели, языка и шпиля — любого дня входа.
  // зачем (владелец 21.10, №49 В1, «пустые комнаты»): при выключенных ботах деление «12 шпилей × 7 дней входа × язык»
  // почти всегда давало комнату из одного человека. День входа из поиска убран (он нужен только формуле ботов, они
  // выключены); шпиль оставлен — итог недели считает повышение по шпилю КОМНАТЫ (spire_finalize_core.ts).
  console.log(LOG, JSON.stringify({ event: 'search', lang, tier, weekId, joinCohortDay: cohortDay, filter: 'week+lang+tier+open' }));
  for (let attempt = 0; attempt < JOIN_ATTEMPTS; attempt++) {
    const snap = await db.collection(SPIRE_GROUPS_COLLECTION)
      .where('weekId', '==', weekId)
      .where('lang', '==', lang)
      .where('tier', '==', tier)
      .where('open', '==', true)
      .limit(ROOM_QUERY_LIMIT)
      .get();
    const candidates = pickSpireJoinCandidates(snap.docs.map((d) => ({ id: d.id, members: d.data().members })));
    console.log(LOG, JSON.stringify({
      event: 'candidates', lang, tier, attempt, scanned: snap.size, candidates: candidates.length,
      top: candidates.slice(0, 3).map((c) => ({ groupId: c.id, live: c.n })),
    }));
    if (candidates.length === 0) {
      console.log(LOG, JSON.stringify({ event: 'no_open_room', lang, tier, cohortDay, scanned: snap.size, attempt }));
      break;
    }
    const target = candidates[0].id;
    const joined = await db.runTransaction(async (tx) => {
      const ref = db.collection(SPIRE_GROUPS_COLLECTION).doc(target);
      const fresh = await tx.get(ref);
      const data = fresh.data();
      if (!fresh.exists || data?.weekId !== weekId || data?.lang !== lang || data?.open !== true) return false;
      const members = { ...((data?.members as Record<string, unknown>) || {}) };
      if (!members[stableUid] && Object.keys(members).length >= SPIRE_ROOM_SIZE) return false;
      if (!members[stableUid]) members[stableUid] = member;
      const n = Object.keys(members).length;
      // зачем update, а не set(merge): точечный путь members.<uid> понимает
      // только update — set записал бы поле с точкой в имени буквально.
      tx.update(ref, {
        [`members.${stableUid}`]: members[stableUid],
        liveMemberCount: n,
        open: n < SPIRE_ROOM_SIZE,
        updatedAt: nowMs,
      });
      tx.set(lbRef, leaderboardPatch(target), { merge: true });
      return true;
    });
    if (joined) {
      console.log(LOG, JSON.stringify({ event: 'joined', groupId: target, lang, tier, cohortDay, attempt, liveBefore: candidates[0].n }));
      return { ok: true, groupId: target, weekId, lang, tier, cohortDay, status: 'joined' };
    }
    console.warn(LOG, JSON.stringify({ event: 'join_race_lost', groupId: target, attempt }));
  }

  // 3) Новая комната только с реальными игроками.
  const groupId = makeSpireGroupId(weekId, lang, tier, cohortDay, stableUid, nowMs);
  const weekStartMs = spireWeekStartMs(nowMs);
  await db.runTransaction(async (tx) => {
    tx.create(db.collection(SPIRE_GROUPS_COLLECTION).doc(groupId), {
      schema: 'spire-group-v1',
      weekId,
      weekStartMs,
      lang,
      tier,
      cohortDay,
      open: true,
      liveMemberCount: 1,
      members: { [stableUid]: member },
      roster: [],
      createdAt: nowMs,
      updatedAt: nowMs,
    });
    tx.set(lbRef, leaderboardPatch(groupId), { merge: true });
  });
  console.log(LOG, JSON.stringify({ event: 'created', groupId, lang, tier, cohortDay, reason: 'no_open_room_of_tier_after_attempts' }));
  return { ok: true, groupId, weekId, lang, tier, cohortDay, status: 'created' };
});
