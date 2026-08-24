/**
 * runes_wallet_no_shop_contract.test.ts — сторож раздела «Руны».
 *
 * зачем (владелец, 2026-08-24, дословно: «в тот раздел не добавляй товары и
 * магазин»): раздел рун — только кошелёк и источники. Блок «усиления» из
 * макета docs/v2/mockups/27-runes-wallet-and-boosts.html ОТМЕНЁН. Макет
 * остался в репозитории, поэтому будущая сессия может «доделать» его в экран —
 * этот тест ломает такую попытку и отсылает к решению владельца.
 *
 * Дополнительно охраняет Firebase-экономию runes_wallet_stats.ts: один doc-get
 * с кэшем 6 часов, без обходов коллекций и фоновых таймеров.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (rel: string): string => readFileSync(join(root, rel), 'utf8');

/**
 * Комментарии из проверки исключаем: шапка runes_wallet.tsx ДОКУМЕНТИРУЕТ запрет
 * («блок усилений отменён», имя файла макета *-boosts.html) — сторож ловит
 * возвращение коммерции в КОД, а не упоминание запрета в документации.
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('раздел «Руны» — без товаров и магазина (решение владельца 2026-08-24)', () => {
  const screen = stripComments(read('app/runes_wallet.tsx'));

  it('не содержит покупок и торговых механик', () => {
    // Любой из этих маркеров означает, что в раздел вернули коммерцию.
    const forbidden = [
      'spend_shop',
      'httpsCallable',
      'purchase',
      'Purchase',
      'priceStars',
      'Усиления',
      'усиления',
      'boost',
      'Boost',
    ];
    for (const token of forbidden) {
      expect(screen.includes(token)).toBe(false);
    }
  });

  it('первый кадр — синхронно из снапшота, без полноэкранного спиннера', () => {
    expect(screen.includes('peekRunesBalance()')).toBe(true);
    expect(screen.includes('ActivityIndicator')).toBe(false);
  });

  it('запреты владельца по дизайну: без обводок контейнеров и ужатия шрифта', () => {
    expect(screen.includes('borderWidth')).toBe(false);
    expect(screen.includes('adjustsFontSizeToFit')).toBe(false);
  });

  it('маршрут зарегистрирован и открывается из обеих шапок', () => {
    expect(read('app/_layout.tsx').includes('name="runes_wallet"')).toBe(true);
    expect(read('app/(tabs)/home.tsx').includes("'/runes_wallet'")).toBe(true);
    expect(read('app/(tabs)/lessons.tsx').includes('"/runes_wallet"')).toBe(true);
  });
});

describe('runes_wallet_stats — Firebase-экономия', () => {
  const stats = read('app/runes_wallet_stats.ts');

  it('кэш 6 часов, чтение только одного документа users/{uid}', () => {
    expect(stats.includes('6 * 60 * 60 * 1000')).toBe(true);
    expect(stats.includes(".collection('users').doc(")).toBe(true);
    // Никаких обходов коллекций из клиентского модуля статистики.
    expect(stats.includes('.where(')).toBe(false);
    expect(stats.includes('.limit(')).toBe(false);
  });

  it('нет фоновых таймеров — рефреш только при входе на экран', () => {
    expect(stats.includes('setInterval')).toBe(false);
    expect(stats.includes('setTimeout')).toBe(false);
  });
});
