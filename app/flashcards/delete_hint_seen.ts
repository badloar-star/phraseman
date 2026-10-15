// зачем (аудит кнопок Карточек #10, координатор 15.10): подсказка «Зажми карточку, чтобы изменить или удалить её» писала СТАРЫЙ ключ `flashcard_delete_hint_seen`, а читалась по ключу цели обучения
// (`flashcardsDeleteHintSeenKey(studyTarget)`) — у fr/de/es/it подсказка возвращалась при каждом заходе. Теперь запись и сброс идут тем же ключом, каким читается.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flashcardsDeleteHintSeenKey, type RuntimeStudyTarget } from '../target_storage_keys';
import { noteSwallowedHandler } from '../swallow_log';

export function markDeleteHintSeen(studyTarget: RuntimeStudyTarget, source: string): void {
  const key = flashcardsDeleteHintSeenKey(studyTarget);
  console.log(`[CARDS-HINT] seen:write key=${key} source=${source} target=${String(studyTarget)}`); // guard-ok: запись признака «подсказка показана»
  AsyncStorage.setItem(key, '1').catch(noteSwallowedHandler(`${source}:markDeleteHintSeen`));
}

export function resetDeleteHintSeen(studyTarget: RuntimeStudyTarget): void {
  const key = flashcardsDeleteHintSeenKey(studyTarget);
  console.log(`[CARDS-HINT] seen:reset key=${key} target=${String(studyTarget)}`); // guard-ok: сброс признака (dev)
  AsyncStorage.removeItem(key).catch(noteSwallowedHandler('resetDeleteHintSeen'));
}
