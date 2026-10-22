// зачем (владелец кнопкой: ускорение первого кадра Главной, шаг 2; ассеты 4 · ТЕМЫ 99165475b): тень плиты сцены — запечённая маска
// позади заливки: тёмная тема — один слой dark цвета тени, светлая — light и lightSoft; вставки −margin и сдвиг offsetY из таблицы;
// касаний не принимает; в лёгком режиме тени нет.
// зачем: общая подмена react-native в тестах минимальна — нужные хосты подменяем здесь, как другие тесты отрисовки
jest.mock('react-native', () => ({ View: 'View', Image: 'Image' }));

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import HomeScenePlateShadow from '../components/home/v2/scene/HomeScenePlateShadow';
import { HOME_SCENE_SHADOW_MASKS } from '../components/home/v2/scene/home_scene_baked_assets.generated';
import { setLiteModeFlag } from '../constants/lite_mode_flag';

type JsonNode = Readonly<{ type: string; props: Record<string, unknown>; children: readonly (JsonNode | string)[] | null }>;

function imagesOf(root: JsonNode | null): JsonNode[] {
  const out: JsonNode[] = [];
  const walk = (n: JsonNode | string | null): void => {
    if (!n || typeof n === 'string') return;
    if (n.type === 'Image') out.push(n);
    (n.children ?? []).forEach(walk);
  };
  walk(root);
  return out;
}

const styleOf = (n: JsonNode): Record<string, unknown> => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean) as object[]);

describe('тень плиты сцены Главной — запечённая маска', () => {
  afterEach(() => setLiteModeFlag(false));

  it('тёмная тема: один слой dark цвета тени, вставки −margin и сдвиг offsetY, касаний не принимает', async () => {
    const m = HOME_SCENE_SHADOW_MASKS.tile.dark;
    await render(<HomeScenePlateShadow kind="tile" isLight={false} shadow="#000000" shadowSoft="#111111" />);
    const root = screen.toJSON() as unknown as JsonNode;
    expect(root.props.pointerEvents).toBe('none');
    const images = imagesOf(root);
    expect(images).toHaveLength(1);
    expect(styleOf(images[0]!)).toMatchObject({ left: -m.margin, right: -m.margin, top: m.offsetY - m.margin, bottom: -m.offsetY - m.margin, tintColor: '#000000' });
  });

  it('светлая тема: два слоя — light цветом тени и lightSoft мягкой', async () => {
    await render(<HomeScenePlateShadow kind="today" isLight shadow="#000000" shadowSoft="#111111" />);
    const images = imagesOf(screen.toJSON() as unknown as JsonNode);
    expect(images.map((n) => styleOf(n).tintColor)).toEqual(['#000000', '#111111']);
  });

  it('лёгкий режим — тени нет', async () => {
    setLiteModeFlag(true);
    await render(<HomeScenePlateShadow kind="tile" isLight={false} shadow="#000000" shadowSoft="#111111" />);
    expect(screen.toJSON()).toBeNull();
  });
});
