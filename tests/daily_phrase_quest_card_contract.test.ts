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

  it('lets live home additional text expand without raw truncation', () => {
    const liveHomeBranchStart = source.indexOf('{homeAdditional ? (');
    const liveHomeBranch = source.slice(
      liveHomeBranchStart,
      source.indexOf('            ) : (', liveHomeBranchStart),
    );

    expect(liveHomeBranchStart).toBeGreaterThan(-1);
    expect(liveHomeBranch).not.toContain('numberOfLines');
    expect(liveHomeBranch).not.toContain('adjustsFontSizeToFit');
  });

  it('scales the home additional kicker line height with its effective font size', () => {
    expect(source).toContain('const homeKickerFontSize = Math.max(12, f.caption);');
    expect(source).toContain('fontSize: homeKickerFontSize');
    expect(source).toContain('lineHeight: Math.round(homeKickerFontSize * 1.3)');

    const kickerStyleStart = source.indexOf('homeAdditionalKicker: {');
    const kickerStyle = source.slice(kickerStyleStart, source.indexOf('  },', kickerStyleStart));
    expect(kickerStyle).not.toContain('lineHeight:');
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

  it('uses one-shot native-driver motion that respects reduced-motion preferences', () => {
    expect(source).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion'");
    expect(source).toContain('const reduceMotion = useReduceMotion();');
    expect(source).toContain('const modalEntranceAnim = useRef(new Animated.Value(0)).current;');
    expect(source).toContain('useNativeDriver: true');
    expect(source).toContain('if (reduceMotion)');
    expect(source).not.toContain('Animated.loop');
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('setTimeout');
  });

  it('starts the entrance only for a closed-to-open modal transition', () => {
    const entranceEffect = source.slice(
      source.indexOf('const wasDetailsVisibleRef'),
      source.indexOf('useEffect(() => {\n    if (!dailyPhraseGateOpen', source.indexOf('const wasDetailsVisibleRef')),
    );

    expect(entranceEffect).toContain('const opened = detailsVisible && !wasDetailsVisibleRef.current;');
    expect(entranceEffect).toContain('wasDetailsVisibleRef.current = detailsVisible;');
    expect(entranceEffect).toContain('if (!opened) return;');
    expect(entranceEffect).toContain('if (reduceMotion)');
    expect(entranceEffect).toContain('duration: 220');
  });

  it('settles active motion immediately when reduced motion changes live', () => {
    const settleEffectStart = source.indexOf('useEffect(() => {\n    if (!reduceMotion) return;');
    const settleEffect = source.slice(settleEffectStart, source.indexOf('  }, [', settleEffectStart));

    expect(settleEffect).toContain('modalEntranceAnim.stopAnimation();');
    expect(settleEffect).toContain('modalEntranceAnim.setValue(detailsVisible ? 1 : 0);');
    expect(settleEffect).toContain('shakeAnim.stopAnimation();');
    expect(settleEffect).toContain('shakeAnim.setValue(0);');
    expect(settleEffect).toContain('explanationAnim.stopAnimation();');
    expect(settleEffect).toContain('explanationAnim.setValue(questAnswered || showQuestExplanation ? 1 : 0);');
    expect(settleEffect).toContain('successAnim.stopAnimation();');
    expect(settleEffect).toContain('successAnim.setValue(questAnswered && selectedQuestCorrect ? 1 : 0);');
  });

  it('settles each feedback branch and close cleanup without replaying motion', () => {
    const wrongAnswer = source.slice(source.indexOf('const runWrongAnswerShake'), source.indexOf('const runCorrectAnswerAnimation'));
    const correctAnswer = source.slice(source.indexOf('const runCorrectAnswerAnimation'), source.indexOf('const resetQuest'));
    const explanation = source.slice(source.indexOf('const revealQuestExplanation'), source.indexOf('const openDetails'));
    const close = source.slice(source.indexOf('const closeDetails'), source.indexOf('const handleQuestOptionPress'));
    const reset = source.slice(source.indexOf('const resetQuest'), source.indexOf('const revealQuestExplanation'));

    expect(wrongAnswer).toContain('if (reduceMotion)');
    expect(wrongAnswer).toContain('shakeAnim.setValue(0);');
    expect(correctAnswer).toContain('if (reduceMotion)');
    expect(correctAnswer).toContain('successAnim.setValue(1);');
    expect(explanation).toContain('if (reduceMotion)');
    expect(explanation).toContain('explanationAnim.setValue(1);');
    expect(close).toContain('modalEntranceAnim.stopAnimation();');
    expect(reset).toContain('shakeAnim.stopAnimation();');
    expect(reset).toContain('explanationAnim.stopAnimation();');
    expect(reset).toContain('successAnim.stopAnimation();');
  });
});
