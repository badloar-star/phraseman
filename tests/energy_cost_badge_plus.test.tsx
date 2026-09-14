import React from 'react';
import { render } from '@testing-library/react-native';
import EnergyCostBadge from '../components/EnergyCostBadge';

let mockUnlimited = false;
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({ isUnlimited: mockUnlimited, energyReady: true }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles },
}));

describe('energy cost badge for Plus', () => {
  it('shows the canonical cost to free users', async () => {
    mockUnlimited = false;
    const view = await render(<EnergyCostBadge activity="arena_match" testID="cost" />);
    expect(view.getByTestId('cost')).toBeTruthy();
    expect(view.getByText('−25')).toBeTruthy();
  });

  it('does not show activity costs to Plus or Pro users', async () => {
    mockUnlimited = true;
    const view = await render(<EnergyCostBadge activity="arena_match" testID="cost" />);
    expect(view.queryByTestId('cost')).toBeNull();
    expect(view.queryByText('−25')).toBeNull();
  });
});
