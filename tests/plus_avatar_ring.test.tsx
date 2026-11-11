// зачем (владелец 21.10, реестр №6): общий компонент кольца Plus. Без Plus — дети как есть, ничего лишнего в дереве (списки на сотни людей);
// с Plus — кольцо, значок ◆ у аватаров от 26, у Пика плоское кольцо без значка; метка «◆ Plus» с текстом.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import React from 'react';
import { configure, render, screen } from '@testing-library/react-native';

// зачем: оверлей кольца намеренно скрыт от озвучки (no-hide-descendants), а тест обязан его видеть
configure({ defaultIncludeHiddenElements: true });

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
}));
jest.mock('react-native-svg', () => {
  const R = jest.requireActual('react');
  // зачем: viewBox/width/height пробрасываются, чтобы тест видел, что рисунок кольца привязан к своей области (11.11, обрезанное кольцо)
  const host = (name: string) => (props: Record<string, unknown>) => R.createElement('View', { testID: name, viewBox: props.viewBox, width: props.width, height: props.height }, props.children);
  return { __esModule: true, default: host('svg'), Svg: host('svg'), Circle: host('svg-circle'), Defs: host('svg-defs'), LinearGradient: host('svg-gradient'), Path: host('svg-path'), Stop: host('svg-stop') };
});
jest.mock('@expo/vector-icons/Ionicons', () => {
  const R = jest.requireActual('react');
  return { __esModule: true, default: (props: { name: string }) => R.createElement('View', { testID: `icon-${props.name}` }) };
});
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: { bgPrimary: '#0C0D10' } }) }));

import { PlusAvatarRing, PlusRingOverlay, PlusTag } from '../components/plus/PlusAvatarRing';

const Avatar = () => React.createElement('View', { testID: 'avatar' });

describe('PlusAvatarRing', () => {
  // зачем: без ручного unmount — RNTL чистит дерево между тестами сам; unmount без await ломал следующие отрисовки («overlapping act()»)
  it.each([[false], [null], [undefined]])('нет Plus (%s) — только аватар, ни кольца, ни обёртки', async (plus) => {
    await render(<PlusAvatarRing plus={plus} size={44}><Avatar /></PlusAvatarRing>);
    expect(screen.getByTestId('avatar')).toBeTruthy();
    expect(screen.queryByTestId('plus-ring')).toBeNull();
    expect(screen.queryByTestId('svg')).toBeNull();
  });

  it('Plus: кольцо из 4 дуг и значок ◆ у аватара 44', async () => {
    await render(<PlusAvatarRing plus size={44}><Avatar /></PlusAvatarRing>);
    expect(screen.getByTestId('avatar')).toBeTruthy();
    expect(screen.getByTestId('plus-ring')).toBeTruthy();
    expect(screen.getAllByTestId('svg-path')).toHaveLength(4);
    expect(screen.getByTestId('icon-diamond')).toBeTruthy();
  });

  // зачем (владелец 11.11, «кольцо поломано»): без viewBox рисунок кольца на устройстве получался крупнее своей области и обрезался справа и снизу.
  // viewBox обязан совпадать с размером области — тогда кольцо вписывается в неё при любом масштабе нативной части.
  it.each([[44, 'list', 53], [35, 'list', 44], [30, 'flat', 40], [165, 'card', 187]] as const)('рисунок кольца привязан к своей области: аватар %s (%s) → viewBox 0 0 %s', async (size, kind, outer) => {
    await render(<PlusAvatarRing plus size={size} kind={kind} hidePin><Avatar /></PlusAvatarRing>);
    const svg = screen.getByTestId('svg');
    expect(svg.props.width).toBe(outer);
    expect(svg.props.height).toBe(outer);
    expect(svg.props.viewBox).toBe(`0 0 ${outer} ${outer}`);
  });

  it('Plus у аватара меньше 26 (автор набора 18): кольцо есть, значка нет', async () => {
    await render(<PlusAvatarRing plus size={18}><Avatar /></PlusAvatarRing>);
    expect(screen.getAllByTestId('svg-path')).toHaveLength(4);
    expect(screen.queryByTestId('icon-diamond')).toBeNull();
  });

  it('Пик (flat): плоское кольцо одной окружностью и без значка', async () => {
    await render(<PlusAvatarRing plus size={30} kind="flat"><Avatar /></PlusAvatarRing>);
    expect(screen.getByTestId('svg-circle')).toBeTruthy();
    expect(screen.queryByTestId('svg-path')).toBeNull();
    expect(screen.queryByTestId('icon-diamond')).toBeNull();
  });

  it('hidePin убирает значок, кольцо остаётся (Обсидиан визитки)', async () => {
    await render(<PlusRingOverlay size={165} kind="card" hidePin />);
    expect(screen.getAllByTestId('svg-path')).toHaveLength(4);
    expect(screen.queryByTestId('icon-diamond')).toBeNull();
  });

  it('hideRing убирает кольцо, значок остаётся', async () => {
    await render(<PlusRingOverlay size={165} kind="card" hideRing />);
    expect(screen.queryByTestId('svg')).toBeNull();
    expect(screen.getByTestId('icon-diamond')).toBeTruthy();
  });

  it('оверлей не перехватывает касания и скрыт от озвучки экрана', async () => {
    await render(<PlusRingOverlay size={44} />);
    const overlay = screen.getByTestId('plus-ring');
    expect(overlay.props.pointerEvents).toBe('none');
    expect(overlay.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

describe('PlusTag · «◆ Plus»', () => {
  it('рисует ромб и текст Plus, читается озвучкой как «Plus»', async () => {
    await render(<PlusTag isLight={false} />);
    expect(screen.getByTestId('plus-tag').props.accessibilityLabel).toBe('Plus');
    expect(screen.getByText('Plus')).toBeTruthy();
    expect(screen.getByTestId('icon-diamond')).toBeTruthy();
  });
});
