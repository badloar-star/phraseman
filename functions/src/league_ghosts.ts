// ═══════════════════════════════════════════════════════════════════════════
// league_ghosts.ts — «жители» сводного пула лиги.
//
// зачем (владелец, 2026-08-03): реальных игроков лиг не хватает даже на одну
// полную комнату, а владелец требует «со следующей недели полупустых комнат
// не было». Жители — детерминированные участники из рукописного корпуса имён
// турнирных ботов (те же «игроки» живут в обоих мирах): у каждого правдоподобные
// totalXp/стрик и недельная кривая очков, растущая к воскресенью. Состав
// ротируется каждую неделю — это же лечит жалобу «одни и те же лица».
//
// Всё детерминировано от (weekId, index): один и тот же житель одинаков на
// всех инстансах и после любых ретраев. Очки — чистая функция времени;
// leagueGhostTickCron лишь материализует текущее значение в документ комнаты
// (жители видны ЛЮБОЙ версии клиента без обновления приложения).
//
// Честность: финализация (league_finalize_cron) не пишет жителям итогов и не
// пускает их в зоны повышения — они соперники на экране, но не в наградах.
// В сундуке лиги жители участвуют (решение владельца): порог 10 участников
// проходит, экономике это не вредит — сундук с 2026-07-20 даёт только косметику.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REDDIT_BOT_NAMES } from './tournament_reddit_bot_names';
import {
  GHOST_UID_PREFIX,
  SHARED_POOL_MARKER,
  SHARED_POOL_TARGET_VISIBLE,
  countRealMembers,
  countVisibleMembers,
  getLeagueWeekId,
  isGhostMemberEntry,
  isSharedPoolEnabled,
  isSharedPoolWeekId,
  isoWeekStartMs,
} from './league_shared_pool';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Очки жителей меняются шагами по 3 часа — между тиками крона документ честно статичен. */
const GHOST_POINTS_QUANT_MS = 3 * 60 * 60 * 1000;
const GHOST_ROOMS_QUERY_LIMIT = 20;

type GhostMember = Record<string, unknown>;
type MembersMap = Record<string, GhostMember>;

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ghostUid(weekId: string, index: number): string {
  return `${GHOST_UID_PREFIX}${weekId}_${String(index).padStart(2, '0')}`;
}

function ghostName(weekId: string, index: number): string {
  // Ротация недели: сдвиг по корпусу + шаг 7 (взаимно прост с 200) — имена в
  // пределах недели различны, а следующая неделя даёт другой состав «лиц».
  const offset = fnv1a(`${weekId}:names`) % REDDIT_BOT_NAMES.length;
  return REDDIT_BOT_NAMES[(offset + index * 7) % REDDIT_BOT_NAMES.length];
}

/** Общий XP жителя — свой seed-поток, чтобы цель недели могла от него зависеть. */
export function ghostTotalXp(weekId: string, index: number): number {
  const rng = mulberry32(fnv1a(`${weekId}:${index}:xp`));
  return Math.round(350 + 88000 * Math.pow(rng(), 1.8));
}

/**
 * Недельная цель жителя: перекошенное распределение — много скромных
 * (легко обгоняемых), немного гриндеров до ~2600. Реальный игрок всегда
 * видит достижимую следующую позицию.
 */
function ghostWeeklyTarget(weekId: string, index: number): number {
  const rng = mulberry32(fnv1a(`${weekId}:${index}:target`));
  const draw = Math.pow(rng(), 2.2);
  // зачем (владелец, 2026-08-03): цель недели коррелирует с опытом — ветераны
  // в среднем быстрее, новички скромнее (потолок ~25% диапазона). ~8%
  // исключений оставлено нарочно (новичок-спринтер, ленивый ветеран) — как в
  // живом лобби; ленивые ветераны и так возможны через низкий draw.
  const xpNorm = Math.sqrt(Math.min(1, ghostTotalXp(weekId, index) / 88_350));
  const outlier = rng() < 0.08;
  const ceiling = outlier ? 1 : 0.25 + 0.75 * xpNorm;
  return Math.round(60 + 2540 * draw * ceiling);
}

/** Очки жителя в момент nowMs: монотонная детерминированная кривая недели. */
export function ghostPointsAt(weekId: string, index: number, nowMs: number): number {
  const start = isoWeekStartMs(weekId);
  if (!start || nowMs <= start) return 0;
  const rng = mulberry32(fnv1a(`${weekId}:${index}:curve`));
  const startDelay = rng() * 0.18; // часть жителей «просыпается» не сразу
  const exponent = 0.75 + rng() * 0.9; // темп: ранние спринтеры и поздние финишеры
  const quantized = Math.floor((nowMs - start) / GHOST_POINTS_QUANT_MS) * GHOST_POINTS_QUANT_MS;
  const progress = Math.max(0, Math.min(1, quantized / WEEK_MS));
  const effective = Math.max(0, (progress - startDelay) / (1 - startDelay));
  return Math.round(ghostWeeklyTarget(weekId, index) * Math.pow(effective, exponent));
}

/**
 * Профиль жителя. avatar/frame/aura = null сознательно: клиент при null сам
 * рисует эмодзи-аватар по уровню totalXp (club_screen.tsx: getBestAvatarForLevel)
 * — работает на любой версии приложения и не требует знать id ассетов.
 */
export function buildGhostMember(weekId: string, index: number, nowMs: number): GhostMember {
  const rng = mulberry32(fnv1a(`${weekId}:${index}:profile`));
  const totalXp = ghostTotalXp(weekId, index);
  const streak = Math.round(45 * Math.pow(rng(), 2.5));
  return {
    uid: ghostUid(weekId, index),
    name: ghostName(weekId, index),
    isGhost: true,
    points: ghostPointsAt(weekId, index, nowMs),
    avatar: null,
    frame: null,
    aura: null,
    profileCardLevel: 0,
    profileCardTheme: 'classic',
    profileCardMotion: 'none',
    profileCardPublicFocus: 'balanced',
    isPremium: false,
    isVip: false,
    isLifetime: false,
    streak,
    totalXp,
  };
}

/**
 * Дозаполняет комнату жителями до targetVisible видимых участников.
 * Никогда никого не удаляет; реальные записи не трогает. Идемпотентно:
 * существующие жители сохраняют свои uid (индексы детерминированы).
 */
export function padRoomWithGhosts(
  members: MembersMap | undefined | null,
  weekId: string,
  nowMs: number,
  targetVisible = SHARED_POOL_TARGET_VISIBLE,
): MembersMap {
  const result: MembersMap = { ...(members || {}) };
  const missing = targetVisible - countVisibleMembers(result);
  if (missing <= 0) return result;
  let added = 0;
  for (let index = 0; index < targetVisible && added < missing; index++) {
    const uid = ghostUid(weekId, index);
    if (result[uid]) continue;
    result[uid] = buildGhostMember(weekId, index, nowMs);
    added += 1;
  }
  return result;
}

/** Обновляет очки существующих жителей на момент nowMs; реальных не трогает. */
export function refreshGhostPoints(
  members: MembersMap | undefined | null,
  weekId: string,
  nowMs: number,
): MembersMap {
  const result: MembersMap = {};
  for (const [uid, member] of Object.entries(members || {})) {
    if (!isGhostMemberEntry(uid, member)) {
      result[uid] = member;
      continue;
    }
    const match = new RegExp(`^${GHOST_UID_PREFIX}${weekId}_(\\d{2})$`).exec(uid);
    if (!match) {
      result[uid] = member; // житель чужой недели в легаси-данных — не трогаем
      continue;
    }
    result[uid] = { ...member, points: ghostPointsAt(weekId, Number(match[1]), nowMs) };
  }
  return result;
}

// Каждые 4 часа материализуем текущие очки жителей в комнаты пула текущей
// недели. Транзакция на комнату (а не слепой batch) — чтобы не затереть
// участника, вступившего между чтением и записью. Стоимость: ≤20 комнат ×
// 6 тиков/день = копейки.
export const leagueGhostTickCron = onSchedule(
  {
    schedule: 'every 4 hours',
    timeZone: 'UTC',
    timeoutSeconds: 120,
    memory: '256MiB',
    region: 'us-central1',
  },
  async () => {
    const db = admin.firestore();
    const weekId = getLeagueWeekId();
    if (!isSharedPoolWeekId(weekId)) return;
    if (!(await isSharedPoolEnabled(db))) return;

    const snap = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .where('pool', '==', SHARED_POOL_MARKER)
      .limit(GHOST_ROOMS_QUERY_LIMIT)
      .get();
    const now = Date.now();

    for (const doc of snap.docs) {
      try {
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(doc.ref);
          if (!fresh.exists) return;
          const data = fresh.data() || {};
          if (data.weekId !== weekId) return;
          const padded = padRoomWithGhosts(data.members as MembersMap, weekId, now);
          const refreshed = refreshGhostPoints(padded, weekId, now);
          tx.set(doc.ref, {
            members: refreshed,
            memberCount: countVisibleMembers(refreshed),
            realMemberCount: countRealMembers(refreshed),
            updatedAt: now,
          }, { merge: true });
        });
      } catch (e: unknown) {
        console.warn(JSON.stringify({
          event: 'league_ghost_tick_failed',
          groupId: doc.id,
          message: String((e as Error)?.message ?? e).slice(0, 160),
        }));
      }
    }
    console.log(`leagueGhostTickCron: weekId=${weekId} rooms=${snap.size}`);
  },
);
