import React from 'react';
import { Text } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';

import KitTouchable from '../components/KitTouchable';

// настоящий react-native: общий мок проекта урезан до Platform/AppState и не знает Animated
jest.mock('react-native', () => jest.requireActual('react-native/index.js'));

// зачем (координатор 10.10): замена TouchableOpacity на KitTouchable в 13 файлах экранов без макета не должна терять нажатие,
// testID и доступность — пейвол/промокод/жалобы/опрос нажимаются как раньше.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => cleanup());

it('keeps onPress, testID and accessibility props of TouchableOpacity', async () => {
  const onPress = jest.fn();
  const view = await render(
    <KitTouchable testID="cta" accessibilityLabel="Оформить" accessibilityState={{ busy: true }} onPress={onPress} style={{ opacity: 0.5, padding: 4 }}>
      <Text>Оформить</Text>
    </KitTouchable>,
  );
  const node = view.getByTestId('cta');
  expect(node.props.accessibilityLabel).toBe('Оформить');
  expect(node.props.accessibilityRole).toBe('button');
  await fireEvent.press(node);
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('does not fire onPress when disabled', async () => {
  const onPress = jest.fn();
  const view = await render(
    <KitTouchable testID="cta" disabled onPress={onPress}>
      <Text>Нельзя</Text>
    </KitTouchable>,
  );
  await fireEvent.press(view.getByTestId('cta'));
  expect(onPress).not.toHaveBeenCalled();
});

it('lets the caller override the default button role (tabs, links)', async () => {
  const view = await render(
    <KitTouchable testID="tab" accessibilityRole="tab" onPress={() => undefined}>
      <Text>Уроки</Text>
    </KitTouchable>,
  );
  expect(view.getByTestId('tab').props.accessibilityRole).toBe('tab');
});
