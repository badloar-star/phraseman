/**
 * cards-2.0 (E10): голоса озвучки карточек.
 * зачем (Ревизор 15.10, пачка 2.65): прежние цепочки pickVoiceForLang / resolveVoiceForLang удалены — у них не было ни одного
 * вызывающего. Сторож теперь стоит на НАСТОЯЩЕМ пути озвучки карточки: use-audio → resolveCardDeviceVoice (card_tts_audio.ts),
 * все 5 языков обучения, без английского запасного голоса для fr/de/it/es. Плюс кэш списка голосов (getVoicesOnce).
 */
import { getVoicesOnce, __resetTtsVoicesForTests, type FcVoiceLike } from '../app/flashcards/tts_voices';
import { resolveCardDeviceVoice } from '../app/flashcards/card_tts_audio';

jest.mock('expo-speech', () => ({
  getAvailableVoicesAsync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Speech = require('expo-speech') as { getAvailableVoicesAsync: jest.Mock };

const v = (identifier: string, language: string, quality = 'Default', name = identifier): FcVoiceLike => ({
  identifier,
  language,
  quality,
  name,
});

beforeEach(() => {
  __resetTtsVoicesForTests();
  Speech.getAvailableVoicesAsync.mockReset();
});

describe('resolveCardDeviceVoice: the real card voice path, all 5 study languages', () => {
  it.each([
    ['en', 'en-US'],
    ['es', 'es-ES'],
    ['fr', 'fr-FR'],
    ['de', 'de-DE'],
    ['it', 'it-IT'],
  ] as const)('%s: the exact native locale wins when the phone has it', (lang, locale) => {
    const voices = [v('us', 'en-US'), v('x', `${lang}-XX`), v('native', locale)];
    expect(resolveCardDeviceVoice(lang, voices)).toEqual({ available: true, locale });
  });

  it('another region of the same language is accepted (fr-CA for fr)', () => {
    expect(resolveCardDeviceVoice('fr', [v('ca', 'fr-CA'), v('us', 'en-US')])).toEqual({ available: true, locale: 'fr-ca' });
  });

  it.each(['es', 'fr', 'de', 'it'] as const)('%s with no voice of that language: no voicing — never an English fallback voice', (lang) => {
    expect(resolveCardDeviceVoice(lang, [v('us', 'en-US'), v('gb', 'en-GB')])).toEqual({ available: false, reason: 'exact_language_missing' });
  });

  it('empty voice list: only English is trusted, other languages stay silent until the inventory is known', () => {
    expect(resolveCardDeviceVoice('en', [])).toEqual({ available: true, locale: 'en-US' });
    for (const lang of ['es', 'fr', 'de', 'it'] as const) {
      expect(resolveCardDeviceVoice(lang, null)).toEqual({ available: false, reason: 'inventory_unverified' });
    }
  });
});

describe('getVoicesOnce (кэш списка голосов)', () => {
  it('getAvailableVoicesAsync зовётся один раз, результат кэшируется', async () => {
    Speech.getAvailableVoicesAsync.mockResolvedValue([v('us', 'en-US'), v('milena', 'ru-RU')]);
    const a = await getVoicesOnce();
    const b = await getVoicesOnce();
    expect(a.map((x) => x.identifier)).toEqual(['us', 'milena']);
    expect(b).toBe(a);
    expect(Speech.getAvailableVoicesAsync).toHaveBeenCalledTimes(1);
  });

  it('ошибка движка → пустой список', async () => {
    Speech.getAvailableVoicesAsync.mockRejectedValue(new Error('no engine'));
    await expect(getVoicesOnce()).resolves.toEqual([]);
  });

  it('зависший getAvailableVoicesAsync (web onvoiceschanged) режется таймаутом', async () => {
    jest.useFakeTimers();
    Speech.getAvailableVoicesAsync.mockReturnValue(new Promise(() => {})); // никогда
    const p = getVoicesOnce();
    jest.advanceTimersByTime(2100);
    await expect(p).resolves.toEqual([]);
    jest.useRealTimers();
  });

  it('параллельные вызовы делят один inflight-запрос', async () => {
    Speech.getAvailableVoicesAsync.mockResolvedValue([v('us', 'en-US')]);
    const [a, b] = await Promise.all([getVoicesOnce(), getVoicesOnce()]);
    expect(a).toBe(b);
    expect(Speech.getAvailableVoicesAsync).toHaveBeenCalledTimes(1);
  });
});
