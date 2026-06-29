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
 *
 * Для GDPR-accountability фиксируем РАЗДЕЛЬНО:
 *   - consentGrantedAt — момент ПЕРВОЙ выдачи согласия (не перетирается при
 *     повторных granted, чтобы сохранить «когда впервые дал»);
 *   - consentRevokedAt — момент ПОСЛЕДНЕГО отзыва (обновляется при каждом denied);
 *   - updatedAt — момент любого изменения.
 * Так в админке видно и «когда дал», и «когда отозвал» по отдельности.
 */
export async function recordConsentToCloud(): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  try {
    const stableId = await getStableId();
    if (!stableId) return;
    const birthYear = getBirthYearSnapshot();
    const analyticsConsent = getAnalyticsConsentState();
    const now = Date.now();
    const ref = db.collection('user_consents').doc(stableId);

    // Читаем прежнее состояние, чтобы не затереть первую дату согласия.
    let prevGrantedAt: number | null = null;
    try {
      const snap = await ref.get();
      const prev = (snap?.data?.() ?? {}) as Record<string, unknown>;
      const g = prev.consentGrantedAt;
      prevGrantedAt = typeof g === 'number' ? g : null;
    } catch {
      /* нет доступа/документа — пишем как первый раз */
    }

    const payload: Record<string, unknown> = {
      birthYear: birthYear ?? null,
      ageBracket: getAgeBracketSnapshot(),
      analyticsConsent,
      platform: require('react-native').Platform.OS,
      updatedAt: now,
    };
    if (analyticsConsent === 'granted') {
      // Первую дату согласия выставляем только если её ещё не было.
      payload.consentGrantedAt = prevGrantedAt ?? now;
    } else if (analyticsConsent === 'denied') {
      payload.consentRevokedAt = now;
    }

    await ref.set(payload, { merge: true });
  } catch {
    /* best-effort: не ломаем UX */
  }
}
