// F17, аудит похожих мест (владелец 11.11): память наград и счётчиков, пережившая смену аккаунта A → B.
//   • итог первого разговора с ИИ: минуты и фразы A уходили в пейвол B, а свой итог B не записывался;
//   • история «+500» за видео: «показано» считалось по ролику без игрока; ожидающая история A открывалась у B;
//   • секунды просмотра видео: 50 с прошлого игрока + 10 с нового = «минута» в задании нового;
//   • ключи без владельца в имени: последняя показанная серия, пульс точки недели, кольцо «Сегодня», итог разговора.
// Сработал — чини логику, а не сторожа.
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockOwnerResets: Record<string, () => void> = {};
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: (name: string, reset: () => void) => { mockOwnerResets[name] = reset; } }));

import { ACCOUNT_SWITCH_LEAK_KEYS } from '../app/account_switch_leak_keys';
import {
  DIALOG_FIRST_FREE_SUMMARY_KEY,
  __resetDialogFirstFreeSummaryForTests,
  dialogLimitPaywallParams,
  peekDialogFirstFreeSummary,
  recordDialogFirstFreeSummary,
} from '../app/dialog_first_free_summary';
import {
  __resetVideoFullStoryForTests,
  dismissVideoFullStory,
  markVideoFullStoryReady,
  peekVideoFullStory,
  queueVideoFullStory,
} from '../app/video_full_story_state';
import { TODAY_VIDEO_CHECKPOINT_SEC, __resetTodayVideoTicks, noteTodayVideoPlaybackTick } from '../modules/today-tasks/today_tasks_video_ticks';

const switchOwner = (name: string): void => {
  const reset = mockOwnerResets[name];
  if (!reset) throw new Error(`сброс при смене владельца не подключён: ${name}`);
  reset();
};

describe('F17 · награды и счётчики при смене аккаунта', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetDialogFirstFreeSummaryForTests();
    __resetVideoFullStoryForTests();
    __resetTodayVideoTicks('test');
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('итог первого разговора A не попадает в пейвол B, и B записывает свой', async () => {
    const talk = (turns: number, was: string) => recordDialogFirstFreeSummary({ freeTier: true, startedAtMs: 0, endedAtMs: 7 * 60_000, learnerTurns: turns, corrections: [{ original: was, corrected: `${was} fixed` }] });
    await talk(12, 'phrase of A');
    expect(dialogLimitPaywallParams('test').firstDialogWas).toBe('phrase of A');
    // выход/смена аккаунта: диск чистит стирание (ключ в списке), память — сброс при смене владельца
    await AsyncStorage.removeItem(DIALOG_FIRST_FREE_SUMMARY_KEY);
    switchOwner('dialog_first_free_summary');
    expect(peekDialogFirstFreeSummary()).toBeNull();
    expect(dialogLimitPaywallParams('test').firstDialogWas).toBeUndefined();
    await talk(3, 'phrase of B');
    expect(dialogLimitPaywallParams('test')).toMatchObject({ firstDialogTurns: '3', firstDialogWas: 'phrase of B' });
  });

  it('история «+500»: показана у A — у B за тот же ролик показывается снова', () => {
    queueVideoFullStory('v1', 500);
    markVideoFullStoryReady('v1', 'ended');
    dismissVideoFullStory();
    switchOwner('video_full_story');
    queueVideoFullStory('v1', 500);
    markVideoFullStoryReady('v1', 'ended');
    expect(peekVideoFullStory()).toMatchObject({ videoId: 'v1', amount: 500 });
  });

  it('история «+500»: тот же игрок второй раз за запуск её не видит', () => {
    queueVideoFullStory('v1', 500);
    markVideoFullStoryReady('v1', 'ended');
    dismissVideoFullStory();
    queueVideoFullStory('v1', 500);
    markVideoFullStoryReady('v1', 'ended');
    expect(peekVideoFullStory()).toBeNull();
  });

  it('ожидающая история A не открывается у B', () => {
    queueVideoFullStory('v1', 500);
    markVideoFullStoryReady('v1', 'ended');
    expect(peekVideoFullStory()).not.toBeNull();
    switchOwner('video_full_story');
    expect(peekVideoFullStory()).toBeNull();
  });

  it('секунды просмотра A не добавляются к минуте B', () => {
    const report = jest.fn();
    const day = new Date(2026, 10, 11, 12).getTime();
    for (let n = 0; n < TODAY_VIDEO_CHECKPOINT_SEC - 10; n += 1) noteTodayVideoPlaybackTick('v1', day + n * 1000, report);
    switchOwner('today_tasks_video_ticks');
    const later = day + 10 * 60_000;
    for (let n = 0; n < 10; n += 1) noteTodayVideoPlaybackTick('v1', later + n * 1000, report);
    expect(report).not.toHaveBeenCalled();
    for (let n = 10; n < TODAY_VIDEO_CHECKPOINT_SEC; n += 1) noteTodayVideoPlaybackTick('v1', later + n * 1000, report);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it('ключи без владельца в имени стираются при выходе и смене аккаунта', () => {
    for (const key of ['streak_last_shown', 'home_week_dot_animation_last_shown_v1', 'today_ring_seen_v1', 'dialog_first_free_summary_v1']) {
      expect(ACCOUNT_SWITCH_LEAK_KEYS).toContain(key);
    }
  });
});
