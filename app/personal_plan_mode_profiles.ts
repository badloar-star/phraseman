import type { PersonalPlanId, PlanMinutesChoice, PlanTaskKind } from './personal_plan_catalog';

/**
 * Per-plan mode emphasis profiles (Ф3 of the plan rebuild).
 *
 * Every generated day carries the same 6 plan-native tail tasks. What makes the
 * five plans FEEL different is (a) which tasks lead the day and (b) which tasks
 * are part of the short 5/10/15-minute sessions. This module is the single
 * source of truth for both.
 *
 * Hard invariant from the product concept: speaking
 * (plan_pronunciation_repeat) is in the 5-minute tier of EVERY plan — all plans
 * emphasize talking; they differ in what surrounds it.
 *
 * Pure module — no React/native imports, fully unit-testable.
 */

/** The 6 plan-native tail kinds every generated day carries (order varies). */
export const PLAN_TAIL_KINDS = [
  'plan_missing_word',
  'plan_choose_natural_phrase',
  'plan_listen_choose',
  'plan_listen_build',
  'plan_pronunciation_repeat',
  'plan_phrase_recall',
] as const satisfies readonly PlanTaskKind[];

type TailKind = (typeof PLAN_TAIL_KINDS)[number];

export type PlanModeProfile = {
  /**
   * Day-rotating tail orders. Every rotation leads with the plan's signature
   * modes so the emphasis survives the variety rotation.
   */
  tailOrders: readonly (readonly PlanTaskKind[])[];
  /**
   * Minute tiers per kind: which session lengths REQUIRE this task. Tiers are
   * cumulative (a kind required at 5 is required at 10/15/20 too).
   */
  requiredFor: Readonly<Record<TailKind, readonly PlanMinutesChoice[]>>;
};

const ALL: readonly PlanMinutesChoice[] = [5, 10, 15, 20];
const FROM_10: readonly PlanMinutesChoice[] = [10, 15, 20];
const FROM_15: readonly PlanMinutesChoice[] = [15, 20];

/**
 * ЭФИР (echo) — кино/сериалы без субтитров. Слух ведёт, речь рядом:
 * сначала услышать и понять, затем повторить вслух.
 */
const echoProfile: PlanModeProfile = {
  tailOrders: [
    ['plan_listen_choose', 'plan_listen_build', 'plan_pronunciation_repeat', 'plan_choose_natural_phrase', 'plan_missing_word', 'plan_phrase_recall'],
    ['plan_listen_build', 'plan_listen_choose', 'plan_pronunciation_repeat', 'plan_missing_word', 'plan_choose_natural_phrase', 'plan_phrase_recall'],
    ['plan_listen_choose', 'plan_pronunciation_repeat', 'plan_listen_build', 'plan_choose_natural_phrase', 'plan_missing_word', 'plan_phrase_recall'],
    ['plan_listen_build', 'plan_pronunciation_repeat', 'plan_listen_choose', 'plan_missing_word', 'plan_choose_natural_phrase', 'plan_phrase_recall'],
  ],
  requiredFor: {
    plan_listen_choose: ALL,
    plan_listen_build: ALL,
    plan_pronunciation_repeat: ALL,
    plan_choose_natural_phrase: FROM_10,
    plan_missing_word: FROM_10,
    plan_phrase_recall: FROM_15,
  },
};

/**
 * РЕПЛИКА (impuls) — повседневное общение. Речь ведёт: произнести,
 * сформулировать естественно, подобрать точное слово.
 */
const impulsProfile: PlanModeProfile = {
  tailOrders: [
    ['plan_pronunciation_repeat', 'plan_choose_natural_phrase', 'plan_missing_word', 'plan_listen_choose', 'plan_listen_build', 'plan_phrase_recall'],
    ['plan_choose_natural_phrase', 'plan_pronunciation_repeat', 'plan_missing_word', 'plan_listen_build', 'plan_listen_choose', 'plan_phrase_recall'],
    ['plan_pronunciation_repeat', 'plan_missing_word', 'plan_choose_natural_phrase', 'plan_listen_choose', 'plan_listen_build', 'plan_phrase_recall'],
    ['plan_choose_natural_phrase', 'plan_missing_word', 'plan_pronunciation_repeat', 'plan_listen_choose', 'plan_listen_build', 'plan_phrase_recall'],
  ],
  requiredFor: {
    plan_pronunciation_repeat: ALL,
    plan_choose_natural_phrase: ALL,
    plan_missing_word: ALL,
    plan_listen_choose: FROM_10,
    plan_listen_build: FROM_10,
    plan_phrase_recall: FROM_15,
  },
};

/**
 * КОМПАС (voyazh) — путешествия. Диалог: услышал реплику — ответил вслух —
 * выбрал естественный вариант.
 */
const voyazhProfile: PlanModeProfile = {
  tailOrders: [
    ['plan_pronunciation_repeat', 'plan_listen_choose', 'plan_choose_natural_phrase', 'plan_listen_build', 'plan_missing_word', 'plan_phrase_recall'],
    ['plan_listen_choose', 'plan_pronunciation_repeat', 'plan_choose_natural_phrase', 'plan_missing_word', 'plan_listen_build', 'plan_phrase_recall'],
    ['plan_choose_natural_phrase', 'plan_listen_choose', 'plan_pronunciation_repeat', 'plan_listen_build', 'plan_missing_word', 'plan_phrase_recall'],
    ['plan_listen_choose', 'plan_choose_natural_phrase', 'plan_pronunciation_repeat', 'plan_missing_word', 'plan_listen_build', 'plan_phrase_recall'],
  ],
  requiredFor: {
    plan_pronunciation_repeat: ALL,
    plan_listen_choose: ALL,
    plan_choose_natural_phrase: ALL,
    plan_listen_build: FROM_10,
    plan_missing_word: FROM_10,
    plan_phrase_recall: FROM_15,
  },
};

/**
 * ЗАПАС (gavan) — нужные слова на каждый день. Слова ведут: точное слово в
 * фразе, вспомнить без подсказки, проговорить вслух.
 */
const gavanProfile: PlanModeProfile = {
  tailOrders: [
    ['plan_missing_word', 'plan_phrase_recall', 'plan_pronunciation_repeat', 'plan_choose_natural_phrase', 'plan_listen_choose', 'plan_listen_build'],
    ['plan_phrase_recall', 'plan_missing_word', 'plan_pronunciation_repeat', 'plan_listen_choose', 'plan_choose_natural_phrase', 'plan_listen_build'],
    ['plan_missing_word', 'plan_pronunciation_repeat', 'plan_phrase_recall', 'plan_choose_natural_phrase', 'plan_listen_build', 'plan_listen_choose'],
    ['plan_phrase_recall', 'plan_pronunciation_repeat', 'plan_missing_word', 'plan_listen_choose', 'plan_choose_natural_phrase', 'plan_listen_build'],
  ],
  requiredFor: {
    plan_missing_word: ALL,
    plan_phrase_recall: ALL,
    plan_pronunciation_repeat: ALL,
    plan_choose_natural_phrase: FROM_10,
    plan_listen_choose: FROM_10,
    plan_listen_build: FROM_15,
  },
};

/**
 * ФОКУС (mitap) — язык как хобби для ума. Ровный микс: по одному заданию из
 * каждой группы (слова / слух / речь) даже в короткой сессии.
 */
const mitapProfile: PlanModeProfile = {
  tailOrders: [
    ['plan_missing_word', 'plan_listen_choose', 'plan_pronunciation_repeat', 'plan_choose_natural_phrase', 'plan_listen_build', 'plan_phrase_recall'],
    ['plan_listen_choose', 'plan_pronunciation_repeat', 'plan_missing_word', 'plan_listen_build', 'plan_choose_natural_phrase', 'plan_phrase_recall'],
    ['plan_pronunciation_repeat', 'plan_missing_word', 'plan_listen_choose', 'plan_choose_natural_phrase', 'plan_listen_build', 'plan_phrase_recall'],
    ['plan_listen_build', 'plan_choose_natural_phrase', 'plan_pronunciation_repeat', 'plan_missing_word', 'plan_listen_choose', 'plan_phrase_recall'],
  ],
  requiredFor: {
    plan_missing_word: ALL,
    plan_listen_choose: ALL,
    plan_pronunciation_repeat: ALL,
    plan_choose_natural_phrase: FROM_10,
    plan_listen_build: FROM_10,
    plan_phrase_recall: FROM_15,
  },
};

export const PLAN_MODE_PROFILES: Readonly<Record<PersonalPlanId, PlanModeProfile>> = {
  echo: echoProfile,
  impuls: impulsProfile,
  voyazh: voyazhProfile,
  gavan: gavanProfile,
  mitap: mitapProfile,
};

/** Tail order for a given plan and day (rotates through the plan's variants). */
export function tailOrderForPlanDay(planId: PersonalPlanId, dayIndex: number): readonly PlanTaskKind[] {
  const profile = PLAN_MODE_PROFILES[planId];
  const safeDay = Number.isFinite(dayIndex) && dayIndex > 0 ? Math.floor(dayIndex) : 1;
  return profile.tailOrders[(safeDay - 1) % profile.tailOrders.length];
}

/** Minute tiers requiring the given kind for the given plan. */
export function requiredMinutesForKind(planId: PersonalPlanId, kind: TailKind): PlanMinutesChoice[] {
  return [...PLAN_MODE_PROFILES[planId].requiredFor[kind]];
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
