// story_summit_tower_deferred_2026_10_29.test.tsx — кадр 7 «Пик · вершина недели»: башня встаёт через два кадра (SpireTowerDeferred, Дизайн c2bc33c7b).
// зачем (координатор 29.10, решение хозяина шаблонов — Моменты): монтаж ~500 узлов SVG в кадре появления давал всплеск сборок мусора. Гейт «пиксель в
// пиксель» не меняется: башня с теми же пропсами внутри того же раскрытия (TowerReveal того же размера, раскрытие начинается через 200 мс — позже,
// чем башня встаёт), до неё — рамка того же размера (тест обёртки — tests/spire_tower_deferred_mount_2026_10_29.test.tsx).
/* eslint-disable import/first -- зачем: __DEV__ задаём до импортов: модули цепочки (constants/i18n) читают его при загрузке */
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SummitFrame } from '../components/stories/templates/frames_progress';
import { summitTowerSize } from '../components/stories/templates/story_template_layout';
import { STORY_TEMPLATE_SAMPLES } from '../components/stories/templates/story_template_registry';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));
jest.mock('react-native-svg', () => ({
  __esModule: true, default: 'Svg', Circle: 'Circle', Defs: 'Defs', LinearGradient: 'LinearGradient', Stop: 'Stop',
  Ellipse: 'Ellipse', G: 'G', ClipPath: 'ClipPath', Path: 'Path', RadialGradient: 'RadialGradient', Rect: 'Rect',
}));
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const Text = (props: Record<string, unknown>) => R.createElement('Text', props, props.children);
  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: (c: unknown) => c },
    runOnJS: (fn: unknown) => fn,
    useAnimatedReaction: () => undefined,
    useAnimatedProps: (fn: () => unknown) => fn(),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/spire/SpireRankCoin', () => ({ __esModule: true, default: 'SpireRankCoin' }));
jest.mock('../components/spire/useSpireScene', () => ({ useSpireScene: () => ({ light: false }) }));
// зачем: заглушка обёртки рисует узел с testID и запоминает пропсы — по ним видно, что башня получает то же, что и раньше
const mockTowerProps: Record<string, unknown>[] = [];
jest.mock('../components/spire/SpireTowerDeferred', () => {
  const R = jest.requireActual('react');
  return { __esModule: true, default: (props: Record<string, unknown>) => { mockTowerProps.push(props); return R.createElement('View', { testID: 'deferred-tower' }); } };
});
jest.mock('../components/stories/templates/story_template_palette', () => {
  const pal = {
    bgTop: '#16241F', bgMid: '#0E1214', bgBot: '#0A0E10', tx: '#FFFFFF', sec: '#B8C0C4', mu: '#8A9296', acc: '#7EF0C8', accG: '#3FD9A6', accB: '#9FF5D8',
    accInk: '#06231A', accSoft: '#1D3A31', accGlow: '#3FD9A655', card: '#1B2123', ctl: '#2A3234', cta: '#FFFFFF', ctaInk: '#0E1214', shTint: '#000000',
    isLight: false, mediaScrim: '#080A0ED1', mediaInk: '#FFFFFF',
  };
  return { useStoryTemplatePalette: () => pal, storyTemplatePalette: () => pal, mix: (c: string, a: number) => `${c}@${a}` };
});

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('кадр 7 «Пик · вершина недели» — башня встаёт через два кадра', () => {
  it('башня — SpireTowerDeferred (source story_summit) с прежними пропсами, внутри раскрытия того же размера', async () => {
    const tpl = STORY_TEMPLATE_SAMPLES.summit;
    await render(<SummitFrame tpl={tpl} lang="ru" myRank={5} />);
    expect(screen.getAllByTestId('deferred-tower')).toHaveLength(1);
    const size = summitTowerSize(844);
    expect(mockTowerProps[mockTowerProps.length - 1]).toMatchObject({
      source: 'story_summit', lang: 'ru', myFloor: tpl.floor, selected: tpl.floor, width: size.width, scene: { light: false },
    });
    expect(screen.getByTestId('story-tpl-summit')).toBeTruthy();
  });

  it('старые слайды (StorySlides, итог недели): башня тоже через SpireTowerDeferred — source story_league (координатор 29.10)', () => {
    const src = read('components/stories/StorySlides.tsx');
    expect(src).not.toContain('<SpireTowerSvg');
    expect(src).toContain('<SpireTowerDeferred source="story_league"');
  });

  it('в шаблонах историй башня больше не монтируется напрямую', () => {
    const src = read('components/stories/templates/frames_progress.tsx');
    expect(src).not.toContain('<SpireTowerSvg');
    expect(src).toContain('<TowerReveal width={size.width} height={size.height}>');
    expect(src).toContain('<SpireTowerDeferred source="story_summit"');
  });
});
