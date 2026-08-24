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

const OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE =
  "owner-unlocked-all-lesson1-word-first-rewrite-2026-08-24";
const OWNER_CONTINUOUS_AUTHORING_CONTRACT =
  "owner-continuous-lesson1-authoring-contract-2026-08-24";
const SESSION_1_WORD_FIRST_FINGERPRINT =
  "3eef3af914b37f711c70e0796edfe94957278f9d8910bc20021eabd431474f19";
const SESSION_2_WORD_FIRST_FINGERPRINT =
  "c5a952b8b9e71703e06216c5d40f5da7a43bc3fc1b799b6878ebc72bcb36d1ff";
const SESSION_3_WORD_FIRST_FINGERPRINT =
  "9d721ad71f2c832740b77948ace5dec2e03a719ffb8475f66e7af0e66f188df7";
const SESSION_4_WORD_FIRST_FINGERPRINT =
  "679939edbcb8ebce9a18eebb09bd7e33b32bd995e8fa4f741278974580ad03b8";
const SESSION_5_WORD_FIRST_FINGERPRINT =
  "887f390c8ac845131be128010ac14c327297eefc17e2b7c44f534dd589aace3e";
const SESSION_6_WORD_FIRST_FINGERPRINT =
  "651642745a8f0737b0fcc4aeb9780f76b3029321d312ba9930ad8703486aa08c";
const SESSION_7_VOICE_FINGERPRINT =
  "50f1731457ac1938ad08b0cf6ad9aca3aa66822a183e4a2939fbe3f33f6857e3";
const SESSION_8_CHECKPOINT_FINGERPRINT =
  "949b91bbd11d874476cb52a8cf8d28cd895ab53d4deec86bb38bf8c8df3993e3";
const SESSION_9_WORD_FIRST_FINGERPRINT =
  "dd740e01a62a049e4582a7d9976a63a10e8ef68bdc484f623b5c51384461b119";
const SESSION_10_WORD_FIRST_FINGERPRINT =
  "aebbaee093189564d88104d04bd02e7c032bad04b9c357875260ad3fb524f58e";
const SESSION_11_FORBIDDEN_FUTURE_FINGERPRINT =
  "2b8488fa0d82d83276f27060724d6da76be40f00857d593d18db0f5177b3e25d";

function buildEnglishRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  return Array.from({ length: 56 }, (_, index) => {
    const sessionOrdinal = index + 1;
    if (sessionOrdinal === 1) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_1_WORD_FIRST_FINGERPRINT,
        ownerDecisionRef: OWNER_CONTINUOUS_AUTHORING_CONTRACT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE,
      };
    }
    if (sessionOrdinal === 2) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_2_WORD_FIRST_FINGERPRINT,
        ownerDecisionRef: OWNER_CONTINUOUS_AUTHORING_CONTRACT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE,
      };
    }
    if (sessionOrdinal === 3) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_3_WORD_FIRST_FINGERPRINT,
        ownerDecisionRef: OWNER_CONTINUOUS_AUTHORING_CONTRACT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE,
      };
    }
    if (sessionOrdinal === 4) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_4_WORD_FIRST_FINGERPRINT,
        ownerDecisionRef: OWNER_CONTINUOUS_AUTHORING_CONTRACT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE,
      };
    }
    if (sessionOrdinal === 5) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_5_WORD_FIRST_FINGERPRINT,
        ownerDecisionRef: OWNER_CONTINUOUS_AUTHORING_CONTRACT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE,
      };
    }
    if (sessionOrdinal === 6) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_6_WORD_FIRST_FINGERPRINT,
        ownerDecisionRef: OWNER_CONTINUOUS_AUTHORING_CONTRACT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE,
      };
    }
    if (sessionOrdinal === 7) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_7_VOICE_FINGERPRINT,
        ownerDecisionRef: OWNER_CONTINUOUS_AUTHORING_CONTRACT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE,
      };
    }
    if (sessionOrdinal === 8) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_8_CHECKPOINT_FINGERPRINT,
        ownerDecisionRef: OWNER_CONTINUOUS_AUTHORING_CONTRACT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE,
      };
    }
    if (sessionOrdinal === 9) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_9_WORD_FIRST_FINGERPRINT,
        ownerDecisionRef: OWNER_CONTINUOUS_AUTHORING_CONTRACT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE,
      };
    }
    if (sessionOrdinal === 10) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_10_WORD_FIRST_FINGERPRINT,
        ownerDecisionRef: OWNER_CONTINUOUS_AUTHORING_CONTRACT,
        unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_WORD_FIRST_REWRITE,
      };
    }
    if (sessionOrdinal === 11) {
      return {
        sessionOrdinal,
        status: "DRAFT" as const,
        forbiddenFutureFingerprint: SESSION_11_FORBIDDEN_FUTURE_FINGERPRINT,
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

// зачем испанская сессия 1 LOCKED (владелец, 2026-08-24: "отлично сессия 1
// одобряю (лок)"): владелец прошёл играбельный макет (СТАРТ ES.md раздел
// 8-bis) и явно одобрил. lockedFingerprint вычислен той же
// learningV2SessionContentFingerprint(source), что читает preflight —
// расхождение с реальным содержимым источника даст HOLD немедленно
// (lesson1_locked_fingerprint_drift), так и задумано: правка запертого
// текста без нового решения владельца обязана остановить сборку.
const ES_OWNER_APPROVED_SESSION_1_DECISION =
  "owner-approved-es-lesson1-session1-2026-08-24";
const ES_SESSION_1_LOCKED_FINGERPRINT =
  "9f4d416d81a8fe2b73b21486690d7b2b387b6e989c0409655f7b9d008fddf7de";

function buildEsRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  const draft = buildDraftRegistry();
  const entries = [...draft];
  entries[0] = {
    sessionOrdinal: 1,
    status: "LOCKED",
    lockedFingerprint: ES_SESSION_1_LOCKED_FINGERPRINT,
    ownerDecisionRef: ES_OWNER_APPROVED_SESSION_1_DECISION,
  };
  // зачем >= 3, а не >= 2 (как в buildDraftRegistry выше): после блокировки
  // сессии 1 текущей становится сессия 2 — она сама разрешена, запрещённый
  // диапазон начинается с forbiddenFrom = currentSessionOrdinal + 1 = 3
  // (lesson1AuthoringPreflightV1). Отпечаток на sessionOrdinal 2 обязан
  // покрывать именно этот диапазон, иначе preflight даёт
  // lesson1_forbidden_future_fingerprint_drift.
  const forbiddenFutureFingerprint = hashCanonicalBody(
    entries
      .filter((entry) => entry.sessionOrdinal >= 3)
      .map((entry) => [entry.sessionOrdinal, null]),
  );
  entries[1] = { ...entries[1], forbiddenFutureFingerprint };
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
