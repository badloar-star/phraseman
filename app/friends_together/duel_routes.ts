/**
 * «Дуэль на 5 фраз» (идея 3) — адреса экрана дуэли из событий: ответ на вызов друга и итог у вызвавшего.
 * зачем: вкладка «Друзья» (маркер, «Реванш») и «Сообщения» открывают одно и то же — один модуль, чтобы адреса не разошлись.
 * Всё нужное лежит в строке уведомления (формат 1 · ЯДРО 22.10) — ни одного чтения сервера.
 */
import type { FriendDuelChallengeInfo, FriendDuelResultInfo } from '../friend_social_events';
import { duelLaunchParams, type DuelLaunchParams } from './duel_launch';

export type DuelFriendView = Readonly<{ uid: string; name: string; coinRank: number | null; isPlus: boolean }>;

/** Ответ на вызов: те же 5 фраз; строка вызова гаснет после отправленного хода (notificationId). */
export function duelAnswerParams(friend: DuelFriendView, duel: FriendDuelChallengeInfo, myName: string, notificationId: string | null): DuelLaunchParams {
  return duelLaunchParams({
    mode: 'answer',
    friendUid: friend.uid,
    friendName: friend.name,
    friendCoinRank: friend.coinRank,
    friendIsPlus: friend.isPlus,
    phraseIds: duel.phraseIds,
    duelId: duel.duelId,
    myName,
    notificationId,
    result: null,
  });
}

/** Итог у вызвавшего: исход, счёт и отметки обоих, фразы — из строки «Итог дуэли». */
export function duelResultParams(friend: DuelFriendView, result: FriendDuelResultInfo, myName: string): DuelLaunchParams {
  return duelLaunchParams({
    mode: 'result',
    friendUid: friend.uid,
    friendName: friend.name,
    friendCoinRank: friend.coinRank,
    friendIsPlus: friend.isPlus,
    phraseIds: result.phraseIds ?? [],
    duelId: result.duelId,
    myName,
    notificationId: null,
    result: { outcome: result.outcome, mine: result.mine, theirs: result.theirs },
  });
}

/** Сколько целых часов до конца вызова (для фактов шторки): не меньше 1, пока вызов жив. */
export function duelHoursLeft(expiresAtMs: number | undefined, nowMs: number): number {
  if (typeof expiresAtMs !== 'number') return 0;
  const left = expiresAtMs - nowMs;
  return left <= 0 ? 0 : Math.max(1, Math.floor(left / 3_600_000));
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
