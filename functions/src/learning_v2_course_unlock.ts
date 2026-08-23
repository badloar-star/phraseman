import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { detachBoundedWalletJson } from "../../modules/learning-v2/contracts/wallet";
import {
  createRequiredSessionCatalogFromSessionSetV2,
  parsePublishedRequiredSessionSet,
  type PublishedRequiredSessionSetV2,
} from "../../modules/learning-v2/contracts/required_session_progress";
import {
  materializeServerCourseUnlockReceiptCandidate,
  materializeServerCourseUnlockRequest,
  parseServerCourseUnlockIntent,
  parseServerCourseUnlockReceiptRaw,
  type ServerCourseUnlockReceiptMaterializationV1,
} from "../../modules/learning-v2/progress/server_course_unlock_receipt";
import { deriveLearningV2EconomicAccountScopeHash } from
  "../../modules/learning-v2/progress/economic_account_scope";
import { HOT_CALLABLE_OPTIONS } from "./callable_options";
import {
  createFirestoreV2CourseCatalogReader,
} from "./content_factory/v2_required_session_activation";
import {
  publishedRequiredSessionSetDocumentId,
} from "./content_factory/v2_required_session_publication";
import {
  normalizeProgressAuthUid,
  readProgressAccountBinding,
  type ProgressAccountBinding,
} from "./learning_v2/progress_event_callable";
import { commitStarOperations, prepareStarOperations } from "./stars_ledger";
import { getWeekKey } from "./progress_events";
import {
  learningV2UnlockStarOpByUnlockId,
  starsFromWalletSubunits,
} from "./learning_v2/stars_ledger_bridge";

export const V2_COURSE_UNLOCK_RECEIPTS_SUBCOLLECTION =
  "v2_course_unlock_receipts";

export interface ProtectedLearningV2CourseUnlockReceiptV1 {
  readonly schemaVersion: "learning-v2-protected-course-unlock-receipt.v1";
  readonly accountScopeHash: string;
  readonly unlockId: string;
  readonly unlockFingerprint: string;
  readonly encoded: string;
}

export interface LearningV2CourseUnlockStore {
  putIfAbsent(input: {
    readonly stableUid: string;
    readonly receipt: ProtectedLearningV2CourseUnlockReceiptV1;
    /**
     * Цена открытия в подъединицах кошелька. Считает сервер по той же лестнице
     * 45/50/55/60/65 (materializeServerCourseUnlockReceiptCandidate), клиент её
     * не задаёт. Ноль — первое занятие бесплатно.
     */
    readonly chargeSubunits?: number;
  }): Promise<
    | { readonly status: "created"; readonly receipt: unknown }
    | { readonly status: "existing"; readonly receipt: unknown }
  >;
  read(stableUid: string, unlockId: string): Promise<unknown | undefined>;
}

export interface LearningV2CourseUnlockDependencies {
  readonly db?: admin.firestore.Firestore;
  readonly resolveAccountBinding?: (
    authUid: string,
  ) => Promise<ProgressAccountBinding>;
  readonly readPublication?: (sessionSetId: string) => Promise<unknown | undefined>;
  readonly readActiveRelease?: (
    studyTarget: string,
    learnerSourceLocale: string,
  ) => Promise<{ readonly activeReleaseId: string }>;
  readonly store?: LearningV2CourseUnlockStore;
}

const CREATE_KEYS = ["intent", "sessionSetId", "learnerSourceLocale"] as const;
const RESOLVE_KEYS = [
  "schemaVersion", "accountScopeHash", "operationId", "courseId",
  "studyTarget", "unlockId", "unlockFingerprint",
] as const;
const PROTECTED_KEYS = [
  "schemaVersion", "accountScopeHash", "unlockId", "unlockFingerprint", "encoded",
] as const;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SOURCE_LOCALES = new Set(["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === "string" && keys.includes(key));
};
const detachedRecord = (input: unknown, keys: readonly string[], code: string) => {
  let value: unknown;
  try { value = detachBoundedWalletJson(input, code); }
  catch { throw new HttpsError("invalid-argument", code); }
  if (!isRecord(value) || !exactKeys(value, keys))
    throw new HttpsError("invalid-argument", code);
  return value;
};

export const materializeProtectedLearningV2CourseUnlockReceipt = (
  materialization: ServerCourseUnlockReceiptMaterializationV1,
): ProtectedLearningV2CourseUnlockReceiptV1 => {
  const parsed = parseServerCourseUnlockReceiptRaw(materialization.encoded);
  if (parsed.receipt.recordFingerprint !== materialization.receipt.recordFingerprint)
    throw new Error("learning_v2_course_unlock_indeterminate");
  return Object.freeze({
    schemaVersion: "learning-v2-protected-course-unlock-receipt.v1" as const,
    accountScopeHash: parsed.receipt.authorizedRequest.accountScopeHash,
    unlockId: parsed.receipt.unlockId,
    unlockFingerprint: parsed.receipt.unlockFingerprint,
    encoded: parsed.encoded,
  });
};

export const parseProtectedLearningV2CourseUnlockReceipt = (
  input: unknown,
): ProtectedLearningV2CourseUnlockReceiptV1 => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype ||
    !exactKeys(input, PROTECTED_KEYS) ||
    input.schemaVersion !== "learning-v2-protected-course-unlock-receipt.v1" ||
    typeof input.accountScopeHash !== "string" || !ACCOUNT.test(input.accountScopeHash) ||
    typeof input.unlockId !== "string" || !ID.test(input.unlockId) ||
    typeof input.unlockFingerprint !== "string" || !HASH.test(input.unlockFingerprint) ||
    typeof input.encoded !== "string") {
    throw new Error("learning_v2_course_unlock_indeterminate");
  }
  let parsed: ServerCourseUnlockReceiptMaterializationV1;
  try { parsed = parseServerCourseUnlockReceiptRaw(input.encoded); }
  catch { throw new Error("learning_v2_course_unlock_indeterminate"); }
  if (parsed.receipt.authorizedRequest.accountScopeHash !== input.accountScopeHash ||
    parsed.receipt.unlockId !== input.unlockId ||
    parsed.receipt.unlockFingerprint !== input.unlockFingerprint) {
    throw new Error("learning_v2_course_unlock_indeterminate");
  }
  return Object.freeze({
    schemaVersion: input.schemaVersion,
    accountScopeHash: input.accountScopeHash,
    unlockId: input.unlockId,
    unlockFingerprint: input.unlockFingerprint,
    encoded: input.encoded,
  });
};

export const createFirestoreLearningV2CourseUnlockStore = (
  db: admin.firestore.Firestore,
): LearningV2CourseUnlockStore => {
  const ref = (stableUid: string, unlockId: string) => db.collection("users")
    .doc(stableUid).collection(V2_COURSE_UNLOCK_RECEIPTS_SUBCOLLECTION).doc(unlockId);
  return {
    putIfAbsent: async ({ stableUid, receipt, chargeSubunits = 0 }) =>
      db.runTransaction(async (transaction) => {
      const document = ref(stableUid, receipt.unlockId);
      // зачем: владелец 2026-08-23 — звёзды Арены, турниров и Learning V2 это
      // одна валюта, поэтому трата за открытие обязана идти в общий журнал, а
      // не только в локальный кошелёк.
      //
      // Firebase-экономия: документ игрока читаем ТОЛЬКО когда есть что
      // списывать. Первое занятие бесплатное, и за него лишнего чтения нет.
      const starOp = learningV2UnlockStarOpByUnlockId({
        unlockId: receipt.unlockId,
        priceStars: starsFromWalletSubunits(chargeSubunits),
        ruleVersion: 1,
      });
      const userRef = starOp ? db.collection("users").doc(stableUid) : null;
      const [snapshot, userSnap] = await Promise.all([
        transaction.get(document),
        userRef ? transaction.get(userRef) : Promise.resolve(null),
      ]);
      if (snapshot.exists) {
        return { status: "existing" as const, receipt: snapshot.data() };
      }
      transaction.create(document, receipt as unknown as FirebaseFirestore.DocumentData);
      if (starOp && userSnap) {
        const nowMs = Date.now();
        const prepared = await prepareStarOperations(
          transaction, db, stableUid, userSnap, [starOp],
          {
            nowMs,
            activeSeasonId: "",
            weekKeyNow: getWeekKey(new Date(nowMs).toISOString().slice(0, 10)),
            authUid: stableUid,
          },
        );
        // зачем (D-C): нехватку звёзд журнал отвергает сам, и это НЕ отменяет
        // открытие — учёбу не отбираем. Долг гасится следующими начислениями.
        commitStarOperations(transaction, prepared);
      }
      return { status: "created" as const, receipt };
    }),
    read: async (stableUid, unlockId) => {
      const snapshot = await ref(stableUid, unlockId).get();
      return snapshot.exists ? snapshot.data() : undefined;
    },
  };
};

const productionDependencies = (
  dependencies: LearningV2CourseUnlockDependencies,
) => {
  const resolveDb = () => dependencies.db ?? admin.firestore();
  return {
    resolveBinding: dependencies.resolveAccountBinding ??
      ((authUid: string) => readProgressAccountBinding(resolveDb(), authUid)),
    readPublication: dependencies.readPublication ?? (async (sessionSetId: string) => {
      const snapshot = await resolveDb().collection("content_v2_required_session_sets")
        .doc(publishedRequiredSessionSetDocumentId(sessionSetId)).get();
      return snapshot.exists ? snapshot.data() : undefined;
    }),
    readActiveRelease: dependencies.readActiveRelease ??
      ((studyTarget: string, learnerSourceLocale: string) =>
        createFirestoreV2CourseCatalogReader(resolveDb())
          .read(studyTarget, learnerSourceLocale)),
    store: dependencies.store ?? createFirestoreLearningV2CourseUnlockStore(resolveDb()),
  };
};

export const createLearningV2CourseUnlockHandler = (
  dependencies: LearningV2CourseUnlockDependencies = {},
) => async (request: {
  readonly data: unknown;
  readonly auth?: { readonly uid?: unknown } | null;
}) => {
  const authUid = normalizeProgressAuthUid(request.auth?.uid);
  const value = detachedRecord(
    request.data,
    CREATE_KEYS,
    "learning_v2_course_unlock_request_invalid",
  );
  if (typeof value.sessionSetId !== "string" || !ID.test(value.sessionSetId) ||
    typeof value.learnerSourceLocale !== "string" ||
    !SOURCE_LOCALES.has(value.learnerSourceLocale)) {
    throw new HttpsError("invalid-argument", "learning_v2_course_unlock_request_invalid");
  }
  let intent;
  try { intent = parseServerCourseUnlockIntent(value.intent); }
  catch { throw new HttpsError("invalid-argument", "learning_v2_course_unlock_request_invalid"); }
  const resolved = productionDependencies(dependencies);
  const binding = await resolved.resolveBinding(authUid);
  const expectedScope = deriveLearningV2EconomicAccountScopeHash(binding.stableUid);
  if (binding.accountGeneration !== intent.accountGeneration ||
    intent.accountScopeHash !== expectedScope) {
    throw new HttpsError("failed-precondition", "account_generation_mismatch");
  }
  const [publicationValue, active] = await Promise.all([
    resolved.readPublication(value.sessionSetId),
    resolved.readActiveRelease(intent.studyTarget, value.learnerSourceLocale),
  ]);
  if (publicationValue === undefined)
    throw new HttpsError("not-found", "learning_v2_course_unlock_catalog_missing");
  let publication: PublishedRequiredSessionSetV2;
  let catalog;
  try {
    const parsed = parsePublishedRequiredSessionSet(publicationValue);
    if (parsed.schemaVersion !== "learning-v2-published-required-session-set.v2")
      throw new Error("publication_v1_ambiguous");
    publication = parsed;
    const localOrdinal = ((intent.requiredSessionOrdinal - 1) % 12) + 1;
    const expectedEpisodeOrdinal = Math.floor((intent.requiredSessionOrdinal - 1) / 12) + 1;
    if (publication.episodeOrdinal !== expectedEpisodeOrdinal ||
      publication.courseId !== intent.courseId ||
      publication.studyTarget !== intent.studyTarget ||
      publication.courseReleaseId !== active.activeReleaseId) {
      throw new Error("publication_mismatch");
    }
    catalog = createRequiredSessionCatalogFromSessionSetV2({
      courseId: publication.courseId,
      studyTarget: publication.studyTarget,
      courseReleaseId: publication.courseReleaseId,
      sessionSetId: publication.sessionSetId,
      sessionSetHash: publication.sessionSetHash,
      requiredSessionOrdinal: localOrdinal,
      sessionSet: publication.sessionSet,
    });
  } catch {
    throw new HttpsError("failed-precondition", "learning_v2_course_unlock_catalog_mismatch");
  }
  const materialization = materializeServerCourseUnlockReceiptCandidate({
    intent,
    targetSessionRef: {
      courseReleaseId: publication.courseReleaseId,
      sessionSetId: publication.sessionSetId,
      sessionSetHash: publication.sessionSetHash,
      catalogFingerprint: catalog.catalogFingerprint,
      sessionId: catalog.sessionId,
    },
  });
  const protectedReceipt = materializeProtectedLearningV2CourseUnlockReceipt(
    materialization,
  );
  const write = await resolved.store.putIfAbsent({
    stableUid: binding.stableUid,
    receipt: protectedReceipt,
    // зачем: цену считает сервер по лестнице 45/50/55/60/65 внутри
    // materializeServerCourseUnlockReceiptCandidate — клиент её не задаёт.
    // Отсюда трата уезжает в общий журнал звёзд (одна валюта на все разделы).
    chargeSubunits: materialization.receipt.authorizedRequest.chargeSubunits,
  });
  let stored: ProtectedLearningV2CourseUnlockReceiptV1;
  try { stored = parseProtectedLearningV2CourseUnlockReceipt(write.receipt); }
  catch { throw new HttpsError("data-loss", "learning_v2_course_unlock_indeterminate"); }
  if (stored.unlockFingerprint !== protectedReceipt.unlockFingerprint ||
    stored.accountScopeHash !== expectedScope) {
    throw new HttpsError("failed-precondition", "learning_v2_course_unlock_conflict");
  }
  return Object.freeze({
    kind: "authorized" as const,
    duplicate: write.status === "existing",
    request: materializeServerCourseUnlockRequest(materialization),
  });
};

export const createLearningV2CourseUnlockResolverHandler = (
  dependencies: LearningV2CourseUnlockDependencies = {},
) => async (request: {
  readonly data: unknown;
  readonly auth?: { readonly uid?: unknown } | null;
}) => {
  const authUid = normalizeProgressAuthUid(request.auth?.uid);
  const value = detachedRecord(
    request.data,
    RESOLVE_KEYS,
    "learning_v2_course_unlock_resolution_invalid",
  );
  if (value.schemaVersion !== "learning-v2-server-course-unlock-request.v1" ||
    typeof value.accountScopeHash !== "string" || !ACCOUNT.test(value.accountScopeHash) ||
    typeof value.operationId !== "string" || !ID.test(value.operationId) ||
    typeof value.courseId !== "string" || !ID.test(value.courseId) ||
    typeof value.studyTarget !== "string" || !ID.test(value.studyTarget) ||
    typeof value.unlockId !== "string" || !ID.test(value.unlockId) ||
    typeof value.unlockFingerprint !== "string" || !HASH.test(value.unlockFingerprint)) {
    throw new HttpsError("invalid-argument", "learning_v2_course_unlock_resolution_invalid");
  }
  const resolved = productionDependencies(dependencies);
  const binding = await resolved.resolveBinding(authUid);
  const expectedScope = deriveLearningV2EconomicAccountScopeHash(binding.stableUid);
  if (value.accountScopeHash !== expectedScope)
    throw new HttpsError("failed-precondition", "account_generation_mismatch");
  const storedValue = await resolved.store.read(binding.stableUid, value.unlockId);
  if (storedValue === undefined)
    throw new HttpsError("not-found", "learning_v2_course_unlock_missing");
  let stored: ProtectedLearningV2CourseUnlockReceiptV1;
  try { stored = parseProtectedLearningV2CourseUnlockReceipt(storedValue); }
  catch { throw new HttpsError("data-loss", "learning_v2_course_unlock_indeterminate"); }
  if (stored.accountScopeHash !== expectedScope ||
    stored.unlockId !== value.unlockId ||
    stored.unlockFingerprint !== value.unlockFingerprint) {
    throw new HttpsError("failed-precondition", "learning_v2_course_unlock_conflict");
  }
  let storedRequest;
  try {
    storedRequest = parseServerCourseUnlockReceiptRaw(stored.encoded)
      .receipt.authorizedRequest;
  } catch {
    throw new HttpsError("data-loss", "learning_v2_course_unlock_indeterminate");
  }
  if (storedRequest.operationId !== value.operationId ||
    storedRequest.courseId !== value.courseId ||
    storedRequest.studyTarget !== value.studyTarget) {
    throw new HttpsError("failed-precondition", "learning_v2_course_unlock_conflict");
  }
  return Object.freeze({
    schemaVersion: "learning-v2-server-course-unlock-resolution.v1" as const,
    unlockId: stored.unlockId,
    unlockFingerprint: stored.unlockFingerprint,
    encoded: stored.encoded,
  });
};

export const authorizeLearningV2CourseUnlock = onCall(
  HOT_CALLABLE_OPTIONS,
  async (request) => createLearningV2CourseUnlockHandler()(request),
);

export const resolveLearningV2CourseUnlockReceipt = onCall(
  HOT_CALLABLE_OPTIONS,
  async (request) => createLearningV2CourseUnlockResolverHandler()(request),
);
