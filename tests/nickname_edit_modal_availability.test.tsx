import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';

const mockCheckNameAvailabilityDetailed = jest.fn();
const mockReserveNameDetailed = jest.fn();
const mockAnnounceForAccessibility = jest.fn();

jest.mock('react-native', () => ({
  AccessibilityInfo: { announceForAccessibility: (...args: unknown[]) => mockAnnounceForAccessibility(...args) },
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: jest.fn() },
  Keyboard: { dismiss: jest.fn() },
  Modal: 'Modal',
  Platform: { OS: 'ios' },
  Pressable: 'Pressable',
  StyleSheet: {
    flatten: (style: unknown) => style ?? {},
  },
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

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
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/firestore_leaderboard', () => ({
  checkNameAvailabilityDetailed: (...args: unknown[]) => mockCheckNameAvailabilityDetailed(...args),
  normalizeNameIndexKey: (name: string) => name.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase(),
  reserveNameDetailed: (...args: unknown[]) => mockReserveNameDetailed(...args),
  warmNameAvailabilityAuth: jest.fn(),
}));
jest.mock('../app/firestore_leagues', () => ({ syncMyLeagueMemberProfileNow: jest.fn() }));
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
} = {}) {
  return render(
    <NicknameEditModal
      visible
      currentName="Current name"
      onRequestClose={jest.fn()}
      onOptimisticApply={callbacks.onOptimisticApply ?? jest.fn()}
      onRollback={callbacks.onRollback ?? jest.fn()}
      onNotice={callbacks.onNotice ?? jest.fn()}
    />,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

test('checks a changed nickname once after the debounce pause', async () => {
  mockCheckNameAvailabilityDetailed.mockResolvedValue({ status: 'available' });
  const screen = await renderModal();

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'First name');
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Final name');

  expect(mockCheckNameAvailabilityDetailed).not.toHaveBeenCalled();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(600);
  });

  expect(mockCheckNameAvailabilityDetailed).toHaveBeenCalledTimes(1);
  expect(mockCheckNameAvailabilityDetailed).toHaveBeenCalledWith('Final name');
  expect(screen.getByTestId('nickname-availability').props.children).toContain('Имя свободно');
});

test('shows a taken nickname immediately after the check and disables save', async () => {
  mockCheckNameAvailabilityDetailed.mockResolvedValue({ status: 'taken' });
  const screen = await renderModal();

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Busy name');
  await act(async () => {
    await jest.advanceTimersByTimeAsync(600);
  });

  expect(screen.getByTestId('nickname-availability').props.children).toContain('Имя уже занято');
  expect(screen.getByTestId('nickname-save').props.accessibilityState).toEqual({ disabled: true });
  expect(mockAnnounceForAccessibility).toHaveBeenCalledWith('Имя уже занято');
});

test('ignores an older availability response after the user enters another nickname', async () => {
  const first = deferred<{ status: 'available' }>();
  const second = deferred<{ status: 'taken' }>();
  mockCheckNameAvailabilityDetailed
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const screen = await renderModal();

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'First name');
  await act(async () => { await jest.advanceTimersByTimeAsync(600); });
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Second name');
  await act(async () => { await jest.advanceTimersByTimeAsync(600); });

  await act(async () => {
    second.resolve({ status: 'taken' });
    await second.promise;
  });
  await act(async () => {
    first.resolve({ status: 'available' });
    await first.promise;
  });

  expect(screen.getByTestId('nickname-availability').props.children).toContain('Имя уже занято');
});

test('reuses the cached result when the same nickname is entered again', async () => {
  mockCheckNameAvailabilityDetailed.mockResolvedValue({ status: 'available' });
  const screen = await renderModal();

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Cached name');
  await act(async () => {
    await jest.advanceTimersByTimeAsync(600);
  });
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Other name');
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Cached name');
  await act(async () => { await jest.advanceTimersByTimeAsync(600); });

  expect(mockCheckNameAvailabilityDetailed).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('nickname-availability').props.children).toContain('Имя свободно');
});

test('does not reuse an availability result from a previous modal opening', async () => {
  mockCheckNameAvailabilityDetailed.mockResolvedValue({ status: 'available' });
  const screen = await renderModal();

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Released later');
  await act(async () => { await jest.advanceTimersByTimeAsync(600); });
  await act(async () => {
    screen.rerender(
      <NicknameEditModal
        visible={false}
        currentName="Current name"
        onRequestClose={jest.fn()}
        onOptimisticApply={jest.fn()}
        onRollback={jest.fn()}
        onNotice={jest.fn()}
      />,
    );
  });
  await act(async () => {
    screen.rerender(
      <NicknameEditModal
        visible
        currentName="Current name"
        onRequestClose={jest.fn()}
        onOptimisticApply={jest.fn()}
        onRollback={jest.fn()}
        onNotice={jest.fn()}
      />,
    );
  });
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Released later');
  await act(async () => { await jest.advanceTimersByTimeAsync(600); });

  expect(mockCheckNameAvailabilityDetailed).toHaveBeenCalledTimes(2);
});

test('allows the atomic reserve attempt when the preliminary check fails', async () => {
  mockCheckNameAvailabilityDetailed.mockResolvedValue({ status: 'error' });
  const onOptimisticApply = jest.fn();
  const screen = await renderModal({ onOptimisticApply });

  await fireEvent.changeText(screen.getByTestId('nickname-input'), '  Final name  ');
  await act(async () => { await jest.advanceTimersByTimeAsync(600); });

  expect(screen.getByTestId('nickname-save').props.accessibilityState).toEqual({ disabled: false });
  await act(async () => {
    fireEvent.press(screen.getByTestId('nickname-save'));
    await Promise.resolve();
  });

  expect(onOptimisticApply).toHaveBeenCalledWith('Final name');
  expect(mockReserveNameDetailed).toHaveBeenCalledWith('Final name', 'Current name', { source: 'settings' });
});

test('rolls the optimistic nickname back when the atomic reserve reports taken', async () => {
  mockCheckNameAvailabilityDetailed.mockResolvedValue({ status: 'available' });
  mockReserveNameDetailed.mockResolvedValue({ status: 'taken' });
  const onRollback = jest.fn();
  const onNotice = jest.fn();
  const screen = await renderModal({ onRollback, onNotice });

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Busy later');
  await act(async () => { await jest.advanceTimersByTimeAsync(600); });
  await act(async () => {
    fireEvent.press(screen.getByTestId('nickname-save'));
    await Promise.resolve();
  });

  expect(onRollback).toHaveBeenCalledWith('Current name');
  expect(onNotice.mock.calls.at(-1)?.[0]).toContain('имя уже занято');
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NicknameEditModal = require('../components/account/NicknameEditModal').default;
