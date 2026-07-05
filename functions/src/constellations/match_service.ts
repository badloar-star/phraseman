// ════════════════════════════════════════════════════════════════════════════
// constellations/match_service.ts — Firestore-оркестрация матча (спек H2).
//
// Тонкая обвязка над чистыми модулями: engine (резолв), service_core (сборка
// входа), deal (вопросы), bots. Паттерны репо: транзакция создания — как
// createSession в matchmaking.ts; идемпотентность финализации — resultProcessedAt.
//
// Жизненный цикл: createConstellationMatch (queue/боты, Звездопад с pity) →
// [фаза choose 12с] → advanceToAnswer (конфликты → дуэли, раздача вопросов,
// планы ботов) → [фаза answer 38с] → resolveCurrentRound (транзакция:
// buildRoundInput → engine.resolveRound → проекция в match-док) → … →
// finalizeConstellationMatch (места, results). Дедлайны страхует watchdog
// (cron ≤60с, спек edge «матч завис»); ранние переходы триггерит submit.
// ════════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import {
  botAnswerPlan,
  chooseBotTarget,
  synthesizeBotProfiles,
  type BotProfile,
} from './bots';
import { resolveConstellationConfig, type ConstellationConfig } from './config';
import { appendRecentQids, fetchQuestionPool, readRecentQids, toDealtQuestion } from './deal';
import {
  createInitialMatchState,
  detectConflicts,
  ownedStarKeys,
  resolveRound,
  type MatchState,
  type PlayerSlot,
  type RoundAction,
  type RoundEvent,
} from './engine';
import { createSeededRand, generateMap, parseHexKey, ringOf, validateMapSymmetry } from './hex';
import { computeMatchRewards } from './rewards';
import { computeFinalScores, rankPlayers, starPointsFor } from './scoring';
import { applyStarDelta } from '../arena_rank_progression';
import { seasonIdForDate } from '../arena_season';
import {
  attackQuestionSpec,
  buildRoundInput,
  levelForRing,
  type SlotRoundRecord,
} from './service_core';
import {
  CONSTELLATION_SCHEMA_VERSION,
  liveScoreBySlotFromState,
  publicPlayersFromState,
  type ConstellationMatchDoc,
  type ConstellationPlayerDoc,
  type ConstellationServerDoc,
  type DealtQuestionPublic,
  type MatchPlayerPublic,
  type PlayerMeta,
  type ServerBotEntry,
} from './store_types';

const db = admin.firestore();

const MATCHES = 'constellation_matches';
const PLAYERS = 'constellation_players';
const SERVER = 'constellation_server';
const RESULTS = 'constellation_results';
const PITY = 'constellation_pity';

/** Слоты матча всегда 0..3. */
const ALL_SLOTS: PlayerSlot[] = [0, 1, 2, 3];

export interface HumanEntry {
  userId: string;
  displayName?: string;
  rankIndex?: number;
  wager?: number;
  expoPushToken?: string;
}

interface ServerDocShape extends ConstellationServerDoc {
  /** Статистика времени ответов для тайбрейка мест (A8). */
  answerStats: Record<number, { timeSumMs: number; count: number }>;
  humanUids: string[];
}

function playerDocId(matchId: string, uid: string): string {
  return `${matchId}_${uid}`;
}

function dayKeyUtc(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

// ── Создание матча ──────────────────────────────────────────────────────────

/** Профиль人 из users-дока: аватар/аура/уровень — как createSession в matchmaking.ts. */
async function readHumanMeta(uids: string[]): Promise<Map<string, PlayerMeta>> {
  const out = new Map<string, PlayerMeta>();
  if (uids.length === 0) return out;
  const { getLevelFromXP } = await import('../xp_levels');
  const snaps = await Promise.all(
    uids.map((uid) => db.collection('users').doc(uid).get().catch(() => null)),
  );
  snaps.forEach((snap, i) => {
    const uid = uids[i];
    const d = snap?.data() as Record<string, Record<string, string>> | undefined;
    const xp = parseInt(d?.progress?.user_total_xp ?? '0', 10) || 0;
    const level = getLevelFromXP(xp);
    const avatarRaw = typeof d?.progress?.user_avatar === 'string' ? d.progress.user_avatar.trim() : '';
    const auraRaw = typeof d?.progress?.user_avatar_aura === 'string' ? d.progress.user_avatar_aura.trim() : '';
    const meta: PlayerMeta = {
      uid,
      name: 'Игрок',
      avatar: avatarRaw && !/^\d+$/.test(avatarRaw) ? avatarRaw : String(level),
      avatarLevel: level,
    };
    if (auraRaw) meta.aura = auraRaw;
    out.set(uid, meta);
  });
  return out;
}

/** Решение «Звездопада» (C1): шанс + pity; счётчики обновляются здесь же. */
async function decideStarfall(
  humanUids: string[],
  cfg: ConstellationConfig,
  rand: () => number,
): Promise<boolean> {
  const now = Date.now();
  const refs = humanUids.map((uid) => db.collection(PITY).doc(uid));
  const snaps = refs.length > 0 ? await db.getAll(...refs) : [];
  const counters = snaps.map((s) => {
    const d = s.data() as { pityCounter?: number } | undefined;
    return typeof d?.pityCounter === 'number' ? d.pityCounter : 0;
  });
  const byChance = rand() * 100 < cfg.starfall.chancePct;
  const byPity = counters.some((c) => c + 1 >= cfg.starfall.pityMatches);
  const golden = byChance || byPity;
  const batch = db.batch();
  refs.forEach((ref, i) => {
    batch.set(ref, {
      pityCounter: golden ? 0 : counters[i] + 1,
      updatedAt: now,
    }, { merge: true });
  });
  if (refs.length > 0) await batch.commit();
  return golden;
}

/**
 * Создаёт матч из 1–4 людей + ботов до 4. Возвращает matchId.
 * Транзакция гарантирует, что ни один человек не заматчен дважды.
 */
export async function createConstellationMatch(humans: HumanEntry[]): Promise<string> {
  if (humans.length < 1 || humans.length > 4) {
    throw new Error(`createConstellationMatch: bad humans count ${humans.length}`);
  }
  const cfg = await resolveConstellationConfig(db);
  const matchRef = db.collection(MATCHES).doc();
  const matchId = matchRef.id;
  const rand = createSeededRand(matchId);

  const matchRankIndex = Math.max(0, ...humans.map((h) => h.rankIndex ?? 0));
  const bots = synthesizeBotProfiles(4 - humans.length, matchRankIndex, cfg.bots, rand);

  // Случайное распределение слотов: люди не всегда slot 0 (боты неотличимы, B5).
  const participants: Array<{ uid: string; human?: HumanEntry; bot?: BotProfile }> = [
    ...humans.map((h) => ({ uid: h.userId, human: h })),
    ...bots.map((b) => ({ uid: b.uid, bot: b })),
  ];
  for (let i = participants.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }

  const map = generateMap(matchId);
  if (!validateMapSymmetry(map)) throw new Error(`Map symmetry validation failed for ${matchId}`);
  const state = createInitialMatchState({
    uids: participants.map((p) => p.uid),
    homes: map.homes,
    roundsTotal: cfg.roundsTotal,
    homeCores: cfg.homeCores,
  });

  const humanMeta = await readHumanMeta(humans.map((h) => h.userId));
  const meta: PlayerMeta[] = participants.map((p) => {
    if (p.bot) {
      return {
        uid: p.uid,
        name: p.bot.name,
        avatar: String(p.bot.avatarLevel),
        avatarLevel: p.bot.avatarLevel,
      };
    }
    const m = humanMeta.get(p.uid);
    return {
      ...(m ?? { uid: p.uid, name: 'Игрок', avatar: '1', avatarLevel: 1 }),
      name: p.human?.displayName?.trim() || m?.name || 'Игрок',
    };
  });

  const golden = await decideStarfall(humans.map((h) => h.userId), cfg, rand);
  const now = Date.now();

  const wagerBySlot: Record<number, number> = {};
  const botEntries: ServerBotEntry[] = [];
  participants.forEach((p, slot) => {
    if (p.human?.wager && p.human.wager > 0) wagerBySlot[slot] = p.human.wager;
    if (p.bot) {
      botEntries.push({
        uid: p.uid,
        slot: slot as PlayerSlot,
        profile: p.bot,
        plan: null,
        target: null,
        shieldStarKey: null,
      });
    }
  });

  const players: MatchPlayerPublic[] = publicPlayersFromState(state, meta, {
    starfallBySlot: {},
    roundDoneSlots: new Set(),
  });

  const matchDoc: ConstellationMatchDoc & { playerIds: string[] } = {
    id: matchId,
    schemaVersion: CONSTELLATION_SCHEMA_VERSION,
    stage: 'active',
    phase: 'choose',
    round: 1,
    roundsTotal: cfg.roundsTotal,
    phaseDeadlineAt: now + cfg.choosePhaseSec * 1000,
    mapSeed: matchId,
    homes: map.homes,
    stars: state.stars,
    players,
    playerIds: participants.map((p) => p.uid),
    starfall: { golden },
    roundEvents: [],
    emotes: [],
    wagerBySlot,
    createdAt: now,
  };

  const serverDoc: ServerDocShape = {
    matchId,
    state,
    ratingBySlot: Object.fromEntries(participants.map((p, slot) => [
      slot,
      p.human?.rankIndex ?? matchRankIndex,
    ])),
    bots: botEntries,
    correctByQid: {},
    duels: [],
    starfallBySlot: {},
    answerStats: Object.fromEntries(ALL_SLOTS.map((s) => [s, { timeSumMs: 0, count: 0 }])),
    humanUids: humans.map((h) => h.userId),
    updatedAt: now,
  };

  await db.runTransaction(async (tx) => {
    for (const human of humans) {
      const qRef = db.collection('constellation_queue').doc(human.userId);
      const qSnap = await tx.get(qRef);
      if (!qSnap.exists || (qSnap.data() as { matchId?: string })?.matchId) {
        throw new Error(`Player ${human.userId} already matched — abort`);
      }
    }
    tx.set(matchRef, matchDoc);
    tx.set(db.collection(SERVER).doc(matchId), serverDoc);
    participants.forEach((p, slot) => {
      if (!p.human) return;
      const playerDoc: ConstellationPlayerDoc = {
        matchId,
        uid: p.uid,
        slot: slot as PlayerSlot,
        round: 1,
        target: null,
        shieldStarKey: null,
        kind: 'idle',
        questions: [],
        answers: [],
        dealtAt: null,
        doneAt: null,
        duelStarKey: null,
        duelOppSlot: null,
        processedActionIds: [],
        updatedAt: now,
      };
      tx.set(db.collection(PLAYERS).doc(playerDocId(matchId, p.uid)), playerDoc);
    });
    for (const human of humans) {
      tx.update(db.collection('constellation_queue').doc(human.userId), {
        matchId,
        matchedAt: now,
      });
    }
  });

  await notifyMatchFound(humans, matchId);
  return matchId;
}

async function notifyMatchFound(humans: HumanEntry[], matchId: string): Promise<void> {
  const withToken = humans.filter((h) => h.expoPushToken);
  if (withToken.length === 0) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withToken.map((h) => ({
        to: h.expoPushToken as string,
        sound: 'default' as const,
        title: '⭐ Матч найден!',
        body: 'Созвездия ждут — нажми, чтобы войти',
        data: { type: 'constellation_match' as const, matchId, userId: h.userId },
      }))),
    });
  } catch {
    // пуш не критичен — клиент увидит матч по подписке
  }
}

// ── Переход choose → answer: конфликты, раздача вопросов, планы ботов ───────

interface Assignment {
  slot: PlayerSlot;
  kind: 'attack' | 'duel' | 'falling';
  target: string | null;
  count: number;
  level: string;
  duelStarKey: string | null;
  duelOppSlot: PlayerSlot | null;
  outpaced: boolean;
}

export async function advanceToAnswer(matchId: string): Promise<void> {
  const matchRef = db.collection(MATCHES).doc(matchId);
  const serverRef = db.collection(SERVER).doc(matchId);
  const [matchSnap, serverSnap] = await db.getAll(matchRef, serverRef);
  const match = matchSnap.data() as (ConstellationMatchDoc & { playerIds: string[] }) | undefined;
  const server = serverSnap.data() as ServerDocShape | undefined;
  if (!match || !server || match.stage !== 'active' || match.phase !== 'choose') return;

  const cfg = await resolveConstellationConfig(db);
  const state = server.state;
  const round = match.round;
  const rand = createSeededRand(`${matchId}:r${round}`);
  const botBySlot = new Map(server.bots.map((b) => [b.slot, b]));
  const humanSlots = ALL_SLOTS.filter((s) => !botBySlot.has(s));

  // Ходы людей — из player-доков; ходы ботов — выбираем сейчас.
  const playerSnaps = await db.getAll(
    ...server.humanUids.map((uid) => db.collection(PLAYERS).doc(playerDocId(matchId, uid))),
  );
  const humanDocs = new Map<number, ConstellationPlayerDoc>();
  for (const snap of playerSnaps) {
    const d = snap.data() as ConstellationPlayerDoc | undefined;
    if (d) humanDocs.set(d.slot, d);
  }

  const actions: RoundAction[] = [];
  const updatedBots: ServerBotEntry[] = [];
  for (const slot of ALL_SLOTS) {
    const player = state.players[slot];
    const bot = botBySlot.get(slot);
    if (bot) {
      const target = player.status === 'alive' ? chooseBotTarget(state, slot, rand) : null;
      // Бот играет козырь, когда дом под угрозой (человечность, A5a).
      const shieldStarKey = player.status === 'alive' && !player.shieldUsed
        && player.cores <= 1 && rand() < 0.6 ? player.homeStarKey : null;
      updatedBots.push({ ...bot, target, shieldStarKey, plan: null });
      if (player.status === 'alive') actions.push({ slot, target, shieldStarKey });
      continue;
    }
    const doc = humanDocs.get(slot);
    if (player.status === 'alive') {
      actions.push({
        slot,
        target: doc?.round === round ? doc.target : null,
        shieldStarKey: doc?.round === round ? doc.shieldStarKey : null,
      });
    }
  }

  const ratingBySlot = Object.fromEntries(
    ALL_SLOTS.map((s) => [s, server.ratingBySlot[s] ?? 0]),
  ) as Record<PlayerSlot, number>;
  const conflicts = detectConflicts(actions, ratingBySlot);
  const matchRankIndex = Math.max(...Object.values(server.ratingBySlot), 0);

  // План раздачи: дуэли (общие вопросы), одиночные атаки, падающие звёзды.
  const assignments: Assignment[] = [];
  for (const duel of conflicts.duels) {
    const spec = attackQuestionSpec(state, duel.starKey, matchRankIndex, cfg);
    for (let i = 0; i < 2; i += 1) {
      assignments.push({
        slot: duel.slots[i],
        kind: 'duel',
        target: duel.starKey,
        count: 4, // 3 основных + внезапная смерть (A4a; Сияние в дуэли не считается)
        level: spec.level,
        duelStarKey: duel.starKey,
        duelOppSlot: duel.slots[1 - i],
        outpaced: false,
      });
    }
  }
  for (const single of conflicts.singles) {
    const spec = attackQuestionSpec(state, single.target as string, matchRankIndex, cfg);
    assignments.push({
      slot: single.slot,
      kind: 'attack',
      target: single.target,
      count: spec.count,
      level: spec.level,
      duelStarKey: null,
      duelOppSlot: null,
      outpaced: false,
    });
  }
  for (const player of state.players) {
    if (player.status !== 'falling') continue;
    assignments.push({
      slot: player.slot,
      kind: 'falling',
      target: null,
      count: 1,
      level: levelForRing('outer', server.ratingBySlot[player.slot] ?? 0),
      duelStarKey: null,
      duelOppSlot: null,
      outpaced: false,
    });
  }

  // Выдача вопросов: пулы по уровням, анти-повторы людей (D5).
  const recent = await readRecentQids(server.humanUids);
  const levels = [...new Set(assignments.map((a) => a.level))];
  const pools = new Map<string, Awaited<ReturnType<typeof fetchQuestionPool>>>();
  for (const level of levels) {
    const need = assignments.filter((a) => a.level === level)
      .reduce((s, a) => s + a.count, 0);
    pools.set(level, await fetchQuestionPool(level, need, recent));
  }

  const usedQids = new Set<string>();
  const correctByQid: ServerDocShape['correctByQid'] = {};
  const questionsBySlot = new Map<number, DealtQuestionPublic[]>();
  const duelQidsByStar = new Map<string, string[]>();

  const takeQuestions = (level: string, count: number, shareKey: string | null): DealtQuestionPublic[] => {
    // Дуэлянты одной звезды получают ОДНИ И ТЕ ЖЕ вопросы в одном порядке.
    if (shareKey && duelQidsByStar.has(shareKey)) {
      const qids = duelQidsByStar.get(shareKey) as string[];
      return qids.map((qid, i) => {
        const cached = correctByQid[qid];
        const pool = pools.get(level) ?? [];
        const raw = pool.find((q) => q.id === qid);
        if (!raw || !cached) throw new Error(`duel question ${qid} missing from pool`);
        return toDealtQuestion(raw, `${matchId}:r${round}:q${i}:${qid}`).public;
      });
    }
    const pool = pools.get(level) ?? [];
    const picked: DealtQuestionPublic[] = [];
    const qids: string[] = [];
    for (const raw of pool) {
      if (picked.length >= count) break;
      if (usedQids.has(raw.id)) continue;
      usedQids.add(raw.id);
      const dealt = toDealtQuestion(raw, `${matchId}:r${round}:q${picked.length}:${raw.id}`);
      correctByQid[raw.id] = { correctIndex: dealt.correctIndex, rule: dealt.rule };
      picked.push(dealt.public);
      qids.push(raw.id);
    }
    // Крайний случай: пул исчерпан — лучше повтор недавнего, чем сорванный раунд.
    if (picked.length < count) {
      for (const raw of pool) {
        if (picked.length >= count) break;
        if (qids.includes(raw.id)) continue;
        const dealt = toDealtQuestion(raw, `${matchId}:r${round}:q${picked.length}:${raw.id}`);
        correctByQid[raw.id] = { correctIndex: dealt.correctIndex, rule: dealt.rule };
        picked.push(dealt.public);
        qids.push(raw.id);
      }
      console.error(`constellations deal: pool exhausted level=${level} need=${count} got=${picked.length} match=${matchId}`);
    }
    if (shareKey) duelQidsByStar.set(shareKey, qids);
    return picked;
  };

  for (const a of assignments) {
    const dealt = takeQuestions(a.level, a.count, a.kind === 'duel' ? (a.duelStarKey as string) : null);
    questionsBySlot.set(a.slot, dealt);
  }

  // Планы ботов на выданные вопросы.
  const finalBots = updatedBots.map((bot) => {
    const assignment = assignments.find((a) => a.slot === bot.slot);
    if (!assignment) return { ...bot, plan: null };
    const plan = botAnswerPlan(bot.profile, questionsBySlot.get(bot.slot)?.length ?? 0, rand);
    return { ...bot, plan };
  });

  const now = Date.now();
  const duels = conflicts.duels.map((d) => ({
    starKey: d.starKey,
    slots: d.slots,
    qids: duelQidsByStar.get(d.starKey) ?? [],
  }));

  await db.runTransaction(async (tx) => {
    const fresh = (await tx.get(matchRef)).data() as ConstellationMatchDoc | undefined;
    if (!fresh || fresh.stage !== 'active' || fresh.phase !== 'choose' || fresh.round !== round) {
      return; // гонка триггера и watchdog — фаза уже переведена
    }
    tx.update(matchRef, {
      phase: 'answer',
      phaseDeadlineAt: now + cfg.answerPhaseSec * 1000,
      players: fresh.players.map((p) => ({ ...p, roundDone: false })),
    });
    tx.update(serverRef, {
      bots: finalBots,
      correctByQid,
      duels,
      updatedAt: now,
    });
    for (const slot of humanSlots) {
      const doc = humanDocs.get(slot);
      if (!doc) continue;
      const assignment = assignments.find((a) => a.slot === slot);
      const outpaced = conflicts.outpaced.includes(slot as PlayerSlot);
      tx.update(db.collection(PLAYERS).doc(playerDocId(matchId, doc.uid)), {
        round,
        kind: assignment?.kind ?? 'idle',
        target: assignment?.target ?? null,
        questions: questionsBySlot.get(slot) ?? [],
        answers: [],
        dealtAt: assignment ? now : null,
        doneAt: null,
        duelStarKey: assignment?.duelStarKey ?? null,
        duelOppSlot: assignment?.duelOppSlot ?? null,
        outpaced,
        updatedAt: now,
      });
    }
  });

  // Анти-повторы (D5): фиксируем выданное людям.
  for (const slot of humanSlots) {
    const doc = humanDocs.get(slot);
    const dealt = questionsBySlot.get(slot);
    if (doc && dealt && dealt.length > 0) {
      await appendRecentQids(doc.uid, dealt.map((q) => q.qid));
    }
  }

  // Никому из людей нечего отвечать (все пропустили/опоздали) → резолв сразу.
  const humansHaveQuestions = humanSlots.some((s) => (questionsBySlot.get(s)?.length ?? 0) > 0);
  if (!humansHaveQuestions) {
    await resolveCurrentRound(matchId).catch((e) => console.error('early resolve', e));
  }
}

// ── Резолв раунда ───────────────────────────────────────────────────────────

export async function resolveCurrentRound(matchId: string): Promise<void> {
  const matchRef = db.collection(MATCHES).doc(matchId);
  const serverRef = db.collection(SERVER).doc(matchId);
  const cfg = await resolveConstellationConfig(db);

  let finished = false;
  await db.runTransaction(async (tx) => {
    const [matchSnap, serverSnap] = await Promise.all([tx.get(matchRef), tx.get(serverRef)]);
    const match = matchSnap.data() as (ConstellationMatchDoc & { playerIds: string[] }) | undefined;
    const server = serverSnap.data() as ServerDocShape | undefined;
    if (!match || !server || match.stage !== 'active' || match.phase !== 'answer') return;

    const botBySlot = new Map(server.bots.map((b) => [b.slot, b]));
    const humanRefs = server.humanUids.map((uid) => db.collection(PLAYERS).doc(playerDocId(matchId, uid)));
    const humanSnaps = humanRefs.length > 0 ? await Promise.all(humanRefs.map((r) => tx.get(r))) : [];
    const humanDocs: ConstellationPlayerDoc[] = [];
    for (const snap of humanSnaps) {
      const d = snap.data() as ConstellationPlayerDoc | undefined;
      if (d) humanDocs.push(d);
    }

    // Записи раунда: люди из доков, боты из планов.
    const records: SlotRoundRecord[] = [];
    for (const doc of humanDocs) {
      records.push({
        slot: doc.slot,
        kind: doc.round === match.round ? doc.kind : 'idle',
        target: doc.round === match.round ? doc.target : null,
        shieldStarKey: doc.round === match.round ? doc.shieldStarKey : null,
        questionCount: doc.questions.length,
        answers: doc.answers.map((a) => ({ qIndex: a.qIndex, correct: a.correct, timeMs: a.timeMs })),
        perfectOverride: null,
      });
    }
    for (const bot of server.bots) {
      const plan = bot.plan;
      const isDuel = server.duels.some((d) => d.slots.includes(bot.slot));
      const status = server.state.players[bot.slot].status;
      records.push({
        slot: bot.slot,
        kind: status === 'falling' ? 'falling' : isDuel ? 'duel' : bot.target ? 'attack' : 'idle',
        target: bot.target,
        shieldStarKey: bot.shieldStarKey,
        questionCount: plan?.correct.length ?? 0,
        answers: (plan?.correct ?? []).map((correct, i) => ({
          qIndex: i,
          correct,
          timeMs: plan?.timesMs[i] ?? 10_000,
        })),
        perfectOverride: plan ? plan.perfect : null,
      });
    }

    const input = buildRoundInput(records, server.duels.map((d) => ({ starKey: d.starKey, slots: d.slots })));
    const resolution = resolveRound(server.state, input, cfg);
    finished = resolution.state.stage === 'finished';

    // Звездопад (C1): осколки за события, кап на матч, дроп вдвое при <2 живых людях.
    const starfallBySlot = { ...server.starfallBySlot };
    if (match.starfall.golden) {
      const humansAlive = humanDocs.filter(
        (d) => resolution.state.players[d.slot].status !== 'out',
      ).length;
      const halve = humansAlive < 2;
      const addFor = (slot: number, amount: number) => {
        const add = halve ? Math.floor(amount / 2) : amount;
        const prev = starfallBySlot[slot] ?? 0;
        starfallBySlot[slot] = Math.min(cfg.starfall.matchCap, prev + add);
      };
      for (const e of resolution.events) {
        if (e.slot === undefined) continue;
        if (e.type === 'capture') addFor(e.slot, cfg.starfall.perCapture);
        if (e.type === 'duel_capture') addFor(e.slot, cfg.starfall.perDuelWin);
        if (e.type === 'polar_income') addFor(e.slot, cfg.starfall.perPolarRound);
      }
    }

    // Тайбрейк-статистика времени ответов (A8).
    const answerStats = { ...server.answerStats };
    for (const r of records) {
      const prev = answerStats[r.slot] ?? { timeSumMs: 0, count: 0 };
      const add = r.answers.reduce((s, a) => s + Math.min(a.timeMs, 60_000), 0);
      answerStats[r.slot] = { timeSumMs: prev.timeSumMs + add, count: prev.count + r.answers.length };
    }

    const now = Date.now();
    const meta: PlayerMeta[] = match.players.map((p) => {
      const m: PlayerMeta = {
        uid: p.uid, name: p.name, avatar: p.avatar, avatarLevel: p.avatarLevel,
      };
      if (p.aura) m.aura = p.aura;
      return m;
    });
    const starValueOf = (key: string) => cfg.scoring.starPoints[ringOf(parseHexKey(key))];
    const players = publicPlayersFromState(resolution.state, meta, {
      starfallBySlot,
      roundDoneSlots: new Set(),
      liveScoreBySlot: liveScoreBySlotFromState(resolution.state, starValueOf),
    });

    tx.update(matchRef, {
      stars: resolution.state.stars,
      players,
      round: resolution.state.round,
      stage: resolution.state.stage,
      phase: 'choose',
      phaseDeadlineAt: now + cfg.choosePhaseSec * 1000,
      roundEvents: resolution.events,
      ...(finished ? { finishedAt: now } : {}),
    });
    tx.update(serverRef, {
      state: resolution.state,
      duels: [],
      correctByQid: {},
      bots: server.bots.map((b) => ({ ...b, plan: null, target: null, shieldStarKey: null })),
      starfallBySlot,
      answerStats,
      updatedAt: now,
    });
    for (const doc of humanDocs) {
      tx.update(db.collection(PLAYERS).doc(playerDocId(matchId, doc.uid)), {
        round: resolution.state.round,
        kind: 'idle',
        target: null,
        shieldStarKey: null,
        questions: [],
        answers: [],
        dealtAt: null,
        doneAt: null,
        duelStarKey: null,
        duelOppSlot: null,
        outpaced: false,
        updatedAt: now,
      });
    }
  });

  if (finished) {
    await finalizeConstellationMatch(matchId).catch((e) => console.error('finalize', e));
  }
}

// ── Финализация: места, results-док (награды/балансы — этап E) ─────────────

export async function finalizeConstellationMatch(matchId: string): Promise<void> {
  const matchRef = db.collection(MATCHES).doc(matchId);
  const serverRef = db.collection(SERVER).doc(matchId);

  await db.runTransaction(async (tx) => {
    const [matchSnap, serverSnap] = await Promise.all([tx.get(matchRef), tx.get(serverRef)]);
    const match = matchSnap.data() as ConstellationMatchDoc | undefined;
    const server = serverSnap.data() as ServerDocShape | undefined;
    if (!match || !server || match.stage !== 'finished' || match.resultProcessedAt) return;

    const cfg = await resolveConstellationConfig(db);
    const state: MatchState = server.state;
    const finals = computeFinalScores(
      state.players.map((p) => ({
        uid: p.uid,
        starKeys: p.status === 'out' ? [] : ownedStarKeys(state, p.slot),
        bonusPoints: p.bonusPoints,
      })),
      cfg.scoring.starPoints,
    );
    const totalByUid = new Map(finals.map((f) => [f.uid, f.total]));
    const ranked = rankPlayers(state.players.map((p) => {
      const stats = server.answerStats[p.slot] ?? { timeSumMs: 0, count: 0 };
      return {
        uid: p.uid,
        points: totalByUid.get(p.uid) ?? 0,
        starCount: p.status === 'out' ? 0 : ownedStarKeys(state, p.slot).length,
        perfectCaptures: p.perfectCaptures,
        avgAnswerMs: stats.count > 0 ? stats.timeSumMs / stats.count : Number.MAX_SAFE_INTEGER,
      };
    }));
    const placeByUid = new Map(ranked.map((r) => [r.uid, r.place]));
    const now = Date.now();

    // ── Начисление наград (E1–E4): только людям, идемпотентно под resultProcessedAt.
    const botUids = new Set(server.bots.map((b) => b.uid));
    const humanUids = match.players.map((p) => p.uid).filter((u) => !botUids.has(u));
    const livingHumans = state.players.filter(
      (p) => !botUids.has(p.uid) && p.status !== 'out',
    ).length;
    const isTutorial = (match as { tutorial?: boolean }).tutorial === true;

    // Читаем профили и статистику режима игроков-людей ВНУТРИ транзакции.
    const profileRefs = new Map(humanUids.map((u) => [u, db.collection('arena_profiles').doc(u)]));
    const userRefs = new Map(humanUids.map((u) => [u, db.collection('users').doc(u)]));
    const profileSnaps = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    const userSnaps = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    for (const u of humanUids) {
      profileSnaps.set(u, await tx.get(profileRefs.get(u) as FirebaseFirestore.DocumentReference));
      userSnaps.set(u, await tx.get(userRefs.get(u) as FirebaseFirestore.DocumentReference));
    }

    const rewardByUid = new Map<string, ReturnType<typeof computeMatchRewards>>();
    for (const player of state.players) {
      if (botUids.has(player.uid)) continue;
      const uSnap = userSnaps.get(player.uid);
      const matchesBefore = Number(
        (uSnap?.data() as { constellation_stats?: { matchesPlayed?: number } } | undefined)
          ?.constellation_stats?.matchesPlayed ?? 0,
      );
      const reward = computeMatchRewards({
        place: placeByUid.get(player.uid) ?? 4,
        isBot: false,
        golden: match.starfall.golden,
        wager: match.wagerBySlot[player.slot] ?? 0,
        dustEarned: player.dustEarned,
        starfallEarned: server.starfallBySlot[player.slot] ?? 0,
        matchesPlayedBefore: matchesBefore,
        perfectCaptures: player.perfectCaptures,
        livingHumans,
        cfg,
      });
      rewardByUid.set(player.uid, reward);

      // ── Ранг/★/SR/XP в arena_profiles (общий с ареной ранг, E1/E2).
      const pRef = profileRefs.get(player.uid) as FirebaseFirestore.DocumentReference;
      const pSnap = profileSnaps.get(player.uid);
      const pData = (pSnap?.exists ? pSnap.data() : undefined) as Record<string, unknown> | undefined;
      const rank = (pData?.rank ?? {}) as { tier?: string; level?: string; stars?: number };
      const oldTier = typeof rank.tier === 'string' ? rank.tier : 'bronze';
      const oldLevel = typeof rank.level === 'string' ? rank.level : 'I';
      const oldStars = typeof rank.stars === 'number' ? rank.stars : 0;
      const wasCeiling = oldTier === 'legend' && oldLevel === 'III';
      // На потолке двигаем SR, ниже — звёзды (как дуэльная арена).
      const progressed = applyStarDelta(
        { tier: oldTier, level: oldLevel, stars: oldStars },
        wasCeiling ? 0 : reward.starDelta,
      );
      const nowSeason = seasonIdForDate(new Date(now));
      const staleSeason = pData?.seasonId !== nowSeason;
      const curSr = staleSeason ? 0 : Number(pData?.sr ?? 0);
      const newSr = wasCeiling ? Math.max(0, curSr + reward.srDelta) : curSr;

      if (!pSnap?.exists) {
        tx.set(pRef, {
          userId: player.uid,
          displayName: player.uid === match.players.find((p) => p.slot === player.slot)?.uid
            ? match.players.find((p) => p.slot === player.slot)?.name ?? 'Игрок'
            : 'Игрок',
          rank: { tier: progressed.tier, level: progressed.level, stars: progressed.stars },
          xp: reward.xp,
          seasonId: nowSeason,
          sr: newSr,
          updatedAt: now,
        }, { merge: true });
      } else {
        tx.update(pRef, {
          'rank.tier': progressed.tier,
          'rank.level': progressed.level,
          'rank.stars': progressed.stars,
          xp: Number(pData?.xp ?? 0) + reward.xp,
          seasonId: nowSeason,
          sr: newSr,
          updatedAt: now,
        });
      }

      // ── Осколки в users.shards + shard_log (серверный леджер, C4).
      const uRef = userRefs.get(player.uid) as FirebaseFirestore.DocumentReference;
      const uSnapData = userSnaps.get(player.uid)?.data() as
        | { shards?: number; constellation_stats?: { matchesPlayed?: number } }
        | undefined;
      const before = Number(uSnapData?.shards ?? 0);
      const after = before + reward.shards;
      const wonPlace = placeByUid.get(player.uid) ?? 4;
      tx.set(uRef, {
        ...(reward.shards !== 0 ? {
          shards: after,
          shards_updated_at_ms: now,
          shards_updated_op: 'earn',
          shards_updated_reason: 'constellation_match',
        } : {}),
        constellation_stats: {
          matchesPlayed: matchesBefore + 1,
          lastPlace: wonPlace,
          lastMatchId: matchId,
          updatedAt: now,
        },
        updatedAt: now,
      }, { merge: true });
      if (reward.shards !== 0) {
        tx.set(uRef.collection('shard_log').doc(), {
          ts: new Date(now).toISOString(),
          type: 'earn',
          amount: reward.shards,
          reason: match.starfall.golden ? 'constellation_starfall' : 'constellation_match',
          balanceBefore: before,
          balanceAfter: after,
          matchId,
          place: wonPlace,
        });
      }
    }

    tx.update(matchRef, {
      players: match.players.map((p) => ({
        ...p,
        place: placeByUid.get(p.uid) ?? 4,
        roundDone: false,
      })),
      resultProcessedAt: now,
    });
    tx.set(db.collection(RESULTS).doc(matchId), {
      matchId,
      finishedAt: match.finishedAt ?? now,
      golden: match.starfall.golden,
      uids: match.players.map((p) => p.uid),
      players: match.players.map((p) => {
        const reward = rewardByUid.get(p.uid);
        return {
          uid: p.uid,
          slot: p.slot,
          name: p.name,
          place: placeByUid.get(p.uid) ?? 4,
          points: totalByUid.get(p.uid) ?? 0,
          dustEarned: p.dustEarned,
          starfallEarned: server.starfallBySlot[p.slot] ?? 0,
          perfectCaptures: p.perfectCaptures,
          // Награды для экрана результатов (полёт XP/осколков/★).
          xpGained: reward?.xp ?? 0,
          shardsGained: reward?.shards ?? 0,
          starDelta: reward?.starDelta ?? 0,
          srDelta: reward?.srDelta ?? 0,
          collectibleEligible: !isTutorial && (reward?.collectibleEligible ?? false),
        };
      }),
      wagerBySlot: match.wagerBySlot,
      createdAt: now,
    });
  });
}

// ── Watchdog: форсирует просроченные переходы (edge «матч завис», ≤60с) ─────

export async function constellationWatchdogTick(): Promise<void> {
  const now = Date.now();
  const snap = await db.collection(MATCHES)
    .where('stage', '==', 'active')
    .where('phaseDeadlineAt', '<', now - 1500)
    .limit(20)
    .get();
  for (const doc of snap.docs) {
    const match = doc.data() as ConstellationMatchDoc;
    try {
      if (match.phase === 'choose') await advanceToAnswer(doc.id);
      else await resolveCurrentRound(doc.id);
    } catch (e) {
      console.error(`constellation watchdog ${doc.id}`, e);
    }
  }
  // Финализация зависших «finished без результата»: == null не находит
  // ОТСУТСТВУЮЩИЕ поля в Firestore — берём свежие finished и фильтруем кодом.
  const stuck = await db.collection(MATCHES)
    .where('stage', '==', 'finished')
    .orderBy('finishedAt', 'desc')
    .limit(10)
    .get()
    .catch(() => null);
  if (stuck) {
    for (const doc of stuck.docs) {
      const data = doc.data() as ConstellationMatchDoc;
      if (data.resultProcessedAt) continue;
      await finalizeConstellationMatch(doc.id).catch((e) => console.error('watchdog finalize', e));
    }
  }
}

/** Все живые люди сходили/ответили? — ранний переход фазы (A3 фаст-форвард). */
export function allHumansDoneForPhase(
  match: ConstellationMatchDoc,
  humanDocs: ConstellationPlayerDoc[],
  humanSlotsAlive: PlayerSlot[],
): boolean {
  if (match.phase === 'choose') {
    return humanSlotsAlive.every((slot) => {
      const doc = humanDocs.find((d) => d.slot === slot);
      return doc?.round === match.round && (doc.target !== null || doc.doneAt !== null);
    });
  }
  return humanDocs.every((doc) => {
    if (doc.round !== match.round) return true;
    return doc.questions.length === 0 || doc.answers.length >= doc.questions.length;
  });
}
