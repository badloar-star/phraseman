// зачем (владелец 22.10 через координатора: «дать возможность удалить все накопившиеся ошибки, так чтобы они не возвращались»):
// «Очистить все ошибки» — один батч-append событий 'hidden' (reason 'removed'), слияние облака не воскрешает, новая ошибка после очистки видна,
// «Вернуть» возвращает событиями 'restored'. Данные — на настоящем журнале с памятью вместо диска.
import { captureObjectiveAttempt, type ObjectiveMistakeAttempt } from '../app/mistake_practice_capture';
import { hideAllMistakes, restoreMistakes } from '../app/mistake_clear_all';
import { loadMistakeEventJournal, mistakeJournalWriteEpoch, type MistakePracticeStorage } from '../app/mistake_practice_store';
import { mergeMistakeEventJournals } from '../app/mistake_practice_cloud_merge';
import { projectMistakes } from '../modules/mistake-practice/projection';

function storage(): MistakePracticeStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

// retry — номер повторной попытки той же фразы: у новой попытки новый attemptId (иначе журнал честно сочтёт её дублем)
const attemptFor = (n: number, studyTarget: 'en' | 'fr' = 'en', retry = 0): ObjectiveMistakeAttempt => ({
  accountScope: 'account-a',
  attemptId: `lesson-attempt-${n}:answer-${n}:try-${retry}`,
  studyTarget,
  verdict: 'wrong',
  objective: true,
  content: { sourceKind: 'lesson_phrase', sourceId: `lesson-${n}:phrase-${n}`, canonicalTarget: `I am ready ${n}.`, sourceMeaning: `Я готов ${n}.`, lessonId: String(n) },
  facet: { kind: 'word_order' },
});

const BASE = 1_700_000_000_000;
let clock = BASE;

async function capture(memory: MistakePracticeStorage, n: number, studyTarget: 'en' | 'fr' = 'en', retry = 0): Promise<string> {
  const result = await captureObjectiveAttempt(attemptFor(n, studyTarget, retry), { storage: memory });
  if (result.kind !== 'captured') throw new Error(`capture ${n} failed`);
  return result.mistakeId;
}

const statusesOf = async (memory: MistakePracticeStorage, studyTarget: 'en' | 'fr' = 'en') =>
  projectMistakes((await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget, storage: memory })).events).items;

beforeEach(() => {
  clock = BASE;
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('hideAllMistakes — один батч, ошибки не возвращаются', () => {
  test('все активные уходят в скрытые ОДНОЙ записью журнала, причина removed', async () => {
    const memory = storage();
    const ids = [await capture(memory, 1), await capture(memory, 2), await capture(memory, 3)];
    const before = await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory });
    const epoch = mistakeJournalWriteEpoch();
    clock = BASE + 10_000;

    const result = await hideAllMistakes({ accountScope: 'account-a', studyTarget: 'en', storage: memory });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mistakes.map((m) => m.mistakeId).sort()).toEqual([...ids].sort());
    expect(result.appendedCount).toBe(3);
    // одна запись журнала на всю пачку, а не три
    expect(mistakeJournalWriteEpoch() - epoch).toBe(1);
    const after = await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory });
    expect(after.events.length).toBe(before.events.length + 3);
    const hidden = after.events.filter((event) => event.type === 'hidden');
    expect(hidden).toHaveLength(3);
    expect(hidden.every((event) => event.payload.reason === 'removed')).toBe(true);
    const items = await statusesOf(memory);
    expect(ids.every((id) => items.get(id)?.status === 'hidden')).toBe(true);
  });

  test('пустой журнал: нечего очищать, ничего не пишется', async () => {
    const memory = storage();
    const epoch = mistakeJournalWriteEpoch();
    await expect(hideAllMistakes({ accountScope: 'account-a', studyTarget: 'en', storage: memory })).resolves.toEqual({ ok: false, reason: 'nothing_to_clear' });
    expect(mistakeJournalWriteEpoch()).toBe(epoch);
  });

  test('чистится только текущий курс: французские ошибки остаются', async () => {
    const memory = storage();
    const en = await capture(memory, 1, 'en');
    const fr = await capture(memory, 2, 'fr');
    clock = BASE + 10_000;
    const result = await hideAllMistakes({ accountScope: 'account-a', studyTarget: 'en', storage: memory });
    expect(result.ok).toBe(true);
    expect((await statusesOf(memory, 'en')).get(en)?.status).toBe('hidden');
    expect((await statusesOf(memory, 'fr')).get(fr)?.status).toBe('active');
  });

  test('повторная очистка ничего не добавляет: скрытые и исправленные не трогаем', async () => {
    const memory = storage();
    await capture(memory, 1);
    clock = BASE + 10_000;
    await hideAllMistakes({ accountScope: 'account-a', studyTarget: 'en', storage: memory });
    const size = (await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory })).events.length;
    await expect(hideAllMistakes({ accountScope: 'account-a', studyTarget: 'en', storage: memory })).resolves.toEqual({ ok: false, reason: 'nothing_to_clear' });
    expect((await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory })).events.length).toBe(size);
  });

  test('слияние с облаком не воскрешает: старый журнал из облака и со второго телефона, часы второго телефона впереди', async () => {
    const memory = storage();
    const id = await capture(memory, 1);
    // «облако» и «второй телефон» хранят состояние ДО очистки
    const cloudBefore = await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory });
    // второй телефон ответил на эту ошибку с часами на час вперёд — последнее событие ошибки «в будущем»
    const skewed = {
      ...cloudBefore,
      events: [
        ...cloudBefore.events,
        {
          eventId: 'phone-b-hint',
          mistakeId: id,
          cycleId: cloudBefore.events[0]!.cycleId,
          type: 'hint_used' as const,
          occurredAtMs: BASE + 3_600_000,
          studyTarget: 'en' as const,
          payload: {},
        },
      ],
    };
    clock = BASE + 10_000;
    const cleared = await hideAllMistakes({ accountScope: 'account-a', studyTarget: 'en', storage: memory });
    expect(cleared.ok).toBe(true);
    const local = await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory });

    // слияние в обе стороны (кто кого перезаписывает — не важно): ошибка остаётся скрытой
    const afterPull = projectMistakes(mergeMistakeEventJournals(local, cloudBefore).events).items.get(id);
    expect(afterPull?.status).toBe('hidden');
    const afterPullSkewed = projectMistakes(mergeMistakeEventJournals(local, skewed).events).items.get(id);
    expect(afterPullSkewed?.status).toBe('hidden');
    const reverse = projectMistakes(mergeMistakeEventJournals(skewed, local).events).items.get(id);
    expect(reverse?.status).toBe('hidden');
  });

  test('новая ошибка после очистки видна как обычно; та же ошибка, сделанная снова, тоже возвращается', async () => {
    const memory = storage();
    const old = await capture(memory, 1);
    clock = BASE + 10_000;
    await hideAllMistakes({ accountScope: 'account-a', studyTarget: 'en', storage: memory });

    clock = BASE + 60_000;
    const fresh = await capture(memory, 2); // новая ошибка
    const again = await capture(memory, 1, 'en', 1); // та же ошибка снова, новая попытка
    expect(again).toBe(old);
    const items = await statusesOf(memory);
    expect(items.get(fresh)?.status).toBe('active');
    expect(items.get(old)?.status).toBe('active');
  });
});

describe('restoreMistakes — «Вернуть»', () => {
  test('откат событиями restored возвращает именно очищенные ошибки, одной записью', async () => {
    const memory = storage();
    const ids = [await capture(memory, 1), await capture(memory, 2)];
    clock = BASE + 10_000;
    const cleared = await hideAllMistakes({ accountScope: 'account-a', studyTarget: 'en', storage: memory });
    if (!cleared.ok) throw new Error('clear failed');

    // часы не ушли вперёд: restored всё равно строго позже своего hidden
    const epoch = mistakeJournalWriteEpoch();
    const restored = await restoreMistakes({ accountScope: 'account-a', studyTarget: 'en', mistakes: cleared.mistakes, nowMs: BASE + 10_000, storage: memory });
    expect(restored).toEqual({ ok: true, appendedCount: 2 });
    expect(mistakeJournalWriteEpoch() - epoch).toBe(1);
    const items = await statusesOf(memory);
    expect(ids.every((id) => items.get(id)?.status === 'active')).toBe(true);
  });

  test('откат не выдумывает ошибок: пустой список — ничего не пишется', async () => {
    const memory = storage();
    const epoch = mistakeJournalWriteEpoch();
    await expect(restoreMistakes({ accountScope: 'account-a', studyTarget: 'en', mistakes: [], storage: memory })).resolves.toEqual({ ok: true, appendedCount: 0 });
    expect(mistakeJournalWriteEpoch()).toBe(epoch);
  });
});
