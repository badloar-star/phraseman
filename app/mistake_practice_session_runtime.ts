import type { MistakeFacet, MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';
import {
  buildMistakePracticeSession,
  mistakePracticeRequestMismatch,
  mistakePracticeRequestOf,
  type MistakePracticeLength,
  type MistakePracticePool,
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
  /**
   * зачем (§123, координатор 04.10): НОВУЮ сессию не сохранять здесь — экран сохранит её
   * через commitPreparedMistakePracticeSession только после списания энергии. Иначе отмена окна
   * энергии (или закрытое приложение) оставляла сохранённую сессию, и следующий вход шёл
   * «продолжением» бесплатно.
   */
  deferNewSessionSave?: boolean;
  lessonId?: string;
  focusMistakeId?: string;
  /** Сузить НОВУЮ сессию до типов ошибок (окно «Перед отработкой»); без параметра — как раньше. Сохранённая сессия возобновляется как есть. */
  facets?: readonly MistakeFacet[];
  /** зачем (владелец 04.10): 'corrected' — повтор исправленных для закрепления; без параметра — как раньше. */
  pool?: MistakePracticePool;
  /** «Ещё N» (координатор 04.10): только эти ошибки — неверные в прошлой сессии. Пусто — как раньше. */
  mistakeIds?: readonly string[];
  storage?: MistakePracticeStorage;
  nowMs?: number;
}>, dependencies: MutableMistakeContentDependencies = {}): Promise<Readonly<{
  session: MistakePracticeSession;
  resumed: boolean;
  unavailableCount: number;
  /** true — новая сессия ещё не сохранена (deferNewSessionSave); её сохраняет экран после оплаты. */
  needsSave: boolean;
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
  // «Ещё N» (mistakeIds) — всегда обычная отработка, pool игнорируется (см. session.ts).
  const requestedPool: MistakePracticePool = (input.mistakeIds?.length ?? 0) > 0 ? 'active' : input.pool ?? 'active';
  const restoredPool: MistakePracticePool = restored?.pool ?? 'active';
  // зачем (повтор исправленных, 04.10): в повторе очередь из исправленных, а ошибка в повторе
  // возвращает ошибку в активные и её переспрашивают — обе стадии законны. Обычная сессия — только активные.
  const retryRequested = (input.mistakeIds?.length ?? 0) > 0;
  // зачем (координатор 13.10, mistakes-panel-017): продолжать только сессию ТОГО ЖЕ запроса — иначе «Все 12» продолжало
  // сохранённую сессию группы из одной ошибки. У старых сессий запроса нет — продолжаются как раньше.
  const requested = mistakePracticeRequestOf(input.requestedLength, input.facets);
  const requestMismatch = restored ? mistakePracticeRequestMismatch(restored.request, requested) : null;
  // зачем: «Ещё N» просит НОВУЮ сессию из конкретных ошибок — продолжать прежнюю вместо неё нельзя.
  const restoredStillAvailable = !retryRequested && requestMismatch === null && restoredPool === requestedPool && restored?.queue.slice(restored.cursor).every((entry) => {
    const item = projection.items.get(entry.mistakeId);
    if (item?.cycleId !== entry.cycleId) return false;
    return restoredPool === 'corrected'
      ? item.status === 'corrected' || item.status === 'active'
      : item.status === 'active';
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
    facets: input.facets ?? null,
    requestedPool,
    restoredPool: restored ? restoredPool : null,
    projectionItems: projection.items.size,
    unavailableCount: reconciled.unavailableCount,
    restoredFound: restored !== null,
    restoredCursor: restored?.cursor ?? null,
    restoredQueueLength: restored?.queue.length ?? null,
    restoredInitialCount: restored?.initialCount ?? null,
    restoredRequest: restored ? (restored.request ?? 'нет (сессия до 13.10)') : null,
    requested,
    requestMismatch,
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
      needsSave: false,
    });
  }
  if (restored && input.persistSession) {
    console.log('[MISTAKE-PRACTICE-PREPARE] dropping stored session', JSON.stringify({
      reason: restored.cursor >= restored.queue.length
        ? 'already_finished'
        : restoredPool !== requestedPool
          ? `pool_mismatch:${restoredPool}->${requestedPool}`
          : requestMismatch !== null
            ? `request_mismatch:${requestMismatch}`
            : retryRequested
              ? 'retry_requested'
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
  if (retryRequested) {
    const requested = new Set(input.mistakeIds);
    const known = items.filter((item) => requested.has(item.mistakeId));
    const eligible = known.filter((item) => (requestedPool === 'corrected' ? item.status === 'corrected' : item.status === 'active'));
    console.log('[MISTAKE-RETRY] prepare', JSON.stringify({
      requested: requested.size,
      foundInJournal: known.length,
      eligibleInPool: eligible.length,
      pool: requestedPool,
      statuses: known.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.status]: (acc[item.status] ?? 0) + 1 }), {}),
      emptyReason: eligible.length > 0 ? null : known.length === 0 ? 'ids_not_in_journal' : 'none_in_pool',
    }));
  }
  const session = buildMistakePracticeSession({
    items,
    requestedLength: input.requestedLength,
    nowMs: input.nowMs ?? Date.now(),
    focusMistakeId: input.focusMistakeId,
    facets: input.facets,
    pool: requestedPool,
    mistakeIds: input.mistakeIds,
  });
  const deferSave = input.persistSession && input.deferNewSessionSave === true;
  if (input.persistSession && !deferSave) {
    await saveMistakePracticeSession({ ...input, session });
    accountFence.assertCurrent();
  }
  console.log('[MISTAKE-PRACTICE-PREPARE] new session', JSON.stringify({
    sessionId: session.sessionId, initialCount: session.initialCount, savedNow: input.persistSession && !deferSave, deferSave,
  }));
  return Object.freeze({
    session,
    resumed: false,
    unavailableCount: reconciled.unavailableCount,
    needsSave: deferSave,
  });
}

/**
 * Сохранить новую сессию, подготовленную с deferNewSessionSave, — когда за неё уже заплачено
 * (или она бесплатная). Только тогда следующий вход вправе «продолжить» её без списания.
 */
export async function commitPreparedMistakePracticeSession(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  session: MistakePracticeSession;
  storage?: MistakePracticeStorage;
}>): Promise<void> {
  const accountFence = captureMistakePracticeSessionAccountFence(input.accountScope);
  await saveMistakePracticeSession(input);
  accountFence.assertCurrent();
}
