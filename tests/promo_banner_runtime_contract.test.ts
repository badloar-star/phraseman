import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'components/PromoBanner.tsx'), 'utf8');

describe('PromoBanner runtime ownership', () => {
  it('uses bounded absolute-expiry scheduling and shared app state', () => {
    expect(source).not.toContain('setInterval(');
    expect(source).toContain('createCampaignExpiryScheduler');
    expect(source).toContain('runtimeAppStateStore.subscribe');
    expect(source).toContain('parsePromoUntilMs(untilRaw)');
    expect(source).toContain('generation !== refreshGeneration.current');
  });
});
