import type {
  PlanAudioGenerationJob,
  PlanAudioGenerationBlocker,
} from './personal_plan_audio_generation_jobs';
import type { PlanAudioAssetProvider } from './personal_plan_audio_asset_readiness';
import { PERSONAL_PLAN_CATALOG, type PersonalPlanId, type PlanDailyTask } from './personal_plan_catalog';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';

export type PersonalPlanRuntimeAudioGenerationPlanInput = {
  provider?: PlanAudioAssetProvider;
  voiceId: string;
  outputRoot: string;
};

export type PersonalPlanRuntimeAudioGenerationPlanSummary = {
  plans: number;
  listeningTaskReferences: number;
  uniqueAudioJobs: number;
  blockers: number;
};

export type PersonalPlanRuntimeAudioGenerationPlanPlanSummary = {
  planId: PersonalPlanId;
  listeningTaskReferences: number;
  uniqueAudioJobs: number;
};

export type PersonalPlanRuntimeAudioGenerationPlan = {
  kind: 'personal_plan_runtime_audio_generation_plan';
  provider: PlanAudioAssetProvider;
  voiceId: string;
  outputRoot: string;
  weekId: 'runtime';
  productionReady: false;
  readyForLive: false;
  audioApprovalReady: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  summary: PersonalPlanRuntimeAudioGenerationPlanSummary;
  planSummaries: PersonalPlanRuntimeAudioGenerationPlanPlanSummary[];
  jobs: PlanAudioGenerationJob[];
  blockers: PlanAudioGenerationBlocker[];
};

type RuntimeAudioCandidate = {
  planId: PersonalPlanId;
  dayIndex: number;
  exerciseType: 'plan_listen_choose' | 'plan_listen_build';
  contentUnitIds: string[];
  targetText: string;
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanPathPart(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/\/+$/g, '');
}

function isListeningTask(task: PlanDailyTask): task is PlanDailyTask & {
  kind: 'plan_listen_choose' | 'plan_listen_build';
  destination: Extract<PlanDailyTask['destination'], { type: 'plan_exercise' }>;
} {
  return (
    (task.kind === 'plan_listen_choose' || task.kind === 'plan_listen_build') &&
    task.destination.type === 'plan_exercise'
  );
}

function blocker(reason: PlanAudioGenerationBlocker['reason']): PlanAudioGenerationBlocker {
  return {
    reason,
    issueCodes: [],
  };
}

function inputBlockers(input: PersonalPlanRuntimeAudioGenerationPlanInput): PlanAudioGenerationBlocker[] {
  const blockers: PlanAudioGenerationBlocker[] = [];
  if (!hasText(input.voiceId)) blockers.push(blocker('missing_voice_id'));
  if (!hasText(input.outputRoot)) blockers.push(blocker('missing_output_root'));
  return blockers;
}

function collectCandidates(): {
  candidates: RuntimeAudioCandidate[];
  planSummaries: PersonalPlanRuntimeAudioGenerationPlanPlanSummary[];
} {
  const candidates: RuntimeAudioCandidate[] = [];
  const planSummaries: PersonalPlanRuntimeAudioGenerationPlanPlanSummary[] = [];

  for (const plan of PERSONAL_PLAN_CATALOG) {
    let listeningTaskReferences = 0;
    const uniqueTargetTexts = new Set<string>();

    for (const day of plan.days) {
      for (const task of day.tasks) {
        if (!isListeningTask(task)) continue;

        const lesson = getPersonalPlanPhraseLesson(task.destination.lessonId);
        for (const contentUnitId of task.destination.contentUnitIds) {
          const phrase = lesson?.phrases.find((item) => String(item.id) === contentUnitId);
          listeningTaskReferences += 1;
          if (!phrase) continue;

          uniqueTargetTexts.add(phrase.english.trim().toLowerCase());
          candidates.push({
            planId: plan.id,
            dayIndex: day.dayIndex,
            exerciseType: task.kind,
            contentUnitIds: [contentUnitId],
            targetText: phrase.english,
          });
        }
      }
    }

    planSummaries.push({
      planId: plan.id,
      listeningTaskReferences,
      uniqueAudioJobs: uniqueTargetTexts.size,
    });
  }

  return { candidates, planSummaries };
}

function dedupeCandidates(candidates: RuntimeAudioCandidate[]): RuntimeAudioCandidate[] {
  const byPlanAndText = new Map<string, RuntimeAudioCandidate>();
  const unique: RuntimeAudioCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.planId}:${candidate.targetText.trim().toLowerCase()}`;
    const existing = byPlanAndText.get(key);
    if (existing) {
      existing.contentUnitIds = [...new Set([...existing.contentUnitIds, ...candidate.contentUnitIds])];
      continue;
    }

    const next = {
      ...candidate,
      contentUnitIds: [...candidate.contentUnitIds],
    };
    byPlanAndText.set(key, next);
    unique.push(next);
  }

  return unique;
}

function jobForCandidate(
  candidate: RuntimeAudioCandidate,
  input: Required<Pick<PersonalPlanRuntimeAudioGenerationPlanInput, 'provider' | 'voiceId' | 'outputRoot'>>,
): PlanAudioGenerationJob {
  const planId = candidate.planId;
  const weekId = 'runtime';
  const primaryContentUnitId = candidate.contentUnitIds[0];
  const daySlug = `${planId}_d${String(candidate.dayIndex).padStart(3, '0')}`;
  const blockSlug = slug(`${daySlug}_listen_audio`);
  const unitSlug = slug(primaryContentUnitId);
  const outputRoot = cleanPathPart(input.outputRoot);
  const outputPath = `${outputRoot}/${planId}/${weekId}/${blockSlug}/${unitSlug}.mp3`;
  const expectedAssetId = `audio:${planId}:${weekId}:${blockSlug}:${unitSlug}`;

  return {
    id: `audio-job:${planId}:${weekId}:${blockSlug}:${unitSlug}`,
    planId,
    weekId,
    blockId: `${daySlug}:listen-audio`,
    exerciseType: candidate.exerciseType,
    contentUnitId: primaryContentUnitId,
    contentUnitIds: [...candidate.contentUnitIds],
    targetText: candidate.targetText,
    sourceBlockTargetText: candidate.targetText,
    provider: input.provider,
    voiceId: input.voiceId.trim(),
    outputPath,
    expectedAssetId,
    splitPolicy: 'per_content_unit',
    status: 'ready_to_generate',
  };
}

export function buildPersonalPlanRuntimeAudioGenerationPlan(
  input: PersonalPlanRuntimeAudioGenerationPlanInput,
): PersonalPlanRuntimeAudioGenerationPlan {
  const provider = input.provider ?? 'openai';
  const blockers = inputBlockers(input);
  const { candidates, planSummaries } = collectCandidates();
  const uniqueCandidates = dedupeCandidates(candidates);
  const jobs = blockers.length === 0
    ? uniqueCandidates.map((candidate) => jobForCandidate(candidate, {
      provider,
      voiceId: input.voiceId,
      outputRoot: input.outputRoot,
    }))
    : [];

  return {
    kind: 'personal_plan_runtime_audio_generation_plan',
    provider,
    voiceId: input.voiceId,
    outputRoot: input.outputRoot,
    weekId: 'runtime',
    productionReady: false,
    readyForLive: false,
    audioApprovalReady: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    summary: {
      plans: PERSONAL_PLAN_CATALOG.length,
      listeningTaskReferences: candidates.length,
      uniqueAudioJobs: jobs.length,
      blockers: blockers.length,
    },
    planSummaries,
    jobs,
    blockers,
  };
}
