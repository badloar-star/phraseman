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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_EXPO_GO } from './config';
import { getStableId } from './stable_id';
import { ensureStableAuthLink } from './cloud_sync';
import {
  getBirthYearSnapshot,
  getAgeBracketSnapshot,
  isPlausibleBirthYear,
  setBirthYear,
  restoreAgeBracket,
  type AgeBracket,
} from './age_gate';
import { getAnalyticsConsentState, setAnalyticsConsent } from './analytics_consent';

/**
 * Локальный латч «Terms + Privacy приняты». Тот же литерал, что LEGAL_ACCEPTED_KEY
 * в CleanOnboarding.tsx (не импортируем оттуда — ключ должен жить и без онбординга).
 */
export const LEGAL_ACCEPTED_STORAGE_KEY = 'onboarding_terms_privacy_accepted_v1';

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

    // ВАЖНО для сбора в облако: правило user_consents разрешает запись владельцу
    // через stableUserMatchesAuth, который читает users/{stableId}.firebaseAuthUid.
    // У brand-new юзера на ПЕРВОМ экране онбординга эта привязка могла ещё не
    // успеть записаться (гонка с cloud-sync) → запись согласия была бы отклонена,
    // и юзер пропал бы из учёта админки. Гарантируем линк ДО записи (best-effort).
    await ensureStableAuthLink().catch(() => false);

    const birthYear = getBirthYearSnapshot();
    const analyticsConsent = getAnalyticsConsentState();
    const legalAccepted =
      (await AsyncStorage.getItem(LEGAL_ACCEPTED_STORAGE_KEY).catch(() => null)) === '1';
    const now = Date.now();
    const ref = db.collection('user_consents').doc(stableId);

    // Читаем прежнее состояние, чтобы не затереть первые даты согласий.
    let prevGrantedAt: number | null = null;
    let prevLegalAt: number | null = null;
    try {
      const snap = await ref.get();
      const prev = (snap?.data?.() ?? {}) as Record<string, unknown>;
      const g = prev.consentGrantedAt;
      prevGrantedAt = typeof g === 'number' ? g : null;
      const l = prev.legalAcceptedAt;
      prevLegalAt = typeof l === 'number' ? l : null;
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
    if (legalAccepted) {
      // Terms + Privacy: фиксируем факт и ПЕРВУЮ дату принятия (accountability).
      payload.legalAccepted = true;
      payload.legalAcceptedAt = prevLegalAt ?? now;
    }

    try {
      await ref.set(payload, { merge: true });
    } catch {
      // Один ретрай: на самой первой записи привязка auth-линка могла ещё
      // распространяться; перепривязываем и пробуем снова.
      await ensureStableAuthLink().catch(() => false);
      await ref.set(payload, { merge: true }).catch(() => {});
    }
  } catch {
    /* best-effort: не ломаем UX */
  }
}

/**
 * Восстановить возраст + согласия ИЗ облака в локальное состояние.
 *
 * Сценарий: реинсталл / новое устройство. Если нужно восстановить локальные
 * ключи возраста/согласий из user_consents, читаем их best-effort; runtime
 * reverify-модал для существующих пользователей не показывается.
 *
 * Восстанавливаем только то, что есть в документе; ничего не выдумываем.
 * Возвращает true, если хоть что-то восстановлено. Best-effort: офлайн/ошибка
 * → false.
 */
export async function restoreConsentStateFromCloud(): Promise<boolean> {
  const db = getFirestore();
  if (!db) return false;
  try {
    const stableId = await getStableId();
    if (!stableId) return false;
    await ensureStableAuthLink().catch(() => false);

    const snap = await db.collection('user_consents').doc(stableId).get();
    const data = (snap?.data?.() ?? null) as Record<string, unknown> | null;
    if (!data) return false;

    let restored = false;

    const birthYear = typeof data.birthYear === 'number' ? data.birthYear : NaN;
    const bracket = data.ageBracket as AgeBracket | undefined;
    if (Number.isFinite(birthYear) && isPlausibleBirthYear(birthYear)) {
      await setBirthYear(birthYear);
      restored = true;
    } else if (bracket === 'under13' || bracket === 'teen_safe' || bracket === 'adult') {
      await restoreAgeBracket(bracket);
      restored = true;
    }

    const analytics = data.analyticsConsent;
    if (analytics === 'granted' || analytics === 'denied') {
      await setAnalyticsConsent(analytics);
      restored = true;
    }

    if (data.legalAccepted === true) {
      await AsyncStorage.setItem(LEGAL_ACCEPTED_STORAGE_KEY, '1').catch(() => {});
      restored = true;
    }

    return restored;
  } catch {
    return false;
  }
}
