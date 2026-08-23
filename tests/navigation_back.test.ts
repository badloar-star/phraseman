type RouterStub = {
  canGoBack: jest.Mock<boolean, []>;
  canDismiss: jest.Mock<boolean, []>;
  back: jest.Mock<void, []>;
  dismiss: jest.Mock<void, [number?]>;
  dismissTo: jest.Mock<void, [any]>;
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
    dismissTo: jest.fn(),
    replace: jest.fn(),
  };
}

function makeDismissableRouter(): RouterStub {
  return {
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => true),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissTo: jest.fn(),
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

  it('uses native dismissTo to the fallback when there is no recorded in-app previous route', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.canGoBack).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('does not exit the app when a standalone screen is the first recorded route', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/streak_stats');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.canGoBack).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('dismisses natively to the recorded previous route instead of using native back', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/streak_stats');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.canGoBack).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/home');

    navigation.rememberNavigationPath('/(tabs)/home');
    jest.advanceTimersByTime(300);

    expect(router.dismissTo).toHaveBeenCalledTimes(1);
  });

  it('does not return from one section root into a previously visited foreign section', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/flashcards');
    navigation.rememberNavigationPath('/lingman_videos');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/home');
    expect(router.dismissTo).not.toHaveBeenCalledWith('/flashcards');
  });

  it('returns from a child screen to its previous screen inside the same section', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/flashcards');
    navigation.rememberNavigationPath('/mistake_practice_session');
    navigation.safeRouterBack(router, '/flashcards' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/flashcards');
    expect(router.dismissTo).not.toHaveBeenCalledWith('/(tabs)/home');
  });

  it('lets a contextual portal inherit its opener section', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/flashcards');
    navigation.rememberNavigationPath('/shards_shop?source=mistake_practice');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/flashcards');
    expect(router.dismissTo).not.toHaveBeenCalledWith('/(tabs)/home');
  });

  it('fails closed to the fallback for an unknown route after another section', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/flashcards');
    navigation.rememberNavigationPath('/future_section_without_policy');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/home');
    expect(router.dismissTo).not.toHaveBeenCalledWith('/flashcards');
  });

  it('preserves an object fallback and all of its identity params across a section boundary', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);
    const fallback = { pathname: '/lesson_menu', params: { id: '7' } } as any;

    navigation.rememberNavigationPath('/flashcards');
    navigation.rememberNavigationPath('/hint?id=7');
    navigation.safeRouterBack(router, fallback);

    expect(router.dismissTo).toHaveBeenCalledWith(fallback);
    expect(router.dismissTo).not.toHaveBeenCalledWith('/flashcards');
  });

  it('keeps nested Settings navigation inside the Settings section', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/flashcards');
    navigation.rememberNavigationPath('/(tabs)/settings');
    navigation.rememberNavigationPath('/settings_language');
    navigation.rememberNavigationPath('/language_welcome');
    navigation.safeRouterBack(router, '/settings_language' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/settings_language');
    expect(router.dismissTo).not.toHaveBeenCalledWith('/flashcards');
  });

  it('does not native-dismiss a direct Settings deep link onto a foreign underlay', () => {
    const navigation = loadNavigationBack();
    const router = makeDismissableRouter();

    navigation.rememberNavigationPath('/promo_code_entry?source=settings');
    navigation.safeRouterBack(router, '/(tabs)/settings' as any);

    expect(router.dismiss).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/settings');
  });

  it('returns a contextual Education sheet to the lesson that opened it', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/lesson_menu?id=4');
    navigation.rememberNavigationPath('/settings_edu');
    navigation.safeRouterBack(router, '/(tabs)/settings' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/lesson_menu?id=4');
    expect(router.dismissTo).not.toHaveBeenCalledWith('/(tabs)/settings');
  });

  it('keeps AI and MAX child routes in the Lessons branch that opened them', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/(tabs)/lessons');
    navigation.rememberNavigationPath('/ai_dialog_briefing?scenarioId=intro');
    navigation.markNextNavigationAsReplace();
    navigation.rememberNavigationPath('/ai_dialog_session?scenarioId=intro');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/lessons');
    expect(router.dismissTo).not.toHaveBeenCalledWith('/(tabs)/home');
  });

  it('always returns MAX to Home even when a stale Dialogs entry opened it', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/ai_dialog_home');
    navigation.rememberNavigationPath('/max_call_session?format=tutor');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/home');
    expect(router.dismissTo).not.toHaveBeenCalledWith('/ai_dialog_home');
  });

  it('treats Flashcards catalog pages as sibling roots and exits straight to Home', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/flashcards');
    navigation.rememberNavigationPath('/flashcards_packs');
    navigation.safeRouterBack(router, '/(tabs)/home' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/home');
    expect(router.dismissTo).not.toHaveBeenCalledWith('/flashcards');
  });

  it('registers all three Flashcards tab destinations as roots of one section', () => {
    const navigation = loadNavigationBack();

    expect(navigation.navigationRoutePolicyForAudit('/flashcards')).toEqual({ role: 'root', section: 'flashcards' });
    expect(navigation.navigationRoutePolicyForAudit('/flashcards_packs')).toEqual({ role: 'root', section: 'flashcards' });
    expect(navigation.navigationRoutePolicyForAudit('/flashcards_my_packs')).toEqual({ role: 'root', section: 'flashcards' });
    expect(navigation.navigationRoutePolicyForAudit('/flashcards_collection?pack=x')).toEqual({ role: 'child', section: 'flashcards' });
  });

  it('sends section roots home and section children to their canonical root', () => {
    const navigation = loadNavigationBack();

    expect(navigation.navigationFallbackForPath('/arena_history')).toBe('/arena');
    expect(navigation.navigationFallbackForPath('/arena_ranks')).toBe('/arena');
    expect(navigation.navigationFallbackForPath('/arena_tops')).toBe('/arena');
    expect(navigation.navigationFallbackForPath('/arena_review?matchId=m-1')).toBe('/arena');
    expect(navigation.navigationFallbackForPath('/flashcards')).toBe('/(tabs)/home');
    // FIX (владелец, 2026-08-16): раньше здесь ждали '/flashcards', и это ожидание
    // кодировало сам баг — разделы карточек были зациклены сами на себя. Экран
    // сохранённых карточек не хаб над каталогом наборов, а его СОСЕД по нижнему
    // таббару, поэтому выход из каталога ведёт наружу раздела, а не вбок в него.
    expect(navigation.navigationFallbackForPath('/flashcards_packs')).toBe('/(tabs)/home');
    expect(navigation.navigationFallbackForPath('/flashcards_my_packs')).toBe('/(tabs)/home');
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
    expect(router.dismissTo).toHaveBeenCalledWith('/lesson_menu?id=5');
  });

  // зачем 2026-08-23: правило (закрывая экран, возвращаемся на КОНКРЕТНЫЙ
  // предыдущий экран с его параметрами, а не на голый корень раздела) раньше
  // проверялось на турнирных экранах. Турниры выключены и заархивированы,
  // поэтому тот же инвариант сторожим на живом разделе уроков.
  it('preserves the concrete previous screen when closing a nested screen', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/lesson_menu?id=7');
    navigation.rememberNavigationPath('/lesson_words?id=7');
    navigation.safeRouterBack(router, '/(tabs)/lessons' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/lesson_menu?id=7');
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
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/home');
  });

  // Смена ИДЕНТИФИЦИРУЮЩЕГО параметра (другой урок) — это РАЗНЫЕ экраны, их нельзя
  // схлопывать: «назад» из меню урока 6 должен вернуть на меню урока 5.
  it('treats different identity ids as distinct screens', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter(true);

    navigation.rememberNavigationPath('/lesson_menu?id=5');
    navigation.rememberNavigationPath('/lesson_menu?id=6');
    navigation.safeRouterBack(router, '/lesson_menu' as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/lesson_menu?id=5');
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

    expect(router.dismissTo).toHaveBeenCalledWith('/lesson_menu?id=9');
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
    navigation.rememberNavigationPath('/mistake_practice_session');
    navigation.markNextNavigationAsReplace();
    navigation.rememberNavigationPath('/premium_modal?context=mistake_practice');

    navigation.dismissPaywallModal(router, '/(tabs)/home' as any);

    expect(router.canDismiss).not.toHaveBeenCalled();
    expect(router.dismiss).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('replaces instead of native-dismiss when a concrete paywall route replaced its source route', () => {
    const navigation = loadNavigationBack();
    const router = makeDismissableRouter();

    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/mistake_practice_session');
    navigation.markNextNavigationAsReplace();
    navigation.rememberNavigationPath('/paywall_a?context=mistake_practice');

    navigation.dismissPaywallModal(router, '/(tabs)/home' as any);

    expect(router.canDismiss).not.toHaveBeenCalled();
    expect(router.dismiss).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/home');
  });
});
