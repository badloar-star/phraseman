// зачем: compiled unit ещё не release authority. Этот server-only adapter
// связывает его с exact active release, approved Season/Episode и Episode.sessionSetRef
// до публикации карточек, которым затем доверяет progress transaction.
import type { Firestore } from "firebase-admin/firestore";
import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import type { SeasonRevisionEnvelope } from "../../../modules/learning-v2/authoring/season_revision";
import type { V2SessionSetRef } from "../../../modules/learning-v2/contracts/episode";
import {
  createPublishedRequiredSessionSet,
  parsePublishedRequiredSessionSet,
  type PublishedRequiredSessionSet,
  type PublishedRequiredSessionSetV2,
} from "../../../modules/learning-v2/contracts/required_session_progress";
import {
  validateV2SessionSet,
  type V2SessionSetBodyV2,
} from "../../../modules/learning-v2/contracts/session";
import type { V2CompiledEpisodeArtifact } from "./v2_content_compilation";
import {
  resolveV2ReleaseManifest,
  type V2ObjectRef,
  type V2ReleaseEnvironment,
  type V2ResolvedReleaseManifest,
} from "./v2_release_adapter";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  assertExactImmutableEpisodeRevision,
  type ImmutableEpisodeRevisionArtifact,
  type ImmutableEpisodeRevisionResolver,
} from "../content_studio/episode_revision_resolver";
import {
  createPublishedRequiredSessionAnswerManifest,
  parsePublishedRequiredSessionAnswerManifest,
  type PublishedRequiredSessionAnswerManifestV1,
} from "../learning_v2/required_session_answer_verifier";
import { requiredSessionSetId } from "../../../modules/learning-v2/contracts/required_session_release_identity";

const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const HASH = /^[a-f0-9]{64}$/;

export const publishedRequiredSessionSetDocumentId = (sessionSetId: string): string => {
  if (typeof sessionSetId !== "string" || !SAFE_ID.test(sessionSetId)) {
    throw new Error("required_session_publication_identity_invalid");
  }
  return `rssv1_${hashCanonicalBody({
    schemaVersion: "learning-v2-required-session-set-document-key.v1",
    sessionSetId,
  })}`;
};

export const publishedRequiredSessionAnswerManifestDocumentId = (
  sessionSetId: string,
): string => {
  if (typeof sessionSetId !== "string" || !SAFE_ID.test(sessionSetId)) {
    throw new Error("required_session_publication_identity_invalid");
  }
  return `rsav1_${hashCanonicalBody({
    schemaVersion: "learning-v2-required-session-answer-manifest-document-key.v1",
    sessionSetId,
  })}`;
};

export { requiredSessionSetId } from "../../../modules/learning-v2/contracts/required_session_release_identity";

// Пилот пока имеет ровно один owner-approved course identity. Новые targets
// добавляются явным versioned catalog, а не формулой из client locale.
export const requiredSessionCourseIdForTarget = (studyTarget: string): string => {
  if (studyTarget === "en") return "english-core";
  throw new Error("required_session_course_catalog_missing");
};

export function materializeSessionSetFromCompiledArtifact(
  compiled: V2CompiledEpisodeArtifact,
  version: number,
): V2SessionSetBodyV2 {
  if (
    !compiled ||
    compiled.schemaVersion !== "v2-compiled-episode-content.v2" ||
    !SAFE_ID.test(compiled.episodeId) ||
    !Array.isArray(compiled.sessions) ||
    !Array.isArray(compiled.optionalPracticeTemplates) ||
    !compiled.qualityReport ||
    compiled.qualityReport.ok !== true ||
    !Number.isSafeInteger(version) ||
    version < 1
  ) throw new Error("required_session_compiled_artifact_invalid");

  const candidate = {
    schemaVersion: "v2-session-set.v2" as const,
    episodeId: compiled.episodeId,
    version,
    sessions: compiled.sessions.map(({ support: _derivedSupport, ...session }) => session),
    optionalPracticeSlots: compiled.optionalPracticeTemplates,
  };
  const validated = validateV2SessionSet(candidate);
  if (!validated.ok || validated.value.schemaVersion !== "v2-session-set.v2") {
    throw new Error("required_session_compiled_artifact_invalid");
  }
  return validated.value;
}

export interface RequiredSessionPublicationStore {
  putIfAbsent(
    documentId: string,
    publication: PublishedRequiredSessionSet,
  ): Promise<
    | { readonly status: "created" }
    | { readonly status: "existing"; readonly value: unknown }
  >;
}

export interface RequiredSessionAnswerManifestStore {
  putIfAbsent(
    documentId: string,
    manifest: PublishedRequiredSessionAnswerManifestV1,
  ): Promise<
    | { readonly status: "created" }
    | { readonly status: "existing"; readonly value: unknown }
  >;
}

export interface RequiredSessionPublicationDependencies {
  readonly resolveSeasonRevision: (seasonRevisionId: string) => Promise<SeasonRevisionEnvelope>;
  readonly episodeResolver: ImmutableEpisodeRevisionResolver;
  readonly resolveCompiledLessonUnit: (ref: V2ObjectRef) => Promise<{
    readonly body: V2CompiledEpisodeArtifact;
    readonly contentHash: string;
    readonly generation: string;
    readonly byteSize: number;
  }>;
  readonly publicationStore: RequiredSessionPublicationStore;
  readonly answerManifestStore: RequiredSessionAnswerManifestStore;
}

export interface PublishRequiredSessionSetInput {
  readonly expectedEnvironment: V2ReleaseEnvironment;
  readonly activePointer: unknown;
  readonly manifestRecord: unknown;
  readonly manifestBody: unknown;
  readonly seasonRevisionId: string;
  readonly episodeId: string;
}

const exactEpisodeRef = (
  left: ApprovedEpisodeRevision,
  right: ImmutableEpisodeRevisionArtifact,
): boolean =>
  left.draftId === right.draftId &&
  left.episodeId === right.episodeId &&
  left.revision === right.revision &&
  left.revisionFingerprint === right.revisionFingerprint &&
  left.contentHash === right.contentHash &&
  left.ordinal === right.ordinal &&
  left.chapterId === right.chapterId &&
  right.approvalStatus === "approved";

const episodeRefFromSeason = (
  season: SeasonRevisionEnvelope,
  episodeId: string,
): ApprovedEpisodeRevision => {
  const body = season.body as { readonly episodeRevisionRefs?: readonly ApprovedEpisodeRevision[] };
  const refs = body?.episodeRevisionRefs;
  if (!Array.isArray(refs)) throw new Error("required_session_season_invalid");
  const matches = refs.filter((ref) => ref?.episodeId === episodeId);
  if (matches.length !== 1 || matches[0].approvalStatus !== "approved") {
    throw new Error("required_session_episode_pin_invalid");
  }
  return matches[0];
};

const assertSeasonMatchesRelease = (
  release: V2ResolvedReleaseManifest,
  season: SeasonRevisionEnvelope,
): void => {
  if (
    season.lifecycle?.status !== "approved" ||
    season.record?.seasonId !== release.body.seasonId ||
    season.record?.revision !== release.body.seasonRevision ||
    season.record?.contentHash !== release.body.seasonContentHash ||
    season.lifecycle.revision !== season.record.revision ||
    season.lifecycle.revisionFingerprint !== season.record.revisionFingerprint
  ) throw new Error("required_session_release_season_mismatch");
};

const sessionSetRefFromEpisode = (
  episode: ImmutableEpisodeRevisionArtifact,
): V2SessionSetRef => {
  const body = episode.body as { readonly sessionSetRef?: V2SessionSetRef };
  const ref = body?.sessionSetRef;
  if (
    !ref ||
    typeof ref !== "object" ||
    Array.isArray(ref) ||
    Object.keys(ref).length !== 3 ||
    !["episodeId", "version", "contentHash"].every((key) =>
      Object.prototype.hasOwnProperty.call(ref, key),
    ) ||
    ref.episodeId !== episode.episodeId ||
    !Number.isSafeInteger(ref.version) ||
    ref.version < 1 ||
    typeof ref.contentHash !== "string" ||
    !HASH.test(ref.contentHash)
  ) throw new Error("required_session_episode_session_set_ref_invalid");
  return ref;
};

export async function publishRequiredSessionSetFromApprovedRelease(
  input: PublishRequiredSessionSetInput,
  dependencies: RequiredSessionPublicationDependencies,
): Promise<{
  readonly status: "published" | "replayed";
  readonly documentId: string;
  readonly publication: PublishedRequiredSessionSetV2;
  readonly answerManifestDocumentId: string;
  readonly answerManifest: PublishedRequiredSessionAnswerManifestV1;
}> {
  if (!SAFE_ID.test(input.seasonRevisionId) || !SAFE_ID.test(input.episodeId)) {
    throw new Error("required_session_publication_identity_invalid");
  }
  const release = resolveV2ReleaseManifest(
    input.activePointer,
    input.manifestRecord,
    input.manifestBody,
    input.expectedEnvironment,
  );
  const season = await dependencies.resolveSeasonRevision(input.seasonRevisionId);
  assertSeasonMatchesRelease(release, season);
  const episodeRef = episodeRefFromSeason(season, input.episodeId);
  const episode = await assertExactImmutableEpisodeRevision(
    dependencies.episodeResolver,
    episodeRef,
  );
  if (!exactEpisodeRef(episodeRef, episode) || episode.bodyHash !== episode.contentHash) {
    throw new Error("required_session_episode_revision_mismatch");
  }
  const releaseUnits = release.body.lessonUnits.filter((unit) => unit.episodeId === input.episodeId);
  if (releaseUnits.length !== 1 || releaseUnits[0].lessonId !== episode.ordinal) {
    throw new Error("required_session_release_unit_mismatch");
  }
  const unitRef = releaseUnits[0].object;
  const resolvedUnit = await dependencies.resolveCompiledLessonUnit(unitRef);
  if (
    resolvedUnit.contentHash !== unitRef.contentHash ||
    resolvedUnit.generation !== unitRef.generation ||
    resolvedUnit.byteSize !== unitRef.byteSize ||
    hashCanonicalBody(resolvedUnit.body) !== unitRef.contentHash ||
    resolvedUnit.body.episodeId !== episode.episodeId
  ) throw new Error("required_session_release_unit_mismatch");

  const sessionSetRef = sessionSetRefFromEpisode(episode);
  const sessionSet = materializeSessionSetFromCompiledArtifact(
    resolvedUnit.body,
    sessionSetRef.version,
  );
  const sessionSetHash = hashCanonicalBody(sessionSet);
  if (sessionSetHash !== sessionSetRef.contentHash) {
    throw new Error("required_session_episode_session_set_ref_mismatch");
  }
  const publication = createPublishedRequiredSessionSet({
    schemaVersion: "learning-v2-published-required-session-set.v2",
    courseId: requiredSessionCourseIdForTarget(release.body.studyTarget),
    studyTarget: release.body.studyTarget,
    courseReleaseId: release.body.courseReleaseId,
    seasonRevisionId: input.seasonRevisionId,
    episodeRevisionFingerprint: episode.revisionFingerprint,
    episodeContentHash: episode.contentHash,
    sessionSetId: requiredSessionSetId(episode.episodeId, sessionSet.version),
    sessionSetHash,
    sessionSet,
    episodeOrdinal: episode.ordinal,
  });
  if (publication.schemaVersion !== "learning-v2-published-required-session-set.v2") {
    throw new Error("required_session_publication_invalid");
  }
  const documentId = publishedRequiredSessionSetDocumentId(publication.sessionSetId);
  const answerManifest = createPublishedRequiredSessionAnswerManifest({
    schemaVersion: "learning-v2-published-required-session-answer-manifest.v1",
    courseId: publication.courseId,
    studyTarget: publication.studyTarget,
    courseReleaseId: publication.courseReleaseId,
    seasonRevisionId: publication.seasonRevisionId,
    episodeRevisionFingerprint: publication.episodeRevisionFingerprint,
    episodeContentHash: publication.episodeContentHash,
    sessionSetId: publication.sessionSetId,
    sessionSetHash: publication.sessionSetHash,
    answerKeys: resolvedUnit.body.requiredTaskAnswerKeys,
  });
  const answerManifestDocumentId = publishedRequiredSessionAnswerManifestDocumentId(
    publication.sessionSetId,
  );
  const write = await dependencies.publicationStore.putIfAbsent(documentId, publication);
  const answerWrite = await dependencies.answerManifestStore.putIfAbsent(
    answerManifestDocumentId,
    answerManifest,
  );
  let persistedPublication: PublishedRequiredSessionSetV2 = publication;
  if (write.status === "existing") {
    const existing = parsePublishedRequiredSessionSet(write.value);
    if (existing.schemaVersion !== "learning-v2-published-required-session-set.v2" ||
      existing.publicationFingerprint !== publication.publicationFingerprint) {
      throw new Error("required_session_publication_conflict");
    }
    persistedPublication = existing;
  }
  let persistedAnswerManifest = answerManifest;
  if (answerWrite.status === "existing") {
    const existing = parsePublishedRequiredSessionAnswerManifest(answerWrite.value);
    if (existing.manifestFingerprint !== answerManifest.manifestFingerprint) {
      throw new Error("required_session_answer_manifest_conflict");
    }
    persistedAnswerManifest = existing;
  }
  return Object.freeze({
    status: write.status === "existing" && answerWrite.status === "existing"
      ? "replayed" as const
      : "published" as const,
    documentId,
    publication: persistedPublication,
    answerManifestDocumentId,
    answerManifest: persistedAnswerManifest,
  });
}

export function createFirestoreRequiredSessionPublicationStore(
  db: Firestore,
): RequiredSessionPublicationStore {
  return {
    putIfAbsent: async (documentId, publication) => db.runTransaction(async (transaction) => {
      const ref = db.collection("content_v2_required_session_sets").doc(documentId);
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) return { status: "existing" as const, value: snapshot.data() };
      transaction.create(ref, publication as unknown as FirebaseFirestore.DocumentData);
      return { status: "created" as const };
    }),
  };
}

export function createFirestoreRequiredSessionAnswerManifestStore(
  db: Firestore,
): RequiredSessionAnswerManifestStore {
  return {
    putIfAbsent: async (documentId, manifest) => db.runTransaction(async (transaction) => {
      const ref = db.collection("content_v2_required_session_answer_manifests").doc(documentId);
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) return { status: "existing" as const, value: snapshot.data() };
      transaction.create(ref, manifest as unknown as FirebaseFirestore.DocumentData);
      return { status: "created" as const };
    }),
  };
}
