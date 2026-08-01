import { eligibleTournamentCellCounts } from './tournament_task_eligibility';

const doc = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });
const base = { isVoice: false, difficulty: 1, tags: [], verified: true, source: 'ai' };

describe('eligible tournament readiness counts', () => {
  it('counts only tasks accepted by the new-room validator', () => {
    const sound = {
      ...base,
      mode: 'sound_contrast',
      payload: {
        audioUri: 'https://example.com/ship.mp3', phrase: 'ship',
        options: ['ship', 'sheep'], correctIndex: 0, contrast: '/ɪ/ vs /iː/',
      },
    };
    const options = Array.from({ length: 6 }, (_, index) => `right-${index}`);
    const speed = {
      ...base,
      mode: 'speed_match',
      payload: {
        prompt: 'Match', rightOptions: options,
        items: options.map((_, index) => ({ prompt: `left-${index}`, options, correctIndex: index })),
      },
    };
    const counts = eligibleTournamentCellCounts([
      doc('sound-valid', sound),
      doc('sound-three-options', {
        ...sound, payload: { ...sound.payload, options: ['ship', 'sheep', 'shape'] },
      }),
      doc('speed-valid', speed),
      doc('speed-five-pairs', {
        ...speed,
        payload: { ...speed.payload, rightOptions: options.slice(0, 5), items: speed.payload.items.slice(0, 5) },
      }),
      doc('legacy-verified', {
        ...base, mode: 'guess_phrase',
        payload: { phrase: 'one', options: ['1', '2', '3', '4'], correctIndex: 0 },
      }),
      doc('non-ai-valid', { ...sound, source: 'plan_content' }),
    ]);

    expect(counts['sound_contrast:1']).toBe(1);
    expect(counts['speed_match:1']).toBe(1);
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(2);
  });
});
