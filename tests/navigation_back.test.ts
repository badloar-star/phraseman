type RouterStub = {
  canGoBack: jest.Mock<boolean, []>;
  canDismiss: jest.Mock<boolean, []>;
  back: jest.Mock<void, []>;
  dismiss: jest.Mock<void, [number?]>;
  replace: jest.Mock<void, [any]>;
};

function loadNavigationBack() {
  jest.resetModules();
  return require('../app/navigation_back') as typeof import('../app/navigation_back');
}

function makeRouter(canGoBack = true): RouterStub {
  return {
    canGoBack: jest.fn(() => canGoBack),
    canDismiss: jest.fn(() => false),
    back: jest.fn(),
    dismiss: jest.fn(),
    replace: jest.fn(),
  };
}

function makeDismissableRouter(): RouterStub {
  return {
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => true),
    back: jest.fn(),
    dismiss: jest.fn(),
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

  it('replaces to the recorded previous route instead of using native back', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/streak_stats');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.canGoBack).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');

    navigation.rememberNavigationPath('/(tabs)/home');
    jest.advanceTimersByTime(300);

    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  // Регрессия: выход из теории/любого экрана урока должен вернуть на меню ИМЕННО
  // того урока, из которого зашли, а не на меню урока 1. Раньше basePath отрезал
  // ?id=N, и «назад» делал replace на голый '/lesson_menu' → дефолт parseInt||1 →
  // меню урока 1. Идентифицирующий id обязан сохраняться в ключе стека.
  it('preserves the lesson id when going back to a lesson menu', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    // Меню урока 5 → открыли теорию урока 5.
    navigation.rememberNavigationPath('/lesson_menu?id=5');
    navigation.rememberNavigationPath('/hint?id=5');
    navigation.safeRouterBack(router, '/lesson_menu' as any);

    // Возврат — на меню урока 5, а не на голый '/lesson_menu' (= урок 1).
    expect(router.replace).toHaveBeenCalledWith('/lesson_menu?id=5');
  });

  // Косметические query (вкладки/фильтры) внутри одного экрана НЕ должны плодить
  // записи в стеке: смена ?tab=a → ?tab=b остаётся одним экраном.
  it('does not stack cosmetic query changes within one screen', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/lesson_words?id=3&tab=list');
    navigation.rememberNavigationPath('/lesson_words?id=3&tab=grid');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    // Один экран lesson_words (id=3) свернулся в одну запись → «назад» уводит домой,
    // а не на ту же страницу с прошлой вкладкой.
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');
  });

  // Смена ИДЕНТИФИЦИРУЮЩЕГО параметра (другой урок) — это РАЗНЫЕ экраны, их нельзя
  // схлопывать: «назад» из меню урока 6 должен вернуть на меню урока 5.
  it('treats different identity ids as distinct screens', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/lesson_menu?id=5');
    navigation.rememberNavigationPath('/lesson_menu?id=6');
    navigation.safeRouterBack(router, '/lesson_menu' as any);

    expect(router.replace).toHaveBeenCalledWith('/lesson_menu?id=5');
  });

  it('preserves replace semantics through the transient premium dispatcher', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/lesson_menu?id=9');
    navigation.rememberNavigationPath('/lesson1?id=9');

    navigation.markNextNavigationAsReplace();
    navigation.rememberNavigationPath('/premium_modal?context=course_after_lesson3');
    navigation.rememberNavigationPath('/paywall_a?context=course_after_lesson3');

    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.replace).toHaveBeenCalledWith('/lesson_menu?id=9');
  });

  it('does not leave duplicate lesson menus after completing and exiting a lesson', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/(tabs)/lessons');
    navigation.rememberNavigationPath('/lesson_menu?id=6');
    navigation.rememberNavigationPath('/lesson1?id=6');

    // lesson1 → lesson_complete and lesson_complete → lesson_menu are both swaps,
    // never additional history entries. Otherwise the first back press appears to
    // do nothing because it lands on a duplicate lesson menu.
    navigation.markNextNavigationAsReplace();
    navigation.rememberNavigationPath('/lesson_complete?id=6');
    navigation.markNextNavigationAsReplace();
    navigation.rememberNavigationPath('/lesson_menu?id=6');
    navigation.safeRouterBack(router, '/(tabs)/lessons' as any);

    expect(router.replace).toHaveBeenCalledWith('/(tabs)/lessons');
  });

  it('dismisses a paywall modal natively when the stack supports it', () => {
    const navigation = loadNavigationBack();
    const router = makeDismissableRouter();

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/premium_modal?context=generic');
    navigation.rememberNavigationPath('/paywall_a?context=generic');

    navigation.dismissPaywallModal(router, '/(tabs)/home' as any);

    expect(router.canDismiss).toHaveBeenCalled();
    expect(router.dismiss).toHaveBeenCalledWith(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces instead of native-dismiss when a transient paywall replaced its source route', () => {
    const navigation = loadNavigationBack();
    const router = makeDismissableRouter();

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/trainer_words_session');
    navigation.markNextNavigationAsReplace();
    navigation.rememberNavigationPath('/premium_modal?context=trainer_limit');

    navigation.dismissPaywallModal(router, '/(tabs)/home' as any);

    expect(router.canDismiss).not.toHaveBeenCalled();
    expect(router.dismiss).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('replaces instead of native-dismiss when a concrete paywall route replaced its source route', () => {
    const navigation = loadNavigationBack();
    const router = makeDismissableRouter();

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/trainer_phrases_session');
    navigation.markNextNavigationAsReplace();
    navigation.rememberNavigationPath('/paywall_a?context=trainer_limit');

    navigation.dismissPaywallModal(router, '/(tabs)/home' as any);

    expect(router.canDismiss).not.toHaveBeenCalled();
    expect(router.dismiss).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');
  });
});
