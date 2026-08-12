/**
 * cards-2.0 (E8): пресеты быстрого старта fc_mode_prefs_v1 (mode_prefs).
 * Покрытие: толерантный парсинг (мусор/битые поля), roundtrip set/get,
 * параллельные записи через очередь, валидаторы deckId/size.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetModePrefsForTests,
  FC_MODE_PREFS_KEY,
  getLastPreset,
  getModePrefs,
  isValidDeckId,
  isValidSessionSize,
  parseModePrefs,
  setLastPreset,
} from '../app/flashcards/mode_prefs';

beforeEach(async () => {
  await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
  __resetModePrefsForTests();
  jest.clearAllMocks();
});

describe('parseModePrefs: толерантный парсинг', () => {
  it('null/пустая строка/мусор -> пустые prefs', () => {
    expect(parseModePrefs(null)).toEqual({ lastPreset: {} });
    expect(parseModePrefs('')).toEqual({ lastPreset: {} });
    expect(parseModePrefs('not json {{{')).toEqual({ lastPreset: {} });
    expect(parseModePrefs('[1,2]')).toEqual({ lastPreset: {} });
  });

  it('валидный пресет читается, битые поля отбрасываются', () => {
    const raw = JSON.stringify({
      lastPreset: {
        trainer: { deckId: 'custom', size: 10 },
        unknown_mode: { deckId: 'saved', size: 15 },
      },
      junkField: 42,
    });
    const prefs = parseModePrefs(raw);
    expect(prefs.lastPreset.trainer).toEqual({ deckId: 'custom', size: 10 });
    expect(Object.keys(prefs.lastPreset)).toEqual(['trainer']);
  });

  it('невалидный размер или deckId -> пресет отбрасывается', () => {
    expect(
      parseModePrefs(JSON.stringify({ lastPreset: { trainer: { deckId: 'custom', size: 17 } } }))
        .lastPreset.trainer,
    ).toBeUndefined();
    expect(
      parseModePrefs(JSON.stringify({ lastPreset: { trainer: { deckId: 'evil', size: 10 } } }))
        .lastPreset.trainer,
    ).toBeUndefined();
    expect(
      parseModePrefs(JSON.stringify({ lastPreset: { trainer: { deckId: 'pack:', size: 10 } } }))
        .lastPreset.trainer,
    ).toBeUndefined();
  });
});

describe('валидаторы', () => {
  it('isValidSessionSize: только 10/15/20', () => {
    expect(isValidSessionSize(10)).toBe(true);
    expect(isValidSessionSize(15)).toBe(true);
    expect(isValidSessionSize(20)).toBe(true);
    expect(isValidSessionSize(0)).toBe(false);
    expect(isValidSessionSize(25)).toBe(false);
    expect(isValidSessionSize('10')).toBe(false);
  });

  it('isValidDeckId: weak/saved/custom/pack:<id>', () => {
    expect(isValidDeckId('weak')).toBe(true);
    expect(isValidDeckId('saved')).toBe(true);
    expect(isValidDeckId('custom')).toBe(true);
    expect(isValidDeckId('pack:official_x')).toBe(true);
    expect(isValidDeckId('pack:')).toBe(false);
    expect(isValidDeckId('due')).toBe(false);
    expect(isValidDeckId(15)).toBe(false);
  });
});

describe('хранение lastPreset', () => {
  it('roundtrip: set -> get (память) -> get с диска после сброса модуля', async () => {
    expect(await getLastPreset('trainer')).toBeNull();
    await setLastPreset('trainer', { deckId: 'custom', size: 10 });
    expect(await getLastPreset('trainer')).toEqual({ deckId: 'custom', size: 10 });

    // «перезапуск приложения» — сброс in-memory, чтение с диска
    __resetModePrefsForTests();
    expect(await getLastPreset('trainer')).toEqual({ deckId: 'custom', size: 10 });

    const raw = await AsyncStorage.getItem(FC_MODE_PREFS_KEY);
    expect(JSON.parse(raw!)).toEqual({ lastPreset: { trainer: { deckId: 'custom', size: 10 } } });
  });

  it('повторный set перезаписывает пресет', async () => {
    await setLastPreset('trainer', { deckId: 'saved', size: 15 });
    await setLastPreset('trainer', { deckId: 'pack:p1', size: 20 });
    expect(await getLastPreset('trainer')).toEqual({ deckId: 'pack:p1', size: 20 });
  });

  it('параллельные set не теряются (очередь записи): выигрывает последний', async () => {
    await Promise.all([
      setLastPreset('trainer', { deckId: 'saved', size: 15 }),
      setLastPreset('trainer', { deckId: 'custom', size: 10 }),
    ]);
    const prefs = await getModePrefs();
    expect(prefs.lastPreset.trainer).toEqual({ deckId: 'custom', size: 10 });
    __resetModePrefsForTests();
    expect(await getLastPreset('trainer')).toEqual({ deckId: 'custom', size: 10 });
  });

  it('битый JSON на диске не роняет чтение и лечится следующим set', async () => {
    await AsyncStorage.setItem(FC_MODE_PREFS_KEY, '{broken');
    expect(await getLastPreset('trainer')).toBeNull();
    await setLastPreset('trainer', { deckId: 'weak', size: 15 });
    __resetModePrefsForTests();
    expect(await getLastPreset('trainer')).toEqual({ deckId: 'weak', size: 15 });
  });
});
