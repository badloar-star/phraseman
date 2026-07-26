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

function parseRunInput(data: unknown): { readonly jobId: string } | { readonly direct: true } {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("v2_worker_request_invalid");
  const record = data as Record<string, unknown>;
  if (record.direct === true) return { direct: true };
  const jobId = record.jobId;
  if (typeof jobId !== "string" || !jobId.trim()) throw new Error("v2_worker_request_invalid");
  return { jobId: jobId.trim() };
}

const DIRECT_JOB_ID = "v2-e1-direct";

/** Выполняет компиляцию E1: exact-hash профиля, QA, артефакт.
 * Два пути: по jobId из очереди (полная дисциплина пинов) и прямой прогон
 * (direct: true) без очереди — для vertical slice, когда опубликованных шаблонов
 * режимов ещё нет; job-документ прямого прогона явно помечен mode:'direct_vertical_slice'. */
export async function handleAdminRunV2E1Compilation(
  request: CallableSeam,
  dependencies: V2WorkerDependencies,
): Promise<V2RunResult> {
  const actor = requireContentDraftWriter(request.auth);
  const input = parseRunInput(request.data);
  const db = dependencies.db;
  const now = dependencies.now?.() ?? new Date().toISOString();

  const directMode = "direct" in input;
  let jobId: string;
  let episodeId: string;
  let generationRequest: Pick<V2AdminGenerationRequest, "episodeIds" | "languageProfileRef"> | undefined;
  let stageIds: readonly string[] = [];

  if (directMode) {
    jobId = DIRECT_JOB_ID;
    episodeId = E1_DEMO_EPISODE_ID;
  } else {
    jobId = (input as { jobId: string }).jobId;
    const jobSnapshot = await db.collection(JOBS).doc(jobId).get();
    if (!jobSnapshot.exists) throw new Error("v2_worker_job_not_found");
    const job = jobSnapshot.data() as Record<string, unknown>;
    const storedRequest = job.request as V2AdminGenerationRequest | undefined;
    if (!storedRequest || !Array.isArray(storedRequest.episodeIds) || storedRequest.episodeIds.length < 1) {
      throw new Error("v2_worker_job_invalid");
    }
    episodeId = storedRequest.episodeIds[0];
    if (job.state === "compiled") {
      return { ok: true, jobId, episodeId, replayed: true, qaOk: true, sessionCount: 12 };
    }
    generationRequest = storedRequest;
    stageIds = Array.isArray((job.plan as Record<string, unknown> | undefined)?.stages)
      ? ((job.plan as { stages: ReadonlyArray<{ id?: unknown }> }).stages
        .map((stage) => (typeof stage.id === "string" ? stage.id : ""))
        .filter(Boolean))
      : [];
  }

  const sourceSnapshot = await db.collection(SOURCES).doc(episodeId).get();
  if (!sourceSnapshot.exists) throw new Error("v2_worker_source_missing");
  const source = sourceSnapshot.data() as Record<string, unknown>;
  const canDoOutcomeId = typeof source.canDoOutcomeId === "string" ? source.canDoOutcomeId : "";
  if (!canDoOutcomeId) throw new Error("v2_worker_source_invalid");

  if (directMode) {
    // Прямой прогон компилирует ровно текущий источник: пин профиля выводится из его
    // же честного canonical hash (совпадение проверит compileV2EpisodeContent).
    const profile = source.languageProfile as V2LanguageProfileBody;
    if (!profile || typeof profile !== "object") throw new Error("v2_worker_source_invalid");
    generationRequest = {
      episodeIds: [episodeId],
      languageProfileRef: {
        profileId: profile.profileId,
        version: profile.version,
        contentHash: hashCanonicalBody(profile),
      },
    };
  }

  // Fail-closed: каждый айтем источника перепроверяется настоящим валидатором —
  // Firestore-документу не доверяем так же, как и клиенту.
  const rawItems = Array.isArray(source.contentItems) ? source.contentItems : [];
  const contentItems: V2ContentItem[] = rawItems.map((raw) => {
    const validated = validateV2ContentItem(raw);
    if (!validated.ok) throw new Error(`v2_worker_source_invalid:${validated.issues[0] ?? "item"}`);
    return validated.value;
  });

  if (!generationRequest) throw new Error("v2_worker_request_invalid");
  const pinnedRequest = generationRequest;

  // Профиль резолвится из источника; compileV2EpisodeContent сам сверит canonical
  // hash тела с закреплённым в запросе ref — подмена после утверждения невозможна.
  const compiled = await compileV2EpisodeContent({
    request: pinnedRequest,
    episodeId,
    canDoOutcomeId,
    contentItems,
    resolveLanguageProfile: async () => ({
      ref: pinnedRequest.languageProfileRef,
      body: source.languageProfile as V2LanguageProfileBody,
    }),
  });

  await db.runTransaction(async (tx) => {
    const freshJob = await tx.get(db.collection(JOBS).doc(jobId));
    const freshState = (freshJob.data() as Record<string, unknown> | undefined)?.state;
    // Гонка двух кликов по job из очереди — второй становится no-op; прямой прогон
    // осознанно перекомпилирует текущий источник (результат детерминирован).
    if (!directMode && freshState === "compiled") return;
    tx.set(db.collection(COMPILED).doc(episodeId), {
      schemaVersion: "v2-compiled-unit-artifact.v1",
      episodeId,
      jobId,
      artifact: compiled,
      compiledAt: now,
      compiledBy: actor.uid,
    });
    if (directMode) {
      tx.set(db.collection(JOBS).doc(jobId), {
        schemaVersion: "v2-generation-job.v1",
        jobId,
        mode: "direct_vertical_slice",
        request: pinnedRequest,
        state: "compiled",
        compiledAt: now,
        compiledBy: actor.uid,
        artifactPath: `${COMPILED}/${episodeId}`,
      }, { merge: true });
    } else {
      tx.update(db.collection(JOBS).doc(jobId), {
        state: "compiled",
        compiledAt: now,
        compiledBy: actor.uid,
        artifactPath: `${COMPILED}/${episodeId}`,
      });
    }
    // Вертикальный срез: артефакт закрывает контентный путь эпизода — стадии job'а
    // помечаются succeeded одним махом; будущие пакеты разнесут это по видам стадий.
    for (const stageId of stageIds) {
      tx.set(db.collection(STAGES).doc(stageId), {
        state: "succeeded",
        finishedAt: now,
        resultKind: "e1_vertical_slice_compilation",
      }, { merge: true });
    }
    // Аудит: set (не create) — повторный прямой прогон обновляет запись, а не падает.
    tx.set(db.collection("admin_log").doc(`${jobId}:compiled:${now}`), {
      schemaVersion: "admin-audit.v1",
      action: "content_v2.generation.compile",
      actorUid: actor.uid,
      role: actor.role,
      entity: { collection: COMPILED, id: episodeId },
      operationId: jobId,
      directMode,
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
