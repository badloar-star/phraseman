// зачем: MAX (голосовой репетитор) не имел ни одного упоминания studyTarget
// (аудит 2026-08-23) — то есть молча предполагал английский. Этот гейт делает
// предположение явным и честным вместо тихой утечки английского контента.
//
// зачем НЕ storageStudyTarget: тот нормализатор схлопывает всё кроме 'fr' в
// 'en' (он для namespace ключей хранилища, намеренно lossy) — и на 'es' вернул
// бы «контент есть», то есть ровно ту тихую утечку, против которой этот гейт.
// Здесь сравнивается сырой рантайм-таргет.
import type { RuntimeStudyTarget } from './target_storage_keys';

/** MAX сегодня существует только для английского контура. */
export function maxVoiceContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return studyTarget === undefined || studyTarget === null || studyTarget === 'en';
}

/* expo-router: не регистрировать файл как экран */
export default function __MaxTargetGateRouteShim() {
  return null;
}
