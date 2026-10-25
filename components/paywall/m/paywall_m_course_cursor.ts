// ═══════════════════════════════════════════════════════════════════════════
// paywall_m_course_cursor.ts — где человек в курсе Learning V2: текущее занятие и сколько пройдено (для «фраз следующих уроков» в пейволе М).
//
// зачем (Learning V2 → Дизайн 25.10): learningV2UpcomingCoursePhrasesV1 просит currentSessionId и completedCount. Читаем локальный прогресс курса (тот же склад, что у вкладки
// «Уроки» и карточки «Продолжить» на Главной): диск телефона, без сети и Firestore, один раз за открытие окна; результат держим в памяти до смены аккаунта.
// currentSessionId — первое ВЫПУЩЕННОЕ занятие, которого нет среди пройденных; null и completedCount > 0 — курс пройден. Каждый выход пишет причину ([PAYWALL-M]).
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { onAccountOwnerChanged } from '../../../app/account_owner_change';

const LOG = '[PAYWALL-M]';

export type PaywallMCourseCursor = Readonly<{ currentSessionId: string | null; completedCount: number }>;

let memory: PaywallMCourseCursor | null = null;
onAccountOwnerChanged('paywall_m_course_cursor', () => { memory = null; });

export function peekPaywallMCourseCursor(): PaywallMCourseCursor | null {
  return memory;
}

/** Первое выпущенное занятие по порядку, которого нет среди пройденных (чистая функция — тест рядом). */
export function paywallMPickCurrentSession(
  released: readonly Readonly<{ courseSessionId: string; lessonOrdinal: number; sessionOrdinal: number }>[],
  completed: ReadonlySet<string>,
): string | null {
  const ordered = [...released].sort((a, b) => a.lessonOrdinal - b.lessonOrdinal || a.sessionOrdinal - b.sessionOrdinal);
  return ordered.find((s) => !completed.has(s.courseSessionId))?.courseSessionId ?? null;
}

export async function loadPaywallMCourseCursor(): Promise<PaywallMCourseCursor | null> {
  const startedAt = Date.now();
  try {
    // зачем: модули курса грузятся лениво — окно не платит за каталог, пока не дошло до этого блока
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { factoryNativeLearningV2AvailabilityV1 } = require('../../../modules/learning-v2/content/factory_native/factory_native_catalog_v1') as typeof import('../../../modules/learning-v2/content/factory_native/factory_native_catalog_v1');
    const { isLearningV2SessionReleasedV1 } = require('../../../app/learning_v2_session_availability_v1') as typeof import('../../../app/learning_v2_session_availability_v1');
    const { createLearningV2CourseLocalProgressStoreV1 } = require('../../../modules/learning-v2/progress/course_local_progress_v1') as typeof import('../../../modules/learning-v2/progress/course_local_progress_v1');
    const { deriveLocalOfflineProgressAccountScopeHash } = require('../../../modules/learning-v2/progress/progress_account_scope') as typeof import('../../../modules/learning-v2/progress/progress_account_scope');
    const { getStableId } = require('../../../app/stable_id') as typeof import('../../../app/stable_id');
    const { withAccountTransitionLock } = require('../../../app/account_generation') as typeof import('../../../app/account_generation');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const released = factoryNativeLearningV2AvailabilityV1().sessions.filter((s) => isLearningV2SessionReleasedV1(s.lessonOrdinal, s.sessionOrdinal));
    const state = await withAccountTransitionLock(async () => {
      const scope = deriveLocalOfflineProgressAccountScopeHash(await getStableId());
      return createLearningV2CourseLocalProgressStoreV1(AsyncStorage).load(scope);
    });
    const completed = new Set<string>(state.completedSessionIds);
    const cursor: PaywallMCourseCursor = { currentSessionId: paywallMPickCurrentSession(released, completed), completedCount: completed.size };
    memory = cursor;
    console.log(LOG, 'cursor:loaded', JSON.stringify({ current: cursor.currentSessionId, completed: cursor.completedCount, released: released.length, source: 'local_progress', ms: Date.now() - startedAt })); // guard-ok: одна строка на открытие окна
    return cursor;
  } catch (error) {
    console.warn(LOG, 'cursor:failed', JSON.stringify({ error: error instanceof Error ? error.message : String(error), keptMemory: memory !== null })); // guard-ok: сбой пишет причину
    return memory;
  }
}
