import { V2_ACTIVITY_FAMILIES, type V2ActivityFamily } from "./activity";
import type { LearningSupportLevel, V2SessionSetRef } from "./episode";
import {
  V2_IDENTITY_REGEX,
  type EpisodeId,
  type SessionId,
} from "./identities";

export type V2SessionLearningFunction =
  | "notice"
  | "comprehend"
  | "retrieve"
  | "discriminate"
  | "assemble"
  | "pronounce"
  | "respond"
  | "transfer"
  | "review";

export interface V2SessionCardPlan {
  readonly cardId: string;
  readonly contentItemId: string;
  readonly objectiveId: string;
  readonly family: V2ActivityFamily;
  readonly learningFunction: V2SessionLearningFunction;
  readonly support: LearningSupportLevel;
  readonly promptId: string;
  readonly promptNovelty: "trained" | "varied" | "novel";
}

export interface V2RequiredSessionDefinition {
  readonly sessionId: SessionId;
  readonly ordinal: number;
  readonly zone: "understand" | "use" | "master";
  readonly targetSeconds: number;
  readonly cards: readonly V2SessionCardPlan[];
}

export interface V2OptionalPracticeSlot {
  readonly slotId: string;
  readonly episodeId: EpisodeId;
  readonly capabilityId: string;
  readonly family: V2ActivityFamily;
  readonly sourcePriority: "mistake" | "due" | "personal_plan" | "current_unit";
  readonly expectedSeconds: number;
  readonly requiredForProgress: false;
  readonly canWriteMastery: false;
}

export interface V2SessionSetBody {
  readonly schemaVersion: "v2-session-set.v1";
  readonly episodeId: EpisodeId;
  readonly version: number;
  readonly sessions: readonly V2RequiredSessionDefinition[];
  readonly optionalPracticeSlots: readonly V2OptionalPracticeSlot[];
}

export type V2SessionSetValidationResult =
  | {
      readonly ok: true;
      readonly issues: readonly [];
      readonly value: V2SessionSetBody;
    }
  | { readonly ok: false; readonly issues: readonly string[] };

const BODY_KEYS = [
  "schemaVersion",
  "episodeId",
  "version",
  "sessions",
  "optionalPracticeSlots",
] as const;
const SESSION_KEYS = [
  "sessionId",
  "ordinal",
  "zone",
  "targetSeconds",
  "cards",
] as const;
const CARD_KEYS = [
  "cardId",
  "contentItemId",
  "objectiveId",
  "family",
  "learningFunction",
  "support",
  "promptId",
  "promptNovelty",
] as const;
const OPTIONAL_KEYS = [
  "slotId",
  "episodeId",
  "capabilityId",
  "family",
  "sourcePriority",
  "expectedSeconds",
  "requiredForProgress",
  "canWriteMastery",
] as const;
const LEARNING_FUNCTIONS = new Set<V2SessionLearningFunction>([
  "notice",
  "comprehend",
  "retrieve",
  "discriminate",
  "assemble",
  "pronounce",
  "respond",
  "transfer",
  "review",
]);
const SUPPORT_LEVELS = new Set<LearningSupportLevel>([
  "model",
  "full_text",
  "partial_cue",
  "visual_only",
  "none",
]);
const REQUIRED_SESSION_ALLOWED_FAMILIES = new Set<V2ActivityFamily>([
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
]);

type SessionSetInputSnapshot =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false };

/**
 * Copies canonical JSON data without invoking accessors. Non-enumerable or
 * symbol keys, accessors, cycles, sparse arrays, exotic prototypes and Proxy
 * trap failures are rejected before semantic validation reads any field.
 */
const snapshotSessionSetInput = (input: unknown): SessionSetInputSnapshot => {
  const active = new WeakSet<object>();

  const visit = (value: unknown): unknown => {
       if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      return value;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("non-canonical number");
      return value;
    }
    if (typeof value !== "object") throw new Error("non-JSON value");

    const objectValue = value as object;
    if (active.has(objectValue)) throw new Error("cyclic input");
    active.add(objectValue);
    try {
      const prototype = Reflect.getPrototypeOf(objectValue);
      const ownKeys = Reflect.ownKeys(objectValue);

      if (Array.isArray(value)) {
        const lengthDescriptor = Reflect.getOwnPropertyDescriptor(
          objectValue,
          "length",
        );
        if (
          prototype !== Array.prototype ||
          !lengthDescriptor ||
          lengthDescriptor.get ||
          lengthDescriptor.set ||
          lengthDescriptor.enumerable !== false ||
          !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value") ||
          !Number.isSafeInteger(lengthDescriptor.value) ||
          Number(lengthDescriptor.value) < 0
        ) {
          throw new Error("non-canonical array");
        }
        const length = Number(lengthDescriptor.value);
        const entries: Array<{
          readonly index: number;
          readonly value: unknown;
        }> = [];
        for (const key of ownKeys) {
          if (key === "length") continue;
          if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)) {
            throw new Error("non-canonical array key");
          }
          const index = Number(key);
          const descriptor = Reflect.getOwnPropertyDescriptor(objectValue, key);
          if (
            !Number.isSafeInteger(index) ||
            index < 0 ||
            index >= length ||
            !descriptor ||
            descriptor.get ||
            descriptor.set ||
            descriptor.enumerable !== true ||
            !Object.prototype.hasOwnProperty.call(descriptor, "value")
          ) {
            throw new Error("non-canonical array entry");
          }
          entries.push({ index, value: descriptor.value });
        }
        if (ownKeys.length !== length + 1 || entries.length !== length) {
          throw new Error("sparse array");
        }
        const snapshot = new Array<unknown>(length);
        for (const entry of entries) snapshot[entry.index] = visit(entry.value);
        return snapshot;
      }

      if (prototype !== Object.prototype && prototype !== null) {
        throw new Error("non-canonical object prototype");
      }
      if (ownKeys.some((key) => typeof key !== "string")) {
        throw new Error("symbol key");
      }
      const snapshot =
        prototype === null
          ? (Object.create(null) as Record<string, unknown>)
          : ({} as Record<string, unknown>);
      for (const key of ownKeys as string[]) {
        const descriptor = Reflect.getOwnPropertyDescriptor(objectValue, key);
        if (
          !descriptor ||
          descriptor.get ||
          descriptor.set ||
          descriptor.enumerable !== true ||
          !Object.prototype.hasOwnProperty.call(descriptor, "value")
        ) {
          throw new Error("non-canonical object field");
        }
        Object.defineProperty(snapshot, key, {
          configurable: true,
          enumerable: true,
          value: visit(descriptor.value),
          writable: true,
        });
      }
      return snapshot;
    } finally {
      active.delete(objectValue);
    }
  };

  try {
    return { ok: true, value: visit(input) };
  } catch {
    return { ok: false };
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

const hasExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean => {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
};

const isIdentity = (value: unknown): value is string =>
  typeof value === "string" && V2_IDENTITY_REGEX.test(value);

const expectedZone = (index: number): V2RequiredSessionDefinition["zone"] =>
  index < 4 ? "understand" : index < 8 ? "use" : "master";

const fail = (issues: readonly string[]): V2SessionSetValidationResult => ({
  ok: false,
  issues: [...new Set(issues)],
});

export const validateV2SessionSet = (
  input: unknown,
): V2SessionSetValidationResult => {
  const snapshot = snapshotSessionSetInput(input);
  if (snapshot.ok === false) return fail(["session_set_input_invalid"]);
  input = snapshot.value;
  if (!isRecord(input)) return fail(["session_set_invalid"]);
  if (!hasExactKeys(input, BODY_KEYS))
    return fail(["session_set_field_unknown"]);

  const issues: string[] = [];
  if (input.schemaVersion !== "v2-session-set.v1")
    issues.push("session_set_schema_version");
  if (
    !isIdentity(input.episodeId) ||
    !Number.isSafeInteger(input.version) ||
    Number(input.version) < 1
  )
    issues.push("session_set_identity");
  if (!Array.isArray(input.sessions))
    return fail([...issues, "session_set_required_count"]);
  if (input.sessions.length !== 12) issues.push("session_set_required_count");

  const sessionIds = new Set<string>();
  const cardIds = new Set<string>();
  input.sessions.forEach((candidate, index) => {
    if (!isRecord(candidate) || !hasExactKeys(candidate, SESSION_KEYS)) {
      issues.push("session_field_invalid");
      return;
    }
    if (!isIdentity(candidate.sessionId) || sessionIds.has(candidate.sessionId))
      issues.push("session_identity_invalid");
    else sessionIds.add(candidate.sessionId);
    if (
      candidate.ordinal !== index + 1 ||
      candidate.zone !== expectedZone(index)
    )
      issues.push("session_set_required_order");
    if (
      !Number.isSafeInteger(candidate.targetSeconds) ||
      Number(candidate.targetSeconds) < 150 ||
      Number(candidate.targetSeconds) > 360
    )
      issues.push("session_target_seconds");
    if (
      !Array.isArray(candidate.cards) ||
      candidate.cards.length !== 12
    ) {
      issues.push("session_card_count");
      return;
    }
    const families = new Set<string>();
    for (const card of candidate.cards) {
      if (!isRecord(card) || !hasExactKeys(card, CARD_KEYS)) {
        issues.push("session_card_invalid");
        continue;
      }
      if (!isIdentity(card.cardId)) {
        issues.push("session_card_identity_invalid");
      } else if (cardIds.has(card.cardId)) {
        issues.push("session_set_duplicate_card_id");
      } else {
        cardIds.add(card.cardId);
      }
      if (
        !isIdentity(card.contentItemId) ||
         !isIdentity(card.objectiveId) ||
         !isIdentity(card.promptId) ||
         !(V2_ACTIVITY_FAMILIES as readonly unknown[]).includes(card.family) ||
        !LEARNING_FUNCTIONS.has(
          card.learningFunction as V2SessionLearningFunction,
        ) ||
        !SUPPORT_LEVELS.has(card.support as LearningSupportLevel) ||
        !["trained", "varied", "novel"].includes(String(card.promptNovelty))
       )
         issues.push("session_card_invalid");
       if (
         typeof card.family !== "string" ||
         !REQUIRED_SESSION_ALLOWED_FAMILIES.has(card.family as V2ActivityFamily)
       ) {
         issues.push("session_card_family_unapproved");
       }
       if (typeof card.family === "string") families.add(card.family);
    }
    if (families.size < 3 || families.size > 4)
      issues.push("session_family_count");
  });

  if (!Array.isArray(input.optionalPracticeSlots)) {
    issues.push("optional_practice_slots_invalid");
  } else {
    if (input.optionalPracticeSlots.length > 2)
      issues.push("optional_practice_slot_count");
    const optionalSlotIds = new Set<string>();
    const optionalCapabilityIds = new Set<string>();
    for (const slot of input.optionalPracticeSlots) {
      if (!isRecord(slot) || !hasExactKeys(slot, OPTIONAL_KEYS)) {
        issues.push("optional_practice_slot_invalid");
        continue;
      }
      if (slot.requiredForProgress !== false)
        issues.push("optional_practice_progress_forbidden");
      if (slot.canWriteMastery !== false)
        issues.push("optional_practice_mastery_forbidden");
      if (isIdentity(slot.slotId)) {
        if (optionalSlotIds.has(slot.slotId)) {
          issues.push("session_set_duplicate_optional_slot_id");
        } else {
          optionalSlotIds.add(slot.slotId);
        }
      }
      if (isIdentity(slot.capabilityId)) {
        if (optionalCapabilityIds.has(slot.capabilityId)) {
          issues.push("session_set_duplicate_optional_capability_id");
        } else {
          optionalCapabilityIds.add(slot.capabilityId);
        }
      }
      if (
        !isIdentity(slot.slotId) ||
        slot.episodeId !== input.episodeId ||
        !isIdentity(slot.capabilityId) ||
        !(V2_ACTIVITY_FAMILIES as readonly unknown[]).includes(slot.family) ||
        !["mistake", "due", "personal_plan", "current_unit"].includes(
          String(slot.sourcePriority),
        ) ||
        !Number.isSafeInteger(slot.expectedSeconds) ||
        Number(slot.expectedSeconds) < 1
      )
        issues.push("optional_practice_slot_invalid");
    }
  }

  return issues.length > 0
    ? fail(issues)
    : { ok: true, issues: [], value: input as unknown as V2SessionSetBody };
};

export type { V2SessionSetRef };
