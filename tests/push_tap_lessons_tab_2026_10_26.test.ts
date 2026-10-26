// зачем (координатор 26.10, запрет петель владельцем): тап по пушу «серия под угрозой / давно не заходил» вёл на /lessons_list — вторую
// копию вкладки «Уроки» поверх стека. Теперь — сама вкладка через dismissToTabRoute, с журналом [NAV-BACK] push_tap.
jest.mock('../app/paywall_close_trace', () => ({ paywallCloseMark: () => undefined }));
jest.mock('../app/paywall_navigation', () => ({ scheduleAfterRootNavigationReady: (fn: () => void) => fn() }));

// eslint-disable-next-line import/first
import { openLessonsTabFromPush } from '../app/notification_tap_handler';

describe('тап по пушу → вкладка «Уроки», не её копия', () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => log.mockRestore());

  it('холодный старт (стек пуст, canGoBack=false): dismissTo на вкладку, причина в журнале', () => {
    const router = { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), canGoBack: () => false };
    openLessonsTabFromPush(router, 'streak_at_risk');
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/lessons');
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    const line = log.mock.calls.find((c) => c[0] === '[NAV-BACK] push_tap → вкладка «Уроки»');
    expect(JSON.parse(String(line?.[1]))).toEqual({ type: 'streak_at_risk', canGoBack: false, method: 'dismissTo' });
  });

  it('роутер без dismissTo — replace на вкладку; совсем без replace — push на вкладку; копии /lessons_list нет', () => {
    const withReplace = { push: jest.fn(), replace: jest.fn() };
    openLessonsTabFromPush(withReplace, 'inactive_return');
    expect(withReplace.replace).toHaveBeenCalledWith('/(tabs)/lessons');
    const pushOnly = { push: jest.fn() };
    openLessonsTabFromPush(pushOnly, 'inactive_long');
    expect(pushOnly.push).toHaveBeenCalledWith('/(tabs)/lessons');
    const all = [...withReplace.replace.mock.calls, ...pushOnly.push.mock.calls].flat();
    expect(all).not.toContain('/lessons_list');
  });
});
