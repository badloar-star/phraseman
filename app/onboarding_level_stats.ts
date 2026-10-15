/**
 * Ответ экрана «Сколько английского ты знаешь» → серверная статистика (владелец 15.10, раздел админки «Онбординг · уровень»).
 *
 * зачем так:
 *  - только при согласии на статистику (isAnalyticsConsentGranted) — как ответ «откуда узнал»;
 *  - один раз на человека: сервер считает по stableId (onboardingLevelRecord), телефон держит метку и не зовёт сервер повторно;
 *  - сеть не блокирует онбординг: вызов фоном; не прошёл — ответ ждёт в «отложенных» и уходит при следующем запуске (Главная);
 *  - на сервере уровень человека не хранится — только дневные счётчики; сам уровень, как и раньше, в профиле на телефоне.
 * Журнал [ONB-LEVEL].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isAnalyticsConsentGranted } from './analytics_consent';

const LOG = '[ONB-LEVEL]';
const DONE_KEY = 'onboarding_level_recorded_v1';
const PENDING_KEY = 'onboarding_level_pending_v1';
const LEVELS = ['a0', 'a1', 'a2', 'b1', 'b2'] as const;

export type OnboardingLevelAnswer = Readonly<{ level: string | null; target: string }>;

function normalize(answer: OnboardingLevelAnswer): OnboardingLevelAnswer | null {
  const level = answer.level && (LEVELS as readonly string[]).includes(answer.level) ? answer.level : null;
  const target = String(answer.target ?? '').trim();
  if (!/^[a-zA-Z]{2}(?:-[a-zA-Z]{2})?$/.test(target)) return null;
  return { level, target };
}

async function send(answer: OnboardingLevelAnswer, source: string): Promise<boolean> {
  const startedAt = Date.now();
  try {
    const { getApp } = await import('@react-native-firebase/app');
    const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
    const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'onboardingLevelRecord');
    const response = await fn({ level: answer.level, target: answer.target });
    const status = (response?.data as { status?: string } | undefined)?.status ?? 'unknown';
    await AsyncStorage.multiSet([[DONE_KEY, JSON.stringify({ status, atMs: Date.now() })]]);
    await AsyncStorage.removeItem(PENDING_KEY);
    console.log(`${LOG} sent status=${status} level=${answer.level ?? 'skipped'} target=${answer.target} source=${source} ms=${Date.now() - startedAt}`);
    return true;
  } catch (error: unknown) {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(answer)).catch((writeError: unknown) => {
      console.warn(`${LOG} pending_write_failed reason=${writeError instanceof Error ? writeError.message : String(writeError)}`);
    });
    console.warn(`${LOG} send_failed source=${source} reason=${error instanceof Error ? error.message : String(error)} ms=${Date.now() - startedAt} — уйдёт при следующем запуске`);
    return false;
  }
}

/** Конец онбординга: level = null, если экран уровня пропущен. Никогда не бросает и не ждёт сеть вызывающим. */
export async function recordOnboardingLevelAnswer(answer: OnboardingLevelAnswer): Promise<void> {
  try {
    if (!isAnalyticsConsentGranted()) {
      console.log(`${LOG} skip reason=analytics_consent_off`);
      return;
    }
    const normalized = normalize(answer);
    if (!normalized) {
      console.warn(`${LOG} skip reason=invalid_answer target=${String(answer.target)}`);
      return;
    }
    if (await AsyncStorage.getItem(DONE_KEY)) {
      console.log(`${LOG} skip reason=already_recorded`);
      return;
    }
    await send(normalized, 'onboarding_complete');
  } catch (error: unknown) {
    console.warn(`${LOG} record_failed reason=${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Отложенный ответ (сеть не прошла в онбординге) — отправить при следующем запуске. Вызывает Главная после первого кадра. */
export async function flushPendingOnboardingLevelAnswer(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return;
    if (await AsyncStorage.getItem(DONE_KEY)) {
      await AsyncStorage.removeItem(PENDING_KEY);
      console.log(`${LOG} pending_dropped reason=already_recorded`);
      return;
    }
    if (!isAnalyticsConsentGranted()) {
      await AsyncStorage.removeItem(PENDING_KEY);
      console.log(`${LOG} pending_dropped reason=analytics_consent_off`);
      return;
    }
    const normalized = normalize(JSON.parse(raw) as OnboardingLevelAnswer);
    if (!normalized) {
      await AsyncStorage.removeItem(PENDING_KEY);
      console.warn(`${LOG} pending_dropped reason=invalid_answer`);
      return;
    }
    await send(normalized, 'pending_flush');
  } catch (error: unknown) {
    console.warn(`${LOG} flush_failed reason=${error instanceof Error ? error.message : String(error)}`);
  }
}

/* expo-router: keep this utility from being treated as a screen */
export default function __OnboardingLevelStatsRouteShim() {
  return null;
}
