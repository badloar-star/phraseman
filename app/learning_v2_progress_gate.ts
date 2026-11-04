// learning_v2_progress_gate.ts — заморозка Learning V2 (владелец 04.11): V2 виден только тем, у кого есть хотя бы одно завершённое занятие V2.
//
// зачем: одна дешёвая локальная проверка «есть V2-прогресс?» — один AsyncStorage.multiGet по ключам прогресса, без сети и Firestore.
// Результат кладётся в живую привязку LEARNING_V2_HIDDEN (app/learning_v2_visibility_switch.ts), поэтому вход, прогрев, индексация
// и карточка «Продолжить» V2 для всех остальных закрыты. Порог — V2_UNLOCK_MIN_COMPLETED_EPISODES завершённых занятий (ответ владельца 04.11: 1).
// Источники те же, что у reconcileV2CourseAchievements: маски, цепочка, локальный список; языки курса en и es.
// Журнал: [V2-GATE] — вход, значения ключей по языкам, решение и что его решило.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import {
  LEARNING_V2_HIDDEN,
  getLearningV2VisibilityVersion,
  setLearningV2Unlocked,
  subscribeLearningV2Visibility,
} from './learning_v2_visibility_switch';

// зачем (владелец 04.11, «хотя бы 1 завершённое занятие»): сколько завершённых занятий (эпизодов) V2 открывают вход. Меняется одной константой.
export const V2_UNLOCK_MIN_COMPLETED_EPISODES = 1;
const TOTAL_SESSIONS = 32 * 56;
const LANGUAGES = ['en', 'es'] as const;

export type LearningV2ProgressFootprint = Readonly<{
  /** Сколько занятий V2 пройдено (максимум по языкам). 0 — следа нет вообще. */
  completedSessions: number;
  /** Завершённых занятий достаточно, чтобы открыть V2 (порог V2_UNLOCK_MIN_COMPLETED_EPISODES). */
  unlocked: boolean;
}>;

const EMPTY_FOOTPRINT: LearningV2ProgressFootprint = Object.freeze({ completedSessions: 0, unlocked: false });

/** Чистая логика порога: хватает ли завершённых занятий, чтобы открыть V2. Экспорт — для тестов. */
export function meetsV2UnlockThreshold(completedSessions: number, threshold: number = V2_UNLOCK_MIN_COMPLETED_EPISODES): boolean {
  return completedSessions >= threshold;
}

let footprint: LearningV2ProgressFootprint = EMPTY_FOOTPRINT;
let refreshSeq = 0;

/** Синхронно, из памяти: есть ли у аккаунта хоть какой-то след V2 (решает, нужен ли фоновый планировщик досылки). */
export function peekLearningV2ProgressFootprint(): LearningV2ProgressFootprint {
  return footprint;
}

async function readCompleted(stableId: string, language: (typeof LANGUAGES)[number]): Promise<Set<number>> {
  const [course, masks, sync, scope] = await Promise.all([
    import('../modules/learning-v2/progress/course_local_progress_v1'),
    import('../modules/learning-v2/progress/course_progress_masks_v1'),
    import('../modules/learning-v2/progress/progress_sync_v1'),
    import('../modules/learning-v2/progress/progress_account_scope'),
  ]);
  const hash = scope.deriveLocalOfflineProgressAccountScopeHash(stableId);
  const keys = [
    course.LEARNING_V2_COURSE_LOCAL_PROGRESS_STORAGE_PREFIX_V1 + hash,
    course.LEARNING_V2_COURSE_LOCAL_MASKS_STORAGE_PREFIX_V1 + hash,
    masks.LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1,
    sync.LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1,
  ].map((key) => course.learningV2LanguageScopedStorageKeyV1(key, language));
  const raw = (await AsyncStorage.multiGet(keys)).map((pair) => pair[1]);
  const completed = new Set<number>();
  for (const index of masks.parseCourseMasksV1(raw[1], TOTAL_SESSIONS).completed) completed.add(index);
  for (const index of masks.parseCourseMasksV1(raw[2], TOTAL_SESSIONS).completed) completed.add(index);
  let chain = sync.parseCourseProgressSyncCountV1(raw[3]);
  if (raw[0]) {
    const local = course.parseLearningV2CourseLocalProgressV1(JSON.parse(raw[0]));
    if (local.accountScopeHash === hash) chain = Math.max(chain, local.completedSessionIds.length);
  }
  for (let i = 0; i < Math.min(chain, TOTAL_SESSIONS); i += 1) completed.add(i);
  console.log(`[V2-GATE] read lang=${language} masks=${raw[1] ? 'yes' : 'no'} sync=${raw[2] ? 'yes' : 'no'} local=${raw[0] ? 'yes' : 'no'} chain=${chain} completed=${completed.size}`); // guard-ok: одна строка на язык на проверку
  return completed;
}

/**
 * Пересчитывает «есть ли завершённое занятие V2» для аккаунта и открывает/закрывает V2. Вызывается при активном аккаунте,
 * после смены аккаунта и после восстановления из облака. Без аккаунта V2 закрыт. Ошибка чтения: решение не меняется, причина в журнале.
 */
export async function refreshLearningV2ProgressGate(stableId: string | null | undefined, from: string): Promise<LearningV2ProgressFootprint> {
  const seq = (refreshSeq += 1);
  if (!stableId) {
    footprint = EMPTY_FOOTPRINT;
    console.log(`[V2-GATE] refresh seq=${seq} from=${from} → нет аккаунта: V2 закрыт`); // guard-ok: ранний выход называет причину
    setLearningV2Unlocked(false, `${from}:no_account`);
    return footprint;
  }
  try {
    let sessions = 0;
    for (const language of LANGUAGES) {
      const completed = await readCompleted(stableId, language);
      sessions = Math.max(sessions, completed.size);
    }
    if (seq !== refreshSeq) {
      console.log(`[V2-GATE] refresh seq=${seq} устарел (актуален ${refreshSeq}) — результат отброшен`); // guard-ok: поздний ответ не затирает свежий
      return footprint;
    }
    const unlocked = meetsV2UnlockThreshold(sessions);
    footprint = Object.freeze({ completedSessions: sessions, unlocked });
    console.log(`[V2-GATE] refresh seq=${seq} from=${from} sessions=${sessions} threshold=${V2_UNLOCK_MIN_COMPLETED_EPISODES} → ${unlocked ? 'V2 открыт' : 'V2 закрыт'}`); // guard-ok: финальное решение
    setLearningV2Unlocked(unlocked, from);
    return footprint;
  } catch (error) {
    console.warn(`[V2-GATE] refresh seq=${seq} from=${from} не удалось прочитать прогресс — решение не меняется (hidden=${String(LEARNING_V2_HIDDEN)})`, error instanceof Error ? error.message : String(error));
    return footprint;
  }
}

/** Для экранов: перерисовка при смене видимости V2. Значение читается из живой привязки в том же рендере. */
export function useLearningV2Visibility(): number {
  return useSyncExternalStore(subscribeLearningV2Visibility, getLearningV2VisibilityVersion, getLearningV2VisibilityVersion);
}

/** Только для тестов. */
export function resetLearningV2ProgressGateForTests(): void {
  footprint = EMPTY_FOOTPRINT;
  refreshSeq = 0;
  setLearningV2Unlocked(false, 'test_reset');
}

export default function __RouteShim() { return null; }
