// зачем (координатор 24.10, Р2 подтверждён Сверкой flags/r2_home_top.png): на тёмных сценах — «Сцене» Главной, «Сегодня», обложке
// Сезона — значки строки состояния светлые, пока сцена под часами и экран виден; уход — снятие своего входа, бар темы возвращается.
import { act, renderHook } from '@testing-library/react-native';
import { sceneStatusBarStack, useSceneStatusBar, reportSeasonCoverTop, useSeasonCoverTop } from '../hooks/use_scene_status_bar';
import { readSource } from './helpers/read_source';

describe('светлая строка состояния на тёмных сценах', () => {
  it('вход в стек строки состояния — пока условие верно; снятие — при уходе', async () => {
    const push = jest.spyOn(sceneStatusBarStack, 'push').mockImplementation(() => ({ entry: 1 }));
    const pop = jest.spyOn(sceneStatusBarStack, 'pop').mockImplementation(() => undefined);
    const hook = await renderHook(({ on, top }: { on: boolean; top: string | null }) => useSceneStatusBar('home', on, 'test', top), { initialProps: { on: false, top: null as string | null } });
    expect(push).not.toHaveBeenCalled();
    await act(async () => { hook.rerender({ on: true, top: null }); });
    // зачем (замечание 4 · ТЕМЫ): верха нет — светлые значки; светлый верх сцены — тёмные
    expect(push).toHaveBeenLastCalledWith('light-content');
    await act(async () => { hook.rerender({ on: true, top: '#F4F1FF' }); });
    expect(push).toHaveBeenLastCalledWith('dark-content');
    await act(async () => { hook.rerender({ on: true, top: '#1B1340' }); });
    expect(push).toHaveBeenLastCalledWith('light-content');
    await act(async () => { hook.rerender({ on: false, top: null }); });
    expect(pop).toHaveBeenCalledWith({ entry: 1 });
    push.mockRestore();
    pop.mockRestore();
  });

  it('обложка Сезона сообщает «у верха» оболочке', async () => {
    const hook = await renderHook(() => useSeasonCoverTop());
    await act(async () => { reportSeasonCoverTop({ mounted: true, atTop: false }); });
    expect(hook.result.current).toEqual({ mounted: true, atTop: false });
    await act(async () => { reportSeasonCoverTop({ mounted: false, atTop: true }); });
    expect(hook.result.current).toEqual({ mounted: false, atTop: true });
  });

  it('подключено: Главная и Сезон — в оболочке вкладок, «Сегодня» — на своём экране', () => {
    const tabs = readSource('app/(tabs)/_layout.tsx');
    expect(tabs).toContain("useSceneStatusBar('home', tabsFocused && HOME_SCENE_V2_ENABLED && visualIdx === 0 && homeSceneTint !== null && homeSceneAtTop, 'home_scene_under_clock', homeSceneTint);");
    expect(tabs).toContain("useSceneStatusBar('season', tabsFocused && SEASON_SCENE_V2_ENABLED && visualIdx === 1 && seasonCover.mounted && seasonCover.atTop,");
    const today = readSource('components/home/v2/today_scene/TodaySceneView.tsx');
    expect(today).toContain("useSceneStatusBar('today', focused && sceneAtTop, 'today_scene_under_clock', tokens.sceneTop);");
    expect(today).toContain('onScroll={onSceneScroll} scrollEventThrottle={32}');
    expect(readSource('components/learning-v2/season/SeasonCourseView.tsx')).toContain('reportSeasonCoverTop({ mounted: true, atTop: coverAtTop });');
  });
});
