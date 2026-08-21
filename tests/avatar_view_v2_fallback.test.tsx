import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AvatarView from '../components/AvatarView';
import { starterAvatarDNA } from '../modules/avatar-dna/catalog';

jest.unmock('react-native');

jest.mock('expo-image', () => {
  const ReactModule = jest.requireActual('react');
  const { Image } = jest.requireActual('react-native');
  return {
    Image: (props: Record<string, unknown>) => ReactModule.createElement(Image, props),
  };
});

jest.mock('../components/AvatarAura', () => {
  const ReactModule = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  return function MockAvatarAura(props: { children: React.ReactNode }) {
    return ReactModule.createElement(NativeView, { testID: 'avatar-aura' }, props.children);
  };
});

jest.mock('../components/LevelBadge', () => {
  const ReactModule = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  return function MockLevelBadge() {
    return ReactModule.createElement(NativeView, { testID: 'level-badge' });
  };
});

jest.mock('../components/LevelAvatarMaterialOverlay', () => {
  const ReactModule = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  return function MockLevelAvatarMaterialOverlay() {
    return ReactModule.createElement(NativeView, { testID: 'level-material-overlay' });
  };
});

jest.mock('../components/CustomAvatarBadge', () => {
  const ReactModule = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  return function MockCustomAvatarBadge() {
    return ReactModule.createElement(NativeView, { testID: 'custom-avatar-badge' });
  };
});

describe('AvatarView v2 fallback chain', () => {
  const avatarV2 = {
    schemaVersion: 1 as const,
    state: 'ready' as const,
    renderId: 'r1',
    portraitUrl: 'https://cdn.example/p.webp',
    studioUrl: 'https://cdn.example/s.webp',
    manifestVersion: 1 as const,
  };

  it('prefers a ready v2 portrait and falls back to legacy when it errors', async () => {
    const view = await render(
      <AvatarView avatar="custom:custom-gen-01:ember:black" avatarV2={avatarV2} />,
    );

    expect(view.getByTestId('avatar-v2-image').props.source).toEqual({ uri: avatarV2.portraitUrl });
    await fireEvent(view.getByTestId('avatar-v2-image'), 'error');
    expect(view.getByTestId('custom-avatar-badge')).toBeTruthy();
    expect(view.getAllByTestId('avatar-aura')).toHaveLength(1);
  });

  it('falls back from a failed ready portrait to the owner local DNA stage', async () => {
    const view = await render(
      <AvatarView avatar="1" avatarV2={avatarV2} localDNA={starterAvatarDNA('starter_warm_01')} />,
    );

    await fireEvent(view.getByTestId('avatar-v2-image'), 'error');
    expect(view.getByTestId('avatar-dna-stage')).toBeTruthy();
    expect(view.getAllByTestId(/^avatar-layer-/)).not.toHaveLength(0);
  });

  it('uses local DNA before legacy when no ready projection exists', async () => {
    const view = await render(
      <AvatarView avatar="custom:custom-gen-01:ember:black" localDNA={starterAvatarDNA('starter_warm_01')} />,
    );

    expect(view.getByTestId('avatar-dna-stage')).toBeTruthy();
    expect(view.queryByTestId('custom-avatar-badge')).toBeNull();
  });
});
