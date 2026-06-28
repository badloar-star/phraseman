import {
  isBorderline,
  isSecondOpinionAvailable,
  maybeSecondOpinion,
  __setSecondOpinionLoader,
  BORDERLINE_LOW,
} from '../app/speaking_second_opinion';

afterEach(() => __setSecondOpinionLoader(null)); // reset to default loader

describe('speaking second opinion', () => {
  it('borderline band: below low, above threshold, and inside', () => {
    expect(isBorderline(40, 75)).toBe(false); // too low
    expect(isBorderline(80, 75)).toBe(false); // already passed
    expect(isBorderline(70, 75)).toBe(true); // inside
    expect(isBorderline(BORDERLINE_LOW, 75)).toBe(true);
    expect(isBorderline(74, 75)).toBe(true);
  });

  it('reports unavailable when no native module is installed (JS-only tree)', () => {
    __setSecondOpinionLoader(() => null);
    expect(isSecondOpinionAvailable()).toBe(false);
  });

  it('does not run when the attempt is not borderline', async () => {
    __setSecondOpinionLoader(() => ({ transcribe: async () => ({ result: 'whatever' }) }));
    const r = await maybeSecondOpinion({
      audioPath: '/tmp/a.wav',
      fastScore: 30,
      threshold: 75,
      scoreTranscript: () => 100,
    });
    expect(r.ran).toBe(false);
    expect(r.reason).toBe('not_borderline');
    expect(r.score).toBe(30);
  });

  it('rescues a borderline attempt when whisper transcribes a better match', async () => {
    __setSecondOpinionLoader(() => ({ transcribe: async () => ({ result: 'the correct phrase' }) }));
    const r = await maybeSecondOpinion({
      audioPath: '/tmp/a.wav',
      fastScore: 70,
      threshold: 75,
      scoreTranscript: (t) => (t === 'the correct phrase' ? 92 : 70),
    });
    expect(r.ran).toBe(true);
    expect(r.reason).toBe('improved');
    expect(r.score).toBe(92);
    expect(r.transcript).toBe('the correct phrase');
  });

  it('keeps the fast score when whisper does not improve it', async () => {
    __setSecondOpinionLoader(() => ({ transcribe: async () => ({ result: 'worse guess' }) }));
    const r = await maybeSecondOpinion({
      audioPath: '/tmp/a.wav',
      fastScore: 70,
      threshold: 75,
      scoreTranscript: () => 60,
    });
    expect(r.score).toBe(70);
    expect(r.reason).toBe('no_improvement');
  });

  it('is safe when there is no audio path', async () => {
    __setSecondOpinionLoader(() => ({ transcribe: async () => ({ result: 'x' }) }));
    const r = await maybeSecondOpinion({
      audioPath: null,
      fastScore: 70,
      threshold: 75,
      scoreTranscript: () => 100,
    });
    expect(r.reason).toBe('no_audio');
    expect(r.score).toBe(70);
  });

  it('never throws when the transcriber errors', async () => {
    __setSecondOpinionLoader(() => ({
      transcribe: () => { throw new Error('native boom'); },
    }));
    const r = await maybeSecondOpinion({
      audioPath: '/tmp/a.wav',
      fastScore: 70,
      threshold: 75,
      scoreTranscript: () => 100,
    });
    expect(r.reason).toBe('error');
    expect(r.score).toBe(70);
  });

  it('supports the whisper.rn { promise } call shape', async () => {
    __setSecondOpinionLoader(() => ({
      transcribe: () => ({ promise: Promise.resolve({ result: 'great match' }) }),
    }));
    const r = await maybeSecondOpinion({
      audioPath: '/tmp/a.wav',
      fastScore: 70,
      threshold: 75,
      scoreTranscript: (t) => (t === 'great match' ? 95 : 70),
    });
    expect(r.reason).toBe('improved');
    expect(r.score).toBe(95);
  });
});
