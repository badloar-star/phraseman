/**
 * Чистое решение о доступе с учётом «новый/старый» и флага (без React — тестируется в node).
 * зачем (владелец 30.10): гейты только для нового пользователя; старым и неопределённым всё открыто.
 */
import { decideRankAccess, type RankAccessDecision, type RankAccessSurface } from '../shared/rank_access_contract';
import type { RankGateUserVerdict } from './rank_gates_new_user';

/** Закрыт ли раздел (только locked): pending/unavailable не запирают — старых и неопределённых не трогаем. */
export function isSurfaceLocked(decision: RankAccessDecision): boolean { return decision.status === 'locked'; }

/** Чистое решение с учётом «нового/старого» и флага — для тестов и не-хуковых мест. */
export function decideForUser(
  surface: RankAccessSurface,
  input: Readonly<{ gatesEnabled: boolean; verdict: RankGateUserVerdict | null; rank: number | null; plusActive: boolean; plusResolved: boolean; existingUsersGated?: boolean }>,
): RankAccessDecision {
  // зачем (владелец 05.11 06:08, «Ранг 0 а у меня всё доступно»): неопределённое (вердикт не прочитан) по-прежнему НЕ запираем; «старый» пользователь заперт по рангу, если Пульт не выключил rank_gates_existing_users
  if (!input.gatesEnabled || !input.verdict || (!input.verdict.isNew && input.existingUsersGated !== true)) return { status: 'allowed', basis: 'grandfather' };
  return decideRankAccess(surface, {
    rank: input.rank, rankResolved: input.rank !== null,
    plusActive: input.plusActive, plusResolved: input.plusResolved,
    grantedSurfaces: new Set<RankAccessSurface>(), grantsResolved: true,
    available: true, availabilityResolved: true,
  });
}
