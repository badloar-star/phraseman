import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(
  join(process.cwd(), 'components', 'ReviewPromptModal.tsx'),
  'utf8',
);

describe('ReviewPromptModal overlay arbitration', () => {
  it('keeps caller visibility as intent and gates the native Modal through OverlayArbiter', () => {
    expect(source).toContain("useOverlayVisible('reviewPrompt', visible)");
    expect(source).toMatch(/<Modal\s+transparent\s+visible=\{overlayVisible\}/);
  });

  it('consumes prompt quota only after the arbiter actually presents a loaded prompt', () => {
    expect(source).toContain('const promptedForRequestRef = useRef(false)');

    expect(source).toContain('promptedForRequestRef.current = true;');
    expect(source.match(/markReviewPrompted\(\)/g)).toHaveLength(1);
  });

  it('marks the user rated only after the store page opens successfully', () => {
    const rateStart = source.indexOf('const rate = async () =>');
    const rateEnd = source.indexOf('\n  };', rateStart);
    const rateSource = source.slice(rateStart, rateEnd);

    expect(rateSource.indexOf('close();')).toBeGreaterThanOrEqual(0);
    expect(rateSource.indexOf('openStoreReviewPage()')).toBeGreaterThan(rateSource.indexOf('close();'));
    expect(rateSource.indexOf('markReviewRated()')).toBeGreaterThan(rateSource.indexOf('openStoreReviewPage()'));
  });
});
