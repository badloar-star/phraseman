/**
 * Разминка и её игры — порталы с ролью: закрытие игры возвращает в разминку, а не на Главную.
 * Повод (эмулятор 11.11.2026): в журнале `[NAV-BACK] candidate:reset leaving_no_section` — у маршрутов игр не было
 * роли, «назад» из игры уходил на Главную, и разминка не вела к следующей игре.
 */
type RouterStub = {
  canGoBack: jest.Mock<boolean, []>;
  canDismiss: jest.Mock<boolean, []>;
  back: jest.Mock<void, []>;
  dismiss: jest.Mock<void, [number?]>;
  dismissTo: jest.Mock<void, [unknown]>;
  replace: jest.Mock<void, [unknown]>;
};

function loadNavigationBack() {
  jest.resetModules();
  return require('../app/navigation_back') as typeof import('../app/navigation_back');
}

function makeRouter(): RouterStub {
  return {
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => true),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissTo: jest.fn(),
    replace: jest.fn(),
  };
}

const GAME_ROUTES = ['/game_flow', '/game_odd_word', '/game_sort', '/game_quiz', '/game_hunt', '/game_order', '/game_race', '/game_minute', '/game_levels'];
const HOME = '/(tabs)/home';

/** Куда ушёл «назад»: явная цель dismissTo/replace либо обычный шаг назад по стеку. */
function wentHome(router: RouterStub): boolean {
  const targets = [...router.dismissTo.mock.calls, ...router.replace.mock.calls].map((call) => String(call[0]));
  return targets.some((target) => target === HOME || target === '/home');
}

describe('«назад» из игр разминки', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each(GAME_ROUTES)('%s, открытая из разминки, закрывается в разминку', (route) => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath(HOME);
    navigation.rememberNavigationPath('/warmup');
    navigation.rememberNavigationPath(route);

    navigation.safeRouterBack(router as never, HOME as never);

    expect(wentHome(router)).toBe(false);
    const explicit = [...router.dismissTo.mock.calls, ...router.replace.mock.calls].map((call) => String(call[0]));
    const steppedBack = router.back.mock.calls.length + router.dismiss.mock.calls.length > 0;
    expect(explicit.includes('/warmup') || steppedBack).toBe(true);
  });

  it('разминка, открытая с Главной, закрывается на Главную', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath(HOME);
    navigation.rememberNavigationPath('/warmup');

    navigation.safeRouterBack(router as never, HOME as never);

    const calls = router.dismissTo.mock.calls.length + router.replace.mock.calls.length + router.back.mock.calls.length + router.dismiss.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    const explicit = [...router.dismissTo.mock.calls, ...router.replace.mock.calls].map((call) => String(call[0]));
    expect(explicit.every((target) => target === HOME || target === '/home')).toBe(true);
  });
});
