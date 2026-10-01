import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const HOME_PATH = path.join(ROOT, 'app', '(tabs)', 'home.tsx');
const RUNE_COMPONENT_PATH = path.join(ROOT, 'components', 'home', 'HomeRuneBalance.tsx');
// Путь к ассету валюты живёт в одном месте — homeRuneAsset.ts (HomeRuneBalance реэкспортирует).
const RUNE_ASSET_MODULE_PATH = path.join(ROOT, 'components', 'home', 'homeRuneAsset.ts');
// зачем (координатор §46, 2026-10-01): ассет монеты переехал из level-spin-rewards
// в coins/ вместе с ретайром спинов уровня; компонент ссылается на новый путь.
const RUNE_ASSET_PATH = path.join(ROOT, 'assets', 'images', 'coins', 'coin_rank_00.webp');

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

// зачем: 2026-08-24 владелец дважды переставлял валюты. Итоговое размещение:
// энергия, жемчужины и руны — в правом крае строки заголовка «Быстрый старт».
// Верхний хедер остаётся только для действий и больше не меняет ширину из-за
// асинхронного разрешения подписки.
describe('Home rune asset balance lives in the quick-start title row', () => {
  it('keeps the live rune balance wiring intact', () => {
    const home = read(HOME_PATH);

    expect(fs.existsSync(RUNE_ASSET_PATH)).toBe(true);
    expect(fs.existsSync(RUNE_COMPONENT_PATH)).toBe(true);
    const runeComponent = read(RUNE_COMPONENT_PATH);
    expect(runeComponent).toContain("import { HOME_RUNE_ICON_SOURCE } from './homeRuneAsset';");
    expect(read(RUNE_ASSET_MODULE_PATH)).toContain(
      "require('../../assets/images/coins/coin_rank_00.webp')",
    );
    expect(home).toContain(
      "import { getRunesBalance, peekRunes } from '../runes_system';",
    );
    expect(home).not.toContain('subscribeRunesBalance');
    expect(home).toContain('subscribeAppSnapshot');
    // Главная 2.0 берёт из HomeRuneBalance только иконку (полёт частиц) — чипа V1 нет.
    expect(home).toContain("import { HOME_RUNE_ICON_SOURCE } from '../../components/home/HomeRuneBalance';");
    expect(home).toContain('const [runesBalance, setRunesBalance] = useState(() => peekRunes());');
    expect(home).toContain('const unsubscribeRunesSnapshot = subscribeAppSnapshot');
    expect(home).toContain('const runesAccountSubscription = subscribeAccountGeneration');
    // зачем (владелец, 2026-08-24: «счёт рун на секунду показал неправду»):
    // обнуление при смене аккаунта обязано остаться — но ТОЛЬКО условным.
    // Безусловный ноль срабатывал и на обычном старте (cloud_sync зовёт
    // beginInitialAccountGeneration уже после первого кадра), и правильный
    // баланс на секунду падал в ноль. Сторожим оба требования сразу.
    // Сброс записан блоком вместе с флагом «баланс известен» — условие то же.
    expect(home).toMatch(/if \(ownerChanged\) \{ setRunesBalance\(0\);/);
    expect(home).not.toContain('            setRunesBalance(0);\n');
    expect(home).toContain('const ownerChanged = previousOwner !== null && previousOwner !== nextOwner;');
    expect(home).toContain('runesOwnerRef.current = nextOwner;');
    expect(home).toContain('void getRunesBalance().then');
    expect(home).toContain('unsubscribeRunesSnapshot();');
    expect(home).toContain('runesAccountSubscription.remove();');
  });

  // Кейс «валюты справа от заголовка "Быстрый старт"» снят: это раскладка Главной V1,
  // удалённой 01.10 (4169840e9); у Главной 2.0 нет ни ряда «Быстрый старт», ни шапки V1.

  it('keeps energy out of the Home screen entirely', () => {
    // зачем (01.10, удаление Главной V1; владелец: «на главной не надо энергию показывать»):
    // энергия жила во вторичном ряду V1-шапки. Главная 2.0 её не рисует — ни полосой (EnergyBar).
    const home = read(HOME_PATH);
    expect(home).not.toContain('<EnergyBar');
  });
});
