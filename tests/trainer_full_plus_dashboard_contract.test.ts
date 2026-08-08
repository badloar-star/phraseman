import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'trainer.tsx'), 'utf8');

describe('Practice dashboard full Plus contract', () => {
  it('shows the shared gold badges only after the current target is verified free', () => {
    expect(source).toContain("import PlusBadge from '../components/PlusBadge';");
    expect(source).toContain('const showPlusBadges = verifiedPremiumAccess?.studyTarget === studyTarget');
    expect(source).toContain('&& verifiedPremiumAccess.hasPremium === false;');
    expect(source).toContain('testID="trainer-hero-plus-badge"');
    expect(source).toContain('testID={`trainer-${row.key}-plus-badge`}');
    expect(source).toContain('testID="trainer-weak-spot-plus-badge"');
    expect(source).toContain('showPlusBadge={showPlusBadges}');
    expect(source).toContain('showPlusBadge: boolean;');
    expect(source).toContain('{showPlusBadge ? (');
    expect(source.match(/\{showPlusBadges \? \(/g)).toHaveLength(2);
    expect(source).not.toContain('testID="trainer-start-plus-badge"');
    expect(source).not.toContain('testID="trainer-rhythm-plus-badge"');
    expect(source).not.toContain('{!hasPremium ? (');
    expect(source).not.toContain('{!hasPremium ? <PlusBadge');
  });

  it('places remaining Plus badges outside their card content at the outer corner', () => {
    expect(source).toContain('style={styles.heroShell}');
    expect(source).toContain('style={styles.heroPlusBadge}');
    expect(source).toContain('style={styles.queueRowShell}');
    expect(source).toContain('style={styles.queuePlusBadge}');
    expect(source).toContain('style={styles.weakPlusBadge}');
    expect(source).not.toContain('styles.weakCardShell');
    expect(source).not.toContain('style={styles.primaryPlusBadge}');
    expect(source).not.toContain('style={styles.rhythmPlusBadge}');

    for (const styleName of ['heroPlusBadge', 'queuePlusBadge', 'weakPlusBadge']) {
      expect(source).toMatch(new RegExp(`${styleName}: \\{ position: 'absolute'`));
      expect(source).toMatch(new RegExp(`${styleName}: \\{ position: 'absolute', top: -`));
    }
  });

  it('gates weak spots and empty queues through the same Plus paywall', () => {
    expect(source).toContain('const openTrainerPaywall = useCallback');
    expect(source).toContain("params: { context: 'trainer_limit' }");
    expect(source).toContain('const openTrainerPlusDestination = useCallback');
    expect(source).toContain('access = await getVerifiedPremiumStatus();');
    expect(source).not.toContain('access = access || await getVerifiedPremiumStatus();');
    expect(source).toContain('catch {\n            openTrainerPaywall();');
    expect(source).toContain('<PlusBadge themeMode={themeMode} size="xs" testID="trainer-weak-spot-plus-badge" />');
    expect(source).toContain('onPlusPress={openTrainerPlusDestination}');
    expect(source).toContain('if (row.count <= 0) {');
    expect(source).toContain('if (total <= 0 || !practiceHallRoute) {');
    expect(source).toContain('await openTrainerPlusDestination(() => {});');
    expect(source).not.toContain('row.count <= 0 && hasPremium');
    expect(source).not.toContain('(total <= 0 || !practiceHallRoute) && hasPremium');
  });

  it('never authorizes paid UI from a cached positive entitlement', () => {
    expect(source).not.toContain('useState(() => prefetchedPractice?.hasPremium ?? false)');
    expect(source).toContain('const hasPremium = verifiedPremiumAccess?.studyTarget === studyTarget');
    expect(source).toContain('setVerifiedPremiumAccess(null);');
    expect(source).toContain('setVerifiedPremiumAccess({ studyTarget, hasPremium: snapshot.hasPremium });');
    expect(source).toContain('const openWeakSpot = () => {\n        hapticTap();\n        onPlusPress(openWeakSpotDestination);\n    };');
    expect(source).not.toContain('openWeakSpotDestination();\n    };');
  });
});
