import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';

const mockCheckNameAvailabilityDetailed = jest.fn();
const mockReserveNameDetailed = jest.fn();
const mockAnnounceForAccessibility = jest.fn();

// зачем (координатор §48, 2026-10-01): самодельный мок react-native ломался при каждом
// новом API компонента (Pressable, useWindowDimensions, StyleSheet.create) и набор не
// исполнялся. Переопределения теперь — слой поверх настоящего модуля (прототип), всё
// неперечисленное берётся из react-native, ленивые геттеры не трогаются.
jest.mock('react-native', () => Object.setPrototypeOf({
  // Шпион объявления поверх настоящего AccessibilityInfo: экран теперь спрашивает и
  // isReduceMotionEnabled (hooks/use_reduce_motion) — голый объект ронял рендер
  // «немым» AggregateError (развёрнуто трассой [NICK-AGG]).
  AccessibilityInfo: Object.setPrototypeOf(
    { announceForAccessibility: (...args: unknown[]) => mockAnnounceForAccessibility(...args) },
    jest.requireActual('react-native').AccessibilityInfo,
  ),
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: jest.fn() },
  // Клавиатура/платформа — тоже слоем: экран подписывается на Keyboard.addListener.
  Keyboard: Object.setPrototypeOf({ dismiss: jest.fn() }, jest.requireActual('react-native').Keyboard),
  Modal: 'Modal',
  Platform: Object.setPrototypeOf({ OS: 'ios' }, jest.requireActual('react-native').Platform),
  Pressable: 'Pressable',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}, jest.requireActual('react-native')));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async () => undefined),
  getItem: jest.fn(async () => null),
}));

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#84cc16',
      bgPrimary: '#101214',
      bgSurface: '#202428',
      bgCard: '#181b1e',
      textPrimary: '#ffffff',
      textMuted: '#9ca3af',
      textGhost: '#6b7280',
      wrong: '#ef4444',
      correct: '#84cc16',
      correctText: '#07110a',
    },
    f: { h2: 20, body: 16, caption: 13 },
  }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../constants/i18n', () => ({
  triLang: (_lang: string, values: Record<string, string>) => values.ru,
}));
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { error: jest.fn() } }));
jest.mock('../app/firestore_leaderboard', () => ({
  checkNameAvailabilityDetailed: (...args: unknown[]) => mockCheckNameAvailabilityDetailed(...args),
  normalizeNameIndexKey: (name: string) => name.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase(),
  reserveNameDetailed: (...args: unknown[]) => mockReserveNameDetailed(...args),
  warmNameAvailabilityAuth: jest.fn(),
}));
jest.mock('../app/app_snapshot_store', () => ({ patchAppSnapshot: jest.fn() }));
jest.mock('../app/nickname_change_helpers', () => ({
  containsBadWord: () => false,
  syncArenaDisplayName: jest.fn(),
  updateLocalNameReferences: jest.fn(async () => undefined),
}));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function renderModal(callbacks: {
  onOptimisticApply?: jest.Mock;
  onRollback?: jest.Mock;
  onNotice?: jest.Mock;
  onRequestClose?: jest.Mock;
} = {}) {
  return render(
    <NicknameEditModal
      visible
      currentName="Current name"
      onRequestClose={callbacks.onRequestClose ?? jest.fn()}
      onOptimisticApply={callbacks.onOptimisticApply ?? jest.fn()}
      onRollback={callbacks.onRollback ?? jest.fn()}
      onNotice={callbacks.onNotice ?? jest.fn()}
    />,
  );
}

const availabilityText = (screen: Awaited<ReturnType<typeof renderModal>>) =>
  screen.queryByTestId('nickname-availability')?.props.children;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

// 18.10 (владелец: «вводим имя — проверяется и, если не занято, СРАЗУ применяется на сервере; ник можно менять хоть каждую
// секунду»): формат — сразу на телефоне, через 400 мс паузы — ОДИН вызов брони, он же применяет имя.

test('format problems show at once on the phone and never reach the server', async () => {
  const screen = await renderModal();
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'A');
  expect(availabilityText(screen)).toContain('Минимум 2 символа');
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  expect(mockReserveNameDetailed).not.toHaveBeenCalled();
});

test('applies the last typed name once after a 400 ms pause and shows «Готово»', async () => {
  const onOptimisticApply = jest.fn();
  const screen = await renderModal({ onOptimisticApply });

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'First name');
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Final name');
  expect(availabilityText(screen)).toContain('Проверяем имя');
  await act(async () => { await jest.advanceTimersByTimeAsync(399); });
  expect(mockReserveNameDetailed).not.toHaveBeenCalled();
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });

  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);
  expect(mockReserveNameDetailed).toHaveBeenCalledWith('Final name', 'Current name', { source: 'settings' });
  expect(onOptimisticApply).toHaveBeenCalledWith('Final name');
  expect(availabilityText(screen)).toContain('Готово');
  expect(availabilityText(screen)).not.toContain('Проверим при сохранении');
});

test('a taken name rolls back to the previous one and is not asked again in this opening', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'taken' });
  const onRollback = jest.fn();
  const screen = await renderModal({ onRollback });

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Busy name');
  await act(async () => { await jest.advanceTimersByTimeAsync(400); });

  expect(onRollback).toHaveBeenCalledWith('Current name');
  expect(availabilityText(screen)).toContain('Имя уже занято');
  expect(mockAnnounceForAccessibility).toHaveBeenCalledWith('Имя уже занято');

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Other');
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Busy name');
  await act(async () => { await jest.advanceTimersByTimeAsync(400); });
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);
  expect(availabilityText(screen)).toContain('Имя уже занято');
});

test('calls go one at a time: input during a call is queued, and the late answer does not override fresher input', async () => {
  const first = deferred<{ status: 'ok' }>();
  mockReserveNameDetailed.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ status: 'ok' });
  const screen = await renderModal();

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'First name');
  await act(async () => { await jest.advanceTimersByTimeAsync(400); });
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Second name');
  await act(async () => { await jest.advanceTimersByTimeAsync(400); });
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);

  await act(async () => {
    first.resolve({ status: 'ok' });
    await first.promise;
  });
  await act(async () => { await Promise.resolve(); });

  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(2);
  // the queued call frees the name that was applied a moment ago
  expect(mockReserveNameDetailed).toHaveBeenLastCalledWith('Second name', 'First name', { source: 'settings' });
  expect(availabilityText(screen)).toContain('Готово');
});

test('no sign-in / no network: the name stays on the phone, no rollback, no «check on save» promise', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'error' });
  const onRollback = jest.fn();
  const onOptimisticApply = jest.fn();
  const screen = await renderModal({ onRollback, onOptimisticApply });

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Offline name');
  await act(async () => { await jest.advanceTimersByTimeAsync(400); });

  expect(onOptimisticApply).toHaveBeenCalledWith('Offline name');
  expect(onRollback).not.toHaveBeenCalled();
  expect(availabilityText(screen) ?? '').not.toContain('Проверим');
});

test('«Готово» before the pause ends applies the typed name right away and closes', async () => {
  const onRequestClose = jest.fn();
  const screen = await renderModal({ onRequestClose });

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Quick name');
  await act(async () => {
    fireEvent.press(screen.getByTestId('nickname-save'));
    await Promise.resolve();
  });

  expect(mockReserveNameDetailed).toHaveBeenCalledWith('Quick name', 'Current name', { source: 'settings' });
  expect(onRequestClose).toHaveBeenCalled();
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NicknameEditModal = require('../components/account/NicknameEditModal').default;
