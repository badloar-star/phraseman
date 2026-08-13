/**
 * cards-2.0 (E8): пресеты быстрого старта fc_mode_prefs_v1 (mode_prefs).
 * Покрытие: толерантный парсинг (мусор/битые поля), roundtrip set/get,
 * параллельные записи через очередь, валидаторы deckId/size.
 *
 * cards-2.1 (§6 SPEC_2_1): пресет хранит мультивыбор `deckIds` + первую колоду
 * в `deckId` (совместимость). `preset()` ниже — ожидаемая нормализованная форма.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetModePrefsForTests,
  FC_MODE_PREFS_KEY,
  getLastPreset,
  getModePrefs,
  isValidDeckId,
  isValidSessionSize,
  normalizeModePreset,
  parseModePrefs,
  presetDeckIds,
  setLastPreset,
  type FcDeckId,
  type FcSessionSize,
} from '../app/flashcards/mode_prefs';

/** Нормализованная форма пресета: deckId = первая колода мультивыбора. */
const preset = (deckIds: FcDeckId[], size: FcSessionSize) => ({ deckId: deckIds[0], deckIds, size });

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
    expect(prefs.lastPreset.trainer).toEqual(preset(['custom'], 10));
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
    expect(await getLastPreset('trainer')).toEqual(preset(['custom'], 10));

    // «перезапуск приложения» — сброс in-memory, чтение с диска
    __resetModePrefsForTests();
    expect(await getLastPreset('trainer')).toEqual(preset(['custom'], 10));

    const raw = await AsyncStorage.getItem(FC_MODE_PREFS_KEY);
    expect(JSON.parse(raw!)).toEqual({ lastPreset: { trainer: preset(['custom'], 10) } });
  });

  it('повторный set перезаписывает пресет', async () => {
    await setLastPreset('trainer', { deckId: 'saved', size: 15 });
    await setLastPreset('trainer', { deckId: 'pack:p1', size: 20 });
    expect(await getLastPreset('trainer')).toEqual(preset(['pack:p1'], 20));
  });

  it('параллельные set не теряются (очередь записи): выигрывает последний', async () => {
    await Promise.all([
      setLastPreset('trainer', { deckId: 'saved', size: 15 }),
      setLastPreset('trainer', { deckId: 'custom', size: 10 }),
    ]);
    const prefs = await getModePrefs();
    expect(prefs.lastPreset.trainer).toEqual(preset(['custom'], 10));
    __resetModePrefsForTests();
    expect(await getLastPreset('trainer')).toEqual(preset(['custom'], 10));
  });

  it('битый JSON на диске не роняет чтение и лечится следующим set', async () => {
    await AsyncStorage.setItem(FC_MODE_PREFS_KEY, '{broken');
    expect(await getLastPreset('trainer')).toBeNull();
    await setLastPreset('trainer', { deckId: 'weak', size: 15 });
    __resetModePrefsForTests();
    expect(await getLastPreset('trainer')).toEqual(preset(['weak'], 15));
  });
});

// ── cards-2.1 (§6): мультивыбор колод в пресете ──────────────────────────────

describe('normalizeModePreset / presetDeckIds', () => {
  it('deckIds — источник правды, deckId = первая колода', () => {
    expect(normalizeModePreset({ deckIds: ['custom', 'saved'], size: 15 })).toEqual(
      preset(['custom', 'saved'], 15),
    );
  });

  it('старый вход (только deckId) → список из одного', () => {
    expect(normalizeModePreset({ deckId: 'saved', size: 20 })).toEqual(preset(['saved'], 20));
  });

  it('дубликаты и мусор схлопываются, weak исключителен', () => {
    expect(normalizeModePreset({ deckIds: ['saved', 'saved', 'pack:a'], size: 10 })).toEqual(
      preset(['saved', 'pack:a'], 10),
    );
    expect(normalizeModePreset({ deckIds: ['saved', 'weak'], size: 10 })).toEqual(preset(['weak'], 10));
  });

  it('пустой выбор или битый размер → null (пресета нет)', () => {
    expect(normalizeModePreset({ deckIds: [], size: 10 })).toBeNull();
    expect(normalizeModePreset({ deckId: 'saved', size: 17 as FcSessionSize })).toBeNull();
    expect(normalizeModePreset(null)).toBeNull();
  });

  it('presetDeckIds: старый пресет без deckIds читается как [deckId]', () => {
    const legacy = { deckId: 'custom', size: 15 } as never;
    expect(presetDeckIds(legacy)).toEqual(['custom']);
    expect(presetDeckIds(preset(['saved', 'custom'], 15))).toEqual(['saved', 'custom']);
    expect(presetDeckIds(null)).toEqual([]);
  });
});

describe('обратная совместимость fc_mode_prefs_v1', () => {
  it('старый формат на диске ({ deckId, size }) читается как мультивыбор из одного', async () => {
    await AsyncStorage.setItem(
      FC_MODE_PREFS_KEY,
      JSON.stringify({ lastPreset: { trainer: { deckId: 'pack:old', size: 20 } } }),
    );
    expect(await getLastPreset('trainer')).toEqual(preset(['pack:old'], 20));
  });

  it('новый формат читается целиком, битые элементы списка отбрасываются', () => {
    const raw = JSON.stringify({
      lastPreset: {
        trainer: { deckId: 'saved', deckIds: ['saved', 'evil', 'pack:x'], size: 15 },
        listening: { deckIds: [], size: 15 },
      },
    });
    const prefs = parseModePrefs(raw);
    expect(prefs.lastPreset.trainer).toEqual(preset(['saved', 'pack:x'], 15));
    expect(prefs.lastPreset.listening).toBeUndefined();
  });

  it('запись мультивыбора кладёт на диск и deckIds, и deckId (старые сборки)', async () => {
    await setLastPreset('trainer', { deckIds: ['saved', 'custom'], size: 10 });
    const raw = await AsyncStorage.getItem(FC_MODE_PREFS_KEY);
    expect(JSON.parse(raw!).lastPreset.trainer).toEqual({
      deckId: 'saved',
      deckIds: ['saved', 'custom'],
      size: 10,
    });
    __resetModePrefsForTests();
    expect(await getLastPreset('trainer')).toEqual(preset(['saved', 'custom'], 10));
  });

  it('setLastPreset с пустым выбором ничего не пишет', async () => {
    await setLastPreset('trainer', { deckIds: [], size: 10 });
    expect(await getLastPreset('trainer')).toBeNull();
  });
});
