// зачем (макет «Панель», меню карточки ошибки: «Я это знаю» / «Удалить из ошибок»): скрытие — одно событие 'hidden' в журнале.
// Ошибка уходит из активных, ничего не стирается, повторное скрытие и скрытие чужой ошибки честно отказывают.
import { captureObjectiveAttempt, type ObjectiveMistakeAttempt } from '../app/mistake_practice_capture';
import { hideMistake } from '../app/mistake_hide';
import { loadMistakeEventJournal, type MistakePracticeStorage } from '../app/mistake_practice_store';
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

const attempt: ObjectiveMistakeAttempt = {
  accountScope: 'account-a',
  attemptId: 'lesson-attempt-1:answer-3',
  studyTarget: 'en',
  verdict: 'wrong',
  objective: true,
  content: { sourceKind: 'lesson_phrase', sourceId: 'lesson-1:phrase-3', canonicalTarget: 'I am ready.', sourceMeaning: 'Я готов.', lessonId: '1' },
  facet: { kind: 'word_order' },
};

// зачем (ночной прогон Ревизора 26.10: «падает только в общем прогоне»): запись ошибки и скрытие в одну миллисекунду сортируются по номеру
// события, и «скрыто» могло встать раньше «записано» — тест мигал. В приложении между ними минуты; здесь скрытие явно позже записи.
const LATER = (): number => Date.now() + 60_000;

describe('hideMistake', () => {
  test('hides an active mistake with one event and keeps the journal intact', async () => {
    const memory = storage();
    const captured = await captureObjectiveAttempt(attempt, { storage: memory });
    if (captured.kind !== 'captured') throw new Error('capture failed');
    const before = await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory });

    const result = await hideMistake({ accountScope: 'account-a', studyTarget: 'en', mistakeId: captured.mistakeId, reason: 'known', nowMs: LATER(), storage: memory });
    expect(result).toEqual({ ok: true, appended: true });

    const after = await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory });
    expect(after.events.length).toBe(before.events.length + 1);
    expect(projectMistakes(after.events).items.get(captured.mistakeId)?.status).toBe('hidden');
  });

  test('a second hide and an unknown mistake are refused without writing', async () => {
    const memory = storage();
    const captured = await captureObjectiveAttempt(attempt, { storage: memory });
    if (captured.kind !== 'captured') throw new Error('capture failed');
    await hideMistake({ accountScope: 'account-a', studyTarget: 'en', mistakeId: captured.mistakeId, reason: 'removed', nowMs: LATER(), storage: memory });
    const size = (await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory })).events.length;

    await expect(hideMistake({ accountScope: 'account-a', studyTarget: 'en', mistakeId: captured.mistakeId, reason: 'removed', nowMs: LATER(), storage: memory }))
      .resolves.toEqual({ ok: false, reason: 'already_hidden_or_corrected' });
    await expect(hideMistake({ accountScope: 'account-a', studyTarget: 'en', mistakeId: 'nope', reason: 'known', nowMs: LATER(), storage: memory }))
      .resolves.toEqual({ ok: false, reason: 'not_found' });
    expect((await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory })).events.length).toBe(size);
  });
});
