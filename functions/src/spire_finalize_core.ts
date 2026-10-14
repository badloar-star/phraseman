// ═══════════════════════════════════════════════════════════════════════════
// spire_finalize_core.ts — итог недели одной комнаты Шпиля (PM-276).
//
// зачем (владелец 2026-09-24, TOWER.md §4.5/§4.7, D54/D59/D60): Шпиль заменяет
// Лигу. В понедельник комната подводит итог: место = пройденные ступени (не
// монеты, T1/T9), ничья — кто раньше добрался (reachedAtMs), затем меньшее
// суммарное время (totalMs). По месту — переход в соседний шпиль и монеты
// за 1/2/3 место и за повышение.
//
// Правила зон — те же, что у лиги (сторож guard_league_demotion, инцидент
// 2026-08-17), но на живых:
//   • повышение — ранг среди живых ≤ зоны И хотя бы одна ступень;
//   • понижение — нижняя зона среди живых И ВСЕ с нулём ступеней;
//   • комната, где не играл никто, никого не понижает.
// Размер зоны — spireLiveZoneSize из spire_residents.ts (D59: база — вся
// комната с ботами, 15% от 30 = 5 мест; одинокий живой повышается). Своей
// функции зон здесь НЕТ намеренно: экран (формула ботов) и итог обязаны
// видеть одну и ту же зону, иначе бот встанет над повышаемым.
//
// Боты: в итог не попадают вообще — ни документа, ни шпиля, ни монет. Их
// ступени считаются той же формулой spireRoomResidents только чтобы честно
// записать «место X из 30», которое человек видел на экране.
//
// Чистый модуль: ни сети, ни Firestore, ни Date.now() внутри. Крон —
// spire_finalize_cron.ts.
//
// Отличие от лиги (осознанное): в лиге понижение гасится `!promoted`, а
// promoted на вершине (top rank) всегда false — лидер высшей лиги в
// маленькой комнате мог попасть в «нижние 15%» и понизиться. Здесь понижение
// гасится попаданием в зону повышения (promotionEligible), а не фактом
// повышения, поэтому лидер Алмаза не понижается.
// ═══════════════════════════════════════════════════════════════════════════

import type { SpireCoinsConfig, SpireRankBy } from './spire_config_contract';
import { spireCoinsZoneK, spireCoinsZonesFor } from '../../shared/spire_coins_zones';
import { spireBotWeekCoins } from './spire_config_contract';
import {
  buildSpireRoster,
  isSpireResidentMember,
  spireLiveZoneSize,
  spireRoomResidents,
  type SpireResidentTuning,
} from './spire_residents';

/** T16/T29: 0 = Гранит … 11 = Алмаз. То же, что SPIRE_MAX_TIER в spire_groups.ts. */
export const SPIRE_FINAL_MAX_TIER = 11;

export const SPIRE_WEEK_RESULT_SCHEMA = 'spire-week-result.v1' as const;

export type SpireStanding = Readonly<{
  uid: string;
  steps: number;
  reachedAtMs: number;
  totalMs: number;
  /** Когда вошёл в комнату (spire_groups.members[uid].joinedAtMs); 0 — неизвестно (боты, старые строки). */
  joinedAtMs?: number;
  /** D162: монеты, заработанные за неделю во всех режимах (журнал), уже с потолком недели. 0 — нет/не считаем. */
  weekCoins?: number;
  /** D191: имя и ранг монеты — только для лестницы итога недели (у живых из members, у ботов из формулы жителей). */
  name?: string;
  coinRank?: number | null;
}>;

/** D191: строка лестницы комнаты в итоге недели (окно m01). Чужих uid нет — только то, что человек видел на экране комнаты. */
export type SpireWeekLadderRow = Readonly<{
  place: number;
  name: string;
  coinRank: number | null;
  coins: number;
  isMe: boolean;
}>;

/** D191: сколько строк лестницы пишем (в образце m01 — первые 6, «Ты» среди них). */
export const SPIRE_WEEK_LADDER_ROWS = 6;

/**
 * D61: отчёты последних 10 минут недели засчитываются уже в НОВУЮ неделю.
 * зачем (симуляция Шпиля 11.10, 🟡 №2): вошедший в эти 10 минут физически не может набрать ступени в своей комнате,
 * и раньше его понижали «за ноль». Теперь такой участник без ступеней не понижается (повышение и места — как были).
 */
export const SPIRE_LATE_JOIN_GRACE_MS = 10 * 60 * 1000;

export type SpireRewardCoins = Readonly<{
  /** Монеты за 1/2/3 место недели (config/spire_v1.coins.weekPlace1..3). */
  place: number;
  /** Монеты за повышение (config/spire_v1.coins.promotionBonus). */
  promotion: number;
  total: number;
}>;

export type SpireMemberWeekResult = Readonly<{
  schema: typeof SPIRE_WEEK_RESULT_SCHEMA;
  steps: number;
  reachedAtMs: number;
  totalMs: number;
  /** Место среди живых — по нему зоны и монеты. */
  liveRank: number;
  liveTotal: number;
  /** Место в комнате с ботами — то, что человек видел на экране («X из 30»). */
  roomRank: number;
  roomTotal: number;
  zoneSize: number;
  promoted: boolean;
  demoted: boolean;
  /** D61: вошёл в последние 10 минут недели без ступеней — понижение снято. */
  lateJoinProtected: boolean;
  prevTier: number;
  newTier: number;
  rewardCoins: SpireRewardCoins;
  /** D162: чем решалось место ('steps' | 'coins'). */
  rankBy: SpireRankBy;
  /** D162: монеты недели по журналу с потолком (0 в режиме ступеней, если не передали). */
  weekCoins: number;
  /** D162: сумма недели упёрлась в потолок weekCoinsCap. */
  weekCoinsCapped: boolean;
  /** D191 (координатор 14.10): лестница комнаты для окна m01 — до 6 строк, «я» всегда среди них. */
  ladder: readonly SpireWeekLadderRow[];
  /** D191: монеты последнего живого в зоне повышения (режим монет) — для m02 «сколько не хватило»; null — нет зоны/режим ступеней. */
  promotionLineCoins: number | null;
}>;

export type SpireRoomFinalizeInput = Readonly<{
  groupId: string;
  tier: number;
  weekStartMs: number;
  cohortDay: number;
  /** Карта members документа spire_groups (только живые; ботов там нет, но фильтруем на всякий случай). */
  members: Readonly<Record<string, unknown>>;
  coins: Pick<SpireCoinsConfig, 'weekPlace1' | 'weekPlace2' | 'weekPlace3' | 'promotionBonus'>;
  tuning: SpireResidentTuning;
  /** D162: чем ранжировать (уже с учётом недели — spireEffectiveRankBy). Нет — 'steps'. */
  rankBy?: SpireRankBy;
  /** D162: монеты недели живых по журналу (starsWeekEarned), ДО потолка. */
  weekCoinsByUid?: Readonly<Record<string, number>>;
  /** D162: потолок суммы недели (config/spire_v1.weekCoinsCap). */
  weekCoinsCap?: number;
}>;

export type SpireRoomFinalizeOutput = Readonly<{
  zoneSize: number;
  liveTotal: number;
  roomTotal: number;
  hasAnyScorer: boolean;
  results: Readonly<Record<string, SpireMemberWeekResult>>;
  /** D162: чем решалось место и сколько живых упёрлись в потолок недели (для журнала [SPIRE-FINALIZE]). */
  rankBy: SpireRankBy;
  capHits: number;
}>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function nonNegativeInt(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function clampSpireFinalTier(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(SPIRE_FINAL_MAX_TIER, n)) : 0;
}

/**
 * Порядок в комнате (§4.5): больше ступеней — выше; ничья — раньше добрался;
 * затем меньшее суммарное время. < 0 — a выше b, 0 — полная ничья.
 *
 * зачем особый случай для нуля ступеней: у не игравшего reachedAtMs/totalMs
 * = 0, и «раньше добрался = 0» поставило бы его выше всех нулей с мусорным
 * временем. Все нули — одна ничья, как в лиге.
 */
export function compareSpireStanding(a: SpireStanding, b: SpireStanding): number {
  if (a.steps !== b.steps) return b.steps - a.steps;
  if (a.steps === 0) return 0;
  const aReached = a.reachedAtMs > 0 ? a.reachedAtMs : Number.MAX_SAFE_INTEGER;
  const bReached = b.reachedAtMs > 0 ? b.reachedAtMs : Number.MAX_SAFE_INTEGER;
  if (aReached !== bReached) return aReached - bReached;
  const aTotal = a.totalMs > 0 ? a.totalMs : Number.MAX_SAFE_INTEGER;
  const bTotal = b.totalMs > 0 ? b.totalMs : Number.MAX_SAFE_INTEGER;
  return aTotal - bTotal;
}

/**
 * D162 (OWNER_FINAL 10.10): при rankBy='coins' место решают монеты недели всех режимов; ничья — прежний порядок по
 * ступеням и времени (compareSpireStanding). При 'steps' — как до D162.
 */
export function compareSpireStandingBy(rankBy: SpireRankBy): (a: SpireStanding, b: SpireStanding) => number {
  if (rankBy !== 'coins') return compareSpireStanding;
  return (a, b) => {
    const ac = a.weekCoins ?? 0;
    const bc = b.weekCoins ?? 0;
    if (ac !== bc) return bc - ac;
    return compareSpireStanding(a, b);
  };
}

/** «Играл на неделе»: монеты > 0 при 'coins', ступени > 0 при 'steps' — от этого зоны и места 1–3. */
export function spireStandingScored(s: SpireStanding, rankBy: SpireRankBy): boolean {
  return rankBy === 'coins' ? (s.weekCoins ?? 0) > 0 : s.steps > 0;
}

/** Живые строки комнаты: без ботов и без скрытых дублей (как countLiveMembers лиги). */
export function spireLiveStandings(members: Readonly<Record<string, unknown>>): SpireStanding[] {
  const out: SpireStanding[] = [];
  for (const [uid, raw] of Object.entries(members || {})) {
    if (!raw || typeof raw !== 'object') continue;
    const member = raw as Record<string, unknown>;
    if (isSpireResidentMember(uid, member)) continue;
    if (member.identityHidden === true) continue;
    const steps = nonNegativeInt(member.steps);
    // зачем: Number(null) = 0 — пустой ранг превращался бы в «ранг 0»; берём только настоящее целое 0…19.
    const rank = typeof member.coinRank === 'number' ? member.coinRank : NaN;
    out.push({
      uid,
      steps,
      reachedAtMs: steps > 0 ? nonNegativeInt(member.reachedAtMs) : 0,
      totalMs: steps > 0 ? nonNegativeInt(member.totalMs) : 0,
      joinedAtMs: nonNegativeInt(member.joinedAtMs),
      // зачем (D191): имя и ранг монеты — для лестницы итога недели; уже лежат в том же документе комнаты, чтений не добавляют.
      name: typeof member.name === 'string' ? member.name.trim().slice(0, 48) : '',
      coinRank: Number.isInteger(rank) && rank >= 0 && rank <= 19 ? rank : null,
    });
  }
  return out;
}

function placeCoins(rank: number, coins: SpireRoomFinalizeInput['coins']): number {
  if (rank === 1) return coins.weekPlace1;
  if (rank === 2) return coins.weekPlace2;
  if (rank === 3) return coins.weekPlace3;
  return 0;
}

/**
 * Итог одной комнаты. Возвращает результат ТОЛЬКО для живых.
 * Ранг — competition ranking по compareSpireStanding (полная ничья делит место).
 */
export function computeSpireRoomResults(input: SpireRoomFinalizeInput): SpireRoomFinalizeOutput {
  const tier = clampSpireFinalTier(input.tier);
  const rankBy: SpireRankBy = input.rankBy === 'coins' ? 'coins' : 'steps';
  const cap = Number.isFinite(Number(input.weekCoinsCap)) && Number(input.weekCoinsCap) > 0 ? Math.trunc(Number(input.weekCoinsCap)) : Number.MAX_SAFE_INTEGER;
  const cappedUids = new Set<string>();
  // зачем потолок (координатор 13.10, PM-291): сумму практики присылает клиент — накрутка не должна покупать место выше потолка.
  const live = spireLiveStandings(input.members).map((m) => {
    const raw = Math.max(0, Math.trunc(Number(input.weekCoinsByUid?.[m.uid] ?? 0)) || 0);
    if (raw > cap) cappedUids.add(m.uid);
    return { ...m, weekCoins: Math.min(raw, cap) };
  });
  const compare = compareSpireStandingBy(rankBy);
  const liveTotal = live.length;
  // зачем (D190, владелец 14.10): в режиме монет зона — k = N≥15 ? 5 : max(1, floor(N/3)) от ЖИВЫХ, вниз только k последних
  // (нули сверх k не спускаются), группы не пересекаются. Та же функция у экрана «Все участники» (shared/spire_coins_zones.ts).
  // Режим ступеней — прежняя зона 15% комнаты с ботами (D59).
  const zoneSize = rankBy === 'coins' ? spireCoinsZoneK(liveTotal) : spireLiveZoneSize(liveTotal);
  const hasAnyScorer = live.some((m) => spireStandingScored(m, rankBy));
  const lateJoinCutoffMs = input.weekStartMs + WEEK_MS - SPIRE_LATE_JOIN_GRACE_MS;
  const coinsZoneByUid = new Map<string, 'up' | 'stay' | 'down'>();
  if (rankBy === 'coins') {
    const sorted = [...live].sort(compare);
    const zones = spireCoinsZonesFor(
      sorted,
      compare,
      (m) => spireStandingScored(m, rankBy),
      // D190 (в3): вошедших в последние сутки недели не понижаем — справедливо, как и раньше.
      (m) => (m.joinedAtMs ?? 0) >= lateJoinCutoffMs,
    );
    sorted.forEach((m, i) => coinsZoneByUid.set(m.uid, zones[i]));
  }

  // Боты на конец недели — та же формула, что на экране (0 чтений/записей).
  const bots = spireRoomResidents({
    groupId: input.groupId,
    weekStartMs: input.weekStartMs,
    cohortDay: input.cohortDay,
    nowMs: input.weekStartMs + WEEK_MS - 1,
    live: live.map((m) => ({ uid: m.uid, steps: m.steps })),
    tuning: input.tuning,
  });
  // D162: у ботов в режиме монет — монеты по формуле от их ступеней (только для показанного «места X из N»).
  // D191: имена и ранги монет ботов — из того же реестра жителей, что рисует комнату (0 чтений).
  const rosterByUid = new Map(buildSpireRoster(input.groupId, input.weekStartMs).map((r) => [r.uid, r]));
  const room: SpireStanding[] = [...live, ...bots.map((b) => ({
    ...b,
    weekCoins: spireBotWeekCoins(b.steps),
    name: rosterByUid.get(b.uid)?.name ?? '',
    coinRank: rosterByUid.get(b.uid)?.coinRank ?? null,
  }))];
  const roomTotal = room.length;
  const roomSorted = [...room].sort(compare);
  const roomPlace = (s: SpireStanding): number => 1 + room.filter((o) => compare(o, s) < 0).length;
  // D191 m02: порог повышения = монеты последнего живого в зоне «вверх» (режим монет); иначе null.
  const upCoins = live.filter((m) => coinsZoneByUid.get(m.uid) === 'up').map((m) => m.weekCoins ?? 0);
  const promotionLineCoins = rankBy === 'coins' && upCoins.length > 0 ? Math.min(...upCoins) : null;
  const ladderFor = (me: SpireStanding): SpireWeekLadderRow[] => {
    const top = roomSorted.slice(0, SPIRE_WEEK_LADDER_ROWS);
    const rows = top.some((s) => s.uid === me.uid) ? top : [...roomSorted.slice(0, SPIRE_WEEK_LADDER_ROWS - 1), me];
    return rows.map((s) => ({ place: roomPlace(s), name: s.name ?? '', coinRank: s.coinRank ?? null, coins: s.weekCoins ?? 0, isMe: s.uid === me.uid }));
  };

  const results: Record<string, SpireMemberWeekResult> = {};
  for (const me of live) {
    const liveRank = 1 + live.filter((o) => compare(o, me) < 0).length;
    const bottomRank = 1 + live.filter((o) => compare(o, me) > 0).length;
    const roomRank = 1 + room.filter((o) => compare(o, me) < 0).length;
    const scored = spireStandingScored(me, rankBy);
    // Зона повышения требует ≥1 ступени: иначе нули в тихой комнате (строго
    // выше них — только игравшие) попадали бы в «топ» и гасили себе понижение
    // — ровно баг лиги 2026-08-17.
    const coinsZone = coinsZoneByUid.get(me.uid);
    const promotionEligible = coinsZone !== undefined
      ? coinsZone === 'up'
      : scored && zoneSize > 0 && liveRank <= zoneSize;
    const promoted = promotionEligible && tier < SPIRE_FINAL_MAX_TIER;
    const inZeroZone = !scored && hasAnyScorer;
    const lateJoinProtected = !scored && (me.joinedAtMs ?? 0) >= lateJoinCutoffMs;
    // D190: в режиме монет понижение решает только зона «k последних»; нижняя лига никого не спускает (tier > 0).
    const demoted = coinsZone !== undefined
      ? coinsZone === 'down' && tier > 0
      : hasAnyScorer
        && !promotionEligible
        && !lateJoinProtected
        && (inZeroZone || (zoneSize > 0 && bottomRank <= zoneSize))
        && tier > 0;
    const place = scored ? placeCoins(liveRank, input.coins) : 0;
    const promotion = promoted ? input.coins.promotionBonus : 0;
    results[me.uid] = {
      schema: SPIRE_WEEK_RESULT_SCHEMA,
      steps: me.steps,
      reachedAtMs: me.reachedAtMs,
      totalMs: me.totalMs,
      liveRank,
      liveTotal,
      roomRank,
      roomTotal,
      zoneSize,
      promoted,
      demoted,
      lateJoinProtected,
      prevTier: tier,
      newTier: promoted ? tier + 1 : demoted ? tier - 1 : tier,
      rewardCoins: { place, promotion, total: place + promotion },
      rankBy,
      weekCoins: me.weekCoins,
      weekCoinsCapped: cappedUids.has(me.uid),
      ladder: ladderFor(me),
      promotionLineCoins,
    };
  }
  return { zoneSize, liveTotal, roomTotal, hasAnyScorer, results, rankBy, capHits: cappedUids.size };
}
