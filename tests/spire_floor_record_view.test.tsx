import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import SpireFloorRecord from '../components/spire/SpireFloorRecord';
import type { SpireRoomSnapshot } from '../modules/spire/room_rows';
import type { SpireConfigDoc } from '../modules/spire/config_contract';

jest.mock('react-native', () => ({ View: 'View', Text: 'Text', Platform: { OS: 'android' }, StyleSheet: { create: (v: unknown) => v, flatten: (v: unknown) => v } }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/v2/V2Pressable', () => ({ __esModule: true, default: (props: object) => require('react').createElement('View', props) }));
jest.mock('../components/modal_fx/HybridSheetShell', () => ({ __esModule: true, default: (props: object) => require('react').createElement('View', props) }));
jest.mock('../components/spire/SpireRankCoin', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/spire/SpireRecordAttempt', () => ({ __esModule: true, default: (props: object) => require('react').createElement('View', { ...props, testID: 'attempt' }) }));
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => ({}) }));
jest.mock('../app/spire/spire_live_gate', () => ({ spireOpenLiveGate: () => ({}) }));
const mockCall = jest.fn();
jest.mock('../app/spire/spire_net', () => ({ spireCall: (...args: unknown[]) => mockCall(...args) }));
const room: SpireRoomSnapshot = { schema: 'spire-room-cache.v1', uid: 'me', lang: 'en', weekId: '2026-W44', groupId: 'room', tier: 0,
  cohortDay: 0, weekStartMs: 0, fetchedAtMs: 0, roster: [], members: [{ uid: 'other', name: 'Аня', steps: 0, reachedAtMs: 0, totalMs: 0 }] };
const config = {} as SpireConfigDoc;
const props = { lang: 'ru' as const, floor: 1, stableId: 'me', room, config, active: true };
beforeEach(() => mockCall.mockReset());
afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });
test('changing selected floor changes the record without another network read', async () => {
  mockCall.mockResolvedValue({ records: { '1:1': { uid: 'other', durationMs: 12000, completedAtMs: 1 } }, personal: {} });
  const view = await render(<SpireFloorRecord {...props} />);
  expect(screen.getByTestId('spire-floor-record').props.accessibilityLabel).toContain('Аня · 0:12.00');
  await view.rerender(<SpireFloorRecord {...props} floor={2} />);
  expect(screen.getByTestId('spire-floor-record').props.accessibilityLabel).toContain('Станьте первым');
  expect(mockCall).toHaveBeenCalledTimes(1);
});
test('all 135 existing steps can be selected and sent explicitly without re-reading', async () => {
  mockCall.mockResolvedValue({ records: {}, personal: {} });
  const view = await render(<SpireFloorRecord {...props} />);
  for (let floor = 1; floor <= 15; floor++) {
    await view.rerender(<SpireFloorRecord {...props} floor={floor} />);
    const count = floor <= 5 ? floor + 4 : 10;
    for (let step = 1; step <= count; step++) {
      await fireEvent.press(screen.getByTestId(`spire-record-step-${step}`));
      expect(screen.getByTestId(`spire-record-step-${step}`).props.accessibilityState.selected).toBe(true);
      expect(screen.getByTestId('spire-floor-record').props.accessibilityLabel).toContain(`${step}`);
      await fireEvent.press(screen.getByTestId('spire-record-start'));
      expect(mockCall.mock.calls[mockCall.mock.calls.length - 1][2]).toEqual(expect.objectContaining({ action: 'start', floor, step }));
      await act(async () => screen.getByTestId('attempt').props.onClose());
    }
    expect(screen.queryByTestId(`spire-record-step-${count + 1}`)).toBeNull();
  }
  expect(mockCall).toHaveBeenCalledTimes(136);
});
test('network error is unavailable, never an empty record', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockCall.mockRejectedValue(new Error('offline'));
  await render(<SpireFloorRecord {...props} />);
  expect(screen.getByTestId('spire-floor-record').props.accessibilityLabel).toContain('Временно недоступен');
  expect(screen.getByTestId('spire-record-start').props.disabled).toBe(true);
});
test('failed finish retries the same token and does not report a winner early', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const requests: Record<string, unknown>[] = [];
  let finishes = 0;
  mockCall.mockImplementation(async (_gate, _name, request: Record<string, unknown>) => {
    requests.push(request);
    if (request.action === 'start') return { token: 'same-token', packHash: 'pack', saltId: 'salt', set: {} };
    if (request.action === 'finish' && ++finishes === 1) throw new Error('offline');
    return { records: {}, personal: {} };
  });
  await render(<SpireFloorRecord {...props} />);
  await fireEvent.press(screen.getByTestId('spire-record-start'));
  await act(async () => screen.getByTestId('attempt').props.onFinish([], 1234));
  expect(screen.queryByText('Рекорд ваш! 10/10 верно.')).toBeNull();
  await fireEvent.press(screen.getByTestId('spire-record-start'));
  const submits = requests.filter((r) => r.action === 'finish');
  expect(submits).toHaveLength(2);
  expect(submits[0]).toEqual(submits[1]);
});
