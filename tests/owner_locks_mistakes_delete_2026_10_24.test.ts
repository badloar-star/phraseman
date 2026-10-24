// ЗАМОК ВЛАДЕЛЬЦА 24.10: «не забудь, что ошибки можно будет удалять».
// зачем: одна ошибка удаляется долгим нажатием на строку списка (и «Удалить» в карточке) — тот же путь, что «Очистить все»:
// событие 'hidden' в журнале (синк уносит на другие устройства, слияние и полная чистка не воскрешают), строка пропадает сразу,
// тост «Ошибка удалена · Вернуть» откатывает событием 'restored'. Остальные ошибки не трогаются.
import fs from 'node:fs';
import path from 'node:path';
import { captureObjectiveAttempt, type ObjectiveMistakeAttempt } from '../app/mistake_practice_capture';
import { hideAllMistakes, restoreMistakes } from '../app/mistake_clear_all';
import { loadMistakeEventJournal, type MistakePracticeStorage } from '../app/mistake_practice_store';
import { projectMistakes } from '../modules/mistake-practice/projection';
import { MISTAKE_CLEAR_ALL_COPY } from '../app/mistake_clear_all_copy';

function storage(): MistakePracticeStorage {
  const data = new Map<string, string>();
  return { getItem: async (k) => data.get(k) ?? null, setItem: async (k, v) => { data.set(k, v); }, removeItem: async (k) => { data.delete(k); } };
}
const attempt = (n: number): ObjectiveMistakeAttempt => ({
  accountScope: 'account-a', attemptId: `a-${n}`, studyTarget: 'en', verdict: 'wrong', objective: true,
  content: { sourceKind: 'lesson_phrase', sourceId: `l-${n}:p-${n}`, canonicalTarget: `I am ready ${n}.`, sourceMeaning: `Я готов ${n}.`, lessonId: String(n) },
  facet: { kind: 'word_order' },
});
const BASE = 1_700_000_000_000;
let clock = BASE;
beforeEach(() => {
  clock = BASE;
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('ЗАМОК ВЛАДЕЛЬЦА 24.10: ошибки можно удалять', () => {
  it('deletes exactly one mistake as a journal event and undo brings it back', async () => {
    const memory = storage();
    const ids: string[] = [];
    for (const n of [1, 2, 3]) {
      const r = await captureObjectiveAttempt(attempt(n), { storage: memory });
      if (r.kind !== 'captured') throw new Error('capture');
      ids.push(r.mistakeId);
    }
    clock = BASE + 5_000;
    const result = await hideAllMistakes({ accountScope: 'account-a', studyTarget: 'en', onlyMistakeIds: [ids[1]], storage: memory });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mistakes.map((m) => m.mistakeId)).toEqual([ids[1]]);
    let items = projectMistakes((await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory })).events).items;
    expect(items.get(ids[1])?.status).toBe('hidden');
    expect(items.get(ids[0])?.status).toBe('active');
    expect(items.get(ids[2])?.status).toBe('active');

    clock = BASE + 8_000;
    await restoreMistakes({ accountScope: 'account-a', studyTarget: 'en', mistakes: result.mistakes, storage: memory });
    items = projectMistakes((await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage: memory })).events).items;
    expect(items.get(ids[1])?.status).toBe('active');
  });

  it('the list offers delete on long press, the card routes «Удалить» through the undo flow, texts exist in 9 languages', () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    const list = read('app/mistakes_list.tsx');
    expect(list).toContain('onLongPress={askDelete}');
    expect(list).toContain('onlyMistakeIds: [item.mistakeId]');
    expect(list).toContain('testID="mistakes-list-delete-one"');
    const detail = read('app/mistake_detail.tsx');
    expect(detail).toContain('onlyMistakeIds: [detail.mistakeId]');
    for (const copy of Object.values(MISTAKE_CLEAR_ALL_COPY)) {
      expect(copy.deleteOne.trim()).not.toBe('');
      expect(copy.doneOne.trim()).not.toBe('');
    }
  });
});
