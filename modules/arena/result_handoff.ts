import type { ArenaMatch, ArenaMatchReward } from './contract';
import type { ArenaResultPreview } from './result_preview';

/**
 * Снимок для экрана результата.
 *
 * `match` появляется только вместе с авторитетным ответом сервера. Пока его
 * нет, экран открывается по `preview` — локальному итогу, посчитанному на
 * устройстве сразу после последнего задания (владелец 2026-08-23: «очень долго
 * загружается экран завершения»). Оба поля необязательные по отдельности, но
 * пустым снимок не бывает: без обоих открывать нечего.
 */
export type ArenaResultHandoff = Readonly<{
  ownerKey: string;
  matchId: string;
  match?: ArenaMatch;
  viewerSeat: 'a' | 'b';
  viewerReward?: ArenaMatchReward;
  /** Локальный итог до ответа сервера. Ничего не начисляет — только рисует. */
  preview?: ArenaResultPreview;
}>;

type FinishLike = Readonly<{
  settled?: boolean;
  match?: ArenaMatch;
  viewerSeat?: 'a' | 'b';
  viewerReward?: ArenaMatchReward;
}>;

const handoffs = new Map<string, ArenaResultHandoff>();
const keyOf = (ownerKey: string, matchId: string) => `${ownerKey}\u0000${matchId}`;

export function arenaResultHandoffReady(
  response: FinishLike,
  mode: string | null | undefined,
): response is FinishLike & Readonly<{ match: ArenaMatch; viewerSeat: 'a' | 'b' }> {
  if (response.settled !== true || !response.match || !response.viewerSeat) return false;
  if (response.match.state !== 'settled' && response.match.state !== 'aborted') return false;
  return mode !== 'quick' || Boolean(response.viewerReward);
}

export function arenaRememberResultHandoff(handoff: ArenaResultHandoff): void {
  // The app has one active account and one foreground navigation handoff.
  // Keeping exactly one entry prevents private rewards from accumulating
  // across account generations before the result screen consumes the cache.
  handoffs.clear();
  handoffs.set(keyOf(handoff.ownerKey, handoff.matchId), handoff);
}

export function arenaPeekResultHandoff(ownerKey: string, matchId: string): ArenaResultHandoff | null {
  return handoffs.get(keyOf(ownerKey, matchId)) ?? null;
}

/** Drops the process-only private snapshot once React state owns the frame. */
export function arenaForgetResultHandoff(ownerKey: string, matchId: string): void {
  handoffs.delete(keyOf(ownerKey, matchId));
}
