import {
  alignPhrasesToTranscript,
  formatTimingClock,
  parseTranscript,
} from '../shared/video_transcript_timing';
import { normalizeVideoPhraseDraft, normalizeVideoPhraseList } from '../shared/video_phrases_contract';

const SRT = `1
00:00:01,000 --> 00:00:04,000
Привет! Сегодня разберём фразы.

2
00:00:10,000 --> 00:00:13,000
First phrase: I'm running late.

3
00:01:15,500 --> 00:01:18,500
Next one — could you give me a hand?
`;

describe('video transcript timing', () => {
  it('parses SRT cues with timecodes and text', () => {
    const cues = parseTranscript(SRT);
    expect(cues).toHaveLength(3);
    expect(cues[1]).toEqual({ startSec: 10, endSec: 13, text: "First phrase: I'm running late." });
    expect(cues[2].startSec).toBe(75.5);
  });

  it('parses YouTube VTT, strips word tags and drops rolled duplicate lines', () => {
    const vtt = `WEBVTT
Kind: captions

00:00:02.000 --> 00:00:04.000 align:start position:0%
hello<00:00:02.500><c> there</c>

00:00:04.000 --> 00:00:06.000 align:start position:0%
hello there
how are you
`;
    const cues = parseTranscript(vtt);
    expect(cues.map((cue) => cue.text)).toEqual(['hello there', 'how are you']);
  });

  it('parses the copied "Show transcript" format with bare clocks', () => {
    const cues = parseTranscript('0:05\nfirst line\n1:02\nsecond line\n1:02:03 third line');
    expect(cues.map((cue) => [cue.startSec, cue.text])).toEqual([[5, 'first line'], [62, 'second line'], [3723, 'third line']]);
    expect(cues[0].endSec).toBe(62);
  });

  it('rejects text without timecodes', () => {
    expect(() => parseTranscript('just words without any time')).toThrow('transcript_has_no_timecodes');
    expect(() => parseTranscript('   ')).toThrow('transcript_empty');
  });

  it('finds each phrase near its spoken moment, in order', () => {
    const matches = alignPhrasesToTranscript([
      { phrase: "I'm running late", translation: 'Я опаздываю' },
      { phrase: 'Could you give me a hand?', translation: 'Не поможешь?' },
    ], parseTranscript(SRT));
    expect(matches[0].matchedBy).toBe('phrase');
    expect(matches[0].startSec).toBeGreaterThanOrEqual(10);
    expect(matches[0].startSec).toBeLessThan(13);
    expect(matches[1].startSec).toBeGreaterThanOrEqual(75);
    expect(matches[1].score).toBe(1);
  });

  it('falls back to the translation when the English phrase was misrecognised', () => {
    const cues = parseTranscript(`1
00:00:20,000 --> 00:00:24,000
а теперь запомни фразу я опаздываю
`);
    const [match] = alignPhrasesToTranscript([{ phrase: "I'm running late", translation: 'Я опаздываю' }], cues);
    expect(match.matchedBy).toBe('translation');
    expect(match.startSec).toBeGreaterThan(19);
  });

  it('leaves the time empty instead of guessing when nothing matches', () => {
    const [match] = alignPhrasesToTranscript([{ phrase: 'Totally absent words', translation: 'Совсем нет' }], parseTranscript(SRT));
    expect(match).toEqual({ startSec: null, score: 0, matchedBy: null });
  });

  it('formats clocks for display', () => {
    expect(formatTimingClock(75.4)).toBe('1:15');
    expect(formatTimingClock(3723)).toBe('1:02:03');
  });
});

describe('video phrase startSec contract', () => {
  const base = { videoId: 'abc12345678', ordinal: 1, phrase: 'A', translation: 'А', explanation: 'Е' };

  it('keeps a valid startSec rounded to 0.1 s', () => {
    expect(normalizeVideoPhraseDraft({ ...base, startSec: 12.345 }).startSec).toBe(12.3);
  });

  it('omits the key when there is no time, keeping old sets unchanged', () => {
    expect(normalizeVideoPhraseDraft({ ...base, startSec: null })).not.toHaveProperty('startSec');
    expect(normalizeVideoPhraseList('abc12345678', [{ phrase: 'A', translation: 'А', explanation: 'Е' }])[0]).not.toHaveProperty('startSec');
  });

  it('rejects a broken time instead of publishing it', () => {
    expect(() => normalizeVideoPhraseDraft({ ...base, startSec: -1 })).toThrow('video_phrase_start_sec_invalid');
    expect(() => normalizeVideoPhraseDraft({ ...base, startSec: 'abc' })).toThrow('video_phrase_start_sec_invalid');
  });
});
