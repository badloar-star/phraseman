// ════════════════════════════════════════════════════════════════════════════
// mistake_practice_answer_journal.ts — журнал ответов «Моих ошибок»: вердикт сразу, запись фоном (§126)
//
// зачем (разбор обращений, 1.6.19: «Мои ошибки» 15–18 с на ответ): экран ждал запись журнала (кусок, страница, корень, чистка графа,
// факт в phone-state) ПРЕЖДЕ чем показать вердикт. Optimistic UI: событие сразу сливается в журнал в памяти, вердикт и серия
// считаются из него без обращения к хранилищу, а запись идёт фоном по ОДНОЙ очереди (порядок событий сохраняется).
// Защита от гонок: следующий ответ берёт журнал из памяти (не из хранилища, где предыдущая запись может ещё не лежать); чтение из
// хранилища всегда ждёт очередь; награды и финал ждут запись (afterWrites/whenIdle). Откат при ошибке: событие НЕ теряется —
// остаётся в «несохранённых» и уходит вместе со следующей записью; после повторов ошибка пишется в лог, память журнала
// сбрасывается (следующее чтение возьмёт правду из хранилища). Идемпотентность: eventId детерминирован по попытке.
// Логи: [MISTAKES-GATE] journal:* (загрузка, запись, повтор, каждый catch).
// ════════════════════════════════════════════════════════════════════════════

import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { mergeMistakeEventJournals, type MistakeEventJournal } from './mistake_practice_cloud_merge';
import { loadMistakeEventJournal, mergeMistakeEvents } from './mistake_practice_store';

type StudyTarget = 'en' | 'fr';

export type MistakeAnswerJournalDeps = Readonly<{
  load: (input: { accountScope: string; studyTarget: StudyTarget }) => Promise<MistakeEventJournal>;
  merge: (input: { accountScope: string; studyTarget: StudyTarget; events: readonly MistakeEvent[] }) => Promise<unknown>;
  wait: (ms: number) => Promise<void>;
  now: () => number;
}>;

const defaultDeps: MistakeAnswerJournalDeps = {
  load: loadMistakeEventJournal,
  merge: mergeMistakeEvents,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: Date.now,
};

const RETRY_DELAY_MS = 1_500;
const WRITE_ATTEMPTS = 2;
const TAG = '[MISTAKES-GATE]';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type MistakeAnswerJournal = Readonly<{
  /** Журнал для расчёта вердикта: из памяти, а при первом обращении — из хранилища (после ожидания очереди записи). */
  current: () => Promise<MistakeEventJournal>;
  /** Мгновенно сливает событие в журнал в памяти и ставит фоновую запись. done → true, если событие записано. */
  record: (event: MistakeEvent) => Readonly<{ journal: MistakeEventJournal; done: Promise<boolean> }>;
  /** Выполнить после очереди записи (очередь не рвётся от упавшей записи). */
  afterWrites: <T>(task: () => Promise<T> | T) => Promise<T>;
  /** Ждёт все поставленные записи. */
  whenIdle: () => Promise<void>;
  /** Забыть журнал в памяти (после записей мимо этого объекта: скрыть/вернуть ошибку). */
  invalidate: () => void;
}>;

export function createMistakeAnswerJournal(
  scope: Readonly<{ accountScope: string; studyTarget: StudyTarget }>,
  deps: MistakeAnswerJournalDeps = defaultDeps,
): MistakeAnswerJournal {
  let memory: MistakeEventJournal | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  let unsaved: MistakeEvent[] = [];

  const whenIdle = async (): Promise<void> => {
    await queue.catch(() => undefined);
  };

  const current = async (): Promise<MistakeEventJournal> => {
    if (memory) return memory;
    await whenIdle();
    if (memory) return memory;
    const started = deps.now();
    const loaded = await deps.load(scope);
    console.warn(`${TAG} journal:loaded events=${loaded.events.length} ms=${deps.now() - started} source=storage`);
    // запись могла поставиться, пока читали: журнал в памяти (с ней) главнее прочитанного
    memory = memory ?? loaded;
    return memory;
  };

  const writeWithRetry = async (events: readonly MistakeEvent[]): Promise<boolean> => {
    for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt += 1) {
      const started = deps.now();
      try {
        await deps.merge({ ...scope, events });
        console.warn(`${TAG} journal:written events=${events.length} attempt=${attempt} ms=${deps.now() - started}`);
        return true;
      } catch (error) {
        console.warn(`${TAG} journal:write:catch attempt=${attempt}/${WRITE_ATTEMPTS} events=${events.length} ms=${deps.now() - started}`, errorText(error));
        if (attempt < WRITE_ATTEMPTS) await deps.wait(RETRY_DELAY_MS);
      }
    }
    return false;
  };

  const record = (event: MistakeEvent): Readonly<{ journal: MistakeEventJournal; done: Promise<boolean> }> => {
    const base: MistakeEventJournal = memory ?? {
      version: 1,
      accountScope: scope.accountScope,
      studyTarget: scope.studyTarget,
      events: [],
    } as MistakeEventJournal;
    const journal = mergeMistakeEventJournals(base, {
      version: 1,
      accountScope: base.accountScope,
      studyTarget: scope.studyTarget,
      events: [event],
    });
    memory = journal;
    unsaved = [...unsaved, event];
    const done = queue.catch(() => undefined).then(async () => {
      const toWrite = unsaved;
      // события, поставленные подряд, уходят одной записью (порядок сохранён); пустой хвост очереди ничего не пишет
      if (toWrite.length === 0) return true;
      const ok = await writeWithRetry(toWrite);
      if (ok) {
        const written = new Set(toWrite.map((item) => item.eventId));
        unsaved = unsaved.filter((item) => !written.has(item.eventId));
      } else {
        // не потеряно: событие остаётся в unsaved и уйдёт со следующей записью; память сбрасываем — правду даст хранилище
        console.warn(`${TAG} journal:write:giveup unsaved=${unsaved.length} — уйдёт со следующей записью`);
        memory = null;
      }
      return ok;
    });
    queue = done;
    return Object.freeze({ journal, done });
  };

  const afterWrites = async <T>(task: () => Promise<T> | T): Promise<T> => {
    await whenIdle();
    return task();
  };

  const invalidate = (): void => {
    memory = null;
  };

  return Object.freeze({ current, record, afterWrites, whenIdle, invalidate });
}
