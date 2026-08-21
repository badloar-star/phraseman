import React from 'react';
import fs from 'fs';
import { render } from '@testing-library/react-native';
import { AvatarDNAStage } from '../components/avatar-dna/AvatarDNAStage';
import { avatarCatalog, starterAvatarDNA } from '../modules/avatar-dna/catalog';
import { avatarDNARenderKey } from '../modules/avatar-dna/render_key';
import { resolveAvatarDNA } from '../modules/avatar-dna/resolver';

jest.unmock('react-native');

jest.mock('expo-image', () => {
  const ReactModule = jest.requireActual('react');
  const { Image } = jest.requireActual('react-native');
  return {
    Image: (props: Record<string, unknown>) => ReactModule.createElement(Image, props),
  };
});

describe('AvatarDNAStage', () => {
  const dna = starterAvatarDNA('starter_warm_01');

  it('renders effective layers in resolver order without animated avatar styles', async () => {
    const expectedLayerIds = resolveAvatarDNA(dna, avatarCatalog).layers.map((layer) => layer.id);
    const view = await render(<AvatarDNAStage dna={dna} camera="portrait" size={128} />);

    expect(
      view.getAllByTestId(/^avatar-layer-/).map((node) => node.props.accessibilityLabel),
    ).toEqual(expectedLayerIds);
    const source = fs.readFileSync(
      require.resolve('../components/avatar-dna/AvatarDNAStage'),
      'utf8',
    );
    expect(source).not.toMatch(/\bAnimated\b|react-native-reanimated/);
    expect(view.getByTestId('avatar-dna-stage').props.pointerEvents).toBe('none');
  });

  it('changes only static crop geometry between portrait and studio cameras', async () => {
    const portrait = await render(<AvatarDNAStage dna={dna} camera="portrait" size={128} />);
    const studio = await render(<AvatarDNAStage dna={dna} camera="studio" size={128} />);
    const portraitLayers = portrait.getAllByTestId(/^avatar-layer-/);
    const studioLayers = studio.getAllByTestId(/^avatar-layer-/);

    expect(portraitLayers).toHaveLength(studioLayers.length);
    expect(portraitLayers[0].props.style).not.toEqual(studioLayers[0].props.style);
    expect(portrait.getByTestId('avatar-dna-stage').props.style).toEqual(
      studio.getByTestId('avatar-dna-stage').props.style,
    );
  });

  it('passes resolved swatch tint to static image layers', async () => {
    const view = await render(<AvatarDNAStage dna={dna} camera="portrait" size={128} />);
    expect(view.getByTestId('avatar-layer-face.base.1').props.tintColor).toBe('#d4936a');
    expect(view.getByTestId('avatar-layer-hair.1.front.mask').props.tintColor).toBe('#5b2b18');
    expect(view.getByTestId('avatar-layer-hair.1.front.shading').props.tintColor).toBeUndefined();
    expect(view.getByTestId('avatar-layer-outfit.1').props.tintColor).toBeUndefined();
  });

  it('builds a canonical content-addressed render key', async () => {
    const left = {
      ...dna,
      face: { ...dna.face, skinDetailIds: ['detail_b', 'detail_a'] },
    };
    const right = {
      ...dna,
      face: { ...dna.face, skinDetailIds: ['detail_a', 'detail_b'] },
    };

    const leftKey = avatarDNARenderKey(left, 1);
    const rightKey = avatarDNARenderKey(right, 1);
    await expect(leftKey).resolves.toBe(await rightKey);
    await expect(leftKey).resolves.toMatch(/^avatar-dna:v1:[a-f0-9]{64}$/);
    await expect(avatarDNARenderKey(left, 0)).rejects.toThrow('avatar_render_key_invalid');
  });
});
