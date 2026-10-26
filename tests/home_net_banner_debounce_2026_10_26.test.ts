import {
  NET_BANNER_UNREACHABLE_MS,
  homeNetBannerStep,
  homeSceneOfflineVerdict,
  type NetBannerSnapshot,
} from '../components/home/v2/scene/home_net_banner_step';

// зачем (владелец 26.10, скрин эмулятора): «Нет сети» на Главной при живой сети — «вот этого экрана не надо». Строка только при
// подтверждённом отсутствии сети: connected=false сразу, reachable=false дольше 5 с; null/неизвестно = сеть есть; возврат — сразу.

const wifi = (isConnected: boolean | null, isInternetReachable: boolean | null | undefined): NetBannerSnapshot =>
  ({ isConnected, isInternetReachable, type: 'wifi' } as NetBannerSnapshot);

describe('«Нет сети» на Главной — только при подтверждённом офлайне', () => {
  it('null / неизвестно — сеть есть, перепроверки нет', () => {
    for (const s of [wifi(null, null), wifi(true, null), wifi(true, undefined), wifi(null, undefined)]) {
      const step = homeNetBannerStep(null, s, 1_000);
      expect([s, step.offline, step.recheckInMs, step.unreachableSinceMs]).toEqual([s, false, null, null]);
    }
  });

  it('connected=true, reachable=true — сеть есть', () => {
    expect(homeNetBannerStep(null, wifi(true, true), 0)).toMatchObject({ offline: false, recheckInMs: null, unreachableSinceMs: null });
  });

  it('connected=false — нет сети сразу', () => {
    const step = homeNetBannerStep(null, { isConnected: false, isInternetReachable: false, type: 'none' } as NetBannerSnapshot, 0);
    expect(step.offline).toBe(true);
    expect(step.reason).toMatch(/^not_connected /);
  });

  it('reachable=false при живом подключении: меньше 5 с — строки нет и назначена перепроверка; 5 с и больше — строка', () => {
    const t0 = 10_000;
    const first = homeNetBannerStep(null, wifi(true, false), t0);
    expect(first).toMatchObject({ offline: false, unreachableSinceMs: t0, recheckInMs: NET_BANNER_UNREACHABLE_MS });
    const mid = homeNetBannerStep(first.unreachableSinceMs, wifi(true, false), t0 + 4_999);
    expect(mid).toMatchObject({ offline: false, unreachableSinceMs: t0, recheckInMs: 1 });
    const held = homeNetBannerStep(mid.unreachableSinceMs, wifi(true, false), t0 + NET_BANNER_UNREACHABLE_MS);
    expect(held).toMatchObject({ offline: true, unreachableSinceMs: t0, recheckInMs: null });
    expect(held.reason).toMatch(/^unreachable_held held_ms=5000 /);
  });

  it('возврат сети — строка уходит сразу и отсчёт сбрасывается', () => {
    const back = homeNetBannerStep(0, wifi(true, true), NET_BANNER_UNREACHABLE_MS * 3);
    expect(back).toMatchObject({ offline: false, unreachableSinceMs: null, recheckInMs: null });
    const unknownBack = homeNetBannerStep(0, wifi(true, null), NET_BANNER_UNREACHABLE_MS * 3);
    expect(unknownBack).toMatchObject({ offline: false, unreachableSinceMs: null });
  });

  it('дребезг false/true/false — время «недоступно» не копится, строки нет', () => {
    let since: number | null = null;
    const seen: boolean[] = [];
    // Каждые 3 с проба мигает: 0 false, 3 true, 6 false, 9 true, 12 false — ни один провал не держится 5 с.
    for (const [t, reach] of [[0, false], [3_000, true], [6_000, false], [9_000, true], [12_000, false], [14_000, false]] as const) {
      const step = homeNetBannerStep(since, wifi(true, reach), t);
      since = step.unreachableSinceMs;
      seen.push(step.offline);
    }
    expect(seen).toEqual([false, false, false, false, false, false]);
    // Тот же последний провал (с 12 с) после 5 с уже показывает строку.
    expect(homeNetBannerStep(since, wifi(true, false), 17_000).offline).toBe(true);
  });

  it('мгновенное решение по одному снимку: reachable=false само по себе строку не включает', () => {
    expect(homeSceneOfflineVerdict(wifi(true, false)).offline).toBe(false);
    expect(homeSceneOfflineVerdict({ isConnected: false, isInternetReachable: null, type: 'none' } as NetBannerSnapshot).offline).toBe(true);
  });
});
