import fs from 'node:fs';
import path from 'node:path';
import { arenaQuestionViewportLayout } from '../modules/arena/question_layout';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('short-window action reachability', () => {
  it.each([480, 568, 640, 667])('uses compact task spacing at %i dp without requiring enlarged text', height => {
    expect(arenaQuestionViewportLayout(height, 1).compactHeight).toBe(true);
  });

  it('bounds the choices container so its scrolling can actually shrink', () => {
    const source = read('components/arena/ArenaQuestion.tsx');
    expect(source).toMatch(/body:\s*\{[^}]*flexShrink:\s*1/);
    expect(source).toMatch(/body:\s*\{[^}]*minHeight:\s*0/);
    // The prompt must scroll too: at 2x text it can exceed the entire viewport.
    const choices = source.slice(source.indexOf('const selected = choice !== null;'));
    expect(choices.indexOf('<ScrollView')).toBeLessThan(choices.indexOf('role="prompt"'));
    expect(choices.indexOf('</ScrollView>')).toBeLessThan(choices.indexOf('<V2Cta'));
  });

  it('keeps the builder submit action outside the scrolling tiles', () => {
    const source = read('components/arena/ArenaQuestion.tsx');
    const builder = source.slice(source.indexOf("if (view.type === 'builder')"), source.indexOf('const selected = choice !== null;'));
    expect(builder.lastIndexOf('</ScrollView>')).toBeLessThan(builder.indexOf('<V2Cta'));
  });

  it('keeps the Arena task host stable across viewport breakpoints', () => {
    const source = read('components/arena/ArenaScreen.tsx');
    expect(source).toContain('scroll || allowShortViewportScroll ?');
    expect(source).toContain('scrollEnabled={scroll || pageScrollFallback}');
  });

  it('gives the entire season gift panel one virtualized scroll owner', () => {
    const source = read('components/SeasonGiftModal.tsx');
    expect(source.match(/<FlatList\b/g)).toHaveLength(1);
    expect(source).toContain('ListHeaderComponent=');
    expect(source).toContain('ListFooterComponent=');
    expect(source).toContain('scrollContent={false}');
  });

  it('bounds error reporting against the keyboard viewport instead of a minimum screen height', () => {
    const source = read('components/ReportErrorButton.tsx');
    expect(source).not.toContain("Dimensions.get('window')");
    expect(source).toContain("maxHeight: '100%'");
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
  });

  it('provides overflow recovery in both remaining flashcard training routes', () => {
    for (const file of ['flashcards_blitz_session', 'flashcards_speaking_session']) {
      const source = read(`app/${file}.tsx`);
      expect(source).toContain('<ScrollView');
      expect(source).toContain('contentContainerStyle=');
      expect(source).not.toContain('numberOfLines=');
    }
  });

  it('shows complete Arena answer text instead of replacing it with an ellipsis', () => {
    const source = read('components/arena/ArenaQuestion.tsx');
    expect(source).not.toContain('numberOfLines=');
    expect(source).not.toContain('ellipsizeMode=');
    expect(read('app/flashcards/PhraseCard.tsx')).not.toContain('numberOfLines=');
  });

  it('gives ordinary hybrid alerts a scroll fallback while preserving self-scrolling forms', () => {
    const source = read('components/modal_fx/HybridAlertShell.tsx');
    expect(source).toContain('<ScrollView');
    expect(source).toContain('fillAvailableHeight');
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
  });

  it.each([
    'components/celebration/BoonActivatedHybrid.tsx',
    'components/celebration/BoonChestHybrid.tsx',
    'components/celebration/ReferralFriendRewardHybrid.tsx',
    'components/friends_together/FriendLevelUpModal.tsx',
    'components/WelcomeGiftModal.tsx',
    'components/LevelSpinRewardModal.tsx',
    'components/PersonalAdminMessageModal.tsx',
    'components/GlobalBroadcastModal.tsx',
    'components/league/LeagueChestTeaserModal.tsx',
  ])('keeps the complete reward/message reachable in %s', file => {
    const source = read(file);
    expect(source).toContain('<ScrollView');
    expect(source).toContain("maxHeight: '100%'");
  });

  it.each(['BoonActivatedModal', 'BoonChestModal', 'UpdateModal', 'AccountSwitchRecoveryScreen', 'PhoneStateRecoveryScreen'])(
    'uses safe-area page overflow in %s', file => {
      expect(read(`components/${file}.tsx`)).toContain('<ResponsiveModalScrollView');
    },
  );

  it.each(['personal_plan_task_done', 'personal_plan_exercise_transition', 'personal_plan_quiz'])(
    'retains an overflow route for legacy plan screen %s', file => {
      expect(read(`app/${file}.tsx`)).toContain('<ScrollView');
    },
  );
});
