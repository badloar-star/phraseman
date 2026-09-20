// зачем: Арена не имела ни одного упоминания studyTarget (аудит 2026-08-23) —
// то есть молча предполагала английский. Этот гейт делает предположение явным
// и честным вместо тихой утечки английского контента в испанский контур.
//
// зачем НЕ storageStudyTarget: тот нормализатор схлопывает всё кроме 'fr' в
// 'en' (он для namespace ключей хранилища, намеренно lossy) — и на 'es' вернул
// бы «контент есть», то есть ровно ту тихую утечку, против которой этот гейт.
// Здесь сравнивается сырой рантайм-таргет.
import type { RuntimeStudyTarget } from './target_storage_keys';
import {
  resolveArenaStudyTarget,
  type ArenaStudyTarget,
} from '../modules/arena/target_registry';

export type ArenaTargetReadiness = Readonly<Partial<Record<ArenaStudyTarget, boolean>>>;

/** Missing/unknown targets and targets without an explicitly ready pool are unavailable. */
export function arenaContentAvailableForTarget(
  studyTarget?: RuntimeStudyTarget,
  readiness?: ArenaTargetReadiness,
): boolean {
  const target = resolveArenaStudyTarget(studyTarget);
  if (!target) return false;
  // A missing publication decision is never permission to fall back to
  // English: each contour must be deliberately declared ready.
  return readiness?.[target] === true;
}

/* expo-router: не регистрировать файл как экран */
export default function __ArenaTargetGateRouteShim() {
  return null;
}
