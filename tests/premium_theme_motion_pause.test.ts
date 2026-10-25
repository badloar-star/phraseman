/**
 * [THEME-MOTION] Пауза живого фона премиум-тем (координатор 25.10, владелец «скролл стал дёрганым, на главной»; A/B Сверки:
 * «Аметист» на WebGL — ANR при бросках). Сторож: движение идёт только когда Главная на виду, приложение активно и прокрутки нет;
 * прокрутка включается с первого шага, гаснет после 220 мс тишины и не гаснет, пока палец на экране.
 */
import {
  SCROLL_ACTIVITY_IDLE_MS,
  noteScreenScrollActivity,
  peekScreenScrollActive,
  resetScreenScrollActivityForTests,
  subscribeScreenScrollActive,
} from '../app/home_scroll_activity';
import {
  premiumMotionGateReason,
  premiumMotionSetRunningScript,
  premiumMotionShouldRun,
} from '../components/home/v2/scene/premium_theme_motion_gate';

const ON = { homeVisible: true, screenFocused: true, appActive: true, scrolling: false, reducedMotion: false } as const;

describe('premium motion gate', () => {
  it('идёт только когда всё на виду и прокрутки нет', () => {
    expect(premiumMotionShouldRun(ON)).toBe(true);
    expect(premiumMotionGateReason(ON)).toBe('running');
  });
  it('печатает первую причину паузы', () => {
    expect(premiumMotionGateReason({ ...ON, scrolling: true })).toBe('scrolling');
    expect(premiumMotionGateReason({ ...ON, homeVisible: false })).toBe('home_hidden');
    expect(premiumMotionGateReason({ ...ON, screenFocused: false })).toBe('screen_unfocused');
    expect(premiumMotionGateReason({ ...ON, appActive: false, homeVisible: false })).toBe('app_background');
    expect(premiumMotionGateReason({ ...ON, reducedMotion: true })).toBe('reduced_motion');
  });
  it('скрипт паузы не бросает, если страница ещё без __pmSetRunning', () => {
    expect(premiumMotionSetRunningScript(false)).toBe('window.__pmSetRunning&&window.__pmSetRunning(false);true;');
    expect(premiumMotionSetRunningScript(true)).toContain('__pmSetRunning(true)');
  });
});

describe('home scroll activity', () => {
  beforeEach(() => { jest.useFakeTimers(); resetScreenScrollActivityForTests(); });
  afterEach(() => { resetScreenScrollActivityForTests(); jest.useRealTimers(); });

  it('шаг прокрутки включает, тишина 220 мс гасит', () => {
    const seen: boolean[] = [];
    const off = subscribeScreenScrollActive('home', () => seen.push(peekScreenScrollActive('home')));
    noteScreenScrollActivity('home', 'offset');
    expect(peekScreenScrollActive('home')).toBe(true);
    jest.advanceTimersByTime(SCROLL_ACTIVITY_IDLE_MS - 10);
    noteScreenScrollActivity('home', 'offset'); // инерция продолжается — таймер перезапущен
    jest.advanceTimersByTime(SCROLL_ACTIVITY_IDLE_MS - 10);
    expect(peekScreenScrollActive('home')).toBe(true);
    jest.advanceTimersByTime(20);
    expect(peekScreenScrollActive('home')).toBe(false);
    expect(seen).toEqual([true, false]); // ровно два переключения, без дребезга на каждом шаге
    off();
  });

  it('пока палец на экране — не гаснет, после отпускания гаснет по тишине', () => {
    noteScreenScrollActivity('home', 'drag_start');
    jest.advanceTimersByTime(SCROLL_ACTIVITY_IDLE_MS * 5);
    expect(peekScreenScrollActive('home')).toBe(true);
    noteScreenScrollActivity('home', 'drag_end');
    jest.advanceTimersByTime(SCROLL_ACTIVITY_IDLE_MS + 1);
    expect(peekScreenScrollActive('home')).toBe(false);
  });

  it('экраны независимы', () => {
    noteScreenScrollActivity('settings', 'offset');
    expect(peekScreenScrollActive('home')).toBe(false);
  });
});
