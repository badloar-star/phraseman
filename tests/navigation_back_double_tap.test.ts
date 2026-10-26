// зачем (Моменты, Optimistic UI-аудит 26.10): второй тап по «назад» во время перехода уводил на два экрана назад —
// safeRouterBack снимает запись истории на каждый вызов. Защита одна, внутри safeRouterBack.
function loadNavigationBack() {
  jest.resetModules();
  return require('../app/navigation_back') as typeof import('../app/navigation_back');
}

function makeRouter() {
  return {
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => false),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissTo: jest.fn(),
    replace: jest.fn(),
  };
}

describe('safeRouterBack: двойной тап', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
    jest.useRealTimers();
  });

  it('второй тап до прихода нового экрана пропускается: одна навигация, история снята один раз', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath('/(tabs)/lessons');
    navigation.rememberNavigationPath('/lesson_menu');
    navigation.rememberNavigationPath('/lesson_words');

    navigation.safeRouterBack(router, '/(tabs)/lessons' as any);
    navigation.safeRouterBack(router, '/(tabs)/lessons' as any);

    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith('/lesson_menu');
    const skip = warn.mock.calls.find((call) => call[0] === '[NAV-BACK] skip');
    expect(JSON.parse(String(skip?.[1]))).toMatchObject({ reason: 'double_tap', from: '/lesson_words', goingTo: '/lesson_menu' });

    // переход дошёл: «назад» с нового экрана снова работает и ведёт на шаг дальше, а не перескакивает
    navigation.rememberNavigationPath('/lesson_menu');
    navigation.safeRouterBack(router, '/(tabs)/lessons' as any);
    expect(router.dismissTo).toHaveBeenCalledTimes(2);
    expect(router.dismissTo).toHaveBeenLastCalledWith('/(tabs)/lessons');
  });

  it('навигация не случилась — через окно второй тап снова работает', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath('/streak_stats');

    navigation.safeRouterBack(router, '/(tabs)/home' as any);
    jest.advanceTimersByTime(1001);
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.dismissTo).toHaveBeenCalledTimes(2);
  });
});
