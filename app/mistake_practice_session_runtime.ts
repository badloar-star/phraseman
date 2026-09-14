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
  // зачем (баг владельца 2026-09-14 «сразу 10/10»): решение возобновить или
  // построить сессию заново раньше принималось молча, и понять со слов
  // пользователя, ЧТО именно восстановилось, было невозможно. Лог печатает
  // сами значения, а не голые true/false.
  console.log('[MISTAKE-PRACTICE-PREPARE]', JSON.stringify({
    studyTarget: input.studyTarget,
    requestedLength: input.requestedLength,
    persistSession: input.persistSession,
    lessonId: input.lessonId ?? null,
    focusMistakeId: input.focusMistakeId ?? null,
    projectionItems: projection.items.size,
    unavailableCount: reconciled.unavailableCount,
    restoredFound: restored !== null,
    restoredCursor: restored?.cursor ?? null,
    restoredQueueLength: restored?.queue.length ?? null,
    restoredInitialCount: restored?.initialCount ?? null,
    restoredStillAvailable,
  }));
  if (restored && restored.cursor < restored.queue.length && restoredStillAvailable) {
    console.log('[MISTAKE-PRACTICE-PREPARE] resumed stored session', JSON.stringify({
      sessionId: restored.sessionId,
      cursor: restored.cursor,
      queueLength: restored.queue.length,
      initialCount: restored.initialCount,
      answeredAttempts: restored.answeredAttemptIds.length,
    }));
    return Object.freeze({
      session: restored,
      resumed: true,
      unavailableCount: reconciled.unavailableCount,
    });
  }
  if (restored && input.persistSession) {
    console.log('[MISTAKE-PRACTICE-PREPARE] dropping stored session', JSON.stringify({
      reason: restored.cursor >= restored.queue.length
        ? 'already_finished'
        : 'queue_items_no_longer_active',
      cursor: restored.cursor,
      queueLength: restored.queue.length,
    }));
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
