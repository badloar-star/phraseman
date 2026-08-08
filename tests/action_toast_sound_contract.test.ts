import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'ActionToast.tsx'), 'utf8');

describe('ActionToast semantic sound routing', () => {
  test('requests sound only when a deduplicated visual toast starts its cycle', () => {
    const start = source.indexOf('const startCycle = useCallback');
    const enqueue = source.indexOf('const enqueue = useCallback');
    const block = source.slice(start, enqueue);

    expect(block).toContain('soundDirector.request(payload.soundEventId ?? TOAST_SOUND_EVENTS[payload.type]');
    expect(block).toContain('dedupeKey: toastKey(payload)');
    expect(block).toContain('deferAfterVoice: true');
    expect(source.slice(enqueue)).not.toContain('soundDirector.request(');
  });
});
