import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Arena redesign audit regressions', () => {
  it('uses one accessible rank transition with a real close action', () => {
    const results = read('app/arena_results.tsx');
    const motion = read('components/arena/ArenaRankHybrid.tsx');

    expect(results).toContain('<ArenaRankChangeHybrid');
    expect(results).not.toContain('<ArenaTierUpHybrid');
    expect(results).not.toContain('<ArenaTierDownHybrid');
    expect(results).not.toContain('<ArenaRankStepHybrid');
    expect(motion).toContain('accessibilityViewIsModal');
    expect(motion).toContain('accessibilityLiveRegion="assertive"');
    expect(motion).toContain('accessibilityRole="button"');
    expect(motion).toContain('onPress={onDone}');
    expect(motion).toContain('transition.before');
    expect(motion).toContain('transition.after');
  });

  it('hides an already-open Arena intro when the tab stops owning the runtime', () => {
    const hook = read('hooks/use_feature_intro.ts');
    expect(hook).toMatch(/if \(!enabled\)\s+setVisible\(false\)/);
  });

  it('uses authoritative profile totals and puts Play before daily content', () => {
    const hub = read('components/arena/ArenaHubSurface.tsx');
    const summary = read('components/arena/ArenaHubSummary.tsx');

    expect(hub).toContain('wins: home?.profile.wins');
    expect(hub).toContain('losses: home?.profile.losses');
    expect(hub).toContain("badge: '8'");
    expect(hub.indexOf('testID="arena-hub-play"')).toBeLessThan(hub.indexOf('<ArenaDailyGoals'));
    // Звёздная лестница (2026-08-23): вместо очков — победы до следующего ранга.
    expect(summary).toContain('winsToNextRank');
    expect(summary).toContain('model.streak');
  });

  it('keeps every matching pair in one shared visual row', () => {
    const question = read('components/arena/ArenaQuestion.tsx');
    const matching = question.slice(
      question.indexOf("if (view.type === 'matching')"),
      question.indexOf("if (view.type === 'builder')"),
    );
    expect(matching).toContain('styles.matchRow');
    expect(matching).toContain('view.right[index]');
    expect(matching).not.toContain('<View style={styles.column}>');
  });

  it('shows a distinguishable friend label and localized tier in Tops', () => {
    const tops = read('app/arena_tops.tsx');
    expect(tops).toContain('friendNameByUid');
    expect(tops).toContain("arenaText(lang, TIER_COPY[view.tierIndex])");
    expect(tops).not.toContain('{ARENA_TIER_KEYS[view.tierIndex]}');
  });

  it('composes a distinct accessibility label for every history row', () => {
    const history = read('app/arena_history.tsx');
    expect(history).toContain('arenaHistoryAccessibilityLabel');
    expect(history).toContain('row.settledAtMs');
  });

  it('retires the private Arena chrome and the obsolete compile-time flag', () => {
    expect(fs.existsSync(path.join(ROOT, 'components/arena/ArenaTabBar.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'components/arena/ArenaHubChrome.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'components/arena/arena_chrome_inset.ts'))).toBe(false);
    expect(read('app/config.ts')).not.toContain('ENABLE_ARENA');
    expect(read('app/_layout.tsx')).not.toContain('ENABLE_ARENA');
  });
});
