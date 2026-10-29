// learning_v2_release_reset_free_start_v1.ts — [V2-RESUME-RESET]: бесплатный старт занятия после сброса «продолжить» новым выпуском курса.
//
// зачем (координатор 29.10): после пересборки курса сохранённое «продолжить с N» сбрасывается — отпечаток набора детей другой
// (learning_v2_episode_resume_v1, reason release_changed). Сброс правильный, но человек не должен платить энергию за повторный старт,
// который случился не по его вине. Бесплатен один старт на занятие и выпуск: отметка на телефоне хранит новый отпечаток, второй
// старт того же занятия в том же выпуске платный — «бесконечных бесплатных стартов» нет. Не прочитали или не записали отметку —
// старт платный, как обычно (дыру не открываем). Сеть не трогаем — Firebase-нагрузки ноль. Никогда не бросает.
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG = '[V2-RESUME-RESET]';
const KEY_PREFIX = 'learning_v2_release_reset_free_start_v1';

export type LearningV2ReleaseResetFreeStartReasonV1 = 'free_start' | 'already_used' | 'mark_read_failed' | 'mark_write_failed';
export type LearningV2ReleaseResetFreeStartV1 = Readonly<{ free: boolean; reason: LearningV2ReleaseResetFreeStartReasonV1 }>;

export function learningV2ReleaseResetFreeStartKeyV1(owner: string, courseSessionId: string, targetLanguage: string): string {
  return `${KEY_PREFIX}:${targetLanguage}:${owner}:${courseSessionId}`;
}

/** Чистое решение: бесплатно, если за этот выпуск (новый отпечаток) занятие ещё не стартовало бесплатно. */
export function learningV2ReleaseResetIsFreeV1(storedFingerprint: string | null, newFingerprint: string): boolean {
  return storedFingerprint !== newFingerprint;
}

const reasonOf = (error: unknown): string => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

/** Забрать бесплатный старт: да — отметка записана и энергию за этот старт не списываем; нет — старт платный, причина в журнале. */
export async function claimLearningV2ReleaseResetFreeStartV1(input: Readonly<{
  owner: string;
  courseSessionId: string;
  targetLanguage: string;
  newFingerprint: string;
}>): Promise<LearningV2ReleaseResetFreeStartV1> {
  const key = learningV2ReleaseResetFreeStartKeyV1(input.owner, input.courseSessionId, input.targetLanguage);
  let stored: string | null;
  try {
    stored = await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(LOG, 'mark_read_failed — старт платный', JSON.stringify({ courseSessionId: input.courseSessionId, reason: reasonOf(error) })); // guard-ok: catch с причиной
    return { free: false, reason: 'mark_read_failed' };
  }
  if (!learningV2ReleaseResetIsFreeV1(stored, input.newFingerprint)) {
    console.log(LOG, 'already_used — бесплатный старт за этот выпуск уже был, старт платный', JSON.stringify({ courseSessionId: input.courseSessionId })); // guard-ok: ранний выход
    return { free: false, reason: 'already_used' };
  }
  try {
    await AsyncStorage.setItem(key, input.newFingerprint);
  } catch (error) {
    console.warn(LOG, 'mark_write_failed — старт платный', JSON.stringify({ courseSessionId: input.courseSessionId, reason: reasonOf(error) })); // guard-ok: catch с причиной
    return { free: false, reason: 'mark_write_failed' };
  }
  return { free: true, reason: 'free_start' };
}
