// Анти-чит маска missed-слов в «Скажи вслух»: после неудачной попытки красные
// (не прозвучавшие) слова показываются первой буквой + «_» вместо полного
// текста, чтобы эталон нельзя было прочитать с экрана на повторной попытке.
// Контракт: и пословная карта (SpeakingPanel), и подсказка «Не прозвучало»
// (buildSpeakingHint) используют одну и ту же маску.

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

describe('missed-word anti-cheat wiring', () => {
  it('buildSpeakingHint never returns a raw missed word', () => {
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
      expect(hint.words).toEqual(['H__', 's__', 'e___']);
      for (const raw of ['Has', 'she', 'ever']) {
        expect(hint.words).not.toContain(raw);
      }
    }
  });

  it('SpeakingPanel renders missed words through the mask (source contract)', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'SpeakingPanel.tsx'),
      'utf8',
    );
    // Маска подключена и применяется именно к missed-статусу.
    expect(source).toContain('maskSpokenWordKeepInitial');
    expect(source).toContain('missedMasked');
  });
});
