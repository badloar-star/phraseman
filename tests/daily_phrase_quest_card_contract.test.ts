import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('DailyPhraseCard quest contract', () => {
  const source = read('components/DailyPhraseCard.tsx');

  it('opens daily phrase details as a meaning quiz before explanation', () => {
    expect(source).toContain('buildDailyPhraseQuestOptions');
    expect(source).toContain('questAnswered');
    expect(source).toContain('Що це означає?');
    expect(source).toContain('questOptions.map');
  });

  it('removes answer options after the answer and animates into explanation', () => {
    expect(source).toContain('{!questAnswered && (');
    expect(source).toContain('showQuestExplanation');
    expect(source).toContain('explanationAnim');
    expect(source).toContain('Animated.timing(explanationAnim');
    expect(source).toContain('{showQuestExplanation && (');
  });

  it('awards XP only through the quest helper and shakes on a wrong answer', () => {
    expect(source).toContain('awardDailyPhraseQuestXpOnce');
    expect(source).toContain('runWrongAnswerShake');
    expect(source).toContain('Animated.sequence');
  });

  it('shows an animated success state for a correct daily phrase answer', () => {
    expect(source).toContain('successAnim');
    expect(source).toContain('runCorrectAnswerAnimation');
    expect(source).toContain('successOverlay');
    expect(source).toContain('questResultPill');
    expect(source.indexOf('setQuestXpDelta(DAILY_PHRASE_QUEST_XP)')).toBeLessThan(
      source.indexOf('runCorrectAnswerAnimation()'),
    );
  });

  it('skips the quiz after any daily phrase answer was already recorded', () => {
    expect(source).toContain('hasDailyPhraseQuestAnswered');
    expect(source).toContain('markDailyPhraseQuestAnswered');
    expect(source).toContain('questPreviouslyAnswered');
    expect(source).toContain('setQuestPreviouslyAnswered(true)');
    expect(source).toContain('selectedQuestCorrect && !questPreviouslyAnswered');
  });

  it('hides the pronunciation button until the explanation is visible', () => {
    expect(source).toContain('{showQuestExplanation && (');
    expect(source.indexOf('{showQuestExplanation && (')).toBeLessThan(
      source.indexOf('name="volume-high"'),
    );
  });

  it('does not show the AI explain button inside the daily phrase quest flow', () => {
    expect(source).not.toContain('<ExplainButton');
  });

  it('uses tonal surfaces for the modal sheet internals without replacing the themed daily plaque chrome', () => {
    expect(source).toContain('TonalSurface');
    expect(source).toContain('dailyPhraseChromeFor(themeMode)');
    expect(source).toContain('radius={24} tone="raised"');
    expect(source).toContain('radius={18} tone="subtle"');
    expect(source).toContain('radius={16} tone="subtle"');
  });

  it('renders a stable compact action card on the home plaque', () => {
    expect(source).toContain('const homeActionLabel = triLang(lang, {');
    expect(source).toContain('{homeActionLabel}');
    expect(source).toContain('backgroundColor: chrome.actionBg');
    expect(source).toContain('color={chrome.actionText}');
    expect(source).toContain('styles.homeAdditionalActionText, { color: chrome.actionText');
    expect(source).not.toContain('cardQuestAnswered');
    expect(source).not.toContain('questTeaser');
    expect(source).not.toContain('homeAdditionalMeaning');
  });

  it('loads the daily phrase as a one-shot value instead of keeping a live listener open', () => {
    expect(source).toContain('getTodayPhraseForTarget(studyTarget, lang)');
    expect(source).not.toContain('subscribeTodayPhraseForTarget');
  });

  it('preserves every localized literal, explanation, and example value in the detail and save flows', () => {
    const saveStart = source.indexOf('<AddToFlashcard');
    const saveBlock = source.slice(saveStart, source.indexOf('/>', saveStart) + 2);

    expect(source).toContain('{phraseCopy.literal}');
    expect(source).toContain('{phraseCopy.meaning}');
    expect(source).toContain('{phraseCopy.text}');
    expect(saveBlock).toContain('literalRu={phrase.literal}');
    expect(saveBlock).toContain('literalUk={phrase.literal_uk}');
    expect(saveBlock).toContain('literalEs={phrase.literal_es}');
    expect(saveBlock).toContain('explanationRu={phrase.meaning}');
    expect(saveBlock).toContain('explanationUk={phrase.meaning_uk}');
    expect(saveBlock).toContain('explanationEs={phrase.meaning_es}');
    expect(saveBlock).toContain('exampleRu={phrase.text}');
    expect(saveBlock).toContain('exampleUk={phrase.text_uk}');
    expect(saveBlock).toContain('exampleEs={phrase.text_es}');
    expect(source).not.toContain("declare module '../app/daily_phrase_system'");
    expect(source).not.toContain('example_ru?:');
  });

  it('numbers each quest option and presents the explanation as a dedicated story rail', () => {
    expect(source).toContain('questOptions.map((option, optionIndex) =>');
    expect(source).toContain('styles.optionMarker');
    expect(source).toContain('{optionIndex + 1}');
    expect(source).toContain('accessibilityLabel={`${optionIndex + 1}. ${option.text}`}');
    expect(source).toContain('styles.explanationRail');
  });
});
