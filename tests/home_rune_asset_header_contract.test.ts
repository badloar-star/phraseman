import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const HOME_PATH = path.join(ROOT, 'app', '(tabs)', 'home.tsx');
const RUNE_COMPONENT_PATH = path.join(ROOT, 'components', 'home', 'HomeRuneBalance.tsx');
const RUNE_ASSET_PATH = path.join(
  ROOT,
  'assets',
  'images',
  'level-spin-rewards',
  'stars_10.webp',
);

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

// зачем: 2026-08-24 владелец дважды переставлял валюты. Итоговое размещение:
// жемчужины и руны — в правом крае строки заголовка «Быстрый старт», энергия —
// обратно в верхний хедер. Исходная версия сторожа требовала все три в хедере,
// то есть охраняла отменённое правило; здесь зафиксировано финальное решение.
describe('Home rune asset balance lives in the quick-start title row', () => {
  it('keeps the live rune balance wiring intact', () => {
    const home = read(HOME_PATH);

    expect(fs.existsSync(RUNE_ASSET_PATH)).toBe(true);
    expect(fs.existsSync(RUNE_COMPONENT_PATH)).toBe(true);
    const runeComponent = read(RUNE_COMPONENT_PATH);
    expect(runeComponent).toContain(
      "require('../../assets/images/level-spin-rewards/stars_10.webp')",
    );
    expect(home).toContain(
      "import { getRunesBalance, peekRunes } from '../runes_system';",
    );
    expect(home).not.toContain('subscribeRunesBalance');
    expect(home).toContain('subscribeAppSnapshot');
    expect(home).toContain("import HomeRuneBalance from '../../components/home/HomeRuneBalance';");
    expect(home).toContain('const [runesBalance, setRunesBalance] = useState(() => peekRunes());');
    expect(home).toContain('const unsubscribeRunesSnapshot = subscribeAppSnapshot');
    expect(home).toContain('const runesAccountSubscription = subscribeAccountGeneration');
    expect(home).toContain('setRunesBalance(0);');
    expect(home).toContain('void getRunesBalance().then');
    expect(home).toContain('unsubscribeRunesSnapshot();');
    expect(home).toContain('runesAccountSubscription.remove();');
  });

  it('renders pearls and runes on the right of the quick-start title, not in the header or the level card', () => {
    const home = read(HOME_PATH);

    const titleIndex = home.indexOf('testID="home-quickstart-title"');
    const currencyIndex = home.indexOf('testID="home-quickstart-currency-row"');

    expect(titleIndex).toBeGreaterThanOrEqual(0);
    // Валюты идут ПОСЛЕ заголовка в том же ряду — значит, справа от него.
    expect(currencyIndex).toBeGreaterThan(titleIndex);

    const currencyBlock = home.slice(currencyIndex, currencyIndex + 3000);
    expect(currencyBlock).toContain('testID="home-quickstart-shards"');
    expect(currencyBlock).toContain('<HomeRuneBalance');
    expect(currencyBlock).toContain('balance={runesBalance}');
    // Распорка между заголовком и валютами прижимает их к правому краю.
    expect(home.slice(titleIndex, currencyIndex)).toContain('flex: 1, minWidth: 0');

    // Валют больше нет ни в хедере, ни на карточке уровня.
    expect(home).not.toContain('testID="home-stats-currency-row"');
    const headerIndex = home.indexOf('testID="home-header-currency-actions"');
    const headerEndIndex = home.indexOf('testID="home-header-secondary-actions"');
    expect(headerIndex).toBeGreaterThanOrEqual(0);
    expect(headerEndIndex).toBeGreaterThan(headerIndex);
    const headerBlock = home.slice(headerIndex, headerEndIndex);
    expect(headerBlock).not.toContain('<HomeRuneBalance');
    expect(headerBlock).not.toContain("nav.push('/shards_shop')");

    expect(home).toContain('const homeHeaderCompact = CONTENT_W < 370;');
    expect(home).toContain('testID="home-header-currency-actions"');
    expect(home).toContain('testID="home-header-secondary-actions"');
    expect(home).toContain("flexDirection: homeHeaderCompact ? 'column' : 'row'");
  });

  it('keeps the energy icon in the header with its tooltip anchor', () => {
    const home = read(HOME_PATH);

    const secondaryIndex = home.indexOf('testID="home-header-secondary-actions"');
    expect(secondaryIndex).toBeGreaterThanOrEqual(0);
    const secondaryBlock = home.slice(secondaryIndex, secondaryIndex + 3000);

    expect(secondaryBlock).toContain('<EnergyIcon');
    expect(secondaryBlock).toContain('ref={energyIconRef}');
    expect(secondaryBlock).toContain('onPress={showEnergyTooltip}');
    expect(secondaryBlock).toContain('{showHomeEnergy && (');
  });
});
