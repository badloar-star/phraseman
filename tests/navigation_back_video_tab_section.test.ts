// зачем (Сверка 06:10, BUG_video_back_to_channel_0609.png): «назад» из плейлиста, открытого из вкладки «Видео», обязан
// вернуть во вкладку «Видео», а не открывать новый экран канала /lingman_videos. Плюс — поведение «назад» в других
// разделах не меняется (условие координатора).
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

function makeRouter(): RouterStub {
  return {
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => false),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissTo: jest.fn(),
    replace: jest.fn(),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe.each(['/video', '/(tabs)/video'])('video tab %s → playlist → back', (tabPath) => {
  it('returns to the video tab, not to a new /lingman_videos screen', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath(tabPath);
    navigation.rememberNavigationPath('/lingman_playlist?playlistId=PL1');

    navigation.safeRouterBack(router, navigation.navigationFallbackForPath('/lingman_playlist') as any);

    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo.mock.calls[0][0]).toBe(tabPath);
  });
});

describe('back in other sections is unchanged', () => {
  it('/lingman_videos → playlist → back returns to /lingman_videos', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath('/lingman_videos');
    navigation.rememberNavigationPath('/lingman_playlist?playlistId=PL1');

    navigation.safeRouterBack(router, navigation.navigationFallbackForPath('/lingman_playlist') as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/lingman_videos');
  });

  // R59 (Макеты 15.10): запасной путь раздела роликов — вкладка «Видео», а не отдельный /lingman_videos без таббара.
  it('home → playlist (another section) → back goes to the Video tab fallback, the home branch does not resurrect', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath('/(tabs)/home');
    navigation.rememberNavigationPath('/lingman_playlist?playlistId=PL1');

    navigation.safeRouterBack(router, navigation.navigationFallbackForPath('/lingman_playlist') as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/video');
  });

  it('flashcards root → child → back returns to the flashcards root', () => {
    const navigation = loadNavigationBack();
    const router = makeRouter();
    navigation.rememberNavigationPath('/flashcards_packs');
    navigation.rememberNavigationPath('/flashcards_collection');

    navigation.safeRouterBack(router, navigation.navigationFallbackForPath('/flashcards_collection') as any);

    expect(router.dismissTo).toHaveBeenCalledWith('/flashcards_packs');
  });
});
