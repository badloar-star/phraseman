import {
  ALL_WHISPER_MODELS,
  MODEL_EN,
  MODEL_MULTILINGUAL,
  WHISPER_MODEL_DIRECTORY,
  baseLanguageOf,
  modelsToPrune,
  resolveWhisperModel,
  whisperLanguageFor,
} from '../app/speaking_whisper_models';

describe('whisper model specs', () => {
  it('every model downloads a .bin over https with a sane size floor', () => {
    for (const m of ALL_WHISPER_MODELS) {
      expect(m.url.startsWith('https://')).toBe(true);
      expect(m.url.endsWith(m.fileName)).toBe(true);
      expect(m.fileName.endsWith('.bin')).toBe(true);
      // Floor rejects a truncated download but not a real model.
      expect(m.minBytes).toBeGreaterThan(10 * 1024 * 1024);
      expect(m.minBytes).toBeLessThan(200 * 1024 * 1024);
    }
  });

  it('the English model is english-only, the multilingual one is not', () => {
    expect(MODEL_EN.englishOnly).toBe(true);
    expect(MODEL_MULTILINGUAL.englishOnly).toBe(false);
  });

  it('the two models are distinct files (so they never collide on disk)', () => {
    expect(MODEL_EN.fileName).not.toBe(MODEL_MULTILINGUAL.fileName);
  });

  it('exposes a non-empty model directory', () => {
    expect(WHISPER_MODEL_DIRECTORY.length).toBeGreaterThan(0);
  });
});

describe('baseLanguageOf', () => {
  it('extracts the base language subtag from a BCP-47 locale', () => {
    expect(baseLanguageOf('en-US')).toBe('en');
    expect(baseLanguageOf('en_GB')).toBe('en');
    expect(baseLanguageOf('es-ES')).toBe('es');
    expect(baseLanguageOf('pt-BR')).toBe('pt');
    expect(baseLanguageOf('FR')).toBe('fr');
  });

  it('falls back to en for empty / nullish input', () => {
    expect(baseLanguageOf('')).toBe('en');
    expect(baseLanguageOf('   ')).toBe('en');
    expect(baseLanguageOf(null)).toBe('en');
    expect(baseLanguageOf(undefined)).toBe('en');
  });
});

describe('resolveWhisperModel', () => {
  it('picks the English-only model for any English locale', () => {
    expect(resolveWhisperModel('en-US')).toBe(MODEL_EN);
    expect(resolveWhisperModel('en_GB')).toBe(MODEL_EN);
    expect(resolveWhisperModel('EN')).toBe(MODEL_EN);
  });

  it('picks the multilingual model for a non-English target', () => {
    expect(resolveWhisperModel('es-ES')).toBe(MODEL_MULTILINGUAL);
    expect(resolveWhisperModel('pt-BR')).toBe(MODEL_MULTILINGUAL);
    expect(resolveWhisperModel('fr-FR')).toBe(MODEL_MULTILINGUAL);
  });

  it('defaults to the English model when the locale is missing', () => {
    expect(resolveWhisperModel(undefined)).toBe(MODEL_EN);
    expect(resolveWhisperModel('')).toBe(MODEL_EN);
  });
});

describe('whisperLanguageFor', () => {
  it('returns the base language whisper should transcribe in', () => {
    expect(whisperLanguageFor('en-US')).toBe('en');
    expect(whisperLanguageFor('es-ES')).toBe('es');
    expect(whisperLanguageFor(undefined)).toBe('en');
  });
});

describe('modelsToPrune', () => {
  it('keeps only the active model and marks every other file for deletion', () => {
    const onDisk = [
      MODEL_EN.fileName,
      MODEL_MULTILINGUAL.fileName,
      'ggml-small-q5_1.bin', // superseded / unknown
    ];
    expect(modelsToPrune(onDisk, MODEL_EN.fileName)).toEqual([
      MODEL_MULTILINGUAL.fileName,
      'ggml-small-q5_1.bin',
    ]);
  });

  it('returns nothing to prune when only the active model is present', () => {
    expect(modelsToPrune([MODEL_EN.fileName], MODEL_EN.fileName)).toEqual([]);
  });

  it('returns nothing to prune for an empty directory', () => {
    expect(modelsToPrune([], MODEL_EN.fileName)).toEqual([]);
  });

  it('prunes a half-downloaded temp file that is not the active model', () => {
    const onDisk = [MODEL_MULTILINGUAL.fileName, `${MODEL_MULTILINGUAL.fileName}.partial`];
    expect(modelsToPrune(onDisk, MODEL_MULTILINGUAL.fileName)).toEqual([
      `${MODEL_MULTILINGUAL.fileName}.partial`,
    ]);
  });
});
