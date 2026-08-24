import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Arena hub surface C', () => {
  it('has one central Play action and a top-right overflow', () => {
    const source = read('components/arena/ArenaHubSurface.tsx');
    expect(source).toContain('ArenaHubOverflowSheet');
    expect(source).toContain('ArenaModeSheet');
    expect(source).toContain('arenaMatchButtonAction');
    expect(source).toContain('testID="arena-hub-play"');
    expect(source).toContain('testID="arena-hub-overflow"');
    expect(source).not.toContain('<ArenaFeatureRow accent icon="play"');
  });

  it('keeps enabled mode rows free of explanatory subtitles', () => {
    const hub = read('components/arena/ArenaHubSurface.tsx');
    expect(hub).toContain("body: enabled");
    expect(hub).toContain('? undefined');
    const sheet = read('components/arena/ArenaModeSheet.tsx');
    expect(sheet).toContain('option.body ?');
  });

  it('preserves the offline-first warm-data lifecycle', () => {
    const source = read('components/arena/ArenaHubSurface.tsx');
    for (const marker of [
      'arenaPeekHomeWarm', 'arenaLoadHomeWarm', 'arenaRememberHomeWarm',
      'createArenaHubHydrationController', 'arenaFlushOutbox', 'useRuntimeActive(ownerVisible)',
    ]) expect(source).toContain(marker);
    expect(source).not.toContain('setInterval(');
  });

  it('does not present onboarding or record an open while the tab is only premounted', () => {
    const source = read('components/arena/ArenaHubSurface.tsx');
    expect(source).toContain("useFeatureIntro('arena_first_visit', active)");
    expect(source).toContain('if (!active || telemetrySentRef.current) return;');
  });

  it('keeps friend standings behind overflow destinations', () => {
    const hub = read('components/arena/ArenaHubSurface.tsx');
    const tops = read('app/arena_tops.tsx');
    expect(hub).not.toContain('arenaV2FriendsBoard');
    expect(tops).toContain('arenaV2FriendsBoard');
  });

  /**
   * Владелец (2026-08-23): отдельного спина Арены больше нет — в приложении
   * один спин, общий каталог подарков. Кошелёк остался только магазином
   * косметики за руны, забирать спин из него нельзя.
   */
  it('keeps the separate Arena spin claim deleted from the wallet', () => {
    const wallet = read('app/arena_star_wallet.tsx');
    expect(wallet).not.toContain('arenaV2SpinClaim');
    expect(wallet).not.toContain('arenaV2SpinStatus');
  });
});
