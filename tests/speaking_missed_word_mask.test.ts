// Маска missed-слов «t____» (помощники остаются), но экран «не засчитано» её больше НЕ применяет:
// решение эталона Макетов 15.10 (speech-result-states.html) — фраза целиком, пропущенные слова красным,
// строка «Не услышали слово «X»». Контракт: подсказка и пословная карта показывают слова целиком.

import { maskSpokenPhraseKeepInitial, maskSpokenWordKeepInitial } from '../app/speaking_word_report';
import { buildSpeakingHint } from '../app/speaking_score_bands';
import fs from 'fs';
import path from 'path';

describe('maskSpokenWordKeepInitial', () => {
  it('keeps the first letter and masks the rest', () => {
    expect(maskSpokenWordKeepInitial('think')).toBe('t____');
    expect(maskSpokenWordKeepInitial('Has')).toBe('H__');
    expect(maskSpokenWordKeepInitial('ever')).toBe('e___');
  });

  it('keeps punctuation (apostrophes, hyphens, question marks) visible', () => {
    expect(maskSpokenWordKeepInitial("don't")).toBe("d__'_");
    expect(maskSpokenWordKeepInitial('well-known')).toBe('w___-_____');
    expect(maskSpokenWordKeepInitial('before?')).toBe('b_____?');
  });

  it('single-letter and empty tokens are safe', () => {
    expect(maskSpokenWordKeepInitial('I')).toBe('I');
    expect(maskSpokenWordKeepInitial('a')).toBe('a');
    expect(maskSpokenWordKeepInitial('')).toBe('');
  });

  it('handles non-ASCII letters (unicode-aware)', () => {
    expect(maskSpokenWordKeepInitial('école')).toBe('é____');
  });

  it('masks every word of a failed phrase while preserving initials and spacing', () => {
    expect(maskSpokenPhraseKeepInitial('They are calm')).toBe('T___ a__ c___');
    expect(maskSpokenPhraseKeepInitial("We're well-known")).toBe("W_'__ w___-_____");
  });
});

describe('экран «не засчитано»: пропущенные слова целиком', () => {
  it('buildSpeakingHint возвращает пропущенные слова как есть (без маски)', () => {
    const hint = buildSpeakingHint({
      honestyFlagged: false,
      stress: 'unknown',
      report: [
        { target: 'Has', status: 'missed' },
        { target: 'she', status: 'missed' },
        { target: 'ever', status: 'missed' },
        { target: 'helped', status: 'clean' },
        { target: 'you', status: 'clean' },
      ],
    });
    expect(hint.kind).toBe('missed_words');
    if (hint.kind === 'missed_words') {
      expect(hint.words).toEqual(['Has', 'she', 'ever']);
    }
  });

  it('SpeakingPanel рисует красное по missingWords, без маски пропущенных слов (source contract)', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'SpeakingPanel.tsx'),
      'utf8',
    );
    expect(source).toContain('buildSpeechFailView');
    expect(source).toContain('strictMissed');
    expect(source).not.toContain('maskSpokenWordKeepInitial');
    expect(source).not.toContain('missedMasked');
    // onScore отдаёт хостам пропущенные слова строгой проверки
    expect(source).toMatch(/onScore\?\.\(\{[^}]*missingWords/);
  });
});
