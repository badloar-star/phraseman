// Pure-логика бита 3 АХ-сцены: мягкая оценка и выбор лучшей гипотезы.

import {
  countMatchedWords,
  pickBetterTranscript,
  softSpeechOutcome,
} from '../components/onboarding_aha/aha_speech_logic';
import type { SpokenWordEntry, SpokenWordStatus } from '../app/speaking_word_report';

const entry = (status: SpokenWordStatus, target = 'word'): SpokenWordEntry => ({
  target,
  status,
});

describe('softSpeechOutcome', () => {
  it('все слова clean → 100 и success', () => {
    const report = [entry('clean'), entry('clean'), entry('clean')];
    expect(softSpeechOutcome(report)).toEqual({ pct: 100, success: true });
  });

  it('fuzzy считается услышанным (мы продаём, не оцениваем)', () => {
    const report = [entry('clean'), entry('fuzzy'), entry('fuzzy'), entry('clean')];
    expect(softSpeechOutcome(report)).toEqual({ pct: 100, success: true });
  });

  it('половина missed → 50 и success (мягкий порог)', () => {
    const report = [entry('clean'), entry('fuzzy'), entry('missed'), entry('missed')];
    expect(softSpeechOutcome(report)).toEqual({ pct: 50, success: true });
  });

  it('все missed → 0 и не success', () => {
    const report = [entry('missed'), entry('missed'), entry('missed')];
    expect(softSpeechOutcome(report)).toEqual({ pct: 0, success: false });
  });

  it('пустой report → 0 и не success (без NaN)', () => {
    expect(softSpeechOutcome([])).toEqual({ pct: 0, success: false });
  });

  it('округляет до целого: 1 из 3 → 33, 2 из 3 → 67', () => {
    const oneOfThree = [entry('clean'), entry('missed'), entry('missed')];
    expect(softSpeechOutcome(oneOfThree)).toEqual({ pct: 33, success: false });

    const twoOfThree = [entry('clean'), entry('fuzzy'), entry('missed')];
    expect(softSpeechOutcome(twoOfThree)).toEqual({ pct: 67, success: true });
  });

  it('чуть меньше половины (3 из 7 → 43) — не success', () => {
    const report = [
      entry('clean'),
      entry('clean'),
      entry('fuzzy'),
      entry('missed'),
      entry('missed'),
      entry('missed'),
      entry('missed'),
    ];
    expect(softSpeechOutcome(report)).toEqual({ pct: 43, success: false });
  });
});

describe('countMatchedWords', () => {
  const target = 'Can I get a coffee to go?';

  it('считает слова цели, услышанные в транскрипте (без учёта регистра/пунктуации)', () => {
    expect(countMatchedWords(target, 'can i get')).toBe(3);
    expect(countMatchedWords(target, 'coffee to go')).toBe(3);
  });

  it('пустой транскрипт → 0', () => {
    expect(countMatchedWords(target, '')).toBe(0);
    expect(countMatchedWords(target, '   ')).toBe(0);
  });
});

describe('pickBetterTranscript', () => {
  const target = 'Can I get a coffee to go?';

  it('кандидат с большим числом слов цели побеждает', () => {
    expect(pickBetterTranscript(target, 'can i', 'can i get a coffee')).toBe(
      'can i get a coffee',
    );
  });

  it('поздний обрывок не затирает более полную гипотезу', () => {
    expect(pickBetterTranscript(target, 'can i get a coffee to go', 'to go')).toBe(
      'can i get a coffee to go',
    );
  });

  it('пустой кандидат не затирает текущий', () => {
    expect(pickBetterTranscript(target, 'can i get', '')).toBe('can i get');
    expect(pickBetterTranscript(target, 'can i get', '  ')).toBe('can i get');
  });

  it('первый непустой кандидат берётся на пустом текущем', () => {
    expect(pickBetterTranscript(target, '', 'coffee')).toBe('coffee');
  });

  it('при равенстве остаётся текущий (первая полная гипотеза)', () => {
    // 'coffee' и 'go' — по одному совпавшему слову цели.
    expect(pickBetterTranscript(target, 'coffee please', 'go now')).toBe('coffee please');
  });
});
