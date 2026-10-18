// зачем (владелец 18.10 через координатора 09:58): реплика не на изучаемом языке — «извини, не понимаю» на изучаемом языке,
// каждый раз по-разному, без хода. Определитель обязан ловить явные случаи и НЕ трогать короткие/смешанные/правильные ответы.
import { detectDialogueOffLanguage, pickDialogueNotUnderstoodReply, DIALOGUE_NOT_UNDERSTOOD_POOL_SIZE } from '../app/dialogue_v2_off_language';

describe('детектор языка реплики в Диалогах', () => {
  it.each([
    ['Привет, как у тебя дела сегодня?', 'en', 'script'],
    ['Я не знаю', 'en', 'script'],
    ['Je ne sais pas ce que tu veux', 'en', 'stopwords'],
    ['Ich bin nicht sicher, was das ist', 'en', 'stopwords'],
    ['Yo no tengo tiempo para eso', 'en', 'stopwords'],
    ['I am not sure what you want', 'es', 'stopwords'],
    ['Привет', 'fr', 'script'],
  ] as const)('%s при изучении %s → не тот язык (%s)', (text, target, reason) => {
    expect(detectDialogueOffLanguage(text, target)).toMatchObject({ offLanguage: true, reason });
  });

  it.each([
    ['I would like a coffee, please', 'en'],
    ['Hi Mila! I am fine.', 'en'],
    ['Ok', 'en'],
    ['Paris', 'en'],
    ['Merci', 'en'],
    ['My name is Олег', 'en'],
    ['Quiero un café, por favor', 'es'],
    ['Je voudrais un café', 'fr'],
    ['Ich möchte einen Kaffee', 'de'],
    ['', 'en'],
    // зачем (Ревизор 18.10): короткие двусмысленные слова не делают английскую реплику испанской
    ['No, thanks', 'en'],
    ['No, no, no, thanks', 'en'],
    ['Yes, I do', 'en'],
    ['No, I do not have a car', 'en'],
  ] as const)('%s при изучении %s — пропускаем как обычно', (text, target) => {
    expect(detectDialogueOffLanguage(text, target).offLanguage).toBe(false);
  });

  it('итальянский (D188): чужая фраза ловится, итальянская — нет', () => {
    expect(detectDialogueOffLanguage('I am not sure what you want', 'it')).toMatchObject({ offLanguage: true, reason: 'stopwords' });
    expect(detectDialogueOffLanguage('Привет, как дела?', 'it')).toMatchObject({ offLanguage: true, reason: 'script' });
    expect(detectDialogueOffLanguage('Vorrei un caffè, per favore', 'it').offLanguage).toBe(false);
  });

  it('ответы на изучаемом языке, разные и не повторяются подряд', () => {
    let previous: number | null = null;
    const seen = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const reply = pickDialogueNotUnderstoodReply('en', previous);
      expect(reply.index).not.toBe(previous);
      seen.add(reply.text);
      previous = reply.index;
    }
    expect(seen.size).toBeGreaterThan(6);
    for (const target of ['es', 'fr', 'de', 'it'] as const) {
      const all = new Set(Array.from({ length: DIALOGUE_NOT_UNDERSTOOD_POOL_SIZE }, (_, i) => pickDialogueNotUnderstoodReply(target, null, () => i / DIALOGUE_NOT_UNDERSTOOD_POOL_SIZE).text));
      expect(all.size).toBe(DIALOGUE_NOT_UNDERSTOOD_POOL_SIZE);
    }
  });
});
