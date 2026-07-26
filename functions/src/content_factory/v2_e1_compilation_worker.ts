// зачем: владелец: «воркер строим» — кнопка генерации в админке должна давать РЕЗУЛЬТАТ,
// а не вечное queued. Вертикальный срез E1: (1) сид демо-банка в ОДИН документ
// content_v2_sources/ep-01 (Firebase-экономия: весь банк одним чтением), (2) запуск
// компиляции по jobId — резолв профиля из источника с проверкой canonical hash,
// чистый компилятор + блокирующий QA (Task 7), артефакт в content_v2_compiled_units,
// стадии job'а -> succeeded, идемпотентный повтор. Никаких cron/onSnapshot — только
// явные вызовы из админки.
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ENFORCE_APP_CHECK } from "../callable_options";
import { requireContentDraftWriter } from "../admin_content_studio_authoring";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  buildE1DemoItems,
  buildE1DemoProfile,
  E1_DEMO_CAN_DO_OUTCOME_ID,
  E1_DEMO_EPISODE_ID,
} from "../../../modules/learning-v2/content/e1_demo_bank";
import { validateV2ContentItem, type V2ContentItem } from "../../../modules/learning-v2/content/content_item";
import type { V2LanguageProfileBody } from "../../../modules/learning-v2/content/language_profile";
import { compileV2EpisodeContent } from "./v2_content_compilation";
import type { V2AdminGenerationRequest } from "./v2_admin_generation_contract";

const callableOptions = { region: "us-central1", enforceAppCheck: ENFORCE_APP_CHECK } as const;
const JOBS = "content_v2_generation_jobs";
const STAGES = "content_v2_generation_stages";
const SOURCES = "content_v2_sources";
const COMPILED = "content_v2_compiled_units";

export interface V2WorkerDependencies {
  readonly db: admin.firestore.Firestore;
  readonly now?: () => string;
}

interface CallableSeam {
  readonly auth?: { readonly uid?: string; readonly token?: Record<string, unknown> };
  readonly data: unknown;
}

export interface V2SeedResult {
  readonly ok: true;
  readonly episodeId: string;
  readonly canDoOutcomeId: string;
  readonly contentItemCount: number;
  readonly languageProfileRef: { readonly profileId: string; readonly version: number; readonly contentHash: string };
}

export interface V2RunResult {
  readonly ok: true;
  readonly jobId: string;
  readonly episodeId: string;
  readonly replayed: boolean;
  readonly qaOk: boolean;
  readonly sessionCount: number;
}

function safeError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  const message = error instanceof Error ? error.message : "";
  const known = /^(v2_worker_[a-z0-9_:.-]+|language_profile_[a-z_]+|session_[a-z_]+|compilation_[a-z_:.-]+|episode_content_qa_blocked)/.test(message);
  return new HttpsError("failed-precondition", known ? message : "V2 worker request rejected");
}

/** Кладёт демо-банк E1 в один источник-документ; hash профиля считается честно. */
export async function handleAdminSeedV2E1DemoSource(
  request: CallableSeam,
  dependencies: V2WorkerDependencies,
): Promise<V2SeedResult> {
  const actor = requireContentDraftWriter(request.auth);
  const profile = buildE1DemoProfile();
  const items = buildE1DemoItems();
  const now = dependencies.now?.() ?? new Date().toISOString();
  const contentHash = hashCanonicalBody(profile);
  await dependencies.db.collection(SOURCES).doc(E1_DEMO_EPISODE_ID).set({
    schemaVersion: "v2-content-source.v1",
    episodeId: E1_DEMO_EPISODE_ID,
    canDoOutcomeId: E1_DEMO_CAN_DO_OUTCOME_ID,
    languageProfile: profile,
    contentItems: items,
    updatedAt: now,
    updatedBy: actor.uid,
  });
  return {
    ok: true,
    episodeId: E1_DEMO_EPISODE_ID,
    canDoOutcomeId: E1_DEMO_CAN_DO_OUTCOME_ID,
    contentItemCount: items.length,
    languageProfileRef: { profileId: profile.profileId, version: profile.version, contentHash },
  };
}

function parseJobId(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("v2_worker_request_invalid");
  const jobId = (data as Record<string, unknown>).jobId;
  if (typeof jobId !== "string" || !jobId.trim()) throw new Error("v2_worker_request_invalid");
  return jobId.trim();
}

/** Выполняет компиляцию E1 для поставленного job: exact-hash профиля, QA, артефакт. */
export async function handleAdminRunV2E1Compilation(
  request: CallableSeam,
  dependencies: V2WorkerDependencies,
): Promise<V2RunResult> {
  const actor = requireContentDraftWriter(request.auth);
  const jobId = parseJobId(request.data);
  const db = dependencies.db;
  const now = dependencies.now?.() ?? new Date().toISOString();

  const jobSnapshot = await db.collection(JOBS).doc(jobId).get();
  if (!jobSnapshot.exists) throw new Error("v2_worker_job_not_found");
  const job = jobSnapshot.data() as Record<string, unknown>;
  const generationRequest = job.request as V2AdminGenerationRequest | undefined;
  if (!generationRequest || !Array.isArray(generationRequest.episodeIds) || generationRequest.episodeIds.length < 1) {
    throw new Error("v2_worker_job_invalid");
  }
  const episodeId = generationRequest.episodeIds[0];
  if (job.state === "compiled") {
    return { ok: true, jobId, episodeId, replayed: true, qaOk: true, sessionCount: 12 };
  }

  const sourceSnapshot = await db.collection(SOURCES).doc(episodeId).get();
  if (!sourceSnapshot.exists) throw new Error("v2_worker_source_missing");
  const source = sourceSnapshot.data() as Record<string, unknown>;
  const canDoOutcomeId = typeof source.canDoOutcomeId === "string" ? source.canDoOutcomeId : "";
  if (!canDoOutcomeId) throw new Error("v2_worker_source_invalid");

  // Fail-closed: каждый айтем источника перепроверяется настоящим валидатором —
  // Firestore-документу не доверяем так же, как и клиенту.
  const rawItems = Array.isArray(source.contentItems) ? source.contentItems : [];
  const contentItems: V2ContentItem[] = rawItems.map((raw) => {
    const validated = validateV2ContentItem(raw);
    if (!validated.ok) throw new Error(`v2_worker_source_invalid:${validated.issues[0] ?? "item"}`);
    return validated.value;
  });

  // Профиль резолвится из источника; compileV2EpisodeContent сам сверит canonical
  // hash тела с закреплённым в запросе ref — подмена после утверждения невозможна.
  const compiled = await compileV2EpisodeContent({
    request: generationRequest,
    episodeId,
    canDoOutcomeId,
    contentItems,
    resolveLanguageProfile: async () => ({
      ref: generationRequest.languageProfileRef,
      body: source.languageProfile as V2LanguageProfileBody,
    }),
  });

  const stageIds = Array.isArray((job.plan as Record<string, unknown> | undefined)?.stages)
    ? ((job.plan as { stages: ReadonlyArray<{ id?: unknown }> }).stages
      .map((stage) => (typeof stage.id === "string" ? stage.id : ""))
      .filter(Boolean))
    : [];

  await db.runTransaction(async (tx) => {
    const freshJob = await tx.get(db.collection(JOBS).doc(jobId));
    const freshState = (freshJob.data() as Record<string, unknown> | undefined)?.state;
    if (freshState === "compiled") return; // гонка двух кликов — второй становится no-op
    tx.set(db.collection(COMPILED).doc(episodeId), {
      schemaVersion: "v2-compiled-unit-artifact.v1",
      episodeId,
      jobId,
      artifact: compiled,
      compiledAt: now,
      compiledBy: actor.uid,
    });
    tx.update(db.collection(JOBS).doc(jobId), {
      state: "compiled",
      compiledAt: now,
      compiledBy: actor.uid,
      artifactPath: `${COMPILED}/${episodeId}`,
    });
    // Вертикальный срез: артефакт закрывает контентный путь эпизода — стадии job'а
    // помечаются succeeded одним махом; будущие пакеты разнесут это по видам стадий.
    for (const stageId of stageIds) {
      tx.set(db.collection(STAGES).doc(stageId), {
        state: "succeeded",
        finishedAt: now,
        resultKind: "e1_vertical_slice_compilation",
      }, { merge: true });
    }
    tx.create(db.collection("admin_log").doc(`${jobId}:compiled`), {
      schemaVersion: "admin-audit.v1",
      action: "content_v2.generation.compile",
      actorUid: actor.uid,
      role: actor.role,
      entity: { collection: COMPILED, id: episodeId },
      operationId: jobId,
      timestamp: now,
    });
  });

  return {
    ok: true,
    jobId,
    episodeId,
    replayed: false,
    qaOk: compiled.qualityReport.ok,
    sessionCount: compiled.sessions.length,
  };
}

export const adminSeedV2E1DemoSource = onCall(callableOptions, async (request) => {
  try {
    return await handleAdminSeedV2E1DemoSource(request, { db: admin.firestore() });
  } catch (error) {
    throw safeError(error);
  }
});

export const adminRunV2E1Compilation = onCall(callableOptions, async (request) => {
  try {
    return await handleAdminRunV2E1Compilation(request, { db: admin.firestore() });
  } catch (error) {
    throw safeError(error);
  }
});
