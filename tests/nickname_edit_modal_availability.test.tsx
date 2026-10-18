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
const mockMarkPending = jest.fn(async () => undefined);
jest.mock('../app/nickname_rename_pending', () => ({
  markNicknameRenamePending: (...args: unknown[]) => mockMarkPending(...(args as [])),
  clearNicknameRenamePending: jest.fn(async () => undefined),
  takeNicknameRenameTakenNotice: jest.fn(async () => null),
}));
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

type ModalCallbacks = {
  onOptimisticApply?: jest.Mock;
  onRollback?: jest.Mock;
  onNotice?: jest.Mock;
  onRequestClose?: jest.Mock;
};

function modalElement(callbacks: ModalCallbacks, visible = true) {
  return (
    <NicknameEditModal
      visible={visible}
      currentName="Current name"
      onRequestClose={callbacks.onRequestClose ?? jest.fn()}
      onOptimisticApply={callbacks.onOptimisticApply ?? jest.fn()}
      onRollback={callbacks.onRollback ?? jest.fn()}
      onNotice={callbacks.onNotice ?? jest.fn()}
    />
  );
}

async function renderModal(callbacks: ModalCallbacks = {}) {
  return render(modalElement(callbacks));
}

const availabilityText = (screen: Awaited<ReturnType<typeof renderModal>>) =>
  screen.queryByTestId('nickname-availability')?.props.children;

// fireEvent сам обёрнут в act — вложенный act ломал все следующие тесты («overlapping act() calls»).
async function pressDone(screen: Awaited<ReturnType<typeof renderModal>>) {
  await fireEvent.press(screen.getByTestId('nickname-save'));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockCheckNameAvailabilityDetailed.mockResolvedValue({ status: 'available' });
  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

// 18.10 (владелец, кнопками через координатора): ник — не больше 5 смен в час, медленный набор лимит не съедает.
// При наборе — только проверка «свободно/занято» после паузы 400 мс; применение (nameReserve) — по «Готово» или закрытию.

test('format problems show at once on the phone and never reach the server', async () => {
  const screen = await renderModal();
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'A');
  expect(availabilityText(screen)).toContain('Минимум 2 символа');
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  expect(mockCheckNameAvailabilityDetailed).not.toHaveBeenCalled();
  expect(mockReserveNameDetailed).not.toHaveBeenCalled();
});

test('typing only checks the name after a 400 ms pause — no rename is spent, answers are cached', async () => {
  const onOptimisticApply = jest.fn();
  const screen = await renderModal({ onOptimisticApply });

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'First name');
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Final name');
  expect(availabilityText(screen)).toContain('Проверяем имя');
  await act(async () => { await jest.advanceTimersByTimeAsync(399); });
  expect(mockCheckNameAvailabilityDetailed).not.toHaveBeenCalled();
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });

  expect(mockCheckNameAvailabilityDetailed).toHaveBeenCalledTimes(1);
  expect(mockCheckNameAvailabilityDetailed).toHaveBeenCalledWith('Final name');
  expect(availabilityText(screen)).toContain('Имя свободно');
  expect(mockReserveNameDetailed).not.toHaveBeenCalled();
  expect(onOptimisticApply).not.toHaveBeenCalled();

  // slow typing with many pauses still spends no rename; the same name again is answered from the cache
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Other name');
  await act(async () => { await jest.advanceTimersByTimeAsync(400); });
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Final name');
  await act(async () => { await jest.advanceTimersByTimeAsync(400); });
  expect(mockCheckNameAvailabilityDetailed).toHaveBeenCalledTimes(2);
  expect(availabilityText(screen)).toContain('Имя свободно');
  expect(mockReserveNameDetailed).not.toHaveBeenCalled();
});

test('«Готово» applies the typed name once, at once on screen, and closes', async () => {
  const onOptimisticApply = jest.fn();
  const onRequestClose = jest.fn();
  const screen = await renderModal({ onOptimisticApply, onRequestClose });

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Quick name');
  await pressDone(screen);

  expect(onOptimisticApply).toHaveBeenCalledWith('Quick name');
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);
  expect(mockReserveNameDetailed).toHaveBeenCalledWith('Quick name', 'Current name', { source: 'settings' });
  expect(onRequestClose).toHaveBeenCalled();
});

test('closing with the cross also applies a changed name; an unchanged name is not sent', async () => {
  const onRequestClose = jest.fn();
  const screen = await renderModal({ onRequestClose });

  await fireEvent.press(screen.getByTestId('nickname-close'));
  expect(mockReserveNameDetailed).not.toHaveBeenCalled();
  expect(onRequestClose).toHaveBeenCalledTimes(1);

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Closed name');
  await fireEvent.press(screen.getByTestId('nickname-close'));
  expect(mockReserveNameDetailed).toHaveBeenCalledWith('Closed name', 'Current name', { source: 'settings' });
});

test('a name the check found taken: «Готово» keeps the window open and sends nothing', async () => {
  mockCheckNameAvailabilityDetailed.mockResolvedValue({ status: 'taken' });
  const onRequestClose = jest.fn();
  const screen = await renderModal({ onRequestClose });

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Busy name');
  await act(async () => { await jest.advanceTimersByTimeAsync(400); });
  expect(availabilityText(screen)).toContain('Имя уже занято');
  expect(mockAnnounceForAccessibility).toHaveBeenCalledWith('Имя уже занято');

  await pressDone(screen);
  expect(mockReserveNameDetailed).not.toHaveBeenCalled();
  expect(onRequestClose).not.toHaveBeenCalled();
});

test('server says taken after «Готово»: the previous name comes back and the parent shows why', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'taken' });
  const onRollback = jest.fn();
  const onNotice = jest.fn();
  const first = deferred<{ status: 'taken' }>();
  mockReserveNameDetailed.mockReturnValueOnce(first.promise);
  const callbacks = { onRollback, onNotice };
  const screen = await renderModal(callbacks);

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Race name');
  await pressDone(screen);
  await screen.rerender(modalElement(callbacks, false));
  // шторка доигрывает уход — иначе следующее открытие (и следующий тест) застают её на полпути
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  await act(async () => { first.resolve({ status: 'taken' }); await first.promise; });

  expect(onRollback).toHaveBeenCalledWith('Current name');
  expect(onNotice).toHaveBeenLastCalledWith('Это имя уже занято. Выбери другое.');
});

test('rate limit: rollback, exact minutes from nextChangeAt, and no pointless call until it passes', async () => {
  const onRollback = jest.fn();
  const onNotice = jest.fn();
  const limited = deferred<{ status: 'rate_limited'; nextChangeAt: number }>();
  mockReserveNameDetailed.mockReturnValueOnce(limited.promise);
  const callbacks = { onRollback, onNotice };
  const screen = await renderModal(callbacks);

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Sixth name');
  await pressDone(screen);
  await screen.rerender(modalElement(callbacks, false));
  // шторка доигрывает уход — иначе следующее открытие (и следующий тест) застают её на полпути
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  await act(async () => {
    limited.resolve({ status: 'rate_limited', nextChangeAt: Date.now() + 12 * 60_000 - 5_000 });
    await limited.promise;
  });

  expect(onRollback).toHaveBeenCalledWith('Current name');
  expect(onNotice).toHaveBeenLastCalledWith(expect.stringMatching(/^Сменить имя можно через 12\s+мин$/)); // число и «мин» — через неразрывный пробел

  // reopened: «Готово» shows the wait at once and does not call the server
  await screen.rerender(modalElement(callbacks, true));
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Seventh name');
  await pressDone(screen);
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);
  expect(String(availabilityText(screen))).toMatch(/^Сменить имя можно через 12\s+мин$/);
});

test('check limit reached: no status is shown, «Готово» still applies', async () => {
  mockCheckNameAvailabilityDetailed.mockResolvedValue({ status: 'limited' });
  const screen = await renderModal();

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Limited check');
  await act(async () => { await jest.advanceTimersByTimeAsync(400); });
  expect(availabilityText(screen)).toBeUndefined();

  await pressDone(screen);
  expect(mockReserveNameDetailed).toHaveBeenCalledWith('Limited check', 'Current name', { source: 'settings' });
});

test('no sign-in / no network: the name stays on the phone, no rollback, it waits for the catch-up', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'error' });
  const onRollback = jest.fn();
  const onOptimisticApply = jest.fn();
  const screen = await renderModal({ onRollback, onOptimisticApply });

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Offline name');
  await pressDone(screen);
  await act(async () => { await Promise.resolve(); });

  expect(onOptimisticApply).toHaveBeenCalledWith('Offline name');
  expect(onRollback).not.toHaveBeenCalled();
  expect(mockMarkPending).toHaveBeenCalledWith('Offline name', 'Current name');
});

test('calls go one at a time: a second «Готово» during a call is queued and frees the name applied a moment ago', async () => {
  const first = deferred<{ status: 'ok' }>();
  mockReserveNameDetailed.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ status: 'ok' });
  const screen = await renderModal();

  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'First name');
  await pressDone(screen);
  await fireEvent.changeText(screen.getByTestId('nickname-input'), 'Second name');
  await pressDone(screen);
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);

  await act(async () => {
    first.resolve({ status: 'ok' });
    await first.promise;
  });
  await act(async () => { await Promise.resolve(); });

  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(2);
  expect(mockReserveNameDetailed).toHaveBeenLastCalledWith('Second name', 'First name', { source: 'settings' });
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NicknameEditModal = require('../components/account/NicknameEditModal').default;
