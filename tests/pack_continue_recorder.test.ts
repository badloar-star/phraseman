// зачем (координатор 12.10, «Продолжить»): запись позиции из сессий тренировки — только для колоды из ОДНОГО набора, с задержкой и при выходе.
import { act, renderHook } from '@testing-library/react-native';

const mockRecord = jest.fn();
jest.mock('../app/flashcards/pack_continue_position', () => ({ recordPackContinuePosition: (...args: unknown[]) => mockRecord(...args) }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));

import { PACK_CONTINUE_DEBOUNCE_MS, singlePackIdFromDeckKeys, usePackContinueRecorder } from '../app/flashcards/use_pack_continue_recorder';

describe('singlePackIdFromDeckKeys', () => {
  it('accepts exactly one pack deck', () => {
    expect(singlePackIdFromDeckKeys(['pack:abc'])).toEqual({ packId: 'abc', reason: 'single_pack' });
  });
  it('refuses saved, custom, mixed and empty selections with a reason', () => {
    expect(singlePackIdFromDeckKeys(['saved']).packId).toBeNull();
    expect(singlePackIdFromDeckKeys(['custom']).reason).toBe('not_a_pack:custom');
    expect(singlePackIdFromDeckKeys(['pack:a', 'pack:b']).reason).toBe('mixed_decks:2');
    expect(singlePackIdFromDeckKeys([]).reason).toBe('no_decks');
    expect(singlePackIdFromDeckKeys(['pack:']).reason).toBe('empty_pack_id');
  });
});

describe('usePackContinueRecorder', () => {
  beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] }); mockRecord.mockClear(); });
  afterEach(() => { jest.useRealTimers(); });

  it('debounces writes and keeps only the last position', async () => {
    const { result } = await renderHook(() => usePackContinueRecorder(['pack:abc'], 'speaking'));
    await act(async () => { result.current.record(3, 20); result.current.record(4, 20); result.current.record(5, 20); });
    expect(mockRecord).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(PACK_CONTINUE_DEBOUNCE_MS + 10); });
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith('en', { packId: 'abc', index: 5, total: 20, mode: 'speaking' });
  });

  it('flushes the pending position when the screen is left', async () => {
    const { result, unmount } = await renderHook(() => usePackContinueRecorder(['pack:abc'], 'recall'));
    await act(async () => { result.current.record(7, 40); });
    await unmount();
    expect(mockRecord).toHaveBeenCalledWith('en', { packId: 'abc', index: 7, total: 40, mode: 'recall' });
  });

  it('writes nothing for a mixed or non-pack deck', async () => {
    const { result, unmount } = await renderHook(() => usePackContinueRecorder(['saved'], 'truefalse'));
    await act(async () => { result.current.record(2, 10); jest.advanceTimersByTime(PACK_CONTINUE_DEBOUNCE_MS + 10); });
    await unmount();
    expect(mockRecord).not.toHaveBeenCalled();
  });
});
