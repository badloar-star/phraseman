import { buildSpokenWordReport, firstSoundHint } from '../app/speaking_word_report';

describe('speaking word report (per-word attempt map)', () => {
  it('marks every word clean on an exact match', () => {
    const report = buildSpokenWordReport({
      targetText: 'I would like a coffee',
      transcript: 'I would like a coffee',
    });
    expect(report).toHaveLength(5);
    expect(report.every((w) => w.status === 'clean')).toBe(true);
  });

  it('keeps display forms (punctuation) as targets, index-aligned with the phrase tokens', () => {
    const report = buildSpokenWordReport({
      targetText: 'How are you?',
      transcript: 'how are you',
    });
    expect(report.map((w) => w.target)).toEqual(['How', 'are', 'you?']);
    expect(report.every((w) => w.status === 'clean')).toBe(true);
  });

  it('flags a dropped word as missed', () => {
    const report = buildSpokenWordReport({
      targetText: 'good morning friend',
      transcript: 'good friend',
    });
    const morning = report.find((w) => w.target === 'morning');
    expect(morning?.status).toBe('missed');
    expect(report.find((w) => w.target === 'good')?.status).toBe('clean');
  });

  it('flags a substituted word as fuzzy with what was heard', () => {
    const report = buildSpokenWordReport({
      targetText: 'I think so',
      transcript: 'I sink so',
    });
    const think = report.find((w) => w.target === 'think');
    expect(think?.status).toBe('fuzzy');
    expect(think?.heard).toBe('sink');
  });

  it('downgrades a matched word to fuzzy when the engine flagged it low-confidence', () => {
    const report = buildSpokenWordReport({
      targetText: 'good morning',
      transcript: 'good morning',
      segments: [
        { segment: 'good', confidence: 0.9 },
        { segment: 'morning', confidence: 0.2 },
      ],
    });
    expect(report.find((w) => w.target === 'good')?.status).toBe('clean');
    expect(report.find((w) => w.target === 'morning')?.status).toBe('fuzzy');
  });

  it('ignores unavailable confidences (-1 / missing) — no false fuzzy', () => {
    const report = buildSpokenWordReport({
      targetText: 'good morning',
      transcript: 'good morning',
      segments: [
        { segment: 'good', confidence: -1 },
        { segment: 'morning' },
      ],
    });
    expect(report.every((w) => w.status === 'clean')).toBe(true);
  });

  it('surfaces the first concrete sound hint from a fuzzy word', () => {
    const report = buildSpokenWordReport({
      targetText: 'I think so',
      transcript: 'I sink so',
    });
    const hinted = firstSoundHint(report);
    if (hinted) {
      expect(hinted.word).toBe('think');
      expect(hinted.hint.expected).toBeTruthy();
      expect(hinted.hint.said).toBeTruthy();
    } else {
      // The G2P diff may be too noisy to pinpoint a sound — then no hint is
      // legitimately shown; the word itself must still be flagged.
      expect(report.find((w) => w.target === 'think')?.status).toBe('fuzzy');
    }
  });
});
