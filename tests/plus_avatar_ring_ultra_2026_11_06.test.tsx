// зачем (владелец 06.11, Plus/Ultra): годовая подписка — «Ultra»: та же геометрия кольца, но шестиугольный значок со звездой ✦ вместо круга с ромбом ◆; метка «Ultra».
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import React from 'react';
import { configure, render, screen } from '@testing-library/react-native';

configure({ defaultIncludeHiddenElements: true });

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
}));
jest.mock('react-native-svg', () => {
  const R = jest.requireActual('react');
  const host = (name: string) => (props: Record<string, unknown>) => R.createElement('View', { testID: name }, props.children);
  return {
    __esModule: true, default: host('svg'), Svg: host('svg'), Circle: host('svg-circle'), Defs: host('svg-defs'),
    LinearGradient: host('svg-gradient'), Path: host('svg-path'), Polygon: host('svg-polygon'), Stop: host('svg-stop'),
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => {
  const R = jest.requireActual('react');
  return { __esModule: true, default: (props: { name: string }) => R.createElement('View', { testID: `icon-${props.name}` }) };
});
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: { bgPrimary: '#0C0D10' } }) }));

import { PlusAvatarRing, PlusTag } from '../components/plus/PlusAvatarRing';

const Avatar = () => React.createElement('View', { testID: 'avatar' });

describe('Ultra: кольцо, значок, метка', () => {
  it('Ultra у аватара 44: кольцо из 4 дуг, шестиугольный значок (2 многоугольника), без ромба ◆', async () => {
    await render(<PlusAvatarRing plus tier="ultra" size={44}><Avatar /></PlusAvatarRing>);
    expect(screen.getByTestId('plus-ring')).toBeTruthy();
    expect(screen.getAllByTestId('svg-path').length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByTestId('svg-polygon')).toHaveLength(2);
    expect(screen.queryByTestId('icon-diamond')).toBeNull();
  });

  it('Plus (по умолчанию и tier="plus"): ромб ◆, многоугольников нет', async () => {
    await render(<PlusAvatarRing plus size={44}><Avatar /></PlusAvatarRing>);
    expect(screen.getByTestId('icon-diamond')).toBeTruthy();
    expect(screen.queryByTestId('svg-polygon')).toBeNull();
  });

  it('Ultra у аватара меньше 26: кольцо есть, значка нет', async () => {
    await render(<PlusAvatarRing plus tier="ultra" size={18}><Avatar /></PlusAvatarRing>);
    expect(screen.getAllByTestId('svg-path')).toHaveLength(4);
    expect(screen.queryByTestId('svg-polygon')).toBeNull();
  });

  it('Пик (flat) Ultra: плоское кольцо без значка', async () => {
    await render(<PlusAvatarRing plus tier="ultra" size={30} kind="flat"><Avatar /></PlusAvatarRing>);
    expect(screen.getByTestId('svg-circle')).toBeTruthy();
    expect(screen.queryByTestId('svg-polygon')).toBeNull();
  });

  it('метка: Ultra — подпись «Ultra» и звезда, Plus — «Plus» и ромб', async () => {
    await render(<PlusTag isLight={false} tier="ultra" testID="tag-u" />);
    expect(screen.getByTestId('tag-u').props.accessibilityLabel).toBe('Ultra');
    expect(screen.getByText('Ultra')).toBeTruthy();
    expect(screen.queryByTestId('icon-diamond')).toBeNull();
  });

  it('метка Plus не изменилась', async () => {
    await render(<PlusTag isLight={false} testID="tag-p" />);
    expect(screen.getByTestId('tag-p').props.accessibilityLabel).toBe('Plus');
    expect(screen.getByText('Plus')).toBeTruthy();
    expect(screen.getByTestId('icon-diamond')).toBeTruthy();
  });
});
