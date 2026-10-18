// зачем (владелец 18.10 через координатора 09:58): закрытие пейвола — ТОЛЬКО шторка. Зонд до починки: поверх урока Learning V2
// (одноразовый адрес) и экранов Диалогов V2 (нет раздела) крестик уходил в dismissTo(Главная) и снимал экран под пейволом.
type RouterStub = { canGoBack: jest.Mock; canDismiss: jest.Mock; back: jest.Mock; dismiss: jest.Mock; dismissTo: jest.Mock; replace: jest.Mock };
function load() { jest.resetModules(); return require('../app/navigation_back') as typeof import('../app/navigation_back'); }
const router = (canDismiss = true): RouterStub => ({ canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => canDismiss), back: jest.fn(), dismiss: jest.fn(), dismissTo: jest.fn(), replace: jest.fn() });

describe('пейвол закрывается один, экран под ним остаётся', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.spyOn(console, 'log').mockImplementation(() => undefined); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

  it.each([
    ['/(tabs)/home', '/learning-v2/session/x?lessonOrdinal=1&sessionOrdinal=2'],
    ['/ai_dialog_home', '/learning-v2/session/x?lessonOrdinal=1&sessionOrdinal=2'],
    ['/(tabs)/home', '/dialogue_v2_session?scenarioId=social_01'],
    ['/(tabs)/lessons', '/dialogue_v2_freeform'],
    ['/flashcards_collection', '/dialogue_v2_memory'],
    ['/ai_dialog_home', '/dialogue_v2_completion'],
    ['/(tabs)/home', '/flashcards_training_setup'],
    ['/(tabs)/home', '/lesson1?id=3'],
  ])('%s → %s → пейвол ✕ = dismiss(1), без dismissTo/replace', (opener, screen) => {
    const nav = load();
    nav.rememberNavigationPath(opener);
    nav.rememberNavigationPath(screen);
    nav.rememberNavigationPath('/premium_modal?context=x');
    const r = router();
    nav.dismissPaywallModal(r as never);
    expect(r.dismiss).toHaveBeenCalledWith(1);
    expect(r.dismissTo).not.toHaveBeenCalled();
    expect(r.replace).not.toHaveBeenCalled();
  });

  it('двойной тап по ✕ (Ревизор 18.10): второй вызов в пределах 900 мс ничего не закрывает', () => {
    const nav = load();
    nav.rememberNavigationPath('/(tabs)/home');
    nav.rememberNavigationPath('/learning-v2/session/x?lessonOrdinal=1&sessionOrdinal=2');
    nav.rememberNavigationPath('/premium_modal?context=x');
    const r = router();
    nav.dismissPaywallModal(r as never);
    nav.dismissPaywallModal(r as never);
    expect(r.dismiss).toHaveBeenCalledTimes(1);
    expect(r.dismissTo).not.toHaveBeenCalled();
    expect(r.replace).not.toHaveBeenCalled();
  });

  it('пейвол поверх вкладки и холодный вход без истории идут прежней логикой', () => {
    const nav = load();
    nav.rememberNavigationPath('/premium_modal?context=x');
    const r = router(false);
    nav.dismissPaywallModal(r as never);
    expect(r.dismiss).not.toHaveBeenCalled();
    expect(r.dismissTo.mock.calls.length + r.replace.mock.calls.length).toBe(1);
  });
});
