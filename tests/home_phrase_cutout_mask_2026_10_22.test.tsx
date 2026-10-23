// зачем (ускорение первого кадра Главной; маски с вырезом 4 · ТЕМЫ 4e6896eb1; координатор 22.10): «Фраза дня» на сцене — тень
// запечённой маской с вырезом (под полупрозрачной плашкой альфа 0) и заливка 50 % отдельным слоем; цвет тени как у прежней boxShadow:
// в светлых ×1,35. Три места плашки (карточка, ворота, заглушка) — со «Сценой» без размытой тени; без «Сцены» — как прежде.
// зачем: общая подмена react-native в тестах минимальна — нужные хосты подменяем здесь, как другие тесты отрисовки
jest.mock('react-native', () => ({ View: 'View', Image: 'Image' }));
jest.mock('../components/v2/ShadowSurface', () => ({ useShadowGlass: () => mockGlass }));

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import HomeSceneTranslucentPlate from '../components/home/v2/scene/HomeSceneTranslucentPlate';
import { HOME_SCENE_SHADOW_MASKS } from '../components/home/v2/scene/home_scene_baked_assets.generated';
import { HOME_LIGHT_SHADOW_BOOST, boostColorAlpha, homePlateFill } from '../components/home/v2/homePlate';
import { readSource } from './helpers/read_source';

let mockGlass = { isLight: true, plateShadow: '#10203040', plateShadowSoft: '#10203020', plateFillFrom: '#F4F5FA', raisedFillFrom: '#FFFFFF' };

type JsonNode = Readonly<{ type: string; props: Record<string, unknown>; children: readonly (JsonNode | string)[] | null }>;
const nodesOf = (root: JsonNode | readonly JsonNode[] | null, type: string): JsonNode[] => {
  const out: JsonNode[] = [];
  const walk = (n: JsonNode | string | null): void => {
    if (!n || typeof n === 'string') return;
    if (n.type === type) out.push(n);
    (n.children ?? []).forEach(walk);
  };
  (Array.isArray(root) ? root : [root]).forEach((n) => walk(n as JsonNode | null));
  return out;
};
const styleOf = (n: JsonNode): Record<string, unknown> => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean) as object[]);

describe('«Фраза дня» на сцене — тень маской с вырезом', () => {
  it('усиление цвета тени: альфа ×1,35 (не выше FF), прочие форматы — как есть', () => {
    expect(HOME_LIGHT_SHADOW_BOOST).toBe(1.35);
    expect(boostColorAlpha('#10203040', 1.35)).toBe('#10203056');
    expect(boostColorAlpha('#000000F0', 1.35)).toBe('#000000FF');
    expect(boostColorAlpha('rgba(0,0,0,0.2)', 1.35)).toBe('rgba(0,0,0,0.2)');
    expect(boostColorAlpha('#10203040', 1)).toBe('#10203040');
  });

  it('светлая тема: маски phraseCutout light + lightSoft усиленным цветом тени, заливка 50 % по форме плашки', async () => {
    mockGlass = { ...mockGlass, isLight: true };
    await render(<HomeSceneTranslucentPlate kind="phraseCutout" radius={24} />);
    const root = screen.toJSON() as unknown as JsonNode | JsonNode[];
    const images = nodesOf(root, 'Image');
    expect(images.map((n) => n.props.source)).toEqual([HOME_SCENE_SHADOW_MASKS.phraseCutout.light.source, HOME_SCENE_SHADOW_MASKS.phraseCutout.lightSoft.source]);
    expect(images.map((n) => styleOf(n).tintColor)).toEqual([boostColorAlpha('#10203040', 1.35), boostColorAlpha('#10203020', 1.35)]);
    const fill = nodesOf(root, 'View').find((n) => styleOf(n).backgroundColor !== undefined)!;
    expect(styleOf(fill)).toMatchObject({ borderRadius: 24, backgroundColor: homePlateFill(mockGlass) });
    expect(fill.props.pointerEvents).toBe('none');
  });

  it('тёмная тема: один слой dark цветом тени без усиления', async () => {
    mockGlass = { ...mockGlass, isLight: false };
    await render(<HomeSceneTranslucentPlate kind="phraseCutout" radius={24} />);
    const images = nodesOf(screen.toJSON() as unknown as JsonNode, 'Image');
    expect(images.map((n) => n.props.source)).toEqual([HOME_SCENE_SHADOW_MASKS.phraseCutout.dark.source]);
    expect(styleOf(images[0]!).tintColor).toBe('#10203040');
  });

  it('карточка, ворота и заглушка: со «Сценой» — маска и заливка вместо размытой тени; без «Сцены» — прежний стиль плашки', () => {
    const card = readSource('components/DailyPhraseCard.tsx');
    expect(card.split('sceneLook ? null : v2Glass').length - 1).toBe(3);
    expect(card.split('<HomeSceneTranslucentPlate kind="phraseCutout" radius={V2.radius.card} />').length - 1).toBe(3);
    expect(card).not.toMatch(/\[styles\.v2Card, v2Glass/);
  });
});
