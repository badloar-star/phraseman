import { getTranscription } from '../app/transcription';

/**
 * Контракт мягкой "c".
 *
 * зачем: юзер сообщил, что в транскрипции pharmacy звучал [k] вместо [s]
 * (репорт 2026-07-24, flashcards_hub). Причина была не в одном слове, а в общем
 * правиле: мягкая "c" подставлялась только перед e/i, но не перед y — из-за чего
 * ВСЕ слова на -cy (agency, policy, fancy, emergency) читались через [k].
 *
 * Тест держит именно правило, а не одно слово: иначе правку легко откатить,
 * добавив pharmacy в словарь и снова сломав остальные -cy слова.
 */
describe('transcription: soft "c" before e / i / y', () => {
  // Слова НЕ из словаря DICT — идут через ruleBasedIPA, проверяют само правило.
  const softCbyRule = ['agency', 'policy', 'fancy', 'emergency'];

  it.each(softCbyRule)('reads "c" before y as [s], not [k] — %s', (word) => {
    const ipa = getTranscription(word);
    expect(ipa).toContain('s');
    expect(ipa).not.toContain('k');
  });

  it('keeps hard "c" as [k] before other letters', () => {
    // Регрессия в обратную сторону: правило не должно смягчать всё подряд.
    expect(getTranscription('cat')).toContain('k');
    expect(getTranscription('cup')).toContain('k');
  });

  it('pronounces pharmacy with [s] (the originally reported word)', () => {
    const ipa = getTranscription('pharmacy');
    expect(ipa).toContain('s');
    expect(ipa).not.toContain('k');
  });
});
