// ════════════════════════════════════════════════════════════════════════════
// openai_jobs_config.ts — админ-тюнинг моделей/капов/выключателей для платных
// OpenAI-функций weekly_review / stats_insights / explain_phrase.
//
// Зачем: эти функции жёстко зашивали модель и дневные капы в код (правка =
// передеплой). Здесь — тот же паттерн, что у диалога (admin_runtime_config),
// но для «джобов». Один Firestore-док `admin_runtime_config/openai_jobs`,
// один admin-CF `openAiJobsConfig` (get/set). Сервер читает через
// resolveJobConfig(); ПРИ ОТСУТСТВИИ дока поведение НЕ меняется — fallback на
// текущие хардкод-дефолты каждой функции.
//
// Также даёт kill-switch: enabled=false → функция мгновенно перестаёт жечь
// OpenAI (аварийный стоп расходов без передеплоя).
// ════════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const CONFIG_COLLECTION = 'admin_runtime_config';
const CONFIG_DOC = 'openai_jobs';

/** Идентификаторы джобов. dialog здесь — ТОЛЬКО для kill-switch (модель/квоты у него свой док). */
export type OpenAiJob = 'weekly' | 'stats' | 'explain' | 'dialog' | 'choice' | 'compass' | 'quiz' | 'help_board' | 'digest' | 'support' | 'constellations' | 'content_factory' | 'image_assets';
export const OPENAI_JOBS: readonly OpenAiJob[] = ['weekly', 'stats', 'explain', 'dialog', 'choice', 'compass', 'quiz', 'help_board', 'digest', 'support', 'constellations', 'content_factory', 'image_assets'];

export const ALLOWED_JOB_MODELS = [
  'gpt-4.1-nano',
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-4o-mini',
] as const;
const ALLOWED_IMAGE_JOB_MODELS = ['gpt-image-1'] as const;
export type JobModel = (typeof ALLOWED_JOB_MODELS)[number] | (typeof ALLOWED_IMAGE_JOB_MODELS)[number];

const DAILY_CAP_MAX = 1_000_000;

/**
 * Дефолты на каждый джоб = текущие хардкод-значения в коде функций.
 * globalDailyCap=0 означает «глобального дневного капа нет» (как у weekly/dialog).
 * Менять эти числа здесь НЕЛЬЗЯ ради тюнинга — это fallback; тюнинг через Firestore.
 */
interface JobDefaults {
  model: JobModel;
  globalDailyCap: number; // 0 = без глобального капа
}
const JOB_DEFAULTS: Record<OpenAiJob, JobDefaults> = {
  weekly: { model: 'gpt-4o-mini', globalDailyCap: 0 },
  stats: { model: 'gpt-4o-mini', globalDailyCap: 5000 },
  explain: { model: 'gpt-4o-mini', globalDailyCap: 3000 },
  dialog: { model: 'gpt-4.1-nano', globalDailyCap: 0 },
  choice: { model: 'gpt-4o-mini', globalDailyCap: 3000 },
  // Непрерывающий пост Компаса в лиговом чате; не связан с удалённой Home-модалкой.
  compass: { model: 'gpt-4.1-nano', globalDailyCap: 5000 },
  // Тематические квизы: батч-«разбор» 1-на-вопрос (вопросов мало, повторяются между учениками) →
  // кэш прогревается быстро. Та же дешёвая модель и кап, что у choice (родственная фича).
  quiz: { model: 'gpt-4o-mini', globalDailyCap: 3000 },
  help_board: { model: 'gpt-4.1-nano', globalDailyCap: 1000 },
  // Дайджест для владельца: раз в сутки, один вызов на весь проект. Кап символический
  // (несколько ручных перегенераций в день максимум). Модель поумнее — сводка должна
  // осмысленно расставлять приоритеты, а не просто пересчитывать.
  digest: { model: 'gpt-4.1-mini', globalDailyCap: 50 },
  // Ответы поддержки: дешёвая модель, один вызов на черновик. Кап скромный —
  // писем поддержки у инди немного, а «сгенерировать всем» ограничено 25 за клик.
  support: { model: 'gpt-4o-mini', globalDailyCap: 500 },
  // Квизы «Созвездий»: генерация вопросов с судьёй-валидатором дистракторов.
  // Дешёвая модель, щедрый кап (кэш досыпается фоном), kill-switch → только кэш+банк.
  constellations: { model: 'gpt-4o-mini', globalDailyCap: 3000 },
  content_factory: { model: 'gpt-4.1-mini', globalDailyCap: 500 },
  image_assets: { model: 'gpt-image-1', globalDailyCap: 40 },
};

export interface JobConfig {
  model: JobModel;
  globalDailyCap: number;
  enabled: boolean;
}

function text(value: unknown, max = 120): string {
  return String(value ?? '').trim().slice(0, max);
}

function isAllowedJob(value: unknown): value is OpenAiJob {
  return (OPENAI_JOBS as readonly string[]).includes(text(value, 20));
}

function allowedModelsForJob(job: OpenAiJob): readonly JobModel[] {
  return job === 'image_assets' ? ALLOWED_IMAGE_JOB_MODELS : ALLOWED_JOB_MODELS;
}

function normalizeModel(value: unknown, fallback: JobModel, allowedModels: readonly JobModel[]): JobModel {
  const m = text(value, 80);
  return (allowedModels as readonly string[]).includes(m) ? (m as JobModel) : fallback;
}

function normalizeCap(value: unknown, fallback: number): number {
  const raw = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  const n = typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(DAILY_CAP_MAX, Math.max(0, Math.floor(n)));
}

function jobFromData(job: OpenAiJob, data: FirebaseFirestore.DocumentData | undefined): JobConfig {
  const d = (data && typeof data === 'object' ? (data as Record<string, unknown>)[job] : undefined) as
    | Record<string, unknown>
    | undefined;
  const def = JOB_DEFAULTS[job];
  const allowedModels = allowedModelsForJob(job);
  return {
    model: normalizeModel(d?.model, def.model, allowedModels),
    globalDailyCap: normalizeCap(d?.globalDailyCap, def.globalDailyCap),
    // enabled по умолчанию TRUE (kill-switch семантика): фича работает, выключается вручную.
    enabled: d?.enabled === false ? false : true,
  };
}

/**
 * Резолвит конфиг джоба (model+cap+enabled) из Firestore с fallback на дефолты.
 * НИКОГДА не бросает: при ошибке/отсутствии дока возвращает дефолты (поведение
 * как до фичи). Один get на вызов функции — дешёво, кэшировать не обязательно.
 */
export async function resolveJobConfig(
  db: FirebaseFirestore.Firestore,
  job: OpenAiJob,
): Promise<JobConfig> {
  try {
    const snap = await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
    return jobFromData(job, snap.data());
  } catch (e) {
    console.warn('resolveJobConfig failed, using fallback', job, e);
    return jobFromData(job, undefined);
  }
}

/** Бросает resource-exhausted, если джоб выключен админом. Вызывать в начале CF. */
export function assertJobEnabled(cfg: JobConfig, job: OpenAiJob): void {
  if (!cfg.enabled) {
    throw new HttpsError('resource-exhausted', `${job}_disabled_by_admin`);
  }
}

// ── Admin CF: чтение/запись конфига всех джобов ─────────────────────────────
export const openAiJobsConfig = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const db = admin.firestore();
  const ref = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC);
  const action = text(request.data?.action, 20) || 'get';

  if (action === 'set') {
    const job = request.data?.job;
    if (!isAllowedJob(job)) throw new HttpsError('invalid-argument', 'unsupported_job');
    const def = JOB_DEFAULTS[job];
    const allowedModels = allowedModelsForJob(job);
    const prevSnap = await ref.get();
    const prev = jobFromData(job, prevSnap.data());
    const next: JobConfig = {
      model: request.data?.model == null ? prev.model : normalizeModel(request.data.model, def.model, allowedModels),
      globalDailyCap:
        request.data?.globalDailyCap == null
          ? prev.globalDailyCap
          : normalizeCap(request.data.globalDailyCap, def.globalDailyCap),
      enabled: request.data?.enabled == null ? prev.enabled : request.data.enabled !== false,
    };
    await ref.set(
      {
        [job]: next,
        allowedModels: {
          text: ALLOWED_JOB_MODELS,
          image_assets: ALLOWED_IMAGE_JOB_MODELS,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAtMs: Date.now(),
        updatedBy: text(request.auth?.token?.email, 200) || 'admin',
      },
      { merge: true },
    );
  } else if (action !== 'get') {
    throw new HttpsError('invalid-argument', 'unsupported_action');
  }

  const snap = await ref.get();
  const jobs: Record<string, JobConfig> = {};
  for (const j of OPENAI_JOBS) jobs[j] = jobFromData(j, snap.data());

  return {
    ok: true,
    jobs,
    defaults: JOB_DEFAULTS,
    allowedModels: {
      text: ALLOWED_JOB_MODELS,
      image_assets: ALLOWED_IMAGE_JOB_MODELS,
    },
    updatedAtMs: Number(snap.data()?.updatedAtMs || 0),
  };
});
