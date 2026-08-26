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
  readonly unlockDecisionRef?: string;
}

export interface Lesson1AuthoringPreflightV1 {
  readonly lockedThrough: number;
  readonly currentSessionOrdinal: number | null;
  readonly forbiddenFrom: number | null;
}

// зачем: параллельный испанский контур (владелец, 2026-08-23) нуждается в
// собственном реестре сессий, изолированном от английского. Реестр хранится
// по языку; английский экспорт ниже сохраняет прежнее API-имя, но статусы обоих
// контуров могут независимо меняться по прямому owner decision.
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

const OWNER_UNLOCKED_ALL_FOR_MODE_NATIVE_REWRITE =
  "owner-unlocked-all-learning-v2-mode-native-rewrite-2026-08-25";
const SESSION_1_MODE_NATIVE_FORBIDDEN_FUTURE_FINGERPRINT =
  "f7668e2d22a045d7665ea13a4b2dbf27f1ccdcea9562480a9bb1e7dae3652f11";
const ES_SESSION_1_MODE_NATIVE_FORBIDDEN_FUTURE_FINGERPRINT =
  "6efaf6584356330a24138bbb59e7c82ea678d83db57778f2459c4fe7ecb9a542";

function buildEnglishRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  return Array.from({ length: 56 }, (_, index) => {
    const sessionOrdinal = index + 1;
    if (sessionOrdinal === 1) {
      return {
        sessionOrdinal,
        status: "DRAFT" as const,
        forbiddenFutureFingerprint:
          SESSION_1_MODE_NATIVE_FORBIDDEN_FUTURE_FINGERPRINT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_MODE_NATIVE_REWRITE,
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

function buildEsRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  const draft = buildDraftRegistry();
  const entries = [...draft];
  entries[0] = {
    ...entries[0],
    forbiddenFutureFingerprint:
      ES_SESSION_1_MODE_NATIVE_FORBIDDEN_FUTURE_FINGERPRINT,
    unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_MODE_NATIVE_REWRITE,
  };
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
    buildEsRegistry().map((entry) => Object.freeze(entry)),
  ),
});

/** Обратная совместимость API: существующие английские вызовы продолжают
 * получать реестр через прежнее экспортированное имя. */
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
