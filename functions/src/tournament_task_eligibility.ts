import { TOURNAMENT_MODES } from './tournament_pool_plan';
import {
  validateTournamentTaskForNewRoom,
  type TournamentTask,
} from './tournament_core';

type TournamentTaskSnapshot = {
  id: string;
  data(): FirebaseFirestore.DocumentData;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function eligibleTournamentCellCounts(docs: TournamentTaskSnapshot[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const mode of TOURNAMENT_MODES) {
    for (const difficulty of [1, 2, 3]) counts[`${mode}:${difficulty}`] = 0;
  }
  for (const doc of docs) {
    const data = doc.data();
    const task: TournamentTask = {
      taskId: doc.id,
      mode: typeof data.mode === 'string' ? data.mode : '',
      isVoice: data.isVoice === true,
      difficulty: Number(data.difficulty),
      payload: isRecord(data.payload) ? data.payload : {},
      explanation: isRecord(data.explanation)
        ? {
          ruleNote: String(data.explanation.ruleNote ?? ''),
          example: String(data.explanation.example ?? ''),
          // New rooms require a reason for every wrong option.  Preserve the
          // stored array while checking eligibility instead of silently
          // reconstructing an older, incomplete explanation shape.
          ...(Array.isArray(data.explanation.wrongOptionReasons)
            ? { wrongOptionReasons: data.explanation.wrongOptionReasons }
            : {}),
        }
        : undefined,
      tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      verified: data.verified === true,
    };
    if (data.source !== 'ai' || !validateTournamentTaskForNewRoom(task).ok) continue;
    const key = `${task.mode}:${task.difficulty}`;
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

export async function loadEligibleTournamentCellCounts(
  collection: FirebaseFirestore.CollectionReference,
): Promise<Record<string, number>> {
  const snap = await collection.where('verified', '==', true).where('source', '==', 'ai').get();
  return eligibleTournamentCellCounts(snap.docs);
}
