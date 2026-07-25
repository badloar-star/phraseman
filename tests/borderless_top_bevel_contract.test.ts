import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function sliceBetween(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function expectNoDecorativeTopBevel(snippet: string): void {
  expect(snippet).not.toContain('borderTopWidth: 1');
  expect(snippet).not.toContain('borderTopWidth:1');
  expect(snippet).not.toContain('borderTopColor: glassFill(t.accent, 0.14)');
  expect(snippet).not.toContain('borderTopColor:glassFill(t.accent, 0.14)');
}

function expectNoDecorativeTopBevelAround(source: string, anchor: string, radius = 520): void {
  const index = source.indexOf(anchor);
  expect(index).toBeGreaterThanOrEqual(0);
  expectNoDecorativeTopBevel(source.slice(Math.max(0, index - radius), index + anchor.length + radius));
}

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('borderless top bevel contract', () => {
  it('keeps arena and club section containers tonal instead of top-beveled', () => {
    const arenaRoom = readSource('app/arena_room.tsx');
    const clubScreen = readSource('app/club_screen.tsx');

    expectNoDecorativeTopBevelAround(arenaRoom, 'testID="arena-room-code-input"');
    expectNoDecorativeTopBevelAround(arenaRoom, 'name="people"');
    expectNoDecorativeTopBevel(sliceBetween(arenaRoom, '{room && (', 'runs.length > 0'));
    expectNoDecorativeTopBevel(sliceBetween(clubScreen, 'showEmptyParticipants ?', 'sortedGroup.map'));
  });

  it('keeps friend list cards tonal while preserving semantic activity signals', () => {
    const friends = readSource('app/(tabs)/friends.tsx');

    expectNoDecorativeTopBevel(sliceBetween(friends, 'function FriendRow', 'function RequestRow'));
    expectNoDecorativeTopBevel(sliceBetween(friends, 'function RequestRow', 'type ActivityFeedSection'));
    expectNoDecorativeTopBevel(sliceBetween(friends, 'testID="friends-activity-digest"', 'activityDigestText'));
    expectNoDecorativeTopBevel(sliceBetween(friends, 'testID="friend-quest-card"', 'visible={friendQuestStarted !== null}'));
    expect(friends).toContain("...(isMilestone ? { borderTopWidth: 1, borderTopColor: color + '55' } : null)");
  });

  it('keeps quiz informational containers tonal without removing locked or selected states', () => {
    const quizzes = readSource('app/(tabs)/quizzes.tsx');

    expectNoDecorativeTopBevel(sliceBetween(quizzes, '!DEV_CONTENT_UNLOCK && !isPremium', '</Reanimated.ScrollView>'));
    expectNoDecorativeTopBevel(sliceBetween(quizzes, 'getXPProgress(totalXP + score)', 'wrongPhrases.length === 0'));
    expectNoDecorativeTopBevel(sliceBetween(quizzes, 'showHardTip && settings.hardMode', 'setHardTipDismissed(true)'));
    expectNoDecorativeTopBevel(sliceBetween(quizzes, 'function FrenchQuizUnavailable', 'copy.cta'));
    expect(quizzes).toContain('borderWidth: 0');
  });

  it('keeps diagnostic, referral, drill, and plan-complete panels tonal', () => {
    const diagnostic = readSource('app/diagnostic_test.tsx');
    const referrals = readSource('app/referrals.tsx');
    const prepositionDrill = readSource('app/preposition_drill.tsx');
    const personalPlanComplete = readSource('app/personal_plan_complete.tsx');

    expectNoDecorativeTopBevelAround(diagnostic, 's.diagnostic.prevResult');
    expectNoDecorativeTopBevelAround(diagnostic, 's.diagnostic.correct');
    expectNoDecorativeTopBevel(sliceBetween(referrals, 'testID={`referrals-row-', '<View style={{ flexDirection'));
    // зачем: блок «Твои приглашения» (people-outline) схлопнут в единый экран —
    // тональность проверяем на карточке кода.
    expectNoDecorativeTopBevelAround(referrals, 'testID="referrals-my-code-card"');
    expectNoDecorativeTopBevelAround(prepositionDrill, '{subtitle}');
    expectNoDecorativeTopBevelAround(personalPlanComplete, 'styles.card');
  });

  it('keeps core flashcard setup and completion panels tonal', () => {
    const flashcardsAudio = readSource('app/flashcards_audio.tsx');
    const flashcardsSwipe = readSource('app/flashcards_swipe.tsx');
    const flashcardsCategoryTiles = readSource('app/flashcards/FlashcardsCategoryTiles.tsx');

    expectNoDecorativeTopBevelAround(flashcardsAudio, 'styles.summaryPanel');
    expectNoDecorativeTopBevelAround(flashcardsAudio, 'styles.sourceRow');
    expectNoDecorativeTopBevelAround(flashcardsAudio, 'styles.donePanel');
    expectNoDecorativeTopBevelAround(flashcardsSwipe, 'styles.heroCard');
    expectNoDecorativeTopBevelAround(flashcardsSwipe, 'styles.sourceRow');
    expectNoDecorativeTopBevelAround(flashcardsSwipe, 'styles.doneBox');
    expectNoDecorativeTopBevelAround(flashcardsSwipe, 'styles.noCardsPanel');
    expectNoDecorativeTopBevelAround(flashcardsCategoryTiles, 'tileW');
  });

  it('does not reintroduce the old accent top-bevel signature in app surfaces', () => {
    const files = ['app', 'components', 'constants', 'hooks', 'modules', 'lib']
      .flatMap((dir) => listSourceFiles(path.join(ROOT, dir)))
      .filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`));
    const offenders = files.filter((file) => readSource(path.relative(ROOT, file)).includes('borderTopColor: glassFill(t.accent, 0.14)'));

    expect(offenders.map((file) => path.relative(ROOT, file))).toEqual([]);
  });
});
