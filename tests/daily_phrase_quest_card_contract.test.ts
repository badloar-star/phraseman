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

  it('hides the meaning on the home plaque until the quest is answered', () => {
    // The homeAdditional plaque must gate the translation behind cardQuestAnswered
    // so the daily quiz keeps its "guess the meaning" point.
    expect(source).toContain('cardQuestAnswered');
    expect(source).toContain('hasDailyPhraseQuestAnswered({ phraseId, date })');
    // Before answering: a teaser CTA, not the meaning.
    expect(source).toContain('questTeaser');
    // The meaning text is rendered only in the answered branch.
    const answeredIdx = source.indexOf('cardQuestAnswered ? (');
    const meaningIdx = source.indexOf('{homeAdditionalMeaning}');
    const teaserIdx = source.indexOf('{questTeaser}');
    expect(answeredIdx).toBeGreaterThan(-1);
    expect(answeredIdx).toBeLessThan(meaningIdx);
    expect(meaningIdx).toBeLessThan(teaserIdx);
  });

  it('loads the daily phrase as a one-shot value instead of keeping a live listener open', () => {
    expect(source).toContain('getTodayPhraseForTarget(studyTarget)');
    expect(source).not.toContain('subscribeTodayPhraseForTarget');
  });
});
