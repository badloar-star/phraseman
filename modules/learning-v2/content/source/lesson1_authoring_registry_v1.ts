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
// зачем повторно открыто (владелец, 2026-08-28, «давай» после аудита новой
// Библии текстов): прежнее телефонное одобрение относилось к старому текстовому
// контракту. Новый evaluator доказал 48 intro_body_overloaded и отсутствие
// актуального review receipt, поэтому сессия 1 была снова открыта, а 2-56
// заморожены одним точным отпечатком до её повторного AUTO_PASS/owner review.
const OWNER_REOPENED_EN_SESSION_1_FOR_TEXT_BIBLE =
  "owner-reopened-en-lesson-01-session-01-for-text-bible-2026-08-28";
// зачем AUTO_PASS (2026-08-28): новая Библия текстов применена к трём интро,
// word-first guidance и feedback во всех восьми локалях; focused text,
// choreography, runtime-native, mode-native и preflight gates зелёные.
// Это только машинный кандидат: независимое review и повторное решение
// владельца ещё обязательны, поэтому OWNER_APPROVED/LOCKED не выставляются.
const EN_SESSION_1_TEXT_BIBLE_CANDIDATE_FINGERPRINT =
  "d73f1e1f2cdcd6b548b28129e2f990a5a1df51fb85dac04141003f4757d9b1dc";
// зачем LOCKED (владелец, 2026-08-28, «Давай сессия 2 теперь»): после
// повторного AUTO_PASS по новой Библии текстов владелец прямо разрешил перейти
// к следующему ordinal. Это повторное owner review именно актуального
// fingerprint, а не восстановление старого телефонного approval.
const OWNER_APPROVED_EN_SESSION_1_TEXT_BIBLE =
  "owner-approved-en-lesson-01-session-01-text-bible-2026-08-28";
// зачем LOCKED (владелец, 2026-08-28, «сессия 2 одобрена»): перед фиксацией
// новый projection guard обнаружил два экрана лишь с двумя ловушками. Для sad
// и fine вручную добавлены третьи phonetic traps во всех восьми локалях;
// current-session integrity и owner HTML повторно проходят на этом exact hash.
const EN_SESSION_2_LOCKED_FINGERPRINT =
  "ac55b9a5027a31f3089fe435cb1658cb3eefeb23cd1a834359371effff6ce4a0";
const OWNER_APPROVED_EN_SESSION_2_AFTER_OWNER_REVIEW =
  "owner-approved-en-lesson-01-session-02-after-owner-review-2026-08-28";
// зачем повторно открыты 1–3 (владелец, 2026-08-28, «переделай все три
// сессии с новыми гейтами»): одобрения 1–2 относились к более раннему
// контракту. Новые атомарные варианты, точный feedback и projection gates
// применяются последовательно заново, начиная с session 1. Диапазон 2–56
// заморожен по фактическим source fingerprints до GREEN первой сессии.
const OWNER_REOPENED_EN_SESSIONS_1_TO_3_FOR_STRICT_GATES =
  "owner-reopened-en-lesson-01-sessions-01-03-for-strict-gates-2026-08-28";
const OWNER_ORDERED_EN_SESSIONS_1_TO_3_STRICT_REWRITE =
  "owner-ordered-en-lesson-01-sessions-01-03-strict-rewrite-2026-08-28";
// зачем пересчитаны LOCKED hashes: прямое решение владельца 2026-08-28
// запретило буквенную сборку и native-language semantic quiz во всех уже
// доступных сессиях. Session 1 теперь спрашивает английскую I/i/l, session 3
// собирает I'm одной цельной плиткой, а все 1-3 несут intro grammar dimensions.
const OWNER_REQUIRED_GLOBAL_GRAMMAR_INTRO_AND_NO_LETTER_GATE =
  "owner-required-global-intro-grammar-and-no-letter-assembly-2026-08-28";
const EN_SESSION_1_STRICT_GATES_LOCKED_FINGERPRINT =
  "7bd55266a75dc118f854d8df23d30daa917e6cb1c5ce3301bad07f5661d0d065";
const EN_SESSION_2_STRICT_GATES_LOCKED_FINGERPRINT =
  "24dfad85aa916dafa7b87bb5d965839a56f7f6c7eac4d88c2aa9fb64764a5eff";
const OWNER_APPROVED_EN_SESSION_3 =
  "owner-approved-en-lesson-01-session-03-next-session-request-2026-08-28";
const EN_SESSION_3_LOCKED_FINGERPRINT =
  "972d8629ea58b0fdf021c415e583c11f5cf84a6fd172aadbc5c6a3a2123c2786";
const EN_SESSION_2_STRICT_GATES_FORBIDDEN_FUTURE_FINGERPRINT =
  "78cdda8fb03525c41f7fcab073051d9284382fe5dd5f00e51f0eb04472b67b10";
const EN_SESSION_1_STRICT_GATES_FORBIDDEN_FUTURE_FINGERPRINT =
  "e079b2b27d52ec87e75610c62aac7bc5b8fad70bba8038559f806ac6558eeb97";
// зачем future hash: после LOCKED 1-2 единственной доступной для authoring
// становится session 3; диапазон 4-56 защищён одним hash фактических source
// fingerprints и не может дрейфовать во время работы над третьей.
const EN_SESSION_4_FORBIDDEN_FUTURE_FINGERPRINT =
  "b5f9d9bcf814bc59e5c749e65d6c2b66aba83eda87aa1383cd692239906a6a9b";
// зачем пересчитано (2026-08-27, во время mode-native переписи испанской
// сессии 1): исходное значение было зафиксировано на другом снимке диапазона
// 2-56 — старые (pre-mode-native) сессии 2-33 продолжали существовать в
// es_authored_sessions_v1.ts своим прежним DRAFT-содержимым, документально
// возвращённым в DRAFT owner-decision 2026-08-25 (СТАРТ ES §10), но физически
// присутствующим в реестре до их собственной последовательной переработки.
// Значение ниже — точный hashCanonicalBody от их ТЕКУЩЕГО (не тронутого этой
// правкой) состояния; drift здесь означал бы, что содержимое 2-56 незаметно
// изменилось, а не то, что оно вообще существует.
const ES_SESSION_1_MODE_NATIVE_FORBIDDEN_FUTURE_FINGERPRINT =
  "b87310f4775514e088b0237c007bb19c60fc58e87de377184cc89d3e446c9d10";
// зачем LOCKED (владелец, 2026-08-27): испанская сессия 1 пройдена и одобрена
// владельцем лично на устройстве (playable mock §8-bis СТАРТ ES.md) — переход
// AUTO_PASS → OWNER_APPROVED → LOCKED. Значение — точный hashCanonicalBody
// содержимого сессии 1 ПОСЛЕ финальных правок (дубль mentira в EXTRA_MEANING_
// TRAPS, интро-страница про es без упоминания fácil, перегенерация аудио) —
// любое дальнейшее изменение source даёт немедленный HOLD fingerprint drift.
// зачем пересчитан 2026-08-27 второй раз: интро-страница про es была ужата до
// трёх предложений и уронила машинный гейт качества (intro_body_too_thin,
// MIN_BODY_CHARS=300 + минимум 4 предложения). Гейт блокировал ВСЮ сессию —
// бандл переставал отдаваться, приложение уходило в сеть и падало с
// stable_identity_unavailable. Текст восстановлен до нормы плотности,
// отпечаток обновлён под него.
const ES_SESSION_1_LOCKED_FINGERPRINT =
  "e55f18f0833fd17460889a9b0dee95b77e13c81050dcc51ab134e4c6f06781c1";
const OWNER_APPROVED_ES_SESSION_1 =
  "owner-approved-es-lesson-01-session-01-after-phone-review-2026-08-27";
// зачем session 2 (владелец, 2026-08-27, «создай следующую испанскую
// сессию»): точный hashCanonicalBody диапазона 3-56 (все null — контент не
// написан), тем же способом, что и preflight считает forbiddenFutureFingerprint
// сам. Испанская сессия 2 (mode-native, тема negation_no) уже написана в
// es_episode_01_session_02_v1.ts и ждёт своего playable mock + одобрения
// владельца — тот же путь DRAFT → AUTO_PASS → OWNER_APPROVED → LOCKED.
const ES_SESSION_2_MODE_NATIVE_FORBIDDEN_FUTURE_FINGERPRINT =
  "19b4062c0fc9e573a7c8dadc9466ce81b5297fb89e3a3d042b77a1a5409675d7";

function buildEnglishRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  return Array.from({ length: 56 }, (_, index) => {
    const sessionOrdinal = index + 1;
    if (sessionOrdinal === 1) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_1_STRICT_GATES_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_REQUIRED_GLOBAL_GRAMMAR_INTRO_AND_NO_LETTER_GATE,
        unlockDecisionRef: OWNER_REOPENED_EN_SESSIONS_1_TO_3_FOR_STRICT_GATES,
      };
    }
    if (sessionOrdinal === 2) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_2_STRICT_GATES_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_REQUIRED_GLOBAL_GRAMMAR_INTRO_AND_NO_LETTER_GATE,
        unlockDecisionRef: OWNER_REOPENED_EN_SESSIONS_1_TO_3_FOR_STRICT_GATES,
      };
    }
    if (sessionOrdinal === 3) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_3_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_REQUIRED_GLOBAL_GRAMMAR_INTRO_AND_NO_LETTER_GATE,
        unlockDecisionRef: OWNER_ORDERED_EN_SESSIONS_1_TO_3_STRICT_REWRITE,
      };
    }
    if (sessionOrdinal === 4) {
      return {
        sessionOrdinal,
        status: "DRAFT" as const,
        forbiddenFutureFingerprint: EN_SESSION_4_FORBIDDEN_FUTURE_FINGERPRINT,
        unlockDecisionRef: OWNER_APPROVED_EN_SESSION_3,
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
    status: "LOCKED" as const,
    lockedFingerprint: ES_SESSION_1_LOCKED_FINGERPRINT,
    ownerDecisionRef: OWNER_APPROVED_ES_SESSION_1,
    unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_MODE_NATIVE_REWRITE,
  };
  entries[1] = {
    ...entries[1],
    status: "DRAFT" as const,
    forbiddenFutureFingerprint:
      ES_SESSION_2_MODE_NATIVE_FORBIDDEN_FUTURE_FINGERPRINT,
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
