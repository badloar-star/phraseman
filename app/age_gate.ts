/**
 * age_gate.ts — единый источник правды по возрасту пользователя и режиму доступа.
 *
 * Юридический смысл:
 *  - Оператор ирландский → цифровой возраст согласия 16 (один из строгих в ЕС).
 *  - Новых пользователей младше 16 не пускаем (мягкая блокировка в онбординге).
 *  - Существующих 13–15 не выкидываем, а переводим в «безопасный режим»
 *    (без ИИ-чата/соц/покупок) — см. ageBracket === 'teen_safe'.
 *  - Год рождения (не полная дата) — минимизация данных.
 *
 * Снапшот в памяти + гидрация из AsyncStorage (как notif/consent), чтобы фичи-гейты
 * читались синхронно. Облачная запись (Firestore) делается отдельно из cloud-слоя.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/** Минимальный возраст полного доступа (ирландский цифровой возраст согласия). */
export const MIN_FULL_ACCESS_AGE = 16;
/** Нижняя граница «безопасного режима» для уже существующих подростков. */
export const MIN_TEEN_SAFE_AGE = 13;

export type AgeBracket =
  | 'under13'    // младше 13 — доступа нет
  | 'teen_safe'  // 13–15 — безопасный режим (без ИИ-чата/соц/покупок)
  | 'adult'      // 16+ — полный доступ
  | 'unknown';   // ещё не спрашивали

const BIRTH_YEAR_KEY = 'user_birth_year_v1';
const AGE_BRACKET_KEY = 'user_age_bracket_v1';

let birthYearMemory: number | null = null;
let bracketMemory: AgeBracket = 'unknown';
let hydrated = false;

/** Текущий год — для расчёта возраста. Вынесено в функцию для тестируемости. */
function currentYear(): number {
  return new Date().getFullYear();
}

/** Возраст (приблизительный, по году рождения) → возрастная группа. */
export function bracketForBirthYear(birthYear: number, atYear: number = currentYear()): AgeBracket {
  if (!Number.isFinite(birthYear) || birthYear <= 0) return 'unknown';
  const age = atYear - birthYear;
  if (age < MIN_TEEN_SAFE_AGE) return 'under13';
  if (age < MIN_FULL_ACCESS_AGE) return 'teen_safe';
  return 'adult';
}

/** Разумные границы валидного года рождения для ввода. */
export function isPlausibleBirthYear(birthYear: number, atYear: number = currentYear()): boolean {
  return Number.isInteger(birthYear) && birthYear >= atYear - 120 && birthYear <= atYear;
}

export function getAgeBracketSnapshot(): AgeBracket {
  return bracketMemory;
}

export function getBirthYearSnapshot(): number | null {
  return birthYearMemory;
}

/** Полный доступ только для 'adult'. */
export function isFullAccess(): boolean {
  return bracketMemory === 'adult';
}

/** Подросток в безопасном режиме — рискованные фичи выключены. */
export function isTeenSafeMode(): boolean {
  return bracketMemory === 'teen_safe';
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
    const [yRaw, bRaw] = await Promise.all([
      AsyncStorage.getItem(BIRTH_YEAR_KEY),
      AsyncStorage.getItem(AGE_BRACKET_KEY),
    ]);
    const y = yRaw ? parseInt(yRaw, 10) : NaN;
    birthYearMemory = Number.isFinite(y) ? y : null;
    bracketMemory =
      bRaw === 'under13' || bRaw === 'teen_safe' || bRaw === 'adult' ? bRaw : 'unknown';
  } catch {
    birthYearMemory = null;
    bracketMemory = 'unknown';
  } finally {
    hydrated = true;
  }
}

/** Сохранить год рождения + рассчитанную группу (локально). Облако пишется отдельно. */
export async function setBirthYear(birthYear: number): Promise<AgeBracket> {
  const bracket = bracketForBirthYear(birthYear);
  birthYearMemory = birthYear;
  bracketMemory = bracket;
  try {
    await AsyncStorage.multiSet([
      [BIRTH_YEAR_KEY, String(birthYear)],
      [AGE_BRACKET_KEY, bracket],
    ]);
  } catch {
    /* no-op: в памяти уже обновлено */
  }
  return bracket;
}
