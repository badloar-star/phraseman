import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AvatarDNAEditor } from '../components/avatar-dna/AvatarDNAEditor';
import { starterAvatarDNA } from '../modules/avatar-dna/catalog';
import { avatarDNACopy, avatarDNAItemName } from '../app/avatar_dna_copy';

jest.unmock('react-native');

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      bgPrimary: '#FFF5EC', bgSurface: '#FFFFFF', textPrimary: '#30180F',
      textSecond: '#704B3B', textMuted: '#765E52', accent: '#CC4B18',
      correct: '#B7F34A', correctText: '#07110A', border: '#E7D2C4',
    },
    ds: { radius: { md: 12, lg: 16, xl: 20, xxl: 24 }, shadow: { soft: {} } },
  }),
}));

jest.mock('../components/avatar-dna/AvatarDNAStage', () => {
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { AvatarDNAStage: () => ReactModule.createElement(View, { testID: 'avatar-dna-stage' }) };
});

describe('Avatar DNA Studio accessibility', () => {
  it('exposes selected tabs, 44px controls, item status and dark CTA text', async () => {
    const copy = avatarDNACopy('ru');
    const hoodName = avatarDNAItemName('headwear.assassin_hood.01', copy);
    const view = await render(
      <AvatarDNAEditor
        initialDNA={starterAvatarDNA('starter_warm_01')}
        lang="ru"
        reduceMotion
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );

    expect(view.getByRole('tab', { name: copy.base }).props.accessibilityState).toEqual({ selected: true });
    expect(view.getByRole('button', { name: copy.close }).props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minWidth: 44, minHeight: 44 })]),
    );
    expect(view.getByRole('button', { name: copy.undo })).toBeDisabled();
    expect(view.getByRole('button', { name: copy.redo })).toBeDisabled();
    await fireEvent.press(view.getByRole('tab', { name: copy.look }));
    expect(view.getByLabelText(`${hoodName}, ${copy.rewardLocked}`)).toBeTruthy();
    const cta = view.getByRole('button', { name: copy.save });
    expect(cta).toBeEnabled();
    expect(view.getByTestId('avatar-dna-save-label').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#07110A' })]),
    );
  });

  it('changes selection immediately when reduced motion is enabled', async () => {
    const copy = avatarDNACopy('ru');
    const hoodName = avatarDNAItemName('headwear.assassin_hood.01', copy);
    const view = await render(
      <AvatarDNAEditor
        initialDNA={starterAvatarDNA('starter_warm_01')}
        lang="ru"
        reduceMotion
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    await fireEvent.press(view.getByRole('tab', { name: copy.look }));
    await fireEvent.press(view.getByLabelText(`${hoodName}, ${copy.rewardLocked}`));
    expect(view.getByLabelText(`${hoodName}, ${copy.rewardSelected}`).props.accessibilityState).toEqual({ selected: true });
    expect(view.getByText('reduced')).toBeTruthy();
  });
});
