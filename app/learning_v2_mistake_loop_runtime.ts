import type { MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
} from './account_generation';
import { getStableId as getStableIdDefault } from './stable_id';
import {
  loadMistakeEventJournal,
} from './mistake_practice_store';
import type { MistakeEventJournal } from './mistake_practice_cloud_merge';
import { reconcileMutableMistakeContent } from './mistake_practice_content_reconciliation';

type Dependencies = Readonly<{
  getStableId?: () => Promise<string>;
  loadJournal?: typeof loadMistakeEventJournal;
  reconcile?: typeof reconcileMutableMistakeContent;
}>;

export async function loadLearningV2MistakeLoopCount(input: Readonly<{
  studyTarget: MistakeStudyTarget;
  lessonId: string;
  nowMs?: number;
  onReady?: (count: number) => void;
}>, dependencies: Dependencies = {}): Promise<number | null> {
  const accountScope = await (dependencies.getStableId ?? getStableIdDefault)();
  const generation = captureAccountGeneration();
  const current = () => isCurrentAccountGeneration(generation, accountScope);
  if (!current()) return null;
  const loadedJournal = await (dependencies.loadJournal ?? loadMistakeEventJournal)({
    accountScope,
    studyTarget: input.studyTarget,
  });
  if (!current()) return null;
  const reconciled = await (dependencies.reconcile ?? reconcileMutableMistakeContent)({
    accountScope,
    studyTarget: input.studyTarget,
    journal: loadedJournal as MistakeEventJournal,
  });
  if (!current()) return null;
  const nowMs = input.nowMs ?? Date.now();
  const count = [...projectMistakes(reconciled.journal.events).items.values()].filter((item) =>
    item.lessonId === input.lessonId
    && item.status === 'active'
    && item.dueAtMs <= nowMs,
  ).length;
  if (!current()) return null;
  input.onReady?.(count);
  return count;
}
