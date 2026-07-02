// Тесты pure-логики сборки chips (бит 2 АХ-сцены).

import {
  buildChipDeck,
  chipWordsFromLine,
  isChipCorrect,
  nextExpectedWord,
} from '../components/onboarding_aha/aha_chips_logic';
import { AHA_SCENARIOS } from '../components/onboarding_aha/aha_scenes';
import type { AhaChip } from '../components/onboarding_aha/aha_types';

describe('chipWordsFromLine', () => {
  const cases: Array<[string, string[]]> = [
    ['Can I get a coffee to go?', ['Can', 'I', 'get', 'a', 'coffee', 'to', 'go']],
    ['Sure, does tomorrow work?', ['Sure', 'does', 'tomorrow', 'work']],
    ['Honestly, me neither.', ['Honestly', 'me', 'neither']],
    ['Pretty quiet, actually.', ['Pretty', 'quiet', 'actually']],
    ["I'll be there in ten minutes.", ["I'll", 'be', 'there', 'in', 'ten', 'minutes']],
    ['Nice to meet you too.', ['Nice', 'to', 'meet', 'you', 'too']],
  ];

  it.each(cases)('%s -> срезает финальную пунктуацию, сохраняет апострофы', (text, expected) => {
    expect(chipWordsFromLine(text)).toEqual(expected);
  });

  it('срезает пунктуацию у всех 6 say-фраз сценариев', () => {
    for (const scenario of Object.values(AHA_SCENARIOS)) {
      const words = chipWordsFromLine(scenario.say.text);
      for (const word of words) {
        expect(word).not.toMatch(/[.,!?]$/);
      }
    }
  });

  it('сохраняет апостроф внутри слова (I\'ll)', () => {
    const words = chipWordsFromLine("I'll be there in ten minutes.");
    expect(words[0]).toBe("I'll");
  });

  it('сохраняет апостроф внутри слова (didn\'t) из hear-реплики media', () => {
    const words = chipWordsFromLine(AHA_SCENARIOS.media.hear.text);
    expect(words).toContain("didn't");
  });
});

describe('buildChipDeck', () => {
  it('детерминирован: один seed -> один и тот же порядок', () => {
    const deckA = buildChipDeck(AHA_SCENARIOS.travel, 42);
    const deckB = buildChipDeck(AHA_SCENARIOS.travel, 42);
    expect(deckA.map((c) => c.id)).toEqual(deckB.map((c) => c.id));
  });

  it('разный seed может дать другой порядок', () => {
    const deckA = buildChipDeck(AHA_SCENARIOS.travel, 1);
    const deckB = buildChipDeck(AHA_SCENARIOS.travel, 999);
    // не гарантируем строгое неравенство для любого сценария, но для travel (7 слов+2 дистрактора) ожидаем разницу
    expect(deckA.map((c) => c.id)).not.toEqual(deckB.map((c) => c.id));
  });

  it('содержит все слова целевой фразы', () => {
    const scenario = AHA_SCENARIOS.travel;
    const words = chipWordsFromLine(scenario.say.text);
    const deck = buildChipDeck(scenario, 7);
    const deckWords = deck.filter((c) => !c.isDistractor).map((c) => c.word);
    expect(deckWords.sort()).toEqual([...words].sort());
  });

  it('дистракторы помечены isDistractor=true', () => {
    const deck = buildChipDeck(AHA_SCENARIOS.work, 3);
    const distractors = deck.filter((c) => c.isDistractor);
    expect(distractors.length).toBeGreaterThan(0);
    for (const d of distractors) {
      expect(d.id.startsWith('d_')).toBe(true);
    }
  });

  it('отбрасывает дистрактор, совпадающий со словом фразы (защита контента)', () => {
    const scenario = {
      ...AHA_SCENARIOS.self,
      say: { ...AHA_SCENARIOS.self.say, text: 'Nice to meet you too.' },
      distractors: ['nice', 'glad'], // 'nice' дублирует слово фразы (регистронезависимо)
    };
    const deck = buildChipDeck(scenario, 5);
    const distractorWords = deck.filter((c) => c.isDistractor).map((c) => c.word.toLowerCase());
    expect(distractorWords).not.toContain('nice');
    expect(distractorWords).toContain('glad');
  });

  it('все 6 сценариев дают колоду без коллизий id', () => {
    for (const scenario of Object.values(AHA_SCENARIOS)) {
      const deck = buildChipDeck(scenario, 11);
      const ids = deck.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('nextExpectedWord', () => {
  const words = ['Can', 'I', 'get', 'a', 'coffee', 'to', 'go'];

  it('возвращает следующее слово по количеству собранных', () => {
    expect(nextExpectedWord(0, words)).toBe('Can');
    expect(nextExpectedWord(1, words)).toBe('I');
    expect(nextExpectedWord(6, words)).toBe('go');
  });

  it('возвращает null, когда фраза уже собрана', () => {
    expect(nextExpectedWord(7, words)).toBeNull();
  });

  it('возвращает null для отрицательного индекса', () => {
    expect(nextExpectedWord(-1, words)).toBeNull();
  });
});

describe('isChipCorrect', () => {
  const words = ['Can', 'I', 'get', 'a', 'coffee', 'to', 'go'];

  function chip(word: string, isDistractor = false): AhaChip {
    return { id: `${word}_0`, word, isDistractor };
  }

  it('true для правильного следующего слова', () => {
    expect(isChipCorrect(chip('Can'), 0, words)).toBe(true);
    expect(isChipCorrect(chip('get'), 2, words)).toBe(true);
  });

  it('false для дистрактора, даже если слово совпадает', () => {
    expect(isChipCorrect(chip('Can', true), 0, words)).toBe(false);
  });

  it('false для слова не в том порядке', () => {
    expect(isChipCorrect(chip('coffee'), 0, words)).toBe(false);
    expect(isChipCorrect(chip('I'), 0, words)).toBe(false);
  });

  it('регистронезависимое сравнение', () => {
    expect(isChipCorrect(chip('can'), 0, words)).toBe(true);
    expect(isChipCorrect(chip('CAN'), 0, words)).toBe(true);
  });

  it('false, когда фраза уже собрана целиком', () => {
    expect(isChipCorrect(chip('go'), 7, words)).toBe(false);
  });
});
