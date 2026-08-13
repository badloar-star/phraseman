import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ENFORCE_APP_CHECK } from "./callable_options";
import {
  requireContentDraftWriter,
  type ContentDraftWriter,
} from "./admin_content_studio_authoring";
import {
  buildV2AdminGenerationPlan,
  parseV2AdminGenerationRequest,
  type V2AdminGenerationPlan,
  type V2AdminGenerationRequest,
} from "./content_factory/v2_admin_generation_contract";
import { createFirestoreModeTemplateResolver } from "./content_studio/firestore_authoring_store";
import type { PublishedModeTemplateRef } from "../../modules/learning-v2/contracts/activity";
import { canonicalJsonV1 } from "../../modules/learning-v2/policies/decision_registry";
import {
  bridgeV2AdminGenerationRequestToCanonicalPlanResultV2,
  v2AdminCanonicalBridgeFingerprintV1,
  type V2AdminCanonicalGenerationBridgeInputV1,
} from "./content_factory/v2_admin_canonical_generation_bridge_v1";
import { V2_GENERATION_STAGE_COLLECTION_V2 } from "./content_factory/v2_generation_stage_repository_v2";
import {
  requireV2ConfiguredRootOwnerV1,
  type V2ConfiguredRootOwnerV1,
} from "./content_factory/v2_root_owner_identity_v1";

const callableOptions = {
  region: "us-central1",
  enforceAppCheck: ENFORCE_APP_CHECK,
} as const;
const JOBS = "content_v2_generation_jobs";
const STAGES = V2_GENERATION_STAGE_COLLECTION_V2;
const LOCALIZATIONS = "content_v2_generation_localizations";
const OPERATIONS = "content_v2_generation_operations";

export interface V2GenerationWriteResult {
  readonly ok: true;
  readonly jobId: string;
  readonly state: "queued";
  readonly requestFingerprint: string;
  readonly canonicalPlanFingerprint: string | null;
  readonly canonicalPlanRequestRaw: string | null;
  readonly canonicalV2Authority:
    | "none_draft_plan_only"
    | "none_missing_exact_speech_voice_and_registry_refs";
  readonly replayed: boolean;
}

export interface V2GenerationDependencies {
  readonly db: admin.firestore.Firestore;
  readonly resolveTemplate: (ref: PublishedModeTemplateRef) => Promise<unknown>;
  readonly now?: () => string;
  readonly canonicalBridge?: V2AdminCanonicalGenerationBridgeInputV1;
  readonly authenticateRootOwner?: (
    auth: Parameters<typeof requireV2ConfiguredRootOwnerV1>[0],
  ) => V2ConfiguredRootOwnerV1;
}

const V2_ADMIN_CANONICAL_GENERATION_COMMAND_SCHEMA_V2 =
  "v2-admin-canonical-generation-command.v2" as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function parseGenerationCommand(
  value: unknown,
  dependencyBridge?: V2AdminCanonicalGenerationBridgeInputV1,
): Readonly<{
  request: V2AdminGenerationRequest;
  canonicalBridge: V2AdminCanonicalGenerationBridgeInputV1 | undefined;
}> {
  if (
    isPlainRecord(value) &&
    value.schemaVersion === V2_ADMIN_CANONICAL_GENERATION_COMMAND_SCHEMA_V2
  ) {
    if (
      Object.keys(value).sort().join("|") !==
        "canonicalBridge|generationRequest|schemaVersion" ||
      !isPlainRecord(value.canonicalBridge)
    ) {
      throw new Error("v2_generation_canonical_command_invalid");
    }
    const request = parseV2AdminGenerationRequest(value.generationRequest);
    const canonicalBridge =
      value.canonicalBridge as unknown as V2AdminCanonicalGenerationBridgeInputV1;
    if (
      dependencyBridge &&
      canonicalJsonV1(dependencyBridge) !== canonicalJsonV1(canonicalBridge)
    ) {
      throw new Error("v2_generation_canonical_bridge_conflict");
    }
    return Object.freeze({ request, canonicalBridge });
  }
  return Object.freeze({
    request: parseV2AdminGenerationRequest(value),
    canonicalBridge: dependencyBridge,
  });
}

function exactRef(value: unknown): value is PublishedModeTemplateRef {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.templateId === "string" &&
    Number.isSafeInteger(item.version) &&
    typeof item.contentHash === "string" &&
    /^[a-f0-9]{64}$/.test(item.contentHash)
  );
}

/** Resolve every pinned template from the immutable published catalog.
 * A request must never silently follow "latest" or a deprecated replacement.
 */
export async function assertV2TemplatePins(
  request: V2AdminGenerationRequest,
  resolveTemplate: (ref: PublishedModeTemplateRef) => Promise<unknown>,
): Promise<void> {
  for (const binding of request.templateBindings) {
    for (const ref of binding.templateRefs) {
      const resolved = await resolveTemplate(ref);
      const resolvedRecord =
        resolved && typeof resolved === "object" && !Array.isArray(resolved)
          ? (resolved as Record<string, unknown>)
          : undefined;
      const resolvedRef = exactRef(resolved)
        ? resolved
        : resolvedRecord && exactRef(resolvedRecord.templateRef)
          ? resolvedRecord.templateRef
          : undefined;
      if (
        !resolvedRef ||
        resolvedRef.templateId !== ref.templateId ||
        resolvedRef.version !== ref.version ||
        resolvedRef.contentHash !== ref.contentHash
      ) {
        throw new Error("v2_generation_template_pin_stale");
      }
    }
  }
}

function planStageBody(
  plan: V2AdminGenerationPlan,
  request: V2AdminGenerationRequest,
  actor: ContentDraftWriter,
  now: string,
) {
  return plan.stages.map((stage) => ({
    schemaVersion: "v2-generation-stage.v1",
    stageId: stage.id,
    jobId: request.idempotencyKey,
    kind: stage.kind,
    ...(stage.episodeId ? { episodeId: stage.episodeId } : {}),
    dependsOn: [...stage.dependsOn],
    state: "queued" as const,
    attempts: 0,
    maxAttempts: 3,
    requestedBy: actor.uid,
    createdAt: now,
  }));
}

function safeError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  const message = error instanceof Error ? error.message : "";
  const known = /^(v2_generation_[a-z0-9_]+|generation_[a-z0-9_]+)$/.test(
    message,
  );
  return new HttpsError(
    "failed-precondition",
    known ? message : "V2 generation request rejected",
  );
}

export async function handleAdminCreateV2GenerationPlan(
  request: {
    readonly auth?: {
      readonly uid?: string;
      readonly token?: Record<string, unknown>;
    };
    readonly data: unknown;
  },
  dependencies: V2GenerationDependencies,
): Promise<V2GenerationWriteResult> {
  const command = parseGenerationCommand(
    request.data,
    dependencies.canonicalBridge,
  );
  const actor = command.canonicalBridge
    ? (() => {
        const owner = (
          dependencies.authenticateRootOwner ?? requireV2ConfiguredRootOwnerV1
        )(request.auth);
        return Object.freeze({ uid: owner.actorUid, role: owner.role });
      })()
    : requireContentDraftWriter(request.auth);
  const input = command.request;
  await assertV2TemplatePins(input, dependencies.resolveTemplate);
  const plan = buildV2AdminGenerationPlan(input);
  const canonicalResult = command.canonicalBridge
    ? bridgeV2AdminGenerationRequestToCanonicalPlanResultV2({
        request: input,
        bridge: command.canonicalBridge,
      })
    : null;
  const canonicalPlan = canonicalResult?.plan ?? null;
  const canonicalBridgeFingerprint =
    canonicalPlan && command.canonicalBridge
      ? v2AdminCanonicalBridgeFingerprintV1({
          requestFingerprint: plan.requestFingerprint,
          planFingerprint: canonicalPlan.planFingerprint,
          bridge: command.canonicalBridge,
        })
      : null;
  const canonicalV2Authority = canonicalPlan
    ? ("none_draft_plan_only" as const)
    : ("none_missing_exact_speech_voice_and_registry_refs" as const);
  const now = dependencies.now?.() ?? new Date().toISOString();
  const db = dependencies.db;
  const jobRef = db.collection(JOBS).doc(input.idempotencyKey);
  const operationRef = db.collection(OPERATIONS).doc(input.idempotencyKey);
  const stageBodies = planStageBody(plan, input, actor, now);
  const localizationBodies = plan.localizationTasks.map((task) => ({
    schemaVersion: "v2-generation-localization.v1",
    id: task.id,
    jobId: input.idempotencyKey,
    episodeId: task.episodeId,
    sourceLocale: task.sourceLocale,
    targetLocale: task.targetLocale,
    dependsOn: [...task.dependsOn],
    state: "queued" as const,
    requestedBy: actor.uid,
    createdAt: now,
  }));
  return db.runTransaction(async (tx) => {
    const operation = await tx.get(operationRef);
    if (operation.exists) {
      const previous = operation.data() as Record<string, unknown>;
      if (
        previous.requestFingerprint !== plan.requestFingerprint ||
        previous.jobId !== input.idempotencyKey ||
        (previous.canonicalBridgeFingerprint ?? null) !==
          canonicalBridgeFingerprint
      ) {
        throw new HttpsError(
          "already-exists",
          "idempotencyKey belongs to another V2 generation plan",
        );
      }
      return {
        ok: true,
        jobId: input.idempotencyKey,
        state: "queued",
        requestFingerprint: plan.requestFingerprint,
        canonicalPlanFingerprint: canonicalPlan?.planFingerprint ?? null,
        canonicalPlanRequestRaw: canonicalResult?.planRequestRaw ?? null,
        canonicalV2Authority,
        replayed: true,
      };
    }
    tx.create(jobRef, {
      schemaVersion: "v2-generation-job.v1",
      jobId: input.idempotencyKey,
      requestFingerprint: plan.requestFingerprint,
      request: input,
      plan,
      canonicalPlan,
      canonicalPlanFingerprint: canonicalPlan?.planFingerprint ?? null,
      canonicalBridgeFingerprint,
      canonicalPlanRaw: canonicalPlan ? canonicalJsonV1(canonicalPlan) : null,
      canonicalPlanRequestRaw: canonicalResult?.planRequestRaw ?? null,
      canonicalV2Authority,
      state: "queued",
      requestedBy: actor.uid,
      role: actor.role,
      createdAt: now,
    });
    if (canonicalPlan) {
      for (const stage of canonicalPlan.stages) {
        tx.create(db.collection(STAGES).doc(stage.stageId), {
          schemaVersion: "v2-generation-stage.v2",
          stageId: stage.stageId,
          jobId: input.idempotencyKey,
          requestId: canonicalPlan.workspaceId,
          kind: stage.kind,
          episodeId: stage.episodeId,
          scopeId: stage.episodeId ?? canonicalPlan.seasonId,
          locale: stage.locale,
          studyTarget: canonicalPlan.targetLanguage,
          sourceLocale: "owner-authored",
          revision: canonicalPlan.authoringRevision,
          dependsOn: [...stage.dependsOn],
          externalRequirementIds: [...stage.externalRequirementIds],
          planFingerprint: canonicalPlan.planFingerprint,
          courseContractFingerprint:
            canonicalPlan.courseContract.courseContractFingerprint,
          executionMode:
            stage.kind === "v2_activity_instances"
              ? "owner_authored_manual_import_only"
              : "server_generation_worker",
          state: "queued",
          attempts: 0,
          maxAttempts: 3,
          requestedBy: actor.uid,
          createdAt: now,
          executionAuthority: "none",
          releaseAuthority: false,
        });
      }
    }
    if (!canonicalPlan) {
      for (const stage of stageBodies)
        tx.create(db.collection(STAGES).doc(stage.stageId), stage);
      for (const localization of localizationBodies)
        tx.create(
          db.collection(LOCALIZATIONS).doc(localization.id),
          localization,
        );
    }
    tx.create(operationRef, {
      schemaVersion: "v2-generation-operation.v1",
      operationId: input.idempotencyKey,
      jobId: input.idempotencyKey,
      requestFingerprint: plan.requestFingerprint,
      canonicalBridgeFingerprint,
      canonicalPlanFingerprint: canonicalPlan?.planFingerprint ?? null,
      createdBy: actor.uid,
      createdAt: now,
      result: { state: "queued" },
    });
    tx.create(db.collection("admin_log").doc(), {
      schemaVersion: "admin-audit.v1",
      action: "content_v2.generation.queue",
      actorUid: actor.uid,
      role: actor.role,
      entity: { collection: JOBS, id: input.idempotencyKey },
      operationId: input.idempotencyKey,
      requestFingerprint: plan.requestFingerprint,
      timestamp: now,
    });
    return {
      ok: true,
      jobId: input.idempotencyKey,
      state: "queued",
      requestFingerprint: plan.requestFingerprint,
      canonicalPlanFingerprint: canonicalPlan?.planFingerprint ?? null,
      canonicalPlanRequestRaw: canonicalResult?.planRequestRaw ?? null,
      canonicalV2Authority,
      replayed: false,
    };
  });
}

export const adminCreateV2GenerationPlan = onCall(
  callableOptions,
  async (request) => {
    try {
      const db = admin.firestore();
      const resolver = createFirestoreModeTemplateResolver(db);
      return await handleAdminCreateV2GenerationPlan(request, {
        db,
        resolveTemplate: (ref) => resolver(ref as never),
      });
    } catch (error) {
      throw safeError(error);
    }
  },
);

// Explicit queue alias for Admin clients; both names share one server-owned implementation.
export const adminQueueV2GenerationPlan = adminCreateV2GenerationPlan;
