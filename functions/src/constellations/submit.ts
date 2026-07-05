// ════════════════════════════════════════════════════════════════════════════
// constellations/submit.ts — callable constellationSubmitAction (спек H2/D6).
//
// ЕДИНСТВЕННЫЙ путь записи хода игрока: клиент не пишет в constellation_players
// напрямую (правила H3). Всё серверно: валидация фазы/легальности, скоринг
// ответа по correctByQid из закрытого constellation_server, серверные тайминги,
// отклонение нечеловеческих (<minAnswerMs), идемпотентность по actionId.
//
// Ответ на 'answer' возвращает correct/correctIndex — раскрытие ПОСЛЕ фиксации
// ответа безопасно. Разборы (rule) в режиме нет — только сам факт верно/неверно.
// Ранний фаст-форвард (A3): последний сходивший человек триггерит переход фазы.
// ════════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from '../callable_options';
import { resolveConstellationConfig } from './config';
import { legalTargets, type PlayerSlot } from './engine';
import {
  advanceToAnswer,
  allHumansDoneForPhase,
  resolveCurrentRound,
} from './match_service';
import type {
  ConstellationMatchDoc,
  ConstellationPlayerDoc,
  ConstellationServerDoc,
} from './store_types';

const db = admin.firestore();

const MATCHES = 'constellation_matches';
const PLAYERS = 'constellation_players';
const SERVER = 'constellation_server';

/** Фиксированный набор эмоутов (F10): id → тексты на studyTarget живут на клиенте. */
export const CONSTELLATION_EMOTE_IDS = [
  'well_played', 'not_bad', 'too_easy', 'lucky_star', 'ouch', 'gg', 'thinking', 'on_fire',
] as const;

const PROCESSED_ACTIONS_CAP = 60;
const EMOTES_KEEP = 30;

export interface SubmitActionData {
  matchId?: unknown;
  actionId?: unknown;
  type?: unknown;
  target?: unknown;
  starKey?: unknown;
  qIndex?: unknown;
  answerIndex?: unknown;
  emoteId?: unknown;
}

interface ServerDocShape extends ConstellationServerDoc {
  humanUids: string[];
}

function asId(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.length === 0 || v.length > 120) {
    throw new HttpsError('invalid-argument', `bad ${field}`);
  }
  return v;
}

export async function handleConstellationSubmit(
  uid: string,
  data: SubmitActionData,
): Promise<Record<string, unknown>> {
  const matchId = asId(data.matchId, 'matchId');
  const actionId = asId(data.actionId, 'actionId');
  const type = asId(data.type, 'type');

  const matchRef = db.collection(MATCHES).doc(matchId);
  const serverRef = db.collection(SERVER).doc(matchId);
  const playerRef = db.collection(PLAYERS).doc(`${matchId}_${uid}`);
  const cfg = await resolveConstellationConfig(db);

  const result = await db.runTransaction(async (tx) => {
    const [matchSnap, serverSnap, playerSnap] = await Promise.all([
      tx.get(matchRef), tx.get(serverRef), tx.get(playerRef),
    ]);
    const match = matchSnap.data() as ConstellationMatchDoc | undefined;
    const server = serverSnap.data() as ServerDocShape | undefined;
    const player = playerSnap.data() as (ConstellationPlayerDoc & { lastAnswerAt?: number }) | undefined;
    if (!match || !server) throw new HttpsError('not-found', 'match not found');
    if (!player) throw new HttpsError('permission-denied', 'not a participant');
    if (match.stage !== 'active') throw new HttpsError('failed-precondition', 'match finished');
    if (player.processedActionIds.includes(actionId)) {
      return { ok: true, duplicate: true };
    }

    const slot = player.slot;
    const now = Date.now();
    const pushActionId = (extra: Record<string, unknown>) => {
      tx.update(playerRef, {
        ...extra,
        processedActionIds: [...player.processedActionIds, actionId].slice(-PROCESSED_ACTIONS_CAP),
        updatedAt: now,
      });
    };
    const markRoundDone = () => {
      tx.update(matchRef, {
        players: match.players.map((p) => (p.slot === slot ? { ...p, roundDone: true } : p)),
      });
    };

    if (type === 'choose_target') {
      if (match.phase !== 'choose') throw new HttpsError('failed-precondition', 'not choose phase');
      if (server.state.players[slot].status !== 'alive') {
        throw new HttpsError('failed-precondition', 'player not alive');
      }
      const target = data.target === null || data.target === undefined
        ? null
        : asId(data.target, 'target');
      if (target !== null && !legalTargets(server.state, slot).includes(target)) {
        throw new HttpsError('failed-precondition', 'illegal target');
      }
      pushActionId({ target, round: match.round, doneAt: now });
      markRoundDone();
      return { ok: true, phaseCheck: 'choose' };
    }

    if (type === 'use_shield') {
      if (match.phase !== 'choose') throw new HttpsError('failed-precondition', 'not choose phase');
      const starKey = asId(data.starKey, 'starKey');
      const p = server.state.players[slot];
      if (p.status !== 'alive') throw new HttpsError('failed-precondition', 'player not alive');
      if (p.shieldUsed) throw new HttpsError('failed-precondition', 'shield already used');
      if (server.state.stars[starKey]?.owner !== slot) {
        throw new HttpsError('failed-precondition', 'not your star');
      }
      pushActionId({ shieldStarKey: starKey, round: match.round });
      return { ok: true };
    }

    if (type === 'answer') {
      if (match.phase !== 'answer') throw new HttpsError('failed-precondition', 'not answer phase');
      if (player.round !== match.round || player.questions.length === 0) {
        throw new HttpsError('failed-precondition', 'no questions this round');
      }
      const qIndex = typeof data.qIndex === 'number' ? data.qIndex : -1;
      const answerIndex = typeof data.answerIndex === 'number' ? data.answerIndex : -1;
      if (qIndex !== player.answers.length) {
        throw new HttpsError('failed-precondition', 'answer out of order');
      }
      const question = player.questions[qIndex];
      if (!question) throw new HttpsError('failed-precondition', 'no such question');
      if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) {
        throw new HttpsError('invalid-argument', 'bad answerIndex');
      }
      // Серверное время ответа (D6): от выдачи/предыдущего ответа, клиенту не верим.
      const sinceMs = now - (player.lastAnswerAt ?? player.dealtAt ?? now);
      const timeMs = Math.max(0, sinceMs);
      if (timeMs < cfg.quizzes.minAnswerMs) {
        throw new HttpsError('failed-precondition', 'too fast');
      }
      const key = server.correctByQid[question.qid];
      const correct = !!key && key.correctIndex === answerIndex;
      const answers = [...player.answers, { qIndex, answerIndex, correct, timeMs }];
      const done = answers.length >= player.questions.length;
      pushActionId({
        answers,
        lastAnswerAt: now,
        ...(done ? { doneAt: now } : {}),
      });
      if (done) markRoundDone();
      // correctIndex клиенту НЕ отдаём (аудит): по спеку D6 разборов в режиме
      // нет, клиенту достаточно факта correct. Иначе клиент мог бы копить пары
      // «вопрос → правильный ответ» для будущих повторов вопросов из банка.
      return {
        ok: true,
        correct,
        done,
        phaseCheck: 'answer',
      };
    }

    if (type === 'emote') {
      const emoteId = asId(data.emoteId, 'emoteId');
      if (!(CONSTELLATION_EMOTE_IDS as readonly string[]).includes(emoteId)) {
        throw new HttpsError('invalid-argument', 'unknown emote');
      }
      const mineThisRound = match.emotes.filter(
        (e) => e.slot === slot && e.round === match.round,
      ).length;
      if (mineThisRound >= cfg.emotes.perRoundCap) {
        throw new HttpsError('resource-exhausted', 'emote cooldown');
      }
      const emotes = [...match.emotes, { slot, emoteId, round: match.round, at: now }]
        .slice(-EMOTES_KEEP);
      tx.update(matchRef, { emotes });
      pushActionId({});
      return { ok: true };
    }

    if (type === 'tick') {
      // Клиент увидел, что дедлайн фазы истёк, и просит форсировать переход.
      // Идемпотентно и безопасно: реальный перевод фазы делает проверка ниже
      // (deadlineElapsed), а не сам клиент — читер не ускорит раунд.
      pushActionId({});
      return { ok: true, phaseCheck: match.phase, deadlineTick: true };
    }

    throw new HttpsError('invalid-argument', `unknown type ${type}`);
  });

  // Переход фазы: (а) фаст-форвард — все люди сходили/ответили (A3), либо
  // (б) tick — истёк дедлайн фазы. СИНХРОННО await (иначе в Cloud Functions фон
  // после return убивается платформой → раунд ЗАВИСАЛ, ждал минутный watchdog).
  // Лаг «зажечь звезду» решается на клиенте оптимистично (шторка закрывается
  // сразу); этот await наступает только когда ВСЕ готовы — тап не блокирует.
  const phaseCheck = (result as { phaseCheck?: string }).phaseCheck;
  const isDeadlineTick = (result as { deadlineTick?: boolean }).deadlineTick === true;
  delete (result as Record<string, unknown>).phaseCheck;
  delete (result as Record<string, unknown>).deadlineTick;

  if (phaseCheck) {
    try {
      const [matchSnap, serverSnap] = await db.getAll(matchRef, serverRef);
      const match = matchSnap.data() as ConstellationMatchDoc | undefined;
      const server = serverSnap.data() as ServerDocShape | undefined;
      if (match && server && match.stage === 'active' && match.phase === phaseCheck) {
        const humanSnaps = server.humanUids.length > 0
          ? await db.getAll(...server.humanUids.map(
            (u) => db.collection(PLAYERS).doc(`${matchId}_${u}`),
          ))
          : [];
        const humanDocs = humanSnaps
          .map((s) => s.data() as ConstellationPlayerDoc | undefined)
          .filter((d): d is ConstellationPlayerDoc => !!d);
        const humanSlotsAlive = humanDocs
          .filter((d) => server.state.players[d.slot]?.status === 'alive')
          .map((d) => d.slot as PlayerSlot);
        const deadlineElapsed = isDeadlineTick && Date.now() >= match.phaseDeadlineAt - 500;
        if (deadlineElapsed || allHumansDoneForPhase(match, humanDocs, humanSlotsAlive)) {
          if (match.phase === 'choose') await advanceToAnswer(matchId);
          else await resolveCurrentRound(matchId);
        }
      }
    } catch (e) {
      console.warn('constellation fast-forward failed — watchdog подстрахует', e);
    }
  }
  return result;
}

/** Callable: единственная точка входа ходов клиента (регистрируется в index.ts). */
export const constellationSubmitAction = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth required');
  // Как у арены (matchmaking_queue): очередь и матчи ключуются AUTH uid —
  // клиент джойнится через ensureArenaAuthUid(), правила требуют
  // d.userId == request.auth.uid. Никакого stable-маппинга здесь не нужно.
  return handleConstellationSubmit(request.auth.uid, (request.data ?? {}) as SubmitActionData);
});
