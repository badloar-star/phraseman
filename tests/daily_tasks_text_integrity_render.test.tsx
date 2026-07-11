import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.unmock('react-native');
jest.mock('expo-router', () => ({ usePathname: () => '/daily-tasks' }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/text-integrity/use_text_integrity_probe', () => ({
  useTextIntegrityProbe: () => ({ ref: { current: null }, onTextLayout: jest.fn() }),
}));
// The component import intentionally follows mocks so the test exercises the mocked probe.
// eslint-disable-next-line import/first
import { DailyBonusCard, DailyTaskCard } from '../components/daily-tasks/DailyTaskCard';

const icon = <Text>ICON</Text>;
const progress = <View testID="custom-progress" accessibilityRole="progressbar" />;
const base = {
  testID: 'task', title: 'Очень длинное полное название задания', description: 'Полное описание задания видно сразу и не требует нажатия.',
  icon, progress, titleColor: '#fff', descriptionColor: '#ddd', surfaceColor: '#111', borderColor: '#333', accentColor: '#9cff00',
};

test('full task copy is visible and unchanged across emphasis press', async () => {
  const onPress = jest.fn();
  await render(<DailyTaskCard {...base} onPress={onPress} />);
  expect(screen.getByTestId('task-title').props.children).toBe(base.title);
  expect(screen.getByTestId('task-description').props.children).toBe(base.description);
  fireEvent.press(screen.getByTestId('task-pressable'));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('task-description').props.children).toBe(base.description);
});

test.each([
  ['incomplete', undefined],
  ['ready', { label: 'Забрать награду полностью', loading: false, disabled: false }],
  ['loading', { label: 'Забрать награду полностью', loading: true, disabled: true }],
])('renders %s action state without nesting it into card press', async (_name, action) => {
  const cardPress = jest.fn(); const actionPress = jest.fn();
  await render(<DailyTaskCard {...base} onPress={cardPress} action={action ? { ...action, onPress: actionPress, foregroundColor: '#07110A' } : undefined} />);
  if (action) {
    const button = screen.getByTestId('task-action');
    fireEvent.press(button);
    expect(actionPress).toHaveBeenCalledTimes(action.disabled ? 0 : 1);
    if (!action.disabled) expect(cardPress).not.toHaveBeenCalled();
    expect(StyleSheet.flatten(screen.getByTestId('task-action-label').props.style).color).toBe('#07110A');
  }
});

test('reroll and claimed/premium/progress accessories remain reachable', async () => {
  const reroll = jest.fn();
  await render(<DailyTaskCard {...base} claimed premium={<Text>PLUS</Text>} reroll={{ accessibilityLabel: 'reroll', onPress: reroll, icon: <Text>REROLL</Text> }} />);
  fireEvent.press(screen.getByRole('button', { name: 'reroll' }));
  expect(reroll).toHaveBeenCalledTimes(1);
  expect(screen.getByText('PLUS')).toBeTruthy();
  expect(screen.getByTestId('custom-progress')).toBeTruthy();
  expect(screen.getByTestId('task-claimed')).toBeTruthy();
});

test.each(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'])('bonus and localized long copy reflow naturally for %s', async (locale) => {
  const claim = jest.fn();
  await render(<DailyBonusCard testID={`bonus-${locale}`} title={`${locale} bardzo długi pełny bonus`} description="Opis pozostaje kompletny także przy skali dwieście procent" icon={icon} progress={progress} action={{ label: 'Odbierz wszystkie fragmenty', onPress: claim, foregroundColor: '#07110A' }} surfaceColor="#111" borderColor="#333" titleColor="#fff" descriptionColor="#ddd" />);
  await act(() => { fireEvent(screen.getByTestId(`bonus-${locale}-action`), 'layout', { nativeEvent: { layout: { width: 112, height: 44, x: 0, y: 0 } } }); });
  await act(() => { fireEvent(screen.getByTestId(`bonus-${locale}-action-label`), 'textLayout', { nativeEvent: { lines: [{ width: 120 }, { width: 90 }] } }); });
  await waitFor(() => expect(StyleSheet.flatten(screen.getByTestId(`bonus-${locale}-content`).props.style).flexDirection).toBe('column'));
  expect(screen.getByTestId(`bonus-${locale}-description`).props.children).toContain('kompletny');
  fireEvent.press(screen.getByTestId(`bonus-${locale}-action`));
  expect(claim).toHaveBeenCalledTimes(1);
});

test('runtime unsafe native text props are stripped from semantic fields', async () => {
  await render(<DailyTaskCard {...base} titleTextProps={{ numberOfLines: 1, ellipsizeMode: 'tail', allowFontScaling: false } as any} action={{ label: 'Complete label', onPress: jest.fn(), foregroundColor: '#07110A', labelProps: { adjustsFontSizeToFit: true } as any }} />);
  expect(screen.getByTestId('task-title').props.numberOfLines).toBeUndefined();
  expect(screen.getByTestId('task-title').props.allowFontScaling).toBeUndefined();
  expect(screen.getByTestId('task-action-label').props.adjustsFontSizeToFit).toBeUndefined();
  expect(screen.getByTestId('task-title').props.accessibilityLabel).toBe(base.title);
});

test('task and bonus variants retain the established card geometry', async () => {
  await render(<><DailyTaskCard {...base} /><DailyBonusCard {...base} testID="bonus" /></>);
  const taskStyle = StyleSheet.flatten(screen.getByTestId('task').props.style);
  const bonusStyle = StyleSheet.flatten(screen.getByTestId('bonus').props.style);
  expect(taskStyle).toMatchObject({ minHeight: 92, borderRadius: 22, paddingHorizontal: 22 });
  expect(bonusStyle).toMatchObject({ minHeight: 0, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9 });
});

test('first-tap emphasis is visible without concealing the description', async () => {
  const { rerender } = await render(<DailyTaskCard {...base} emphasized={false} />);
  await rerender(<DailyTaskCard {...base} emphasized />);
  expect(StyleSheet.flatten(screen.getByTestId('task').props.style)).toMatchObject({ borderColor: '#9cff00', borderWidth: 1 });
  expect(screen.getByTestId('task-description').props.children).toBe(base.description);
});

test('measured short action remains inline and preserves its contextual accessibility label', async () => {
  await render(<DailyTaskCard {...base} action={{ label: 'Al', accessibilityLabel: 'Günlük bonusu al: 3 parça', onPress: jest.fn(), foregroundColor: '#07110A' }} />);
  await act(() => { fireEvent(screen.getByTestId('task-action'), 'layout', { nativeEvent: { layout: { width: 80, height: 44, x: 0, y: 0 } } }); });
  await act(() => { fireEvent(screen.getByTestId('task-action-label'), 'textLayout', { nativeEvent: { lines: [{ width: 14 }] } }); });
  expect(StyleSheet.flatten(screen.getByTestId('task-content').props.style).flexDirection).toBe('row');
  expect(screen.getByRole('button', { name: 'Günlük bonusu al: 3 parça' })).toBeTruthy();
});

test('bonus keeps compact icon/action geometry and flow progress after content', async () => {
  await render(<DailyBonusCard {...base} testID="bonus-layout" outerStyle={{ borderRadius: 16, shadowOpacity: 0.2 }} titleTextProps={{ style: { fontSize: 16, fontWeight: '800' } }} action={{ label: 'Забрать', onPress: jest.fn(), foregroundColor: '#07110A', labelProps: { style: { fontSize: 13, fontWeight: '900' } } }} />);
  expect(StyleSheet.flatten(screen.getByTestId('bonus-layout').props.style)).toMatchObject({ minHeight: 0, gap: 0, borderRadius: 16, shadowOpacity: 0.2 });
  expect(StyleSheet.flatten(screen.getByTestId('bonus-layout-content').props.style)).toMatchObject({ minHeight: 0, gap: 10 });
  expect(StyleSheet.flatten(screen.getByTestId('bonus-layout-icon').props.style)).toMatchObject({ width: 38, minHeight: 38, borderRadius: 11 });
  expect(StyleSheet.flatten(screen.getByTestId('bonus-layout-action').props.style)).toMatchObject({ maxWidth: 112, borderRadius: 14 });
  expect(StyleSheet.flatten(screen.getByTestId('bonus-layout-title').props.style)).toMatchObject({ fontSize: 16, fontWeight: '800' });
  expect(StyleSheet.flatten(screen.getByTestId('bonus-layout-action-label').props.style)).toMatchObject({ fontSize: 13, fontWeight: '900' });
  expect(StyleSheet.flatten(screen.getByTestId('bonus-layout-progress').props.style)).toMatchObject({ marginTop: 8 });
});
