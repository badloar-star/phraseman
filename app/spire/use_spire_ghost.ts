// ═══════════════════════════════════════════════════════════════════════════
// use_spire_ghost.ts — выбрать «призрака друга» для ступени (ТЗ spire-engagement-2026-10-25.md §3а, владелец 25.10: среднее время).
//
// зачем: выбор делается ОДИН раз на ступень, при её открытии, из того, что уже лежит в памяти: комната недели (peekSpireRoom — кэш
// 6 часов) и снимок друзей (peekFriendsTabSwrWarm). Ни одного чтения Firestore и ни одного сетевого вызова; в сеть за комнатой не идём.
// Выключенный флаг — null без единого обращения к кэшам (ступень 2.0.2).
// СПЕРВА ЛОГИ: [SPIRE-GHOST] — кандидат и почему, либо «нет призрака: причина=…».
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { peekFriendsTabSwrWarm } from '../friends_tab_swr_warm';
import { spireGhostEnabled } from '../../components/spire/spire_ghost_flag';
import {
  spireGhostLogLine,
  spireGhostMarkFrac,
  spireGhostStepNumber,
  spirePickGhost,
  type SpireGhost,
} from '../../modules/spire/ghost';
import { peekSpireRoom } from './spire_room_client';
import { rememberSpireGhost } from './spire_ghost_memory';
import type { SpireStepContext } from './use_spire_step_runner';

// зачем (сторож spire_game_source_contract): весь Шпиль в app/spire/ пишет с префиксом '[SPIRE]'; тег задачи [SPIRE-GHOST] идёт вторым аргументом — ищется и так, и так
const LOG = '[SPIRE]';
const GHOST = '[SPIRE-GHOST]';

export type SpireGhostView = Readonly<{
  ghost: SpireGhost;
  /** Доля оставшегося времени, при которой друг финиширует; null — друг в среднем не укладывается в бюджет, метки на кольце нет. */
  markFrac: number | null;
}>;

/** Чистая сборка для хука и тестов: всё, что нужно, приходит аргументами. */
export function spireBuildGhostView(input: Readonly<{ uid: string; ctx: SpireStepContext; budgetMs: number }>): SpireGhostView | null {
  const { uid, ctx, budgetMs } = input;
  const stepNumber = spireGhostStepNumber(ctx.floor, ctx.stepInFloor);
  let room = peekSpireRoom(uid, ctx.lang);
  if (room && room.weekId !== ctx.weekKey) {
    console.log(LOG, GHOST, `комната из другой недели (комната=${room.weekId} ступень=${ctx.weekKey}) — не используем`); // guard-ok: ранний выход с причиной
    room = null;
  }
  const warm = peekFriendsTabSwrWarm();
  const friendUids = new Set<string>(warm && warm.canonicalUid === uid ? warm.friends.map((f) => f.uid) : []);
  const pick = spirePickGhost({ room, friendUids, myUid: uid, stepNumber });
  console.log(LOG, GHOST, spireGhostLogLine(pick, stepNumber), `| друзей в снимке=${friendUids.size} участников комнаты=${room?.members.length ?? 0} бюджет=${budgetMs}мс`); // guard-ok: одна строка на ступень
  rememberSpireGhost(pick.ghost, ctx);
  if (!pick.ghost) return null;
  const markFrac = spireGhostMarkFrac(pick.ghost.avgMs, budgetMs);
  if (markFrac === null) console.log(LOG, GHOST, `метки на кольце нет: среднее ${pick.ghost.avgMs}мс не короче бюджета ${budgetMs}мс`); // guard-ok: ранний выход с причиной
  return { ghost: pick.ghost, markFrac };
}

/** Призрак на ступень: считается один раз при открытии ступени (StepBody ключуется по runId), дальше не перерисовывается. */
export function useSpireGhost(input: Readonly<{ uid: string; ctx: SpireStepContext; budgetMs: number }>): SpireGhostView | null {
  const [view] = useState<SpireGhostView | null>(() => {
    if (!spireGhostEnabled()) {
      rememberSpireGhost(null, input.ctx); // зачем: флаг выключен — итог не должен взять призрака прошлой ступени из включённого dev-режима
      return null;
    }
    return spireBuildGhostView(input);
  });
  return view;
}

/* expo-router: утилита, не экран */
export default function __UseSpireGhostRouteShim() { return null; }
