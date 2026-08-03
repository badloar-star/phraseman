import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'app', 'shards_shop.tsx'), 'utf8');

describe('ShardsShop cards tab layout', () => {
  it('lets the marketplace FlashList fill the remaining screen height', () => {
    const cardsTabStart = source.indexOf("<View style={{ flex: 1, display: shopTab === 'paid' ? 'flex' : 'none'");
    const cardsTabEnd = source.indexOf('</View>', cardsTabStart);
    const cardsTab = source.slice(cardsTabStart, cardsTabEnd);

    expect(cardsTabStart).toBeGreaterThanOrEqual(0);
    expect(cardsTab).toContain('<FlashList');
    expect(cardsTab).toMatch(/style=\{\{\s*flex:\s*1/);
  });

  it('keeps the FlashList background transparent so ScreenGradient shows through below the last card', () => {
    // зачем: FlashList v2 иногда красит свой корневой контейнер непрозрачным белым
    // по умолчанию — под последней карточкой был виден белый лист вместо фона темы.
    const cardsTabStart = source.indexOf("<View style={{ flex: 1, display: shopTab === 'paid' ? 'flex' : 'none'");
    const cardsTabEnd = source.indexOf('</View>', cardsTabStart);
    const cardsTab = source.slice(cardsTabStart, cardsTabEnd);

    expect(cardsTab).toContain("backgroundColor: 'transparent'");
    const flashListStart = cardsTab.indexOf('<FlashList');
    const flashListStyleEnd = cardsTab.indexOf('data={marketPacks}', flashListStart);
    const flashListStyle = cardsTab.slice(flashListStart, flashListStyleEnd);
    expect(flashListStyle).toContain("backgroundColor: 'transparent'");
  });
});
