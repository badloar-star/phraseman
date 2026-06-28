/**
 * Компас — чтение выборов онбординга. Волна 6.1 (персональное приветствие).
 *
 * Компас раньше не знал НИЧЕГО про первый выбор ученика (имя, цель, уровень,
 * купил ли доступ, какой план). Из-за этого первый день был обезличен, а текст
 * «закрепим вчерашнее» звучал ложно (вчера ещё ничего не было). Этот модуль —
 * единственная точка, где Компас читает уже сохранённые онбордингом значения,
 * чтобы поприветствовать по имени и дать обещание под цель ученика.
 *
 * ЧИТАЕТ, НЕ ПИШЕТ. Все ключи — те, что кладёт `components/onboarding.tsx`:
 *  - `user_name`                              → имя (живое поле профиля);
 *  - `user_profile` (JSON UserProfile)        → learningGoal / currentLevel / minutesPerDay;
 *  - `premium_active` ('true')                → куплен ли доступ;
 *  - `personal_plan_pending_activation_v1`    → planId выбранного плана.
 *
 * ИЗОЛЯЦИЯ: никогда не бросает. При любой ошибке — обезличенный профиль (Компас
 * просто приветствует нейтрально, но не падает). Образец — `app/paywall_profile.ts`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LearningGoal, CurrentLevel } from '../types/user_profile';

/** Цель Компаса (для выбора обещания). Маппится из UserProfile.learningGoal. */
export type CompassGoal = 'series' | 'everyday' | 'travel' | 'words' | 'mind';

/** Уровень для штриха приветствия (как на онбординге). */
export type CompassLevel = 'a0' | 'a1' | 'a2' | 'b1';

/** Снимок выборов онбординга — только то, что нужно для приветствия и индакшна. */
export interface CompassOnboardingProfile {
  /** Имя ученика (1–24 симв.) или '' если не задано. */
  name: string;
  /** Цель обучения или null (например, «просто посмотреть»). */
  goal: CompassGoal | null;
  /** Текущий уровень или null. */
  level: CompassLevel | null;
  /** Минут в день (5/15/30/60 из профиля) или null. */
  minutesPerDay: number | null;
  /** Куплен ли полный доступ на онбординге/позже. */
  hasPremium: boolean;
  /** Выбранный план (echo/impuls/voyazh/gavan/mitap) или null. */
  planId: string | null;
}

export const EMPTY_ONBOARDING_PROFILE: CompassOnboardingProfile = {
  name: '',
  goal: null,
  level: null,
  minutesPerDay: null,
  hasPremium: false,
  planId: null,
};

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 24) return '';
  return trimmed;
}

/**
 * learningGoal в профиле хранится уже свёрнутым (tourism/work/hobby/emigration),
 * а выбор плана — по исходной цели. Восстанавливаем цель Компаса максимально
 * близко: travel←tourism, everyday←work/emigration, mind←hobby. Если есть planId,
 * он точнее цели (echo→series и т.д.) — им и уточняем.
 */
function goalFromProfile(learningGoal: unknown, planId: string | null): CompassGoal | null {
  const byPlan: Record<string, CompassGoal> = {
    echo: 'series',
    impuls: 'everyday',
    voyazh: 'travel',
    gavan: 'words',
    mitap: 'mind',
  };
  if (planId && byPlan[planId]) return byPlan[planId];

  const g = learningGoal as LearningGoal;
  switch (g) {
    case 'tourism':
      return 'travel';
    case 'work':
    case 'emigration':
      return 'everyday';
    case 'hobby':
      return 'mind';
    default:
      return null;
  }
}

const VALID_LEVELS: readonly CompassLevel[] = ['a0', 'a1', 'a2', 'b1'];

function levelFromProfile(currentLevel: unknown): CompassLevel | null {
  const lvl = currentLevel as CurrentLevel;
  // Профиль хранит a1/a2/b1/b2; a0 онбординга свёрнут в a1 — это нормально для штриха.
  if (typeof lvl !== 'string') return null;
  return (VALID_LEVELS as readonly string[]).includes(lvl) ? (lvl as CompassLevel) : null;
}

function parsePlanId(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as { planId?: unknown };
    return typeof obj?.planId === 'string' ? obj.planId : null;
  } catch {
    return null;
  }
}

function parseProfile(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as unknown;
    return obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Прочитать выборы онбординга для Компаса. Никогда не бросает — при любой ошибке
 * возвращает обезличенный профиль (приветствие останется нейтральным).
 */
export async function readCompassOnboardingProfile(): Promise<CompassOnboardingProfile> {
  try {
    const [nameRaw, profileRaw, premiumRaw, planRaw] = await Promise.all([
      AsyncStorage.getItem('user_name'),
      AsyncStorage.getItem('user_profile'),
      AsyncStorage.getItem('premium_active'),
      AsyncStorage.getItem('personal_plan_pending_activation_v1'),
    ]);

    const profile = parseProfile(profileRaw);
    const planId = parsePlanId(planRaw);
    const name = sanitizeName(nameRaw) || sanitizeName(profile?.name);

    return {
      name,
      goal: goalFromProfile(profile?.learningGoal, planId),
      level: levelFromProfile(profile?.currentLevel),
      minutesPerDay: typeof profile?.minutesPerDay === 'number' ? profile.minutesPerDay : null,
      hasPremium: premiumRaw === 'true',
      planId,
    };
  } catch {
    return { ...EMPTY_ONBOARDING_PROFILE };
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route. */
export default function __RouteShim() {
  return null;
}
