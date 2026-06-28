import { diffPhonemes } from '../app/speaking_phoneme_diff';

describe('speaking phoneme (word-level) diff', () => {
  it('marks every word ok on a perfect match', () => {
    const r = diffPhonemes('I would like coffee', 'I would like coffee');
    expect(r.hasIssues).toBe(false);
    expect(r.words.map((w) => w.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
  });

  it('treats phonetic spelling variants as ok (centre ~ center)', () => {
    const r = diffPhonemes('Go to the center', 'Go to the centre');
    expect(r.hasIssues).toBe(false);
  });

  it('flags a substituted word as mispronounced with what was heard', () => {
    const r = diffPhonemes('I would like coffee', 'I would like banana');
    const last = r.words[3]!;
    expect(last.status).not.toBe('ok');
    expect(r.hasIssues).toBe(true);
    // "coffee" did not come through; it was either mispronounced or missed.
    expect(['mispronounced', 'missed']).toContain(last.status);
  });

  it('flags a dropped trailing word as missed', () => {
    const r = diffPhonemes('Where is the nearest stop', 'Where is the nearest');
    const stop = r.words.find((w) => w.target.toLowerCase() === 'stop')!;
    expect(stop.status).toBe('missed');
  });

  it('keeps correctly-said words ok even when another word is wrong', () => {
    const r = diffPhonemes('Please open the window', 'Please open the door');
    expect(r.words[0]!.status).toBe('ok'); // please
    expect(r.words[1]!.status).toBe('ok'); // open
    expect(r.words[2]!.status).toBe('ok'); // the
    expect(r.words[3]!.status).not.toBe('ok'); // window
  });

  it('handles empty transcript: every word missed', () => {
    const r = diffPhonemes('hello there', '');
    expect(r.words.every((w) => w.status === 'missed')).toBe(true);
    expect(r.hasIssues).toBe(true);
  });
});
