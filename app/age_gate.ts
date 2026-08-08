/**
 * age_gate.ts — единый источник правды по возрасту пользователя и режиму доступа.
 *
 * Юридический смысл:
 *  - Оператор ирландский → цифровой возраст согласия 16 (один из строгих в ЕС).
 *  - Новых пользователей младше 16 не пускаем (мягкая блокировка в онбординге).
 *  - Age bracket is stored as consent metadata. After onboarding it must not disable app features.
 *  - Спрашиваем ТОЛЬКО факт «есть ли 16» (self-attestation) — ни года, ни даты
 *    рождения. Это минимум данных, достаточный для GDPR ст. 8 (минимизация,
 *    ст. 5(1)(c)). Ключ года остался только чтобы вычищать legacy-значение.
 *
 * Снапшот в памяти + гидрация из AsyncStorage (как notif/consent), чтобы фичи-гейты
 * читались синхронно. Облачная запись (Firestore) делается отдельно из cloud-слоя.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/** Минимальный возраст полного доступа (ирландский цифровой возраст согласия). */
export const MIN_FULL_ACCESS_AGE = 16;

/**
 * Возрастная метка согласия.
 *
 * зачем: онбординг задаёт ровно один бинарный вопрос — «есть ли тебе 16». Значит и
 * состояний ровно два: подтвердил (adult) или ещё не спрашивали (unknown). Брекеты
 * under13/teen_safe существовали под ввод года рождения, которого в приложении нет;
 * они никогда не выставлялись и держались как мёртвый код.
 */
export type AgeBracket =
  | 'adult'      // 16+ — подтверждено в онбординге
  | 'unknown';   // ещё не спрашивали

const BIRTH_YEAR_KEY = 'user_birth_year_v1';
const AGE_BRACKET_KEY = 'user_age_bracket_v1';

let bracketMemory: AgeBracket = 'unknown';
let hydrated = false;

export function getAgeBracketSnapshot(): AgeBracket {
  return bracketMemory;
}

/** Compatibility helper: app features are not age-blocked after onboarding. */
export function isFullAccess(): boolean {
  return true;
}

/** Compatibility helper: teen-safe metadata no longer disables app features. */
export function isTeenSafeMode(): boolean {
  return false;
}

/** Сделан ли уже ввод возраста (нужно ли показывать гейт/модал). */
export function hasAgeDecision(): boolean {
  return bracketMemory !== 'unknown';
}

export function isAgeGateHydrated(): boolean {
  return hydrated;
}

export async function hydrateAgeGateFromStorage(): Promise<void> {
  try {
    const bRaw = await AsyncStorage.getItem(AGE_BRACKET_KEY);
    // зачем: legacy-брекеты (under13/teen_safe) писались только синтетикой из старых
    // сборок и всё равно ничего не блокировали — читаем их как 'unknown', не тащим тип.
    bracketMemory = bRaw === 'adult' ? 'adult' : 'unknown';
  } catch {
    bracketMemory = 'unknown';
  } finally {
    hydrated = true;
  }
}

/**
 * Восстановить возрастную метку (реинсталл/новое устройство: облачный user_consents
 * хранит только bracket).
 */
export async function restoreAgeBracket(bracket: AgeBracket): Promise<void> {
  if (bracket !== 'adult') return;
  bracketMemory = 'adult';
  try {
    await AsyncStorage.setItem(AGE_BRACKET_KEY, 'adult');
  } catch {
    /* no-op: в памяти уже обновлено */
  }
}

/**
 * Зафиксировать подтверждение «мне есть 16» из онбординга.
 *
 * зачем: единственный возрастной вопрос в приложении — бинарный (self-attestation),
 * года рождения мы не спрашиваем. Раньше онбординг синтезировал фиктивный год
 * (текущий − 16) только чтобы получить bracket='adult'; такой год — лишние
 * персональные данные без цели (GDPR ст. 5(1)(c)) и вдобавок вводил в заблуждение
 * админку, где он выглядел как настоящий. Пишем сразу bracket, без года.
 */
export async function confirmAdultAgeAttestation(): Promise<AgeBracket> {
  bracketMemory = 'adult';
  try {
    await AsyncStorage.setItem(AGE_BRACKET_KEY, 'adult');
    // Подчищаем год, оставшийся от прошлых версий (там лежит синтетика).
    await AsyncStorage.removeItem(BIRTH_YEAR_KEY);
  } catch {
    /* no-op: в памяти уже обновлено */
  }
  return 'adult';
}
