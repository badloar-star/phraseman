import * as admin from "firebase-admin";
import type { EpisodeDraft } from "../../../modules/learning-v2/authoring/episode_draft";
import {
  validateSeasonImmutablePin,
  type SeasonDraft,
} from "../../../modules/learning-v2/authoring/season_draft";
import type { ModeTemplateArtifactBody } from "../../../modules/learning-v2/contracts/activity";
import {
  validateModeTemplateArtifactBody,
  validateModeTemplateLifecycleHead,
} from "../../../modules/learning-v2/contracts/validation";
import type { AuthoringTransactionStore } from "./authoring_transaction_repository";
import type { SeasonAuthoringTransactionStore } from "./season_authoring_transaction_repository";
import type { ModeTemplateLifecycleStore } from "./mode_template_transition_repository";
import type { ModeTemplateReceiptDocumentReader } from "./mode_template_transition_reader";
import type { EpisodeReviewReceipt, EpisodeReviewStore } from "./episode_review_repository";
import type { ContentGateIssueStore, ContentGateObjectWriter } from "./content_gate_repository";
import type { EpisodeValidationStore, EpisodeValidationReceipt } from "./episode_validation_repository";
import type { EpisodeVoiceStore, EpisodeVoiceReceipt } from "./episode_voice_repository";
import type { EpisodeLifecycleStore } from "./episode_lifecycle_transition_repository";
import type { ContentGateReceiptBody } from "../../../modules/learning-v2/contracts/content_studio";
import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import type {
  ImmutableEpisodeRevisionArtifact,
  ImmutableEpisodeRevisionResolver,
  ImmutableEpisodeRevisionReadContext,
  EpisodeRevisionRecord,
  EpisodeLifecycleHead,
} from "./episode_revision_resolver";
import {
  episodeRevisionObjectPath,
  validateEpisodeRevisionRecordEnvelope,
  validateEpisodeRevisionRecordOnly,
  validateEpisodeRevisionArtifactBody,
  validateEpisodeLifecycleHead,
} from "./episode_revision_resolver";
import { readImmutableCanonicalObject } from "./immutable_object_reader";
import { decisionRegistryObjectPath } from "../../../modules/learning-v2/policies/decision_registry";
import type { DecisionRegistryResolver } from "./season_authoring_transaction_repository";
import {
  validateDecisionRegistry,
  validateDecisionRegistryRecord,
} from "../../../modules/learning-v2/policies/decision_registry";
import { sha256Utf8 } from "../../../modules/learning-v2/policies/decision_registry";
import { canonicalJsonV1, hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { resolveImmutableSeasonRevision, createStorageSeasonRevisionObjectReader } from "./season_revision_resolver";
import { seasonEpisodePinIndexDocumentPath } from "./season_pin_index_paths";
import { validateSeasonPinIndexEntry } from "./season_pin_index_repository";
import { validateSeasonLifecycleHead, type SeasonRevisionEnvelope } from "../../../modules/learning-v2/authoring/season_revision";
import { validateSeasonLifecycleOperationEnvelope, type SeasonLifecycleTransitionStore } from "./season_lifecycle_transition_repository";
import type { SeasonApprovalReceipt } from "../../../modules/learning-v2/authoring/season_approval_receipt";

export const episodeDraftDocumentPath = (draftId: string): string =>
  `content_episode_drafts/${draftId}`;
export const seasonDraftDocumentPath = (draftId: string): string =>
  `content_season_drafts/${draftId}`;
export const episodeRevisionDocumentPath = (
  draftId: string,
  revision: number,
): string => `content_episode_revisions/${draftId}__r${revision}`;

export const modeTemplateVersionDocumentPath = (
  templateId: string,
  version: number,
): string => `content_mode_template_versions/${templateId}__v${version}`;
export const modeTemplateLifecycleDocumentPath = (
  templateId: string,
  version: number,
): string => `content_mode_template_lifecycle/${templateId}__v${version}`;
export const modeTemplateLifecycleAuditDocumentPath = (
  templateId: string,
  version: number,
  lifecycleRevision: number,
): string =>
  `content_mode_template_lifecycle_audit/${templateId}__v${version}__r${lifecycleRevision}`;
export const modeTemplateLifecycleOperationDocumentPath = (
  operationId: string,
): string => `content_mode_template_lifecycle_operations/${operationId}`;
export const episodeReviewReceiptDocumentPath = (episodeId: string, revision: number, contentHash: string): string =>
  `content_studio_review_receipts/${episodeId}__r${revision}__${contentHash}`;
export const episodeReviewOperationDocumentPath = (operationId: string): string =>
  `content_studio_episode_review_operations/${operationId}`;
export const contentGateOperationDocumentPath = (operationId: string): string =>
  `content_studio_gate_operations/${operationId}`;
export const episodeLifecycleDocumentPath = (ref: Pick<ApprovedEpisodeRevision, "draftId" | "revision">): string =>
  `content_episode_lifecycle/${ref.draftId}__r${ref.revision}`;
export const episodeLifecycleAuditDocumentPath = (ref: Pick<ApprovedEpisodeRevision, "draftId" | "revision">, lifecycleRevision: number): string =>
  `content_episode_lifecycle_audit/${ref.draftId}__r${ref.revision}__lr${lifecycleRevision}`;
export const episodeLifecycleOperationDocumentPath = (operationId: string): string =>
  `content_episode_lifecycle_operations/${operationId}`;
export const seasonLifecycleOperationDocumentPath = (operationId: string): string =>
  `content_season_lifecycle_operations/${operationId}`;
export const seasonPinCleanupAuditDocumentPath = (auditId: string): string =>
  `content_season_pin_cleanup_audits/${auditId}`;

export interface ImmutableModeTemplateObjectReader {
  read(
    objectPath: string,
    expectedHash: string,
    expectedGeneration: string,
    expectedByteSize: number,
  ): Promise<{
    readonly body: unknown;
    readonly contentHash: string;
    readonly objectGeneration: string;
    readonly byteSize: number;
  }>;
}

export function createFirestoreModeTemplateResolver(
  db: admin.firestore.Firestore,
  objectReader: ImmutableModeTemplateObjectReader = {
    read: async (objectPath, expectedHash, expectedGeneration, expectedByteSize) =>
      readImmutableCanonicalObject(admin.storage().bucket().file(objectPath), {
        expectedHash,
        expectedGeneration,
        expectedByteSize,
      }),
  },
  options: { readonly allowDeprecated?: boolean } = {},
): NonNullable<ImmutableEpisodeRevisionResolver["resolveModeTemplate"]> {
  return async (templateRef, context?: ImmutableEpisodeRevisionReadContext) => {
    if (
      typeof templateRef.templateId !== "string" ||
      !Number.isSafeInteger(templateRef.version) ||
      typeof templateRef.contentHash !== "string"
    )
      return undefined;
    const versionPath = modeTemplateVersionDocumentPath(templateRef.templateId, Number(templateRef.version));
    const snap = context
      ? await context.get(versionPath)
      : await db.doc(versionPath).get();
    if (!snap.exists) return undefined;
    const lifecyclePath = modeTemplateLifecycleDocumentPath(templateRef.templateId, Number(templateRef.version));
    const lifecycleSnap = context
      ? await context.get(lifecyclePath)
      : await db.doc(lifecyclePath).get();
    if (!lifecycleSnap.exists) return undefined;
    const record = snap.data() as Record<string, unknown>;
    const object = record.object as Record<string, unknown>;
    const recordKeys = Object.keys(record).sort();
    const objectKeys = object && typeof object === "object" ? Object.keys(object).sort() : [];
    const provenance = record.provenance as Record<string, unknown>;
    const provenanceKeys =
      provenance && typeof provenance === "object" ? Object.keys(provenance).sort() : [];
    if (
      recordKeys.join("|") !== "contentHash|createdAt|object|provenance|schemaVersion|templateId|version" ||
      objectKeys.join("|") !== "byteSize|contentHash|objectGeneration|objectPath" ||
      provenanceKeys.some(
        (key) => !["createdAt", "createdBy", "basedOn", "generator"].includes(key),
      ) ||
      !["createdAt", "createdBy"].every((key) =>
        Object.prototype.hasOwnProperty.call(provenance ?? {}, key),
      ) ||
      record.schemaVersion !== "v2-mode-template-record.v1" ||
      record.templateId !== templateRef.templateId ||
      record.version !== templateRef.version ||
      record.contentHash !== templateRef.contentHash ||
      !object ||
      object.objectPath !==
        `content-studio/mode-templates/${sha256Utf8(templateRef.templateId)}/v${templateRef.version}/${templateRef.contentHash}.json` ||
      object.contentHash !== templateRef.contentHash ||
      typeof object.objectGeneration !== "string" ||
      typeof object.byteSize !== "number" ||
      !Number.isSafeInteger(object.byteSize) ||
      object.byteSize < 1 ||
      typeof record.createdAt !== "string" ||
      record.createdAt.length === 0 ||
      !provenance ||
      typeof provenance.createdBy !== "string" ||
      provenance.createdBy.length === 0 ||
      typeof provenance.createdAt !== "string" ||
      provenance.createdAt.length === 0
    )
      return undefined;
    const basedOn = provenance.basedOn as Record<string, unknown> | undefined;
    const generator = provenance.generator as Record<string, unknown> | undefined;
    if (
      (basedOn !== undefined &&
        (!basedOn ||
          typeof basedOn !== "object" ||
          Array.isArray(basedOn) ||
          Object.keys(basedOn).sort().join("|") !== "contentHash|entityId|entityType|versionOrRevision" ||
          typeof basedOn.entityType !== "string" ||
          typeof basedOn.entityId !== "string" ||
          !Number.isSafeInteger(basedOn.versionOrRevision) ||
          typeof basedOn.contentHash !== "string" ||
          !/^[a-f0-9]{64}$/.test(basedOn.contentHash))) ||
      (generator !== undefined &&
        (!generator ||
          typeof generator !== "object" ||
          Array.isArray(generator) ||
          Object.keys(generator).sort().join("|") !==
          "artifactId|promptVersion|schemaVersion|stageId" ||
          typeof generator.stageId !== "string" ||
          typeof generator.artifactId !== "string" ||
          typeof generator.promptVersion !== "string" ||
          !Number.isSafeInteger(generator.schemaVersion)))
    )
      return undefined;
    const lifecycle = lifecycleSnap.data() as Record<string, unknown>;
    const lifecycleKeys = Object.keys(lifecycle ?? {}).sort();
    const replacementRef = lifecycle?.replacementRef as Record<string, unknown> | undefined;
    const replacementKeys =
      replacementRef && typeof replacementRef === "object"
        ? Object.keys(replacementRef).sort()
        : [];
    if (
      !lifecycle ||
      lifecycleKeys.some(
        (key) =>
          ![
            "schemaVersion",
            "templateId",
            "version",
            "contentHash",
            "status",
            "reason",
            "replacementRef",
            "noReplacement",
            "changedBy",
            "changedAt",
            "lifecycleRevision",
          ].includes(key),
      ) ||
      ![
        "schemaVersion",
        "templateId",
        "version",
        "contentHash",
        "status",
        "reason",
        "changedBy",
        "changedAt",
        "lifecycleRevision",
      ].every((key) => Object.prototype.hasOwnProperty.call(lifecycle, key)) ||
      (Object.prototype.hasOwnProperty.call(lifecycle, "replacementRef") &&
        (replacementKeys.join("|") !== "contentHash|templateId|version" ||
          typeof replacementRef?.templateId !== "string" ||
          replacementRef.templateId.length === 0 ||
          !Number.isSafeInteger(replacementRef?.version) ||
          Number(replacementRef.version) < 1 ||
          typeof replacementRef?.contentHash !== "string" ||
          !/^[a-f0-9]{64}$/.test(String(replacementRef.contentHash)))) ||
      (Object.prototype.hasOwnProperty.call(lifecycle, "noReplacement") &&
        typeof lifecycle.noReplacement !== "boolean") ||
      lifecycle.schemaVersion !== "v2-mode-template-lifecycle.v1" ||
      lifecycle.templateId !== templateRef.templateId ||
      lifecycle.version !== templateRef.version ||
      lifecycle.contentHash !== templateRef.contentHash ||
      !["published", ...(options.allowDeprecated ? ["deprecated"] : [])].includes(String(lifecycle.status)) ||
      typeof lifecycle.reason !== "string" ||
      lifecycle.reason.length === 0 ||
      typeof lifecycle.changedBy !== "string" ||
      lifecycle.changedBy.length === 0 ||
      typeof lifecycle.changedAt !== "string" ||
      lifecycle.changedAt.length === 0 ||
      typeof lifecycle.lifecycleRevision !== "number" ||
      !Number.isSafeInteger(lifecycle.lifecycleRevision) ||
      lifecycle.lifecycleRevision < 1
    )
      return undefined;
    const hasReplacement = Object.prototype.hasOwnProperty.call(lifecycle, "replacementRef");
    const hasNoReplacement = Object.prototype.hasOwnProperty.call(lifecycle, "noReplacement");
    const noReplacement = lifecycle.noReplacement === true;
    if (
      lifecycle.status === "deprecated" &&
      hasReplacement === hasNoReplacement
    )
      return undefined;
    if (
      hasReplacement &&
      replacementRef?.templateId === templateRef.templateId &&
      replacementRef.version === templateRef.version &&
      replacementRef.contentHash === templateRef.contentHash
    )
      return undefined;
    if (lifecycle.status === "published" && (hasReplacement || hasNoReplacement))
      return undefined;
    if (!validateModeTemplateLifecycleHead(lifecycle).ok) return undefined;
    const stored = await objectReader.read(
      String(object.objectPath),
      templateRef.contentHash,
      String(object.objectGeneration),
      Number(object.byteSize),
    );
    if (
      stored.contentHash !== templateRef.contentHash ||
      stored.objectGeneration !== object.objectGeneration ||
      stored.byteSize !== object.byteSize
    )
      return undefined;
    const body = stored.body as ModeTemplateArtifactBody;
    if (
      !body ||
      body.schemaVersion !== "v2-mode-template-body.v1" ||
      body.templateId !== templateRef.templateId ||
      body.version !== templateRef.version ||
      body.kernel === undefined ||
      !body.authoring ||
      Object.keys(body.authoring).some(
        (key) =>
          ![
            "editableFieldPaths",
            "requiredFieldPaths",
            "defaultValues",
            "allowedOverridePaths",
          ].includes(key),
      ) ||
      ![
        "editableFieldPaths",
        "requiredFieldPaths",
        "defaultValues",
        "allowedOverridePaths",
      ].every((key) => Object.prototype.hasOwnProperty.call(body.authoring, key)) ||
      !Array.isArray(body.authoring.editableFieldPaths) ||
      !Array.isArray(body.authoring.requiredFieldPaths) ||
      !Array.isArray(body.authoring.allowedOverridePaths) ||
      body.authoring.editableFieldPaths.some((path) => typeof path !== "string") ||
      body.authoring.requiredFieldPaths.some((path) => typeof path !== "string") ||
      body.authoring.allowedOverridePaths.some((path) => typeof path !== "string")
    )
      return undefined;
    if (!validateModeTemplateArtifactBody(body).ok) return undefined;
    return {
      templateRef: {
        templateId: templateRef.templateId,
        version: templateRef.version,
        contentHash: templateRef.contentHash,
      },
      allowedOverridePaths: body.authoring.allowedOverridePaths,
    };
  };
}
export const decisionRegistryDocumentPath = (
  id: string,
  version: number,
): string => `content_decision_registries/${id}__v${version}`;

export interface ImmutableEpisodeObjectReader {
  read(
    path: string,
    expectedHash: string,
    expectedGeneration: string,
    expectedByteSize: number,
  ): Promise<{
    body: unknown;
    contentHash: string;
    objectGeneration: string;
    byteSize: number;
  }>;
}

export function createFirestoreEpisodeDraftStore(
  db: admin.firestore.Firestore,
): AuthoringTransactionStore {
  return {
    runTransaction: (work) =>
      db.runTransaction(async (transaction) =>
        work(createEpisodeTransactionStore(db, transaction)),
      ),
    read: async (id) => {
      const snap = await db.doc(episodeDraftDocumentPath(id)).get();
      return snap.exists
        ? (snap.data() as { ownerId: string; draft: EpisodeDraft })
        : undefined;
    },
    compareAndSet: async () => {
      throw new Error("authoring_transaction_required");
    },
    createIfAbsent: async () => {
      throw new Error("authoring_transaction_required");
    },
  };
}

export interface ImmutableDecisionRegistryObjectReader {
  read(
    path: string,
    expectedHash: string,
    expectedGeneration: string,
    expectedByteSize: number,
  ): Promise<{
    body: unknown;
    contentHash: string;
    objectGeneration: string;
    byteSize: number;
  }>;
}

function createEpisodeTransactionStore(
  db: admin.firestore.Firestore,
  transaction: admin.firestore.Transaction,
): AuthoringTransactionStore {
  return {
    runTransaction: async (work) =>
      work(createEpisodeTransactionStore(db, transaction)),
    read: async (id) => {
      const snap = await transaction.get(db.doc(episodeDraftDocumentPath(id)));
      return snap.exists
        ? (snap.data() as { ownerId: string; draft: EpisodeDraft })
        : undefined;
    },
    compareAndSet: async (id, expectedRevision, expectedFingerprint, value) => {
      const ref = db.doc(episodeDraftDocumentPath(id));
      const snap = await transaction.get(ref);
      const current = snap.data() as { draft?: EpisodeDraft } | undefined;
      if (
        !current?.draft ||
        current.draft.record.revision !== expectedRevision ||
        current.draft.record.fingerprint !== expectedFingerprint
      )
        throw new Error("authoring_revision_stale");
      transaction.set(ref, {
        ...value,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
    createIfAbsent: async (id, value) => {
      const ref = db.doc(episodeDraftDocumentPath(id));
      const snap = await transaction.get(ref);
      if (snap.exists) throw new Error("authoring_create_conflict");
      transaction.create(ref, {
        ...value,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
  };
}

export function createFirestoreSeasonDraftStore(
  db: admin.firestore.Firestore,
): SeasonAuthoringTransactionStore {
  return {
    runTransaction: (work) =>
      db.runTransaction(async (transaction) =>
        work(createSeasonTransactionStore(db, transaction)),
      ),
    read: async (id) => {
      const snap = await db.doc(seasonDraftDocumentPath(id)).get();
      return snap.exists
        ? (snap.data() as { ownerId: string; draft: SeasonDraft })
        : undefined;
    },
    compareAndSet: async () => {
      throw new Error("authoring_transaction_required");
    },
    createIfAbsent: async () => {
      throw new Error("authoring_transaction_required");
    },
  };
}

function createSeasonTransactionStore(
  db: admin.firestore.Firestore,
  transaction: admin.firestore.Transaction,
): SeasonAuthoringTransactionStore {
  return {
    runTransaction: async (work) =>
      work(createSeasonTransactionStore(db, transaction)),
    episodeRevisionReadContext: {
      get: (path) => transaction.get(db.doc(path)),
    },
    decisionRegistryReadContext: {
      get: (path) => transaction.get(db.doc(path)),
    },
    read: async (id) => {
      const snap = await transaction.get(db.doc(seasonDraftDocumentPath(id)));
      return snap.exists
        ? (snap.data() as { ownerId: string; draft: SeasonDraft })
        : undefined;
    },
    compareAndSet: async (id, expectedRevision, expectedFingerprint, value) => {
      const ref = db.doc(seasonDraftDocumentPath(id));
      const snap = await transaction.get(ref);
      const current = snap.data() as { draft?: SeasonDraft } | undefined;
      if (
        !current?.draft ||
        current.draft.record.revision !== expectedRevision ||
        current.draft.record.fingerprint !== expectedFingerprint
      )
        throw new Error("authoring_revision_stale");
      transaction.set(ref, {
        ...value,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
    createIfAbsent: async (id, value) => {
      const ref = db.doc(seasonDraftDocumentPath(id));
      const snap = await transaction.get(ref);
      if (snap.exists) throw new Error("authoring_create_conflict");
      transaction.create(ref, {
        ...value,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
  };
}

export function createFirestoreEpisodeRevisionResolver(
  db: admin.firestore.Firestore,
  objectReader: ImmutableEpisodeObjectReader = {
    read: async (path, expectedHash, expectedGeneration, expectedByteSize) => {
      return readImmutableCanonicalObject(admin.storage().bucket().file(path), {
        expectedHash,
        expectedGeneration,
        expectedByteSize,
      });
    },
  },
  resolveModeTemplate?: ImmutableEpisodeRevisionResolver["resolveModeTemplate"],
): ImmutableEpisodeRevisionResolver {
  const resolveArtifact = async (ref: ApprovedEpisodeRevision, context?: ImmutableEpisodeRevisionReadContext): Promise<ImmutableEpisodeRevisionArtifact | undefined> => {
    const snap = context
      ? await context.get(episodeRevisionDocumentPath(ref.draftId, ref.revision))
      : await db.doc(episodeRevisionDocumentPath(ref.draftId, ref.revision)).get();
    if (!snap.exists) return undefined;
    const envelope = snap.data() as unknown;
    let record: EpisodeRevisionRecord;
    let lifecycle: EpisodeLifecycleHead;
    if (validateEpisodeRevisionRecordEnvelope(envelope)) {
      record = envelope.record;
      lifecycle = envelope.lifecycle;
    } else if (validateEpisodeRevisionRecordOnly(envelope)) {
      const lifecyclePath = `content_episode_lifecycle/${ref.draftId}__r${ref.revision}`;
      const lifecycleSnap = context ? await context.get(lifecyclePath) : await db.doc(lifecyclePath).get();
      const lifecycleValue = lifecycleSnap.data() as Record<string, unknown>;
      if (!lifecycleSnap.exists || !validateEpisodeLifecycleHead(lifecycleValue?.lifecycle)) throw new Error("season_episode_lifecycle_missing_or_invalid");
      record = envelope.record;
      lifecycle = lifecycleValue.lifecycle as EpisodeLifecycleHead;
    } else throw new Error("season_episode_revision_record_invalid");
    const expectedPath = episodeRevisionObjectPath(ref.draftId, ref.revision, ref.contentHash);
    if (record.object.objectPath !== expectedPath) throw new Error("season_episode_object_path_invalid");
    const metadata = await objectReader.read(expectedPath, ref.contentHash, record.object.objectGeneration, record.object.byteSize);
    if (metadata.contentHash !== ref.contentHash || metadata.objectGeneration !== record.object.objectGeneration || metadata.byteSize !== record.object.byteSize || metadata.body === undefined) throw new Error("season_episode_object_generation_invalid");
    return { draftId: record.draftId, episodeId: record.episodeId, revision: record.revision, revisionFingerprint: record.revisionFingerprint, contentHash: record.contentHash, ordinal: ref.ordinal, chapterId: ref.chapterId, approvalStatus: lifecycle.status === "approved" ? "approved" : "draft", body: metadata.body, bodyHash: record.contentHash, objectPath: record.object.objectPath, objectGeneration: record.object.objectGeneration, record, lifecycle };
  };
  return {
    validateBody: validateEpisodeRevisionArtifactBody,
    resolveModeTemplate,
    resolve: resolveArtifact,
    resolveForAuthoring: resolveArtifact,
  };
}

export function createFirestoreDecisionRegistryResolver(
  db: admin.firestore.Firestore,
  objectReader: ImmutableDecisionRegistryObjectReader = {
    read: async (path, expectedHash, expectedGeneration, expectedByteSize) =>
      readImmutableCanonicalObject(admin.storage().bucket().file(path), {
        expectedHash,
        expectedGeneration,
        expectedByteSize,
      }),
  },
): DecisionRegistryResolver {
  return {
    resolve: async (ref, context) => {
      const snap = context
        ? await context.get(decisionRegistryDocumentPath(ref.id, ref.version))
        : await db.doc(decisionRegistryDocumentPath(ref.id, ref.version)).get();
      if (!snap.exists) return undefined;
      const result = validateDecisionRegistryRecord(snap.data());
      if (!result.ok) throw new Error("season_decision_registry_invalid");
      if (
        result.value.ref.id !== ref.id ||
        result.value.ref.version !== ref.version ||
        result.value.ref.contentHash !== ref.contentHash
      )
        throw new Error("season_decision_registry_ref_mismatch");
      const object = result.value.object;
      if (
        object.objectPath !==
        decisionRegistryObjectPath(ref.id, ref.version, ref.contentHash)
      )
        throw new Error("season_decision_registry_object_path_invalid");
      const stored = await objectReader.read(
        object.objectPath,
        ref.contentHash,
        object.objectGeneration,
        object.byteSize,
      );
      if (
        stored.contentHash !== object.contentHash ||
        stored.objectGeneration !== object.objectGeneration ||
        stored.byteSize !== object.byteSize
      )
        throw new Error("season_decision_registry_object_metadata_invalid");
      const storedResult = validateDecisionRegistry({
        body: stored.body,
        record: result.value,
      });
      if (!storedResult.ok)
        throw new Error("season_decision_registry_object_invalid");
      return {
        ...storedResult.value.record,
        body: storedResult.value.body,
      };
    },
  };
}

/** Firestore transaction adapter for the guarded ModeTemplate lifecycle repository. */
export function createFirestoreModeTemplateLifecycleStore(
  db: admin.firestore.Firestore,
): ModeTemplateLifecycleStore {
  const build = (
    transaction?: admin.firestore.Transaction,
  ): ModeTemplateLifecycleStore => {
    const get = async (path: string) =>
      transaction ? transaction.get(db.doc(path)) : (await db.doc(path).get());
    const receiptReader: ModeTemplateReceiptDocumentReader = {
      get: async (collection, id) => {
        const snapshot = await get(`${collection}/${id}`);
        return snapshot.exists ? snapshot.data() : undefined;
      },
    };
    return {
      receiptReader,
      runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
      readLifecycle: async (templateId, version) => {
        const snapshot = await get(modeTemplateLifecycleDocumentPath(templateId, version));
        if (!snapshot.exists) return undefined;
        const result = validateModeTemplateLifecycleHead(snapshot.data());
        if (!result.ok || result.value.templateId !== templateId || result.value.version !== version)
          return undefined;
        return result.value;
      },
      readTemplateVersion: async (templateId, version) => {
        const snapshot = await get(modeTemplateVersionDocumentPath(templateId, version));
        if (!snapshot.exists) return undefined;
        const data = snapshot.data() as Record<string, unknown>;
        const object = data.object as Record<string, unknown> | undefined;
        const provenance = data.provenance as Record<string, unknown> | undefined;
        const expectedPath = `content-studio/mode-templates/${sha256Utf8(templateId)}/v${version}/${String(data.contentHash)}.json`;
        if (
          Object.keys(data).sort().join("|") !== "contentHash|createdAt|object|provenance|schemaVersion|templateId|version" ||
          data.schemaVersion !== "v2-mode-template-record.v1" ||
          data.templateId !== templateId ||
          data.version !== version ||
          typeof data.contentHash !== "string" ||
          !/^[a-f0-9]{64}$/.test(data.contentHash) ||
          !object ||
          Object.keys(object).sort().join("|") !== "byteSize|contentHash|objectGeneration|objectPath" ||
          object.objectPath !== expectedPath ||
          object.contentHash !== data.contentHash ||
          typeof object.objectGeneration !== "string" ||
          object.objectGeneration.length === 0 ||
          !Number.isSafeInteger(object.byteSize) ||
          Number(object.byteSize) < 1 ||
          !provenance ||
          typeof provenance.createdBy !== "string" ||
          provenance.createdBy.length === 0 ||
          typeof provenance.createdAt !== "string" ||
          provenance.createdAt.length === 0 ||
          typeof data.createdAt !== "string" ||
          data.createdAt.length === 0
        )
          return undefined;
        return {
          templateId: data.templateId,
          version: Number(data.version),
          contentHash: data.contentHash,
        };
      },
      hasUnsealedEpisodeDraftForTemplate: async (templateId, version, contentHash) => {
        const snapshots = transaction
          ? await transaction.get(db.collection("content_episode_drafts"))
          : await db.collection("content_episode_drafts").get();
        return snapshots.docs.some((snapshot) => {
          const value = snapshot.data() as Record<string, unknown>;
          const record = value.record as Record<string, unknown> | undefined;
          if (record?.status !== "draft") return false;
          const body = value.body as Record<string, unknown> | undefined;
          const activities = Array.isArray(body?.activities) ? body.activities : [];
          return activities.some((activity) => {
            if (!activity || typeof activity !== "object") return false;
            const templateRef = (activity as Record<string, unknown>).templateRef;
            return !!templateRef && typeof templateRef === "object" &&
              (templateRef as Record<string, unknown>).templateId === templateId &&
              (templateRef as Record<string, unknown>).version === version &&
              (templateRef as Record<string, unknown>).contentHash === contentHash;
          });
        });
      },
      compareAndSetLifecycle: async (templateId, version, expectedRevision, next) => {
        if (!transaction) throw new Error("mode_template_transaction_required");
        const ref = db.doc(modeTemplateLifecycleDocumentPath(templateId, version));
        transaction.update(ref, next as unknown as Record<string, unknown>);
        void expectedRevision;
      },
      appendAudit: async (event) => {
        if (!transaction) throw new Error("mode_template_transaction_required");
        const ref = db.doc(
          modeTemplateLifecycleAuditDocumentPath(
            event.templateId,
            event.version,
            event.lifecycleRevision,
          ),
        );
        transaction.create(ref, {
          schemaVersion: "v2-mode-template-lifecycle-audit.v1",
          ...event,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      },
      readOperation: async (operationId) => {
        const snapshot = await get(modeTemplateLifecycleOperationDocumentPath(operationId));
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        if (!value || typeof value.requestFingerprint !== "string" || !value.lifecycle)
          throw new Error("mode_template_idempotency_operation_invalid");
        const lifecycleResult = validateModeTemplateLifecycleHead(value.lifecycle);
        if (!lifecycleResult.ok)
          throw new Error("mode_template_idempotency_operation_invalid");
        return {
          requestFingerprint: value.requestFingerprint,
          lifecycle: lifecycleResult.value,
        };
      },
      createOperation: async (operationId, value) => {
        if (!transaction) throw new Error("mode_template_transaction_required");
        transaction.create(db.doc(modeTemplateLifecycleOperationDocumentPath(operationId)), value as never);
      },
    };
  };
  return build();
}

/** Firestore transaction adapter for the server-owned Episode lifecycle transition repository. */
export function createFirestoreEpisodeLifecycleStore(
  db: admin.firestore.Firestore,
  options: { readonly seasonObjectReader?: Parameters<typeof resolveImmutableSeasonRevision>[0]["objectReader"] } = {},
): EpisodeLifecycleStore {
  const seasonObjectReader = options.seasonObjectReader ?? createStorageSeasonRevisionObjectReader(admin.storage().bucket() as never);
  const build = (transaction?: admin.firestore.Transaction): EpisodeLifecycleStore => {
    const get = async (path: string) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
    const receiptReader: ModeTemplateReceiptDocumentReader = {
      get: async (collection, id) => { const snapshot = await get(`${collection}/${id}`); return snapshot.exists ? snapshot.data() : undefined; },
    };
    return {
      receiptReader,
      readReviewActor: async (receiptId) => {
        const snapshot = await get(`content_studio_review_receipts/${receiptId}`);
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        return typeof value.reviewerId === "string" ? value.reviewerId : undefined;
      },
      runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
      readLifecycle: async (ref) => {
        const snapshot = await get(episodeLifecycleDocumentPath(ref));
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        return validateEpisodeLifecycleHead(value.lifecycle) ? value.lifecycle : undefined;
      },
      createLifecycle: async (ref, lifecycle) => {
        if (!transaction) throw new Error("episode_lifecycle_transaction_required");
        transaction.create(db.doc(episodeLifecycleDocumentPath(ref)), { lifecycle } as Record<string, unknown>);
      },
      compareAndSetLifecycle: async (ref, expectedRevision, next) => {
        if (!transaction) throw new Error("episode_lifecycle_transaction_required");
        const doc = db.doc(episodeLifecycleDocumentPath(ref));
        const snapshot = await transaction.get(doc);
        const value = snapshot.exists ? snapshot.data() as Record<string, unknown> : undefined;
        const current = value?.lifecycle;
        if (!snapshot.exists || !validateEpisodeLifecycleHead(current) || current.lifecycleRevision !== expectedRevision) {
          throw new Error("episode_lifecycle_stale");
        }
        transaction.update(doc, { lifecycle: next } as Record<string, unknown>);
      },
      appendAudit: async (event) => {
        if (!transaction) throw new Error("episode_lifecycle_transaction_required");
        transaction.create(db.doc(episodeLifecycleAuditDocumentPath(event.ref, event.lifecycleRevision)), { schemaVersion: "episode-lifecycle-audit.v1", ...event, createdAt: admin.firestore.FieldValue.serverTimestamp() } as Record<string, unknown>);
      },
      readOperation: async (operationId) => {
        const snapshot = await get(episodeLifecycleOperationDocumentPath(operationId));
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        const keys = Object.keys(value).sort();
        if (keys.join("|") !== "lifecycle|requestFingerprint" || typeof value.requestFingerprint !== "string" || !validateEpisodeLifecycleHead(value.lifecycle)) throw new Error("episode_lifecycle_operation_invalid");
        return { requestFingerprint: value.requestFingerprint, lifecycle: value.lifecycle };
      },
      createOperation: async (operationId, value) => {
        if (!transaction) throw new Error("episode_lifecycle_transaction_required");
        transaction.create(db.doc(episodeLifecycleOperationDocumentPath(operationId)), value as unknown as Record<string, unknown>);
      },
      hasActiveSeasonPin: async (ref) => {
        const indexedSnapshot = await get(seasonEpisodePinIndexDocumentPath(ref));
        if (indexedSnapshot.exists) {
          const indexed = indexedSnapshot.data() as Record<string, unknown>;
          if (!validateSeasonPinIndexEntry(indexed, ref)) return true;
          const seasonRevisionId = typeof indexed.seasonRevisionId === "string" ? indexed.seasonRevisionId : "";
          if (!seasonRevisionId) return true;
          try {
            const resolved: SeasonRevisionEnvelope = await resolveImmutableSeasonRevision({
              revisionPath: `content_season_revisions/${seasonRevisionId}`,
              lifecyclePath: `content_season_lifecycle/${seasonRevisionId}`,
              objectReader: seasonObjectReader,
              documentReader: { read: async (path) => { const document = await get(path); return { exists: document.exists, data: () => document.data() }; } },
            });
            if (resolved.record.revisionFingerprint !== indexed.seasonRevisionFingerprint) return true;
            if (resolved.lifecycle.status !== "approved") return false;
            const refs: unknown[] = Array.isArray((resolved.body as Record<string, unknown>).episodeRevisionRefs) ? (resolved.body as Record<string, unknown>).episodeRevisionRefs as unknown[] : [];
            return refs.some((item: unknown) => item && typeof item === "object" && (item as Record<string, unknown>).episodeId === ref.episodeId && (item as Record<string, unknown>).revision === ref.revision && (item as Record<string, unknown>).revisionFingerprint === ref.revisionFingerprint && (item as Record<string, unknown>).contentHash === ref.contentHash);
          } catch {
            return true;
          }
        }
        const snapshots = transaction ? await transaction.get(db.collection("content_season_revisions")) : await db.collection("content_season_revisions").get();
        for (const snapshot of snapshots.docs) {
          const value = snapshot.data() as Record<string, unknown>;
          if (!Object.prototype.hasOwnProperty.call(value, "body") && value.record) {
            try {
              const resolved: SeasonRevisionEnvelope = await resolveImmutableSeasonRevision({
                revisionPath: `content_season_revisions/${snapshot.id}`,
                lifecyclePath: `content_season_lifecycle/${snapshot.id}`,
                objectReader: seasonObjectReader,
                documentReader: { read: async (path) => { const document = await get(path); return { exists: document.exists, data: () => document.data() }; } },
              });
              if (resolved.lifecycle.status !== "approved") continue;
              const refs: unknown[] = Array.isArray((resolved.body as Record<string, unknown>).episodeRevisionRefs) ? (resolved.body as Record<string, unknown>).episodeRevisionRefs as unknown[] : [];
              if (refs.some((item: unknown) => item && typeof item === "object" && (item as Record<string, unknown>).episodeId === ref.episodeId && (item as Record<string, unknown>).revision === ref.revision && (item as Record<string, unknown>).revisionFingerprint === ref.revisionFingerprint && (item as Record<string, unknown>).contentHash === ref.contentHash)) return true;
            } catch {
              // Fail closed for malformed/missing canonical Season objects.
            }
            continue;
          }
          const body = value.body as Record<string, unknown> | undefined;
          const refs = Array.isArray(body?.episodeRevisionRefs) ? body.episodeRevisionRefs : [];
          const candidate = refs.some((item) => item && typeof item === "object" && (item as Record<string, unknown>).episodeId === ref.episodeId && (item as Record<string, unknown>).revision === ref.revision && (item as Record<string, unknown>).revisionFingerprint === ref.revisionFingerprint && (item as Record<string, unknown>).contentHash === ref.contentHash);
          if (!candidate) continue;
          const immutablePin = validateSeasonImmutablePin({ body, record: value.record });
          if (!immutablePin) continue;
          const lifecycleSnapshot = transaction ? await transaction.get(db.doc(`content_season_lifecycle/${snapshot.id}`)) : await db.doc(`content_season_lifecycle/${snapshot.id}`).get();
          const lifecycle = lifecycleSnapshot.exists ? lifecycleSnapshot.data() as Record<string, unknown> : undefined;
          const status = lifecycle?.status ?? (lifecycle?.lifecycle as Record<string, unknown> | undefined)?.status ?? (value.lifecycle as Record<string, unknown> | undefined)?.status ?? (value.record as Record<string, unknown> | undefined)?.status;
          if (["approved", "released"].includes(String(status))) return true;
        }
        return false;
      },
    };
  };
  return build();
}

/** Firestore transaction adapter for approved Season lifecycle and pin-index projection. */
export function createFirestoreSeasonLifecycleTransitionStore(
  db: admin.firestore.Firestore,
): SeasonLifecycleTransitionStore {
  const seasonObjectReader = createStorageSeasonRevisionObjectReader(admin.storage().bucket() as never);
  const build = (transaction?: admin.firestore.Transaction): SeasonLifecycleTransitionStore => {
    let observedLifecycleRevision: number | undefined;
    const get = async (path: string) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
    return {
      runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
      readLifecycle: async (seasonRevisionId) => {
        const snapshot = await get(`content_season_lifecycle/${seasonRevisionId}`);
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        if (!validateSeasonLifecycleHead(value)) throw new Error("season_lifecycle_head_invalid");
        observedLifecycleRevision = value.lifecycleRevision;
        return value;
      },
      compareAndSetLifecycle: async (seasonRevisionId, expectedRevision, next) => {
        if (!transaction) throw new Error("season_lifecycle_transaction_required");
        const doc = db.doc(`content_season_lifecycle/${seasonRevisionId}`);
        if (observedLifecycleRevision === undefined) throw new Error("season_lifecycle_cas_unobserved");
        if (observedLifecycleRevision !== expectedRevision || !validateSeasonLifecycleHead(next)) throw new Error("season_lifecycle_cas_mismatch");
        transaction.update(doc, next as unknown as Record<string, unknown>);
      },
      writePinIndex: async (_seasonRevisionId, entries) => {
        if (!transaction) throw new Error("season_lifecycle_transaction_required");
        for (const entry of entries) transaction.set(db.doc(entry.documentPath), entry as unknown as Record<string, unknown>);
      },
      clearPinIndex: async (seasonRevisionId) => {
        if (!transaction) throw new Error("season_lifecycle_transaction_required");
        const snapshots = await transaction.get(db.collection("content_season_episode_pins").where("seasonRevisionId", "==", seasonRevisionId));
        for (const snapshot of snapshots.docs) transaction.delete(snapshot.ref);
      },
      clearPinIndexForSeason: async (seasonId, keepSeasonRevisionId) => {
        if (!transaction) throw new Error("season_lifecycle_transaction_required");
        const snapshots = await transaction.get(db.collection("content_season_episode_pins"));
        const deletions: admin.firestore.DocumentReference[] = [];
        for (const snapshot of snapshots.docs) {
          const value = snapshot.data() as Record<string, unknown>;
          if (value.seasonRevisionId === keepSeasonRevisionId) continue;
          if (typeof value.seasonRevisionId !== "string") continue;
          const lifecycle = await transaction.get(db.doc(`content_season_lifecycle/${value.seasonRevisionId}`));
          const lifecycleValue = lifecycle.exists ? lifecycle.data() as Record<string, unknown> : undefined;
          if (lifecycleValue?.seasonId === seasonId) deletions.push(snapshot.ref);
        }
        for (const reference of deletions) transaction.delete(reference);
      },
      writePinCleanupAudit: async (entry) => {
        if (!transaction) throw new Error("season_lifecycle_transaction_required");
        transaction.create(db.doc(seasonPinCleanupAuditDocumentPath(entry.auditId)), { schemaVersion: "season-pin-cleanup-audit.v1", ...entry, createdAt: new Date().toISOString() });
      },
      writeApprovalReceipt: async (receipt: SeasonApprovalReceipt) => {
        if (!transaction) throw new Error("season_lifecycle_transaction_required");
        transaction.create(db.doc(`content_studio_season_approval_receipts/${receipt.receiptId}`), receipt as unknown as Record<string, unknown>);
      },
      readOperation: async (operationId) => {
        const snapshot = await get(seasonLifecycleOperationDocumentPath(operationId));
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        if (!validateSeasonLifecycleOperationEnvelope(value) || !validateSeasonLifecycleHead(value.lifecycle)) throw new Error("season_lifecycle_operation_invalid");
        return value as never;
      },
      createOperation: async (operationId, value) => {
        if (!transaction) throw new Error("season_lifecycle_transaction_required");
        transaction.create(db.doc(seasonLifecycleOperationDocumentPath(operationId)), value as unknown as Record<string, unknown>);
      },
      readRevision: async (seasonRevisionId) => resolveImmutableSeasonRevision({
        revisionPath: `content_season_revisions/${seasonRevisionId}`,
        lifecyclePath: `content_season_lifecycle/${seasonRevisionId}`,
        objectReader: seasonObjectReader,
        documentReader: { read: async (path) => { const snapshot = await get(path); return { exists: snapshot.exists, data: () => snapshot.data() }; } },
      }),
    };
  };
  return build();
}

/** Firestore adapter for the server-owned Episode semantic review receipt. */
export function createFirestoreEpisodeReviewStore(
  db: admin.firestore.Firestore,
  resolver: ImmutableEpisodeRevisionResolver,
): EpisodeReviewStore {
  const build = (transaction?: admin.firestore.Transaction): EpisodeReviewStore => {
    const get = async (path: string) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
    return {
      runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
      readArtifact: async (ref: ApprovedEpisodeRevision) => (resolver.resolveForAuthoring ?? resolver.resolve)(ref),
      readReceipt: async (receiptId) => {
        const snapshot = await get(`content_studio_review_receipts/${receiptId}`);
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        if (typeof value.receiptHash !== "string" || typeof value.reviewerId !== "string" || !value.subject || !["approved", "changes_requested"].includes(String(value.status)))
          throw new Error("episode_review_receipt_invalid");
        return value as unknown as EpisodeReviewReceipt;
      },
      writeReceipt: async (receiptId, receipt) => {
        if (!transaction) throw new Error("episode_review_transaction_required");
        transaction.create(db.doc(`content_studio_review_receipts/${receiptId}`), receipt as unknown as Record<string, unknown>);
      },
      readOperation: async (operationId) => {
        const snapshot = await get(episodeReviewOperationDocumentPath(operationId));
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        if (typeof value.requestFingerprint !== "string" || !value.receipt)
          throw new Error("episode_review_operation_invalid");
        return value as unknown as { requestFingerprint: string; receipt: EpisodeReviewReceipt };
      },
      createOperation: async (operationId, value) => {
        if (!transaction) throw new Error("episode_review_transaction_required");
        transaction.create(db.doc(episodeReviewOperationDocumentPath(operationId)), value as unknown as Record<string, unknown>);
      },
    };
  };
  return build();
}

export function createFirestoreContentGateIssueStore(db: admin.firestore.Firestore, objectWriter?: ContentGateObjectWriter): ContentGateIssueStore {
  const build = (transaction?: admin.firestore.Transaction): ContentGateIssueStore => {
    const get = async (path: string) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
    return {
      runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
      objectWriter: objectWriter ?? {
        write: async (path, body) => {
          const bytes = Buffer.from(canonicalJsonV1(body), "utf8");
          const file = admin.storage().bucket().file(path);
          await file.save(bytes, { resumable: false, metadata: { contentType: "application/json", metadata: { contentHash: hashCanonicalBody(body) } } });
          const [metadata] = await file.getMetadata();
          return { objectGeneration: String(metadata.generation ?? ""), byteSize: bytes.byteLength, contentHash: hashCanonicalBody(body) };
        },
      },
      receiptReader: {
        get: async (collection, id) => {
          const snapshot = await get(`${collection}/${id}`);
          return snapshot.exists ? snapshot.data() : undefined;
        },
      },
      writeGate: async (gateId, body, record) => {
        if (!transaction) throw new Error("content_gate_transaction_required");
        transaction.create(db.doc(`content_studio_gate_receipts/${gateId}`), { body, ...(record ? { record } : {}) } as unknown as Record<string, unknown>);
      },
      readOperation: async (operationId) => {
        const snapshot = await get(contentGateOperationDocumentPath(operationId));
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        if (typeof value.requestFingerprint !== "string" || !value.body)
          throw new Error("content_gate_operation_invalid");
        return value as never;
      },
      createOperation: async (operationId, value) => {
        if (!transaction) throw new Error("content_gate_transaction_required");
        transaction.create(db.doc(contentGateOperationDocumentPath(operationId)), value as unknown as Record<string, unknown>);
      },
    };
  };
  return build();
}

export function createFirestoreEpisodeValidationStore(
  db: admin.firestore.Firestore,
  resolver: ImmutableEpisodeRevisionResolver,
  options: { readonly receiptCollection?: string; readonly operationCollection?: string } = {},
): EpisodeValidationStore {
  const receiptCollection = options.receiptCollection ?? "content_studio_validation_receipts";
  const operationCollection = options.operationCollection ?? "content_studio_episode_validation_operations";
  const build = (transaction?: admin.firestore.Transaction): EpisodeValidationStore => {
    const get = async (path: string) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
    return {
      runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
      readArtifact: async (ref) => (resolver.resolveForAuthoring ?? resolver.resolve)(ref),
      writeReceipt: async (receiptId, receipt) => {
        if (!transaction) throw new Error("episode_validation_transaction_required");
        transaction.create(db.doc(`${receiptCollection}/${receiptId}`), receipt as unknown as Record<string, unknown>);
      },
      readOperation: async (operationId) => {
        const snapshot = await get(`${operationCollection}/${operationId}`);
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        if (typeof value.requestFingerprint !== "string" || !value.receipt)
          throw new Error("episode_validation_operation_invalid");
        return value as unknown as { requestFingerprint: string; receipt: EpisodeValidationReceipt };
      },
      createOperation: async (operationId, value) => {
        if (!transaction) throw new Error("episode_validation_transaction_required");
        transaction.create(db.doc(`${operationCollection}/${operationId}`), value as unknown as Record<string, unknown>);
      },
    };
  };
  return build();
}

export function createFirestoreEpisodeVoiceStore(
  db: admin.firestore.Firestore,
  resolver: ImmutableEpisodeRevisionResolver,
): EpisodeVoiceStore {
  const build = (transaction?: admin.firestore.Transaction): EpisodeVoiceStore => {
    const get = async (path: string) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
    return {
      runTransaction: async (work) => db.runTransaction(async (tx) => work(build(tx))),
      readArtifact: async (ref) => (resolver.resolveForAuthoring ?? resolver.resolve)(ref),
      writeReceipt: async (receiptId, receipt) => {
        if (!transaction) throw new Error("episode_voice_transaction_required");
        transaction.create(db.doc(`content_studio_voice_receipts/${receiptId}`), receipt as unknown as Record<string, unknown>);
      },
      readOperation: async (operationId) => {
        const snapshot = await get(`content_studio_episode_voice_operations/${operationId}`);
        if (!snapshot.exists) return undefined;
        const value = snapshot.data() as Record<string, unknown>;
        if (typeof value.requestFingerprint !== "string" || !value.receipt) throw new Error("episode_voice_operation_invalid");
        return value as unknown as { requestFingerprint: string; receipt: EpisodeVoiceReceipt };
      },
      createOperation: async (operationId, value) => {
        if (!transaction) throw new Error("episode_voice_transaction_required");
        transaction.create(db.doc(`content_studio_episode_voice_operations/${operationId}`), value as unknown as Record<string, unknown>);
      },
    };
  };
  return build();
}
