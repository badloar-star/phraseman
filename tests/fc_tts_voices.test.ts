/**
 * cards-2.0 (E10): фолбэк-цепочки TTS-голосов (§3.8, п.8 критики).
 * Покрытие: en → en-US/en-GB/en-* с приоритетом Enhanced/Premium по quality;
 * uk → uk-UA, иначе ru-RU (usedFallbackLang), иначе «нет озвучки»; ru; es;
 * пустой список движка → оптимистичная ветка; кэш getAvailableVoicesAsync
 * (один вызов на жизнь приложения); БЕЗ хардкода идентификаторов голосов.
 */
import {
  getVoicesOnce,
  pickVoiceForLang,
  resolveVoiceForLang,
  ttsLangFromLocale,
  __resetTtsVoicesForTests,
  type FcVoiceLike,
} from '../app/flashcards/tts_voices';

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

// ── ttsLangFromLocale ────────────────────────────────────────────────────────

describe('ttsLangFromLocale', () => {
  it('маппит BCP-47 в наш язык', () => {
    expect(ttsLangFromLocale('uk-UA')).toBe('uk');
    expect(ttsLangFromLocale('ru-RU')).toBe('ru');
    expect(ttsLangFromLocale('es-ES')).toBe('es');
    expect(ttsLangFromLocale('en-US')).toBe('en');
    expect(ttsLangFromLocale('fr-FR')).toBe('en'); // незнакомое → en
  });
});

// ── pickVoiceForLang (чистая) ────────────────────────────────────────────────

describe('pickVoiceForLang: en', () => {
  it('en-US приоритетнее en-GB', () => {
    const r = pickVoiceForLang([v('gb1', 'en-GB'), v('us1', 'en-US')], 'en');
    expect(r).toMatchObject({ available: true, voiceId: 'us1' });
  });

  it('Enhanced/Premium по quality приоритетнее Default', () => {
    const r = pickVoiceForLang(
      [v('us_plain', 'en-US', 'Default'), v('us_enh', 'en-US', 'Enhanced'), v('us_plain2', 'en-US')],
      'en',
    );
    expect(r.voiceId).toBe('us_enh');
  });

  it('premium в quality тоже считается улучшенным', () => {
    const r = pickVoiceForLang([v('a', 'en-US', 'Default'), v('b', 'en-US', 'Premium')], 'en');
    expect(r.voiceId).toBe('b');
  });

  it('нет en-US/en-GB → любой en-*', () => {
    const r = pickVoiceForLang([v('au', 'en-AU'), v('ru', 'ru-RU')], 'en');
    expect(r).toMatchObject({ available: true, voiceId: 'au' });
  });

  it('язык с underscore (en_US) нормализуется', () => {
    const r = pickVoiceForLang([v('us', 'en_US')], 'en');
    expect(r.voiceId).toBe('us');
  });
});

describe('pickVoiceForLang: uk → ru → «нет озвучки»', () => {
  it('uk-UA есть → без фолбэка', () => {
    const r = pickVoiceForLang([v('lesya', 'uk-UA'), v('milena', 'ru-RU')], 'uk');
    expect(r).toMatchObject({ available: true, voiceId: 'lesya' });
    expect(r.usedFallbackLang).toBeUndefined();
  });

  it('uk нет → фолбэк на ru-RU с пометкой', () => {
    const r = pickVoiceForLang([v('milena', 'ru-RU'), v('us', 'en-US')], 'uk');
    expect(r).toMatchObject({ available: true, voiceId: 'milena', usedFallbackLang: 'ru' });
  });

  it('нет ни uk, ни ru → «текст без озвучки» (available=false)', () => {
    const r = pickVoiceForLang([v('us', 'en-US'), v('es', 'es-ES')], 'uk');
    expect(r).toMatchObject({ available: false, language: 'uk-UA' });
    expect(r.voiceId).toBeUndefined();
  });

  it('внутри фолбэка ru тоже действует приоритет Enhanced', () => {
    const r = pickVoiceForLang(
      [v('ru_plain', 'ru-RU', 'Default'), v('ru_enh', 'ru-RU', 'Enhanced')],
      'uk',
    );
    expect(r.voiceId).toBe('ru_enh');
  });
});

describe('pickVoiceForLang: ru / es', () => {
  it('ru: ru-RU → available', () => {
    expect(pickVoiceForLang([v('m', 'ru-RU')], 'ru')).toMatchObject({ available: true, voiceId: 'm' });
  });
  it('ru: нет ru-голоса → текст', () => {
    expect(pickVoiceForLang([v('us', 'en-US')], 'ru')).toMatchObject({ available: false, language: 'ru-RU' });
  });
  it('es: es-ES приоритетнее es-MX, но es-MX подходит как es-*', () => {
    expect(pickVoiceForLang([v('mx', 'es-MX'), v('es', 'es-ES')], 'es').voiceId).toBe('es');
    expect(pickVoiceForLang([v('mx', 'es-MX')], 'es')).toMatchObject({ available: true, voiceId: 'mx' });
  });
});

describe('pickVoiceForLang: пустой список движка', () => {
  it('оптимистичная ветка: available=true, канон BCP-47, без voiceId', () => {
    // Часть Android-движков и headless web отдают [] при живом TTS
    expect(pickVoiceForLang([], 'uk')).toEqual({ available: true, language: 'uk-UA' });
    expect(pickVoiceForLang([], 'en')).toEqual({ available: true, language: 'en-US' });
  });
});

// ── resolveVoiceForLang: кэш getAvailableVoicesAsync ─────────────────────────

describe('resolveVoiceForLang (кэш)', () => {
  it('getAvailableVoicesAsync зовётся один раз, результат кэшируется', async () => {
    Speech.getAvailableVoicesAsync.mockResolvedValue([v('us', 'en-US'), v('milena', 'ru-RU')]);
    const en = await resolveVoiceForLang('en');
    const uk = await resolveVoiceForLang('uk');
    const ru = await resolveVoiceForLang('ru');
    expect(en.voiceId).toBe('us');
    expect(uk).toMatchObject({ voiceId: 'milena', usedFallbackLang: 'ru' });
    expect(ru.voiceId).toBe('milena');
    expect(Speech.getAvailableVoicesAsync).toHaveBeenCalledTimes(1);
  });

  it('ошибка движка → [] → оптимистичная ветка', async () => {
    Speech.getAvailableVoicesAsync.mockRejectedValue(new Error('no engine'));
    const r = await resolveVoiceForLang('uk');
    expect(r).toEqual({ available: true, language: 'uk-UA' });
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
