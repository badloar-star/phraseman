import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'app', 'shards_shop.tsx'), 'utf8');

describe('ShardsShop cards tab layout', () => {
  it('lets the marketplace FlashList fill the remaining screen height', () => {
    const cardsTabStart = source.indexOf("<View style={{ flex: 1, display: shopTab === 'paid' ? 'flex' : 'none' }}>");
    const cardsTabEnd = source.indexOf('</View>', cardsTabStart);
    const cardsTab = source.slice(cardsTabStart, cardsTabEnd);

    expect(cardsTabStart).toBeGreaterThanOrEqual(0);
    expect(cardsTab).toContain('<FlashList');
    expect(cardsTab).toContain('style={{ flex: 1 }}');
  });
});
