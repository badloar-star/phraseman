const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

test('every owner-approved illustration is mounted from a real user flow', () => {
  const flows = [
    ['cards_hub', 'app/flashcards/FlashcardsHubScreen.tsx', "id=\"cards_hub_first_visit\""],
    ['statistics', 'app/streak_stats.tsx', "id=\"statistics_first_visit\""],
    ['daily_phrase', 'components/DailyPhraseCard.tsx', "'daily_phrase_first_visit'"],
    ['videos', 'app/lingman_videos.tsx', "id=\"videos_first_visit\""],
    ['friends', 'app/(tabs)/friends.tsx', "id=\"friends_first_visit\""],
    ['arena', 'components/arena/ArenaHubSurface.tsx', "'arena_first_visit'"],
    ['league', 'app/club_screen.tsx', 'LEAGUE_RULES_INTRO_ID'],
    ['cards_swipe', 'app/flashcards_swipe.tsx', "'cards_swipe_help'"],
    ['training_listening', 'app/flashcards_training_setup.tsx', 'id={`training_${mode}_first_visit`}'],
    ['training_speaking', 'app/flashcards_training_setup.tsx', 'id={`training_${mode}_first_visit`}'],
    ['training_blitz', 'app/flashcards_training_setup.tsx', 'id={`training_${mode}_first_visit`}'],
    ['ai_dialog', 'components/feature_intro/DialogueComicStage.tsx', "'ai_dialog'"],
    ['mistake_practice', 'components/mistake-practice/MistakePracticeSetupSheet.tsx', 'art="mistake_practice"'],
  ];

  for (const [art, file, marker] of flows) {
    assert.ok(read(file).includes(marker), `${art} must be mounted from ${file}`);
  }
});

test('listening training has its own registered first-visit definition', () => {
  const trainingCopy = read('app/feature_intro_training_copy.ts');

  assert.match(trainingCopy, /id: 'training_listening_first_visit'/u);
  assert.match(trainingCopy, /art: 'training_listening'/u);
});

test('new profile, ideas and spin intros are mounted at their real entry screens', () => {
  const home = read('app/(tabs)/home.tsx');
  const ideas = read('app/ideas_catalog.tsx');
  const spin = read('app/level_reward_spin.tsx');

  assert.match(home, /setProfileIntroRequested\(true\)/u);
  assert.match(home, /id="profile_card_first_visit"/u);
  assert.match(ideas, /id="ideas_first_visit"/u);
  assert.match(spin, /id="spin_first_visit"/u);
});
