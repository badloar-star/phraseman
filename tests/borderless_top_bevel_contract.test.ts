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
  it('keeps club section containers tonal instead of top-beveled', () => {
    const clubScreen = readSource('app/club_screen.tsx');

    expectNoDecorativeTopBevelAround(clubScreen, 'showEmptyParticipants ?');
  });

  it('keeps friend list cards tonal while preserving semantic activity signals', () => {
    const friends = readSource('app/(tabs)/friends.tsx');

    // Лента активности (с её «вехами» на верхнем бевеле) удалена 2026-08-16 —
    // проверяем строки друзей, заявки, квест-модалки и карточку квеста.
    expectNoDecorativeTopBevel(sliceBetween(friends, 'function FriendRow', 'function RequestRow'));
    expectNoDecorativeTopBevel(sliceBetween(friends, 'function RequestRow', '// ── Friend quest modals'));
    expectNoDecorativeTopBevel(sliceBetween(friends, '// ── Friend quest modals', '// ── Add Friend Modal'));
    expectNoDecorativeTopBevel(sliceBetween(friends, 'testID="friend-quest-card"', '<FriendQuestStartedModal'));
  });

  it('keeps diagnostic, referral, and drill panels tonal', () => {
    const diagnostic = readSource('app/diagnostic_test.tsx');
    const referrals = readSource('app/referrals.tsx');
    const prepositionDrill = readSource('app/preposition_drill.tsx');

    expectNoDecorativeTopBevelAround(diagnostic, 's.diagnostic.prevResult');
    expectNoDecorativeTopBevelAround(diagnostic, 's.diagnostic.correct');
    expectNoDecorativeTopBevel(sliceBetween(referrals, 'testID={`referrals-row-', '<View style={{ flexDirection'));
    // зачем: блок «Твои приглашения» (people-outline) схлопнут в единый экран —
    // тональность проверяем на карточке кода.
    expectNoDecorativeTopBevelAround(referrals, 'testID="referrals-my-code-card"');
    expectNoDecorativeTopBevelAround(prepositionDrill, '{subtitle}');
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
      .filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`))
      // GlassSurface owns the opt-in bevel primitive; this contract forbids
      // reintroducing that signature directly in product surfaces.
      .filter((file) => path.relative(ROOT, file) !== path.join('components', 'GlassSurface.tsx'));
    const offenders = files.filter((file) => readSource(path.relative(ROOT, file)).includes('borderTopColor: glassFill(t.accent, 0.14)'));

    expect(offenders.map((file) => path.relative(ROOT, file))).toEqual([]);
  });
});
