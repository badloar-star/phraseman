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
    // зачем (владелец, 2026-08-24: «счёт рун на секунду показал неправду»):
    // обнуление при смене аккаунта обязано остаться — но ТОЛЬКО условным.
    // Безусловный ноль срабатывал и на обычном старте (cloud_sync зовёт
    // beginInitialAccountGeneration уже после первого кадра), и правильный
    // баланс на секунду падал в ноль. Сторожим оба требования сразу.
    expect(home).toContain('if (ownerChanged) setRunesBalance(0);');
    expect(home).not.toContain('            setRunesBalance(0);\n');
    expect(home).toContain('const ownerChanged = previousOwner !== null && previousOwner !== nextOwner;');
    expect(home).toContain('runesOwnerRef.current = nextOwner;');
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

    // Срез до ряда плиток, а не окном фиксированной длины: окно ложно падало,
    // как только в блок добавляли комментарии (класс бага formatting-drift).
    const tilesIndex = home.indexOf('visibleQuickItems.map', currencyIndex);
    expect(tilesIndex).toBeGreaterThan(currencyIndex);
    const currencyBlock = home.slice(currencyIndex, tilesIndex);
    expect(currencyBlock).toContain('testID="home-quickstart-shards"');
    expect(currencyBlock).toContain('<HomeRuneBalance');
    expect(currencyBlock).toContain('balance={runesBalance}');

    // Порядок: жемчужины левее рун. Без этой проверки перестановку не заметить.
    const shardsIndex = home.indexOf('testID="home-quickstart-shards"', currencyIndex);
    const runesIndex = home.indexOf('testID="home-quickstart-runes"', currencyIndex);
    expect(shardsIndex).toBeGreaterThan(0);
    expect(runesIndex).toBeGreaterThan(shardsIndex);

    // Плотная строка: чип рун не резервирует 46px тап-цели шапки и не заводит
    // вторую группу доступности внутри кнопки (иначе баланс читается дважды).
    expect(currencyBlock).toContain('reserveTapHeight={false}');
    expect(currencyBlock).toContain('standaloneA11y={false}');

    // Обе валюты одного размера — иначе строка выглядит рассогласованно.
    expect(currencyBlock).toContain('iconSize={homeQuickCurrencyIconSize}');
    expect(currencyBlock).toContain('width: homeQuickCurrencyIconSize, height: homeQuickCurrencyIconSize');

    // Склонение: «1 жемчужина», а не «1 жемчужин»; у рун — общий runeAmount.
    expect(currencyBlock).toContain('ruKnowledgeShardsAfterNumber(shardsBalance)');
    expect(home).toContain('runeAmount(lang, runesBalance)');

    // Соседние кнопки не перекрывают зоны нажатия по горизонтали.
    expect(currencyBlock).not.toContain('hitSlop={10}');

    // Всплывающее «+N» живёт рядом с иконкой жемчужин, а не в хедере.
    const bonusIndex = home.indexOf('testID="home-shards-bonus"');
    expect(bonusIndex).toBeGreaterThan(currencyIndex);
    expect(bonusIndex).toBeLessThan(tilesIndex);
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
    // Срез до кнопки профиля — она закрывает вторичный ряд хедера. Граница по
    // смыслу, а не окно фиксированной длины (см. коммент выше про drift).
    const profileIndex = home.indexOf('renderHomeProfileButton()', secondaryIndex);
    expect(profileIndex).toBeGreaterThan(secondaryIndex);
    const secondaryBlock = home.slice(secondaryIndex, profileIndex);

    expect(secondaryBlock).toContain('<EnergyIcon');
    expect(secondaryBlock).toContain('ref={energyIconRef}');
    expect(secondaryBlock).toContain('onPress={showEnergyTooltip}');
    expect(secondaryBlock).toContain('{showHomeEnergy && (');
    // Само правило, а не только его наличие: энергия видна ТОЛЬКО без Plus.
    // Без этой строки перепутанное отрицание прошло бы незамеченным.
    expect(home).toContain('const showHomeEnergy = !hasPremiumAccess;');
  });
});
