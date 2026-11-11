import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
}));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('../constants/i18n', () => ({
  triLang: (lang: string, copy: Record<string, unknown>) => copy[lang] ?? copy.en,
}));

import CoinRankCatalog from '../components/coins/CoinRankCatalog';
import { COIN_RANK_TABLE, coinRankPaidPriceFromStoryPayload } from '../app/coin_rank_table_v1';

const glass = {
  text: '#FFFFFF',
  secondary: '#AAAAAA',
  selected: '#333333',
  opaqueCard: '#111111',
} as never;

describe('цены в каталоге рангов', () => {
  it('каноническая таблица: ранг 0 бесплатный, ранг 1 = 1 000, затем +100 до итога 36 100', () => {
    let total = 0;
    for (const row of COIN_RANK_TABLE) {
      const expected = row.rank === 0 ? 0 : 1000 + (row.rank - 1) * 100;
      total += expected;
      expect(row).toMatchObject({ priceToReach: expected, totalSpent: total });
    }
    expect(total).toBe(36100);
  });

  it('история различает новую запечатанную цену, legacy-событие и битое новое поле', () => {
    expect(coinRankPaidPriceFromStoryPayload({ paidPrice: 1500 }, 6)).toBe(1500);
    expect(coinRankPaidPriceFromStoryPayload({}, 6)).toBe(6000);
    expect(coinRankPaidPriceFromStoryPayload({ paidPrice: 0 }, 6)).toBeNull();
    expect(coinRankPaidPriceFromStoryPayload({ paidPrice: '1500' }, 6)).toBeNull();
    expect(coinRankPaidPriceFromStoryPayload({ paidPrice: 1000 }, 0)).toBeNull();
    expect(coinRankPaidPriceFromStoryPayload({ paidPrice: 1000 }, 20)).toBeNull();
    expect(coinRankPaidPriceFromStoryPayload({ paidPrice: 1000 }, Number.NaN)).toBeNull();
  });

  it('показывает «бесплатно» для ранга 0 и цену каждого следующего ранга', async () => {
    await render(<CoinRankCatalog glass={glass} lang="en" currentRank={1} showTitle={false} />);
    expect(screen.getByText('Free')).toBeTruthy();
    expect(screen.getByText(/1\s000/)).toBeTruthy();
    expect(screen.getByText(/2\s800/)).toBeTruthy();
    expect(screen.getByTestId('coin-rank-catalog-cell-1').props.accessibilityLabel).toMatch(/1\s000/);
  });
});
