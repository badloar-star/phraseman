import { hashCanonicalBody } from "../../policies/decision_registry";

export type Lesson1AuthoringStatusV1 =
  | "DRAFT"
  | "AUTO_PASS"
  | "OWNER_APPROVED"
  | "LOCKED";

export interface Lesson1AuthoringRegistryEntryV1 {
  readonly sessionOrdinal: number;
  readonly status: Lesson1AuthoringStatusV1;
  readonly lockedFingerprint?: string;
  readonly candidateFingerprint?: string;
  readonly forbiddenFutureFingerprint?: string;
  readonly ownerDecisionRef?: string;
}

export interface Lesson1AuthoringPreflightV1 {
  readonly lockedThrough: number;
  readonly currentSessionOrdinal: number | null;
  readonly forbiddenFrom: number | null;
}

// зачем: параллельный испанский контур (владелец, 2026-08-23) нуждается в
// собственном реестре сессий, изолированном от английского. Реестр теперь
// хранится по языку; английский экспорт ниже сохраняет прежнее имя, форму
// и значения — правка не меняет ни один fingerprint/статус английского курса.
export const V2_AUTHORING_TARGET_LANGUAGES = ["en", "es"] as const;
export type V2AuthoringTargetLanguage =
  (typeof V2_AUTHORING_TARGET_LANGUAGES)[number];

export function isV2AuthoringTargetLanguage(
  value: unknown,
): value is V2AuthoringTargetLanguage {
  return (
    typeof value === "string" &&
    (V2_AUTHORING_TARGET_LANGUAGES as readonly string[]).includes(value)
  );
}

const OWNER_APPROVED_FIRST_TEN =
  "owner-approved-first-ten-plus-task-distractor-variant-3-2026-08-21";
const LOCKED_FIRST_TEN_FINGERPRINTS: Readonly<Record<number, string>> =
  Object.freeze({
    1: "92791663899cb0539d6aa55080701895715ad54597ab8304d4deefa817afef2f",
    2: "ce9ec77ac058334b14b3e8a6ce7d8dbe262ddd6bcee14894330671ad3e5fbaf3",
    3: "d14a88d3a0403f442e646433a82304186304a8f9b5f2ad002399335d6f98f2a6",
    4: "3c277b5e3df63e04a06bc0e6e8f097300b31f7b426907729c82c23f72a6fa00d",
    5: "6efe77a14f772415a32452fdd6f7782f1066d4f9ef1d3db8d5144b5879f0aa98",
    6: "2048118cdfcfa3ab17faf377703f46a2497e6da57186a5f4799252686530ec04",
    7: "65c66f37aad033a65e5758713b189ebb7f69268ad9ed1b1ec52b35fccbb927d0",
    8: "4ac95fea5c0c404daf7c45015e6a1d80f1a3dc5917f8405ded6d6c4d2862fabd",
    9: "1e2eb1d5a74c2bc9ecdd577553fdc64426e56da711c82a1971b14a008e9508d9",
    10: "afc6510b255316d894cd92f5958be57034e61c7a8dda52b6574dcff663592686",
  });
const OWNER_APPROVED_SESSION_11 =
  "owner-approved-session-11-task-distractor-variant-3-2026-08-21";
const SESSION_11_LOCKED_FINGERPRINT =
  "dc5882cc93aaa1a3dc50554d2c9871fab5fa5c89ffdc1293a48583e10b8452df";
const OWNER_APPROVED_SESSION_12 =
  "owner-approved-session-12-next-2026-08-21";
const SESSION_12_LOCKED_FINGERPRINT =
  "c444eb113e98c4ae6e88d965b5f810e057beb89f3ce461cd6292a18ce8dc20d2";
const SESSION_13_AUTO_PASS_FINGERPRINT =
  "6fecc3eb8a22cda2517e9ab57b33e9fbdff6172e03f171c9c641832ec6ad4ff7";
const OWNER_APPROVED_SESSION_13 =
  "owner-approved-session-13-next-2026-08-21";
const SESSION_14_FORBIDDEN_FUTURE_FINGERPRINT =
  "46df531c54ad9aaa685d849f6a5d6e8caf0d4baa167fb7b5686b051f6e17bf51";
const SESSION_14_AUTO_PASS_FINGERPRINT =
  "e29a9b532e9538fe9be3c51eec6f0897c89325ed6a9092b3f568cbe0e55569a1";

function buildEnglishRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  return Array.from({ length: 56 }, (_, index) => {
    const sessionOrdinal = index + 1;
    if (sessionOrdinal <= 10) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: LOCKED_FIRST_TEN_FINGERPRINTS[sessionOrdinal],
        ownerDecisionRef: OWNER_APPROVED_FIRST_TEN,
      };
    }
    if (sessionOrdinal === 11) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_11_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_APPROVED_SESSION_11,
      };
    }
    if (sessionOrdinal === 12) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_12_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_APPROVED_SESSION_12,
      };
    }
    if (sessionOrdinal === 13) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_13_AUTO_PASS_FINGERPRINT,
        ownerDecisionRef: OWNER_APPROVED_SESSION_13,
      };
    }
    if (sessionOrdinal === 14) {
      return {
        sessionOrdinal,
        status: "AUTO_PASS" as const,
        candidateFingerprint: SESSION_14_AUTO_PASS_FINGERPRINT,
        forbiddenFutureFingerprint: SESSION_14_FORBIDDEN_FUTURE_FINGERPRINT,
      };
    }
    return { sessionOrdinal, status: "DRAFT" as const };
  });
}

// зачем: испанский контур стартует с чистого листа — 56 записей DRAFT, точно
// как английский контур стартовал бы, если бы у него не было уже написанных
// первых 14 сессий. Параллельная сессия Кодекса/Клода пишет именно в этот
// реестр через authoringRegistryForTargetLanguage("es"), никогда не касаясь
// английского массива ниже. Session 1 несёт forbiddenFutureFingerprint,
// вычисленный тем же hashCanonicalBody, что и сам preflight — иначе
// assertRegistryShape отказывает даже пустому реестру (session 2..56 ещё не
// разрешены, и это должно быть доказуемо, а не подразумеваться).
function buildDraftRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  const entries: Lesson1AuthoringRegistryEntryV1[] = Array.from(
    { length: 56 },
    (_, index) => ({ sessionOrdinal: index + 1, status: "DRAFT" as const }),
  );
  const forbiddenFutureFingerprint = hashCanonicalBody(
    entries
      .filter((entry) => entry.sessionOrdinal >= 2)
      .map((entry) => [entry.sessionOrdinal, null]),
  );
  entries[0] = { ...entries[0], forbiddenFutureFingerprint };
  return entries;
}

const REGISTRY_BY_TARGET_LANGUAGE: Readonly<
  Record<
    V2AuthoringTargetLanguage,
    readonly Lesson1AuthoringRegistryEntryV1[]
  >
> = Object.freeze({
  en: Object.freeze(
    buildEnglishRegistry().map((entry) => Object.freeze(entry)),
  ),
  es: Object.freeze(
    buildDraftRegistry().map((entry) => Object.freeze(entry)),
  ),
});

/** Обратная совместимость: существующие вызовы (английский конвейер,
 * английский gate-тест) получают ровно тот же массив, что и раньше. */
export const LESSON1_AUTHORING_REGISTRY_V1: readonly Lesson1AuthoringRegistryEntryV1[] =
  REGISTRY_BY_TARGET_LANGUAGE.en;

export function authoringRegistryForTargetLanguage(
  targetLanguage: V2AuthoringTargetLanguage,
): readonly Lesson1AuthoringRegistryEntryV1[] {
  return REGISTRY_BY_TARGET_LANGUAGE[targetLanguage];
}

function assertRegistryShape(
  entries: readonly Lesson1AuthoringRegistryEntryV1[],
  actualFingerprints: Readonly<Record<number, string | null>>,
): void {
  if (entries.length !== 56) {
    throw new Error(
      `lesson1_authoring_registry_size_invalid:expected=56:actual=${entries.length}`,
    );
  }

  let encounteredUnlocked = false;
  entries.forEach((entry, index) => {
    const expectedOrdinal = index + 1;
    if (entry.sessionOrdinal !== expectedOrdinal) {
      throw new Error(
        `lesson1_authoring_registry_ordinal_invalid:expected=${expectedOrdinal}:actual=${entry.sessionOrdinal}`,
      );
    }
    if (entry.status === "LOCKED") {
      if (encounteredUnlocked) {
        throw new Error(
          `lesson1_authoring_locked_prefix_broken:session=${entry.sessionOrdinal}`,
        );
      }
      if (!entry.ownerDecisionRef?.trim()) {
        throw new Error(
          `lesson1_authoring_owner_decision_missing:session=${entry.sessionOrdinal}`,
        );
      }
      if (!entry.lockedFingerprint?.trim()) {
        throw new Error(
          `lesson1_locked_fingerprint_missing:session=${entry.sessionOrdinal}`,
        );
      }
      if (
        actualFingerprints[entry.sessionOrdinal] !== entry.lockedFingerprint
      ) {
        throw new Error(
          `lesson1_locked_fingerprint_drift:session=${entry.sessionOrdinal}`,
        );
      }
    } else {
      encounteredUnlocked = true;
      if (
        (entry.status === "AUTO_PASS" || entry.status === "OWNER_APPROVED") &&
        !entry.candidateFingerprint?.trim()
      ) {
        throw new Error(
          `lesson1_candidate_fingerprint_missing:session=${entry.sessionOrdinal}:status=${entry.status}`,
        );
      }
      if (
        entry.status === "OWNER_APPROVED" &&
        !entry.ownerDecisionRef?.trim()
      ) {
        throw new Error(
          `lesson1_authoring_owner_decision_missing:session=${entry.sessionOrdinal}`,
        );
      }
      if (
        entry.candidateFingerprint &&
        actualFingerprints[entry.sessionOrdinal] !== entry.candidateFingerprint
      ) {
        throw new Error(
          `lesson1_candidate_fingerprint_drift:session=${entry.sessionOrdinal}:status=${entry.status}`,
        );
      }
    }
  });
}

export function lesson1AuthoringPreflightV1(
  requestedSessionOrdinal: number | undefined,
  actualFingerprints: Readonly<Record<number, string | null>>,
  entries: readonly Lesson1AuthoringRegistryEntryV1[] = LESSON1_AUTHORING_REGISTRY_V1,
): Lesson1AuthoringPreflightV1 {
  assertRegistryShape(entries, actualFingerprints);

  const firstUnlockedIndex = entries.findIndex(
    (entry) => entry.status !== "LOCKED",
  );
  const lockedThrough =
    firstUnlockedIndex === -1 ? entries.length : firstUnlockedIndex;
  const currentSessionOrdinal =
    firstUnlockedIndex === -1
      ? null
      : (entries[firstUnlockedIndex]?.sessionOrdinal ?? null);
  const forbiddenFrom =
    currentSessionOrdinal === null || currentSessionOrdinal >= entries.length
      ? null
      : currentSessionOrdinal + 1;

  if (currentSessionOrdinal !== null && forbiddenFrom !== null) {
    const currentEntry = entries[firstUnlockedIndex];
    if (!currentEntry?.forbiddenFutureFingerprint?.trim()) {
      throw new Error(
        `lesson1_forbidden_future_fingerprint_missing:current=${currentSessionOrdinal}:range=${forbiddenFrom}-${entries.length}`,
      );
    }
    const actualForbiddenFutureFingerprint = hashCanonicalBody(
      entries
        .filter((entry) => entry.sessionOrdinal >= forbiddenFrom)
        .map((entry) => [
          entry.sessionOrdinal,
          actualFingerprints[entry.sessionOrdinal],
        ]),
    );
    if (
      actualForbiddenFutureFingerprint !==
      currentEntry.forbiddenFutureFingerprint
    ) {
      throw new Error(
        `lesson1_forbidden_future_fingerprint_drift:range=${forbiddenFrom}-${entries.length}`,
      );
    }
  }

  if (
    requestedSessionOrdinal !== undefined &&
    requestedSessionOrdinal !== currentSessionOrdinal
  ) {
    throw new Error(
      `lesson1_authoring_out_of_order:requested=${requestedSessionOrdinal}:current=${
        currentSessionOrdinal ?? "none"
      }:lockedThrough=${lockedThrough}`,
    );
  }

  return { lockedThrough, currentSessionOrdinal, forbiddenFrom };
}
