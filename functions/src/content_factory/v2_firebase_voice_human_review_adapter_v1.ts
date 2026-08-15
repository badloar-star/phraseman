import * as admin from "firebase-admin";

import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { type V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryImmutableObjectPinV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1,
  type V2FirebaseVoiceAudioEpisodeReceiptHandleV1,
} from "./v2_firebase_voice_audio_episode_receipt_adapter_v1";
import {
  resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1,
  type V2FirebaseVoiceDeviceEpisodeReceiptHandleV1,
} from "./v2_firebase_voice_device_observation_receipt_adapter_v1";
import {
  V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1,
  validateV2FirebaseRepositoryTrustRootV1,
} from "./v2_firebase_repository_trust_root_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import { type V2VoiceAudioManifestV1 } from "./v2_voice_audio_manifest_v1";
import {
  V2_VOICE_HUMAN_REVIEW_MAX_BYTES_V1,
  materializeV2VoiceHumanReviewV1,
  parseV2VoiceHumanReviewV1,
  type V2VoiceHumanReviewV1,
  type V2VoiceHumanReviewerRoleV1,
} from "./v2_voice_human_review_contract_v1";
import {
  decideV2VoiceHumanReviewIndexV1,
  materializeV2VoiceHumanReviewIndexV1,
  parseV2VoiceHumanReviewIndexV1,
  v2VoiceHumanReviewIndexDocumentPathV1,
  type V2VoiceHumanReviewIndexV1,
} from "./v2_voice_human_review_index_v1";

export const V2_FIREBASE_VOICE_HUMAN_REVIEW_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-human-review-summary.v1" as const;

export interface V2FirebaseVoiceHumanReviewSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_HUMAN_REVIEW_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly deviceEpisodeReceiptFingerprint: string;
  readonly reviewerRole: V2VoiceHumanReviewerRoleV1;
  readonly reviewerIdentityFingerprint: string;
  readonly reviewerCredentialFingerprint: string;
  readonly reviewFingerprint: string;
  readonly reviewPin: V2RepositoryImmutableObjectPinV1;
  readonly indexFingerprint: string;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly pageDecision: "approved" | "changes_requested";
  readonly reviewerAuthentication: "firebase_admin_revocation_checked_id_token";
  readonly reviewerRoleAuthority: "authenticated_exact_voice_review_role_claim";
  readonly reviewAuthority: "authenticated_in_process_exact_audio_page_review";
  readonly artifactStorageAuthority: "firebase_admin_generation_pinned_review_readback";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceHumanReviewHandleV1 {
  readonly __opaqueV2FirebaseVoiceHumanReviewHandleV1: unique symbol;
}

export interface V2FirebaseVoiceHumanReviewAdapterV1 {
  authenticateAndReviewPage(input: {
    readonly idToken: string;
    readonly reviewerRole: V2VoiceHumanReviewerRoleV1;
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly audioEpisodeReceiptHandle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
    readonly deviceEpisodeReceiptHandle: V2FirebaseVoiceDeviceEpisodeReceiptHandleV1;
    readonly reviewOperationId: string;
    readonly reviewedAtMs: number;
    readonly pageStartIndex: number;
    readonly nextPageStartIndex: number | null;
    readonly decisions: readonly Readonly<{
      readonly itemIndex: number;
      readonly decision: "approved" | "changes_requested";
      readonly issueCodes: readonly string[];
    }>[];
  }): Promise<V2FirebaseVoiceHumanReviewHandleV1>;
  coldLoadReviewPage(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly audioEpisodeReceiptHandle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
    readonly deviceEpisodeReceiptHandle: V2FirebaseVoiceDeviceEpisodeReceiptHandleV1;
    readonly reviewerRole: V2VoiceHumanReviewerRoleV1;
    readonly pageStartIndex: number;
  }): Promise<V2FirebaseVoiceHumanReviewHandleV1>;
}

export interface V2FirebaseVoiceHumanReviewMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly review: V2VoiceHumanReviewV1;
  readonly index: V2VoiceHumanReviewIndexV1;
  readonly summary: V2FirebaseVoiceHumanReviewSummaryV1;
}

const handles = new WeakSet<object>();
const metadata = new WeakMap<object, V2FirebaseVoiceHumanReviewMaterialV1>();

function fail(): never {
  throw new Error("v2_firebase_voice_human_review_invalid");
}

function emulatorEnvironment() {
  return Object.freeze({
    functionsEmulator: process.env.FUNCTIONS_EMULATOR ?? null,
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST ?? null,
    storageEmulatorHost: process.env.STORAGE_EMULATOR_HOST ?? null,
    firebaseStorageEmulatorHost:
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? null,
    firebaseEmulatorHub: process.env.FIREBASE_EMULATOR_HUB ?? null,
  });
}

export function createFirebaseAdminV2VoiceHumanReviewAdapterV1(): V2FirebaseVoiceHumanReviewAdapterV1 {
  const expected = V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1;
  const app = admin.app();
  if (
    app.name !== expected.appName ||
    app.options.projectId !== expected.projectId ||
    app.options.storageBucket !== expected.bucketName
  )
    fail();
  validateV2FirebaseRepositoryTrustRootV1({
    projectId: app.options.projectId,
    databaseId: expected.databaseId,
    bucketName: expected.bucketName,
    appName: app.name,
    emulatorEnvironment: emulatorEnvironment(),
  });
  const auth = admin.auth(app);
  const io = createV2FirebaseAdminRepositoryIoV1();
  const coldReadReview = async (input: {
    readonly index: V2VoiceHumanReviewIndexV1;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly audioEpisodeReceipt: Parameters<
      typeof parseV2VoiceHumanReviewV1
    >[0]["audioEpisodeReceipt"];
    readonly deviceEpisodeReceipt: Parameters<
      typeof parseV2VoiceHumanReviewV1
    >[0]["deviceEpisodeReceipt"];
  }) => {
    const pin = input.index.reviewPin;
    const storedMetadata = await io.storage.readMetadataExact(pin.objectPath);
    const stored = await io.storage.downloadGenerationExact({
      objectPath: pin.objectPath,
      ifGenerationMatch: pin.objectGeneration,
      maximumBytes: V2_VOICE_HUMAN_REVIEW_MAX_BYTES_V1,
    });
    if (
      storedMetadata === null ||
      storedMetadata.generation !== pin.objectGeneration ||
      storedMetadata.byteSize !== pin.byteSize ||
      storedMetadata.contentHash !== pin.contentHash ||
      storedMetadata.contentType !==
        V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 ||
      stored.kind !== "downloaded" ||
      stored.bytes.byteLength !== pin.byteSize
    )
      fail();
    let raw: string;
    try {
      raw = new TextDecoder("utf-8", { fatal: true }).decode(stored.bytes);
    } catch {
      fail();
    }
    if (sha256Utf8(raw) !== pin.contentHash) fail();
    const review = parseV2VoiceHumanReviewV1({
      raw,
      manifest: input.manifest,
      audioEpisodeReceipt: input.audioEpisodeReceipt,
      deviceEpisodeReceipt: input.deviceEpisodeReceipt,
    });
    if (
      review.reviewFingerprint !== input.index.reviewFingerprint ||
      review.reviewerRole !== input.index.reviewerRole ||
      review.reviewerIdentityFingerprint !==
        input.index.reviewerIdentityFingerprint ||
      review.reviewerCredentialFingerprint !==
        input.index.reviewerCredentialFingerprint ||
      review.pageStartIndex !== input.index.pageStartIndex ||
      review.pageItemCount !== input.index.pageItemCount ||
      review.nextPageStartIndex !== input.index.nextPageStartIndex
    )
      fail();
    return review;
  };
  const issueHandle = (input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly review: V2VoiceHumanReviewV1;
    readonly index: V2VoiceHumanReviewIndexV1;
  }) => {
    const body = {
      schemaVersion: V2_FIREBASE_VOICE_HUMAN_REVIEW_SUMMARY_SCHEMA_V1,
      planFingerprint: input.index.planFingerprint,
      stageId: input.index.stageId,
      episodeId: input.index.episodeId,
      manifestFingerprint: input.index.manifestFingerprint,
      audioEpisodeReceiptFingerprint:
        input.index.audioEpisodeReceiptFingerprint,
      deviceEpisodeReceiptFingerprint:
        input.index.deviceEpisodeReceiptFingerprint,
      reviewerRole: input.index.reviewerRole,
      reviewerIdentityFingerprint: input.index.reviewerIdentityFingerprint,
      reviewerCredentialFingerprint: input.index.reviewerCredentialFingerprint,
      reviewFingerprint: input.review.reviewFingerprint,
      reviewPin: input.index.reviewPin,
      indexFingerprint: input.index.indexFingerprint,
      pageStartIndex: input.review.pageStartIndex,
      pageItemCount: input.review.pageItemCount,
      pageDecision: input.review.pageDecision,
      reviewerAuthentication:
        "firebase_admin_revocation_checked_id_token" as const,
      reviewerRoleAuthority:
        "authenticated_exact_voice_review_role_claim" as const,
      reviewAuthority:
        "authenticated_in_process_exact_audio_page_review" as const,
      artifactStorageAuthority:
        "firebase_admin_generation_pinned_review_readback" as const,
      publicationAuthority: "none" as const,
      runtimeConsumer: false as const,
      releaseEligible: false as const,
      releaseAuthority: false as const,
    };
    const summary = Object.freeze({
      ...body,
      summaryFingerprint: hashCanonicalBody(body),
    });
    const handle = Object.freeze({}) as V2FirebaseVoiceHumanReviewHandleV1;
    handles.add(handle);
    metadata.set(
      handle,
      Object.freeze({
        plan: input.plan,
        manifest: input.manifest,
        review: input.review,
        index: input.index,
        summary,
      }),
    );
    return handle;
  };
  return Object.freeze({
    authenticateAndReviewPage: async (
      input: Parameters<
        V2FirebaseVoiceHumanReviewAdapterV1["authenticateAndReviewPage"]
      >[0],
    ) => {
      if (
        typeof input.idToken !== "string" ||
        input.idToken.length < 20 ||
        input.idToken.length > 16_384
      )
        fail();
      const token = await auth.verifyIdToken(input.idToken, true);
      const voiceRoles = token.learningV2VoiceReviewRoles;
      if (
        token.admin !== true ||
        !["owner", "admin", "content_reviewer"].includes(
          String(token.adminRole),
        ) ||
        !Array.isArray(voiceRoles) ||
        voiceRoles.length < 1 ||
        voiceRoles.length > 2 ||
        !voiceRoles.every(
          (role) =>
            role === "human_listening_specialist" ||
            role === "target_language_linguist",
        ) ||
        new Set(voiceRoles).size !== voiceRoles.length ||
        !voiceRoles.includes(input.reviewerRole) ||
        typeof token.uid !== "string" ||
        token.uid.length < 1 ||
        token.uid.length > 128 ||
        typeof token.auth_time !== "number" ||
        !Number.isSafeInteger(token.auth_time) ||
        token.auth_time < 1
      )
        fail();
      const audio = resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1({
        handle: input.audioEpisodeReceiptHandle,
        plan: input.plan,
        stageId: input.stageId,
        manifest: input.manifest,
      });
      const device = resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1({
        handle: input.deviceEpisodeReceiptHandle,
        plan: input.plan,
        stageId: input.stageId,
        manifest: input.manifest,
      });
      const reviewerIdentityFingerprint = hashCanonicalBody({
        uid: token.uid,
        projectId: expected.projectId,
      });
      const reviewerCredentialFingerprint = hashCanonicalBody({
        uid: token.uid,
        authTime: token.auth_time,
        reviewerRole: input.reviewerRole,
        voiceRoles: [...voiceRoles].sort(),
      });
      const review = materializeV2VoiceHumanReviewV1({
        manifest: input.manifest,
        audioEpisodeReceipt: audio.receipt,
        deviceEpisodeReceipt: device.pcmEpisodeReceipt,
        reviewerRole: input.reviewerRole,
        reviewerIdentityFingerprint,
        reviewerCredentialFingerprint,
        reviewOperationId: input.reviewOperationId,
        reviewedAtMs: input.reviewedAtMs,
        pageStartIndex: input.pageStartIndex,
        nextPageStartIndex: input.nextPageStartIndex,
        decisions: input.decisions,
      });
      const reviewRaw = canonicalJsonV1(review);
      const reviewRawHash = sha256Utf8(reviewRaw);
      const reviewPath = `learning-v2/voice-human-reviews/${input.plan.planFingerprint}/${hashCanonicalBody({ stageId: input.stageId })}/${input.manifest.manifestFingerprint}/${input.reviewerRole}/${review.reviewFingerprint}/${reviewRawHash}.json`;
      const persisted = await persistV2ImmutableRepositoryObjectV1({
        storage: io.storage,
        objectPath: reviewPath,
        bytes: new TextEncoder().encode(reviewRaw),
        maximumBytes: V2_VOICE_HUMAN_REVIEW_MAX_BYTES_V1,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: reviewRawHash,
      });
      const coldDownload = await io.storage.downloadGenerationExact({
        objectPath: persisted.pin.objectPath,
        ifGenerationMatch: persisted.pin.objectGeneration,
        maximumBytes: V2_VOICE_HUMAN_REVIEW_MAX_BYTES_V1,
      });
      if (coldDownload.kind !== "downloaded") fail();
      let coldRaw: string;
      try {
        coldRaw = new TextDecoder("utf-8", { fatal: true }).decode(
          coldDownload.bytes,
        );
      } catch {
        fail();
      }
      const coldReview = parseV2VoiceHumanReviewV1({
        raw: coldRaw,
        manifest: input.manifest,
        audioEpisodeReceipt: audio.receipt,
        deviceEpisodeReceipt: device.pcmEpisodeReceipt,
      });
      if (coldReview.reviewFingerprint !== review.reviewFingerprint) fail();
      const proposedIndex = materializeV2VoiceHumanReviewIndexV1({
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        episodeId: input.manifest.episodeId,
        manifestFingerprint: input.manifest.manifestFingerprint,
        audioEpisodeReceiptFingerprint: audio.receipt.receiptFingerprint,
        deviceEpisodeReceiptFingerprint:
          device.pcmEpisodeReceipt.receiptFingerprint,
        reviewerRole: input.reviewerRole,
        reviewerIdentityFingerprint,
        reviewerCredentialFingerprint,
        pageStartIndex: coldReview.pageStartIndex,
        pageItemCount: coldReview.pageItemCount,
        nextPageStartIndex: coldReview.nextPageStartIndex,
        reviewFingerprint: coldReview.reviewFingerprint,
        reviewPin: persisted.pin,
      });
      const indexPath = v2VoiceHumanReviewIndexDocumentPathV1(proposedIndex);
      const committedIndex = await io.firestore.runTransaction(
        async (transaction) => {
          const current = await transaction.readExact(indexPath);
          const decision = decideV2VoiceHumanReviewIndexV1({
            currentRaw: current.exists ? current.raw : null,
            proposed: proposedIndex,
          });
          if (decision.kind === "conflict") fail();
          if (decision.kind === "create")
            await transaction.createExact(indexPath, decision.canonicalRaw);
          return decision.kind === "create"
            ? decision.next
            : decision.committed;
        },
      );
      const coldIndex = await io.firestore.runTransaction(
        async (transaction) => {
          const current = await transaction.readExact(indexPath);
          if (!current.exists) fail();
          return parseV2VoiceHumanReviewIndexV1(current.raw);
        },
      );
      if (
        coldIndex.indexFingerprint !== committedIndex.indexFingerprint ||
        coldIndex.reviewFingerprint !== coldReview.reviewFingerprint ||
        canonicalJsonV1(coldIndex.reviewPin) !== canonicalJsonV1(persisted.pin)
      )
        fail();
      return issueHandle({
        plan: input.plan,
        manifest: input.manifest,
        review: coldReview,
        index: coldIndex,
      });
    },
    coldLoadReviewPage: async (
      input: Parameters<
        V2FirebaseVoiceHumanReviewAdapterV1["coldLoadReviewPage"]
      >[0],
    ) => {
      const audio = resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1({
        handle: input.audioEpisodeReceiptHandle,
        plan: input.plan,
        stageId: input.stageId,
        manifest: input.manifest,
      });
      const device = resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1({
        handle: input.deviceEpisodeReceiptHandle,
        plan: input.plan,
        stageId: input.stageId,
        manifest: input.manifest,
      });
      const indexPath = v2VoiceHumanReviewIndexDocumentPathV1({
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        manifestFingerprint: input.manifest.manifestFingerprint,
        reviewerRole: input.reviewerRole,
        pageStartIndex: input.pageStartIndex,
      });
      const index = await io.firestore.runTransaction(async (transaction) => {
        const current = await transaction.readExact(indexPath);
        if (!current.exists) fail();
        return parseV2VoiceHumanReviewIndexV1(current.raw);
      });
      if (
        index.planFingerprint !== input.plan.planFingerprint ||
        index.stageId !== input.stageId ||
        index.episodeId !== input.manifest.episodeId ||
        index.manifestFingerprint !== input.manifest.manifestFingerprint ||
        index.audioEpisodeReceiptFingerprint !==
          audio.receipt.receiptFingerprint ||
        index.deviceEpisodeReceiptFingerprint !==
          device.pcmEpisodeReceipt.receiptFingerprint ||
        index.reviewerRole !== input.reviewerRole ||
        index.pageStartIndex !== input.pageStartIndex
      )
        fail();
      const coldReview = await coldReadReview({
        index,
        manifest: input.manifest,
        audioEpisodeReceipt: audio.receipt,
        deviceEpisodeReceipt: device.pcmEpisodeReceipt,
      });
      return issueHandle({
        plan: input.plan,
        manifest: input.manifest,
        review: coldReview,
        index,
      });
    },
  });
}

export function isV2FirebaseVoiceHumanReviewHandleV1(
  value: unknown,
): value is V2FirebaseVoiceHumanReviewHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseVoiceHumanReviewSummaryV1(
  handle: V2FirebaseVoiceHumanReviewHandleV1,
): V2FirebaseVoiceHumanReviewSummaryV1 {
  const value = metadata.get(handle);
  if (!value) fail();
  return value.summary;
}

export function resolveV2FirebaseVoiceHumanReviewMaterialV1(input: {
  readonly handle: V2FirebaseVoiceHumanReviewHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly reviewerRole: V2VoiceHumanReviewerRoleV1;
}): V2FirebaseVoiceHumanReviewMaterialV1 {
  const value = metadata.get(input.handle);
  if (
    !value ||
    value.plan !== input.plan ||
    value.manifest !== input.manifest ||
    value.summary.stageId !== input.stageId ||
    value.summary.reviewerRole !== input.reviewerRole ||
    value.review.reviewFingerprint !== value.summary.reviewFingerprint ||
    value.index.indexFingerprint !== value.summary.indexFingerprint
  )
    fail();
  return value;
}
