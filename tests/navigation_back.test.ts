type RouterStub = {
  canGoBack: jest.Mock<boolean, []>;
  back: jest.Mock<void, []>;
  replace: jest.Mock<void, [any]>;
};

function loadNavigationBack() {
  jest.resetModules();
  return require('../app/navigation_back') as typeof import('../app/navigation_back');
}

function makeRouter(canGoBack = true): RouterStub {
  return {
    canGoBack: jest.fn(() => canGoBack),
    back: jest.fn(),
    replace: jest.fn(),
  };
}

describe('safeRouterBack', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('uses fallback instead of native back when there is no recorded in-app previous route', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.canGoBack).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('does not exit the app when a standalone screen is the first recorded route', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/streak_stats');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.canGoBack).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('allows native back only when an in-app previous route was recorded', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/streak_stats');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.canGoBack).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();

    navigation.rememberNavigationPath('/(tabs)/home');
    jest.advanceTimersByTime(300);

    expect(router.replace).not.toHaveBeenCalled();
  });
});
