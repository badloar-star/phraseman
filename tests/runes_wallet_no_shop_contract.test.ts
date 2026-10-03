/**
 * runes_wallet_no_shop_contract.test.ts — сторож раздела «Руны».
 *
 * зачем (владелец, 2026-08-24, дословно: «в тот раздел не добавляй товары и
 * магазин»): раздел рун — только кошелёк и источники. Блок «усиления» из
 * макета docs/v2/mockups/27-runes-wallet-and-boosts.html ОТМЕНЁН. Макет
 * остался в репозитории, поэтому будущая сессия может «доделать» его в экран —
 * этот тест ломает такую попытку и отсылает к решению владельца.
 *
 * (Блок про Firebase-экономию runes_wallet_stats.ts снят вместе с удалённым модулем, 2026-10-03.)
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

  // зачем (координатор §46, 2026-10-01): на Главной 2.0 монеты — строка статистики,
  // тап ведёт в /coin_rank (макет 2.0); кошелёк открывается чипом баланса в шапке
  // уроков (RuneBalanceChip → /runes_wallet). Маршрут обязан быть зарегистрирован.
  it('маршрут зарегистрирован и открывается чипом баланса в шапке уроков', () => {
    expect(read('app/_layout.tsx').includes('name="runes_wallet"')).toBe(true);
    expect(read('components/RuneBalanceChip.tsx').includes("router.push('/runes_wallet')")).toBe(true);
    expect(read('app/(tabs)/lessons.tsx').includes('<RuneBalanceChip')).toBe(true);
    expect(read('app/(tabs)/home.tsx').includes("nav.push('/coin_rank')")).toBe(true);
  });
});

// зачем (TG-8A2D25725DBA, 2026-10-03): блок «runes_wallet_stats — Firebase-экономия» охранял app/runes_wallet_stats.ts —
// модуль удалён как мёртвый (экран кошелька его не использовал, нет ни одного вызова).
