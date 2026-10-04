/**
 * §126 п.5: повреждённый журнал «Моих ошибок» по-прежнему отказывает той же ошибкой, но теперь
 * пишет [MISTAKE-JOURNAL] corrupt с конкретной причиной — иначе диагноз «не открывается» невозможен.
 */
import { loadMistakeEventJournal, type MistakePracticeStorage } from '../app/mistake_practice_store';
import { mistakePracticeEventsKey } from '../app/target_storage_keys';

function storageWith(entries: Record<string, string>): MistakePracticeStorage {
  const values = new Map(Object.entries(entries));
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
    getAllKeys: async () => [...values.keys()],
  };
}

test('missing manifest page → same error, reason page_missing in the log', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const accountScope = 'owner-a';
  const head = 'a'.repeat(64);
  const storage = storageWith({
    [mistakePracticeEventsKey(accountScope, 'en')]: JSON.stringify({
      version: 2, accountScope, studyTarget: 'en', eventCount: 3, headPageId: head,
    }),
  });
  await expect(loadMistakeEventJournal({ accountScope, studyTarget: 'en', storage })).rejects.toThrow('mistake_practice_events_corrupt');
  const line = warn.mock.calls.find((call) => call[0] === '[MISTAKE-JOURNAL] corrupt');
  expect(line).toBeDefined();
  expect(JSON.parse(String(line?.[1]))).toMatchObject({ reason: 'page_missing', studyTarget: 'en', readSource: 'storage', page: 'aaaaaaaa' });
  warn.mockRestore();
});
