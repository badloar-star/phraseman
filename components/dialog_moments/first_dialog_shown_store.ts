// ═══════════════════════════════════════════════════════════════════════════
// first_dialog_shown_store.ts — отметка «момент m17 уже показан» для пары (аккаунт, изучаемый язык).
//
// зачем (координатор 15.10: «1 раз на изучаемый язык, ключ показа локально»): «первый разговор» бывает один раз на язык, поэтому отметка живёт и между запусками. Хранится только булево
// «показано» (никаких реплик, id сценариев и данных собеседников), ключ — идентификатор аккаунта + язык; Firestore не трогаем (0 чтений, 0 записей). Отметка ставится В МОМЕНТ показа,
// а не «долгом на показ» — празднование не очередь (ФУНДАМЕНТ владельца 01.09). Память процесса отвечает мгновенно, диск догоняет фоном; сбой чтения/записи пишет причину и не ломает экран.
// Журнал: [FIRST-DIALOG-STORE].
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration } from '../../app/account_generation';

const PREFIX = 'first_dialog_moment_shown_v1:';
const LOG = '[FIRST-DIALOG-STORE]';
const shownInMemory = new Set<string>();

function storageKey(studyTarget: string): string | null {
  const token = captureAccountGeneration();
  if (token.phase !== 'active' || !token.stableId) {
    console.log(`${LOG} ключ недоступен: аккаунт не активен phase=${token.phase} stableId=${token.stableId ? 'есть' : 'нет'}`); // guard-ok: ранний выход называет причину
    return null;
  }
  return `${PREFIX}${token.stableId}:${studyTarget}`;
}

/** Показывали ли момент для этого языка на этом аккаунте. null — аккаунт ещё не определён (решение откладывается, момент не показываем наугад). */
export async function readFirstDialogShown(studyTarget: string): Promise<boolean | null> {
  const key = storageKey(studyTarget);
  if (!key) return null;
  if (shownInMemory.has(key)) {
    console.log(`${LOG} read → да (память) target=${studyTarget}`); // guard-ok: источник ответа
    return true;
  }
  try {
    const raw = await AsyncStorage.getItem(key);
    const shown = raw === '1';
    if (shown) shownInMemory.add(key);
    console.log(`${LOG} read → ${shown ? 'да' : 'нет'} (диск, raw=${raw === null ? 'пусто' : raw}) target=${studyTarget}`); // guard-ok: источник ответа
    return shown;
  } catch (error: unknown) {
    // зачем: не удалось прочитать — не показываем момент (лучше пропустить праздник, чем повторить его), причина в журнале
    console.warn(`${LOG} read failed target=${studyTarget} message=${error instanceof Error ? error.message : String(error)} → считаем показанным`); // guard-ok: catch называет причину
    return true;
  }
}

/** Поставить отметку: память сразу, диск фоном. */
export function markFirstDialogShown(studyTarget: string): void {
  const key = storageKey(studyTarget);
  if (!key) return;
  shownInMemory.add(key);
  AsyncStorage.setItem(key, '1')
    .then(() => { console.log(`${LOG} mark ok target=${studyTarget}`); }) // guard-ok: итог записи
    .catch((error: unknown) => { console.warn(`${LOG} mark failed target=${studyTarget} message=${error instanceof Error ? error.message : String(error)} (в памяти отметка остаётся до перезапуска)`); }); // guard-ok: catch называет причину
}

export function resetFirstDialogShownForTests(): void {
  shownInMemory.clear();
}
