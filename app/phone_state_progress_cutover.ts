import type { PersonalProgressApi } from '../modules/phone-state/domains/progress_api';
import type { PersonalProgressProjection } from '../modules/phone-state/domains/progress_projection';
import { assignPhoneStateCohort, getRemoteBool, getRemoteNumber } from './remote_flags';
import { publishPersonalProgressProjection } from './personal_progress_store';
import { isPhoneStateHealthCutoverAllowed } from './phone_state_health';

let progressApi: PersonalProgressApi | null = null;

export function configurePhoneStateProgressCutover(api: PersonalProgressApi | null): void {
  progressApi = api;
}

export function getPhoneStateProgressApi(): PersonalProgressApi | null {
  return progressApi;
}

export function isPhoneStateCutoverEnabled(stableUid: string | null): boolean {
  return Boolean(
    progressApi
    && stableUid
    && getRemoteBool('phone_state_sync_enabled')
    && !getRemoteBool('phone_state_emergency_stop')
    && isPhoneStateHealthCutoverAllowed()
    && assignPhoneStateCohort(stableUid, getRemoteNumber('phone_state_cutover_percent')),
  );
}

export async function tryGrantXpThroughPhoneState(
  stableUid: string | null,
  input: Parameters<PersonalProgressApi['grantXp']>[0],
): Promise<Awaited<ReturnType<PersonalProgressApi['grantXp']>> | null> {
  const api = progressApi;
  if (!api || !isPhoneStateCutoverEnabled(stableUid)) return null;
  try {
    const committed = await api.grantXp(input);
    publishPersonalProgressProjection(await api.read(), 'phone_state');
    return committed;
  } catch {
    // The caller continues through the existing durable local compatibility
    // path. Storage/sync failures are background diagnostics, never UI errors.
    return null;
  }
}

export async function trySubmitProgressThroughPhoneState(
  stableUid: string | null,
  input: Readonly<{
    eventId: string;
    type: string;
    payload: Readonly<Record<string, unknown>>;
  }>,
): Promise<PersonalProgressProjection | null> {
  const api = progressApi;
  if (!api || !isPhoneStateCutoverEnabled(stableUid) || input.type === 'wager_win') return null;
  try {
    if (input.type === 'lesson_complete') {
      const lessonId = input.payload.lessonId ?? input.payload.lessonNumber;
      if (typeof lessonId !== 'string' && typeof lessonId !== 'number') return null;
      const bestCandidate = Number(input.payload.bestPct ?? input.payload.bestScore);
      const bestPct = Number.isFinite(bestCandidate) ? bestCandidate : undefined;
      const projection = await api.completeLesson({
        eventId: input.eventId,
        lessonId: String(lessonId),
        ...(bestPct === undefined ? {} : { bestPct }),
      });
      publishPersonalProgressProjection(projection, 'phone_state');
      return projection;
    }
    if (input.type === 'exam_complete') {
      const examId = input.payload.examId ?? input.payload.level ?? input.payload.lessonId;
      const bestPct = Number(input.payload.bestPct ?? input.payload.pct ?? input.payload.score);
      if ((typeof examId !== 'string' && typeof examId !== 'number') || !Number.isFinite(bestPct)) {
        return null;
      }
      const projection = await api.completeExam({ eventId: input.eventId, examId: String(examId), bestPct });
      publishPersonalProgressProjection(projection, 'phone_state');
      return projection;
    }
    return api.read();
  } catch {
    return null;
  }
}
