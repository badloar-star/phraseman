import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs
  .readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
  .replace(/\r\n/g, '\n');

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

  it('shows AI explain only after the daily phrase quest explanation is revealed', () => {
    const explanationIdx = source.indexOf('{showQuestExplanation && (');
    const explainButtonIdx = source.indexOf('<ExplainButton');
    expect(explanationIdx).toBeGreaterThan(-1);
    expect(explainButtonIdx).toBeGreaterThan(explanationIdx);
  });

  it('uses tonal surfaces for the modal sheet internals without replacing the themed daily plaque chrome', () => {
    expect(source).toContain('TonalSurface');
    expect(source).toContain('dailyPhraseChromeFor(themeMode)');
    expect(source).toContain('radius={24} tone="raised"');
    expect(source).toContain('radius={18} tone="subtle"');
    expect(source).toContain('radius={16} tone="subtle"');
  });

  it('keeps the whole home phrase card tappable without a separate CTA', () => {
    const liveHomeBranchStart = source.indexOf('{homeAdditional ? (');
    const liveHomeBranch = source.slice(
      liveHomeBranchStart,
      source.indexOf('            ) : (', liveHomeBranchStart),
    );

    expect(liveHomeBranch).not.toContain('homeAdditionalAction');
    expect(source).not.toContain('homeActionLabel');
    expect(source).not.toContain('homeAdditionalActionText');
    expect(source).toContain('accessibilityRole="button"');
    expect(liveHomeBranch).not.toContain('name="arrow-forward"');
    expect(source).not.toContain('cardQuestAnswered');
    expect(source).not.toContain('questTeaser');
    expect(source).not.toContain('homeAdditionalMeaning');
  });

  it('uses a full-width editorial accent with content-driven height', () => {
    const editorialStyleStart = source.indexOf('homeAdditionalEditorial: {');
    const editorialStyle = source.slice(
      editorialStyleStart,
      source.indexOf('  },', editorialStyleStart),
    );
    const homePressableStart = source.indexOf('accessibilityLabel={homeAdditional ?');
    const homePressable = source.slice(
      homePressableStart,
      source.indexOf(
        '<View style={homeAdditional ? styles.homeAdditionalContent',
        homePressableStart,
      ),
    );

    expect(source).toContain('homeAdditional ? styles.homeAdditionalEditorial : styles.plaque');
    expect(homePressable).toContain('!homeAdditional && {');
    expect(homePressable).toContain('{!homeAdditional && (');
    expect(source).toContain('homeAdditional && styles.homeAdditionalCopy');
    expect(source).toMatch(/homeAdditionalContent:\s*\{[\s\S]*?alignItems:\s*'center'/);
    expect(source).toMatch(/homeAdditionalCopy:\s*\{[\s\S]*?alignItems:\s*'center'/);
    expect(source).toMatch(/homeAdditionalKicker:\s*\{[\s\S]*?textAlign:\s*'center'/);
    expect(source).toMatch(/homeAdditionalPhrase:\s*\{[\s\S]*?textAlign:\s*'center'/);
    expect(editorialStyle).toContain("alignSelf: 'stretch'");
    expect(editorialStyle).toContain('marginHorizontal: 8');
    expect(editorialStyle).not.toContain('maxWidth:');
    expect(source).not.toContain('homeAdditionalGhostWrap');
    expect(editorialStyle).not.toContain('minHeight:');
    expect(editorialStyle).not.toContain('backgroundColor:');
    expect(editorialStyle).not.toContain('borderWidth:');
    expect(editorialStyle).not.toContain('shadowOpacity:');
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

  it('uses a finite two-pulse native-driver cue for the complete home card', () => {
    expect(source).toContain('claimDailyPhrasePulseForDay');
    expect(source).toContain('const homePulseScale = useRef(new Animated.Value(1)).current;');
    expect(source).toContain('const homePulseAttemptedDayRef = useRef<string | null>(null);');
    expect(source.match(/toValue: 1\.025/g)).toHaveLength(2);
    expect(source).toContain('transform: [{ scale: homePulseScale }]');
    expect(source).toContain('useNativeDriver: true');
    expect(source).not.toContain('Animated.loop');
    expect(source).not.toContain('setInterval');
  });

  it('starts the entrance only for a closed-to-open modal transition', () => {
    const entranceEffectStart = source.indexOf('useEffect(() => {\n    const opened = detailsVisible');
    const entranceEffect = source.slice(
      entranceEffectStart,
      source.indexOf('useEffect(() => {\n    if (!reduceMotion) return;', entranceEffectStart),
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
