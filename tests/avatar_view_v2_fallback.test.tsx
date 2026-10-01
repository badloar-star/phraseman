import fs from 'fs';
import path from 'path';
import React from 'react';
import { render } from '@testing-library/react-native';
import AvatarView from '../components/AvatarView';

jest.unmock('react-native');

jest.mock('expo-image', () => {
  const ReactModule = jest.requireActual('react');
  const { Image } = jest.requireActual('react-native');
  return {
    Image: (props: Record<string, unknown>) => ReactModule.createElement(Image, props),
  };
});

// Таблица рангов тянет expo-цепочку (virtual/env), которую rntl-конфиг не
// транспилирует; для проверки ветвления хватает её контракта.
jest.mock('../app/coin_rank_table_v1', () => ({
  isValidCoinRank: (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 19,
  coinRankRowForDisplay: (rank: number) => ({ source: { testUri: `coin_${rank}` }, levelTitle: `rank ${rank}` }),
}));

// зачем: Q5 (координатор 01.10) — «Студия персонажа» (Avatar DNA) и портрет V2
// удалены. Аватар = монета ранга, если ранг известен, иначе старая картинка.
describe('AvatarView after Avatar DNA removal (Q5)', () => {
  it('renders the coin of the rank when the rank is known', async () => {
    const view = await render(<AvatarView avatar="1" coinRank={3} />);
    expect(view.getByTestId('avatar-coin-rank')).toBeTruthy();
    expect(view.queryByTestId('avatar-dna-stage')).toBeNull();
    expect(view.queryByTestId('avatar-v2-image')).toBeNull();
  });

  it('falls back to the base image for removed cosmetics without DNA or portrait paths', async () => {
    const view = await render(<AvatarView avatar="custom:custom-gen-01:ember:black" auraId="aura-ember" />);
    expect(view.queryByTestId('avatar-coin-rank')).toBeNull();
    expect(view.queryByTestId('avatar-dna-stage')).toBeNull();
    expect(view.queryByTestId('custom-avatar-badge')).toBeNull();
    expect(view.queryByTestId('avatar-aura')).toBeNull();
  });

  it('no longer imports the Avatar DNA stage or contracts', () => {
    const source = fs.readFileSync(path.join(__dirname, '../components/AvatarView.tsx'), 'utf8');
    expect(source).not.toContain('avatar-dna');
    expect(source).not.toContain('localDNA');
    expect(source).not.toContain('avatarV2');
  });
});
