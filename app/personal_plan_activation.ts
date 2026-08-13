import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PERSONAL_PLAN_CATALOG,
  type PersonalPlanId,
  type PlanMinutesChoice,
} from './personal_plan_catalog';
import {
  activatePersonalPlan,
  type PersonalPlanState,
} from './personal_plan_state';

export const PERSONAL_PLAN_PENDING_ACTIVATION_KEY = 'personal_plan_pending_activation_v1';
export const PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY = 'personal_plan_onboarding_nickname_pending_v1';

export type PendingPersonalPlanActivationSource = 'onboarding' | 'dev' | 'unknown';

export type PendingPersonalPlanActivation = {
  planId: PersonalPlanId;
  minutesPerDay: PlanMinutesChoice;
  startDayIndex: number;
  source: PendingPersonalPlanActivationSource;
  createdAt: string;
  updatedAt: string;
};

const VALID_PLAN_IDS = new Set(PERSONAL_PLAN_CATALOG.map((plan) => plan.id));
const VALID_MINUTES = new Set<PlanMinutesChoice>([5, 10, 15, 20]);
const VALID_SOURCES = new Set<PendingPersonalPlanActivationSource>(['onboarding', 'dev', 'unknown']);

function nowIso(): string {
  return new Date().toISOString();
}

function sanitizePendingPersonalPlanActivation(raw: unknown): PendingPersonalPlanActivation | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<PendingPersonalPlanActivation>;
  if (!VALID_PLAN_IDS.has(row.planId as PersonalPlanId)) return null;
  if (!VALID_MINUTES.has(row.minutesPerDay as PlanMinutesChoice)) return null;

  const source = VALID_SOURCES.has(row.source as PendingPersonalPlanActivationSource)
    ? (row.source as PendingPersonalPlanActivationSource)
    : 'unknown';
  const createdAt = typeof row.createdAt === 'string' && row.createdAt
    ? row.createdAt
    : nowIso();
  const updatedAt = typeof row.updatedAt === 'string' && row.updatedAt
    ? row.updatedAt
    : createdAt;
  const startDayIndex = Number.isFinite(Number(row.startDayIndex))
    ? Math.max(1, Math.floor(Number(row.startDayIndex)))
    : 1;

  return {
    planId: row.planId as PersonalPlanId,
    minutesPerDay: row.minutesPerDay as PlanMinutesChoice,
    startDayIndex,
    source,
    createdAt,
    updatedAt,
  };
}

export async function queuePendingPersonalPlanActivation(input: {
  planId: PersonalPlanId;
  minutesPerDay: PlanMinutesChoice;
  startDayIndex?: number;
  source?: PendingPersonalPlanActivationSource;
}): Promise<PendingPersonalPlanActivation> {
  const timestamp = nowIso();
  const pending = sanitizePendingPersonalPlanActivation({
    planId: input.planId,
    minutesPerDay: input.minutesPerDay,
    startDayIndex: input.startDayIndex ?? 1,
    source: input.source ?? 'unknown',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  if (!pending) throw new Error('invalid_personal_plan_pending_activation');
  await AsyncStorage.setItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY, JSON.stringify(pending));
  return pending;
}

export async function readPendingPersonalPlanActivation(): Promise<PendingPersonalPlanActivation | null> {
  try {
    const raw = await AsyncStorage.getItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY);
    if (!raw) return null;
    const pending = sanitizePendingPersonalPlanActivation(JSON.parse(raw));
    if (!pending) {
      await AsyncStorage.removeItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY);
      return null;
    }
    return pending;
  } catch {
    await AsyncStorage.removeItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY).catch(() => {});
    return null;
  }
}

export async function clearPendingPersonalPlanActivation(): Promise<void> {
  await AsyncStorage.removeItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY);
}

export async function activatePendingPersonalPlanAfterPremium(): Promise<PersonalPlanState | null> {
  const pending = await readPendingPersonalPlanActivation();
  if (!pending) return null;
  const state = await activatePersonalPlan({
    planId: pending.planId,
    minutesPerDay: pending.minutesPerDay,
    startDayIndex: pending.startDayIndex,
  });
  await clearPendingPersonalPlanActivation();
  return state;
}

export default function __RouteShim() { return null; }
