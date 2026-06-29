/**
 * age_consent_cloud.ts — облачная запись возраста и согласий в Firestore
 * `user_consents/{stableId}` для учёта в админке (accountability перед регулятором).
 *
 * Отдельная коллекция (не users/{id}) — чтобы не упираться в field-whitelist правил
 * прогресса. Правило: владелец пишет свой документ, читает агрегаты только admin
 * (см. firestore.rules → match /user_consents/{userId}).
 *
 * Best-effort: сбой облака не ломает UX (локальные значения уже сохранены в
 * age_gate / analytics_consent). Не вызывать в Expo Go.
 */

import { IS_EXPO_GO } from './config';
import { getStableId } from './stable_id';
import { getBirthYearSnapshot, getAgeBracketSnapshot } from './age_gate';
import { getAnalyticsConsentState } from './analytics_consent';

function getFirestore(): any | null {
  if (IS_EXPO_GO) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

/**
 * Записать текущее состояние возраста + согласия на аналитику в облако.
 * Вызывать ПОСЛЕ локальных setBirthYear/setAnalyticsConsent.
 */
export async function recordConsentToCloud(): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  try {
    const stableId = await getStableId();
    if (!stableId) return;
    const birthYear = getBirthYearSnapshot();
    await db.collection('user_consents').doc(stableId).set(
      {
        birthYear: birthYear ?? null,
        ageBracket: getAgeBracketSnapshot(),
        analyticsConsent: getAnalyticsConsentState(),
        platform: require('react-native').Platform.OS,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch {
    /* best-effort: не ломаем UX */
  }
}
