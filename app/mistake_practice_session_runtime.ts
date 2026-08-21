import type { MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';
import {
  buildMistakePracticeSession,
  type MistakePracticeLength,
  type MistakePracticeSession,
} from '../modules/mistake-practice/session';
import {
  reconcileMutableMistakeContent,
  type MutableMistakeContentDependencies,
} from './mistake_practice_content_reconciliation';
import {
  loadMistakeEventJournal,
  type MistakePracticeStorage,
} from './mistake_practice_store';
import {
  captureMistakePracticeSessionAccountFence,
  clearMistakePracticeSession,
  loadMistakePracticeSession,
  saveMistakePracticeSession,
} from './mistake_practice_session_store';

export async function prepareMistakePracticeSession(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  requestedLength: MistakePracticeLength;
  persistSession: boolean;
  lessonId?: string;
  focusMistakeId?: string;
  storage?: MistakePracticeStorage;
  nowMs?: number;
}>, dependencies: MutableMistakeContentDependencies = {}): Promise<Readonly<{
  session: MistakePracticeSession;
  resumed: boolean;
  unavailableCount: number;
}>> {
  const accountFence = captureMistakePracticeSessionAccountFence(input.accountScope);
  const loadedJournal = await loadMistakeEventJournal(input);
  accountFence.assertCurrent();
  const reconciled = await reconcileMutableMistakeContent({
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
    journal: loadedJournal,
    storage: input.storage,
  }, dependencies);
  accountFence.assertCurrent();
  const projection = projectMistakes(reconciled.journal.events);
  const restored = input.persistSession
    ? await loadMistakePracticeSession(input)
    : null;
  accountFence.assertCurrent();
  const restoredStillAvailable = restored?.queue.slice(restored.cursor).every((entry) => {
    const item = projection.items.get(entry.mistakeId);
    return item?.cycleId === entry.cycleId && item.status === 'active';
  }) === true;
  if (restored && restored.cursor < restored.queue.length && restoredStillAvailable) {
    return Object.freeze({
      session: restored,
      resumed: true,
      unavailableCount: reconciled.unavailableCount,
    });
  }
  if (restored && input.persistSession) {
    await clearMistakePracticeSession(input);
    accountFence.assertCurrent();
  }
  const items = [...projection.items.values()].filter((item) =>
    !input.lessonId || item.lessonId === input.lessonId,
  );
  const session = buildMistakePracticeSession({
    items,
    requestedLength: input.requestedLength,
    nowMs: input.nowMs ?? Date.now(),
    focusMistakeId: input.focusMistakeId,
  });
  if (input.persistSession) {
    await saveMistakePracticeSession({ ...input, session });
    accountFence.assertCurrent();
  }
  return Object.freeze({
    session,
    resumed: false,
    unavailableCount: reconciled.unavailableCount,
  });
}
