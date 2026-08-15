import {
  normalizeSpokenWord,
  speakingMatchedFlags,
  speakingTargetTokens,
} from '../app/speaking_word_match';
import { scoreSpeechPronunciationTranscript } from '../app/pronunciation_scoring_client';

describe('speaking_word_match', () => {
  describe('normalizeSpokenWord', () => {
    it('lowercases and strips punctuation', () => {
      expect(normalizeSpokenWord('Phone.')).toBe('phone');
      expect(normalizeSpokenWord('  HELLO!  ')).toBe('hello');
    });
    it('keeps apostrophes and normalizes curly ones', () => {
      expect(normalizeSpokenWord('don’t')).toBe("don't");
      expect(normalizeSpokenWord("I'm")).toBe("i'm");
    });
    it('returns empty for pure punctuation', () => {
      expect(normalizeSpokenWord('—')).toBe('');
      expect(normalizeSpokenWord('...')).toBe('');
    });
  });

  describe('speakingTargetTokens', () => {
    it('splits on whitespace and keeps display punctuation', () => {
      expect(speakingTargetTokens('I bought a new phone.')).toEqual([
        'I', 'bought', 'a', 'new', 'phone.',
      ]);
    });
    it('handles extra whitespace', () => {
      expect(speakingTargetTokens('  two   words ')).toEqual(['two', 'words']);
    });
  });

  describe('speakingMatchedFlags', () => {
    const target = 'I bought a new phone';

    it('marks nothing when transcript is empty', () => {
      expect(speakingMatchedFlags(target, '')).toEqual([false, false, false, false, false]);
    });

    it('marks words progressively as they are heard', () => {
      expect(speakingMatchedFlags(target, 'I bought')).toEqual([true, true, false, false, false]);
    });

    it('is order-tolerant (out-of-order words still light up)', () => {
      expect(speakingMatchedFlags(target, 'phone new')).toEqual([false, false, false, true, true]);
    });

    it('marks all when full phrase is spoken (case/punct-insensitive)', () => {
      expect(speakingMatchedFlags(target, 'I BOUGHT a New phone!')).toEqual([true, true, true, true, true]);
    });

    it('requires each repeated target occurrence to be heard', () => {
      const repeatedTarget = 'The charger is near the phone';
      expect(speakingMatchedFlags(repeatedTarget, 'The charger is near phone')).toEqual([
        true, true, true, true, false, true,
      ]);
      expect(speakingMatchedFlags(repeatedTarget, 'The charger is near the phone')).toEqual([
        true, true, true, true, true, true,
      ]);
    });

    it('treats punctuation-only target tokens as already matched', () => {
      // em-dash token normalizes to empty -> always matched
      expect(speakingMatchedFlags('Wait — go', 'wait')).toEqual([true, true, false]);
    });
  });

  describe('integration: matching aligns with pass scoring', () => {
    it('a fully-matched phrase also passes the 90% pronunciation score', () => {
      const target = 'I bought a new phone';
      const transcript = 'I bought a new phone';
      const flags = speakingMatchedFlags(target, transcript);
      expect(flags.every(Boolean)).toBe(true);

      const scored = scoreSpeechPronunciationTranscript({ targetText: target, transcript });
      expect(scored.passed).toBe(true);
      expect(scored.score).toBeGreaterThanOrEqual(90);
    });

    it('an empty transcript neither matches nor passes', () => {
      const target = 'I bought a new phone';
      const flags = speakingMatchedFlags(target, '');
      expect(flags.some(Boolean)).toBe(false);

      const scored = scoreSpeechPronunciationTranscript({ targetText: target, transcript: '' });
      expect(scored.passed).toBe(false);
    });

    it('does not pass when one of two repeated words is omitted', () => {
      const scored = scoreSpeechPronunciationTranscript({
        targetText: 'The charger is near the phone',
        transcript: 'The charger is near phone',
      });
      expect(scored.passed).toBe(false);
    });
  });
});
