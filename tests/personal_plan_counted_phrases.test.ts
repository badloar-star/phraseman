import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  markPhrasesCounted,
  readCountedPhraseCount,
  clearCountedPhrases,
} from '../app/personal_plan_counted_phrases';

describe('personal_plan_counted_phrases', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns the count of NEW phrase ids only', async () => {
    expect(await markPhrasesCounted('inst', ['a', 'b', 'c'])).toBe(3);
    // повтор тех же id — ничего нового
    expect(await markPhrasesCounted('inst', ['a', 'b', 'c'])).toBe(0);
    // частичное пересечение: только 'd' новая
    expect(await markPhrasesCounted('inst', ['b', 'c', 'd'])).toBe(1);
    expect(await readCountedPhraseCount('inst')).toBe(4);
  });

  it('deduplicates within a single call and ignores blanks', async () => {
    expect(await markPhrasesCounted('inst', ['a', 'a', ' ', '', 'b'])).toBe(2);
    expect(await readCountedPhraseCount('inst')).toBe(2);
  });

  it('isolates counts per plan instance', async () => {
    expect(await markPhrasesCounted('inst_a', ['p1'])).toBe(1);
    // тот же id, другой план — считается заново
    expect(await markPhrasesCounted('inst_b', ['p1'])).toBe(1);
    expect(await readCountedPhraseCount('inst_a')).toBe(1);
    expect(await readCountedPhraseCount('inst_b')).toBe(1);
  });

  it('returns 0 for empty/blank instance or empty ids', async () => {
    expect(await markPhrasesCounted('', ['a'])).toBe(0);
    expect(await markPhrasesCounted(null, ['a'])).toBe(0);
    expect(await markPhrasesCounted('inst', [])).toBe(0);
  });

  it('does not lose writes under concurrent (un-awaited) calls — serialized chain', async () => {
    // Запускаем параллельно, НЕ дожидаясь по одному: общая очередь не должна
    // терять записи (это и был корень гонки в прогрессе задания до фикса).
    const results = await Promise.all([
      markPhrasesCounted('inst', ['a']),
      markPhrasesCounted('inst', ['b']),
      markPhrasesCounted('inst', ['c']),
      markPhrasesCounted('inst', ['a', 'b', 'c']),
    ]);
    const totalNew = results.reduce((sum, n) => sum + n, 0);
    expect(totalNew).toBe(3); // суммарно зачтены ровно a,b,c один раз
    expect(await readCountedPhraseCount('inst')).toBe(3);
  });

  it('clearCountedPhrases resets a plan instance', async () => {
    await markPhrasesCounted('inst', ['a', 'b']);
    await clearCountedPhrases('inst');
    expect(await readCountedPhraseCount('inst')).toBe(0);
    // после очистки те же фразы снова новые
    expect(await markPhrasesCounted('inst', ['a', 'b'])).toBe(2);
  });
});
