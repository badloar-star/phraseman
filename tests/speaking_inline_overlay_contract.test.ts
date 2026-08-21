import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('inline speaking surface contract', () => {
  const panel = read('components/SpeakingPanel.tsx');
  const button = read('components/SpeakingButton.tsx');
  const slot = read('components/SpeakingInlineSlot.tsx');
  const hostResult = fs.existsSync(path.join(root, 'components', 'SpeakingInlineResultStars.tsx'))
    ? read('components/SpeakingInlineResultStars.tsx')
    : '';
  const mistakePractice = read('app/mistake_practice_session.tsx');
  const lesson = read('app/lesson1.tsx');

  it('uses one fixed normal-flow slot instead of guessed overlay offsets', () => {
    expect(slot).toContain('export const SPEAKING_INLINE_SLOT_HEIGHT');
    expect(slot).toContain('testID="speaking-inline-slot"');
    expect(slot).toContain('speakingInlineMetrics(width, height, variant)');
    expect(slot).toContain('minHeight: metrics.slotHeight');
    expect(panel).toContain("presentation?: 'modal' | 'inline'");
    expect(panel).toContain("if (presentation === 'inline')");
    expect(panel).not.toContain('inlineOverlay');
    expect(panel).not.toContain('overlayStyle');
    expect(mistakePractice).not.toContain('overlayStyle={{ bottom:');
    expect(lesson).not.toContain('overlayStyle={{ bottom:');
  });

  it('mounts the lesson panel in the stable slot and keeps mistake practice in normal flow', () => {
    expect(lesson).toContain('<SpeakingInlineSlot');
    expect(lesson).toContain('presentation="inline"');
    expect(mistakePractice).toContain('presentation="inline"');
    expect(mistakePractice).toContain('<View style={styles.speechArea}>');
    expect(lesson.indexOf('<SpeakingInlineSlot')).toBeLessThan(lesson.indexOf('presentation="inline"'));
    expect(lesson).toContain('<SpeakingInlineSlot variant="lesson"');
    expect(lesson).toContain('marginTop: linkedSliceCompact ? 14 : 18');
  });

  it('keeps the lesson scroll position stable when the speaking card appears', () => {
    expect(lesson).not.toContain('lessonScrollRef');
    expect(lesson).not.toContain('scrollToEnd({ animated: true })');
    expect(panel).not.toContain('minHeight: inlineMetrics.slotHeight');
    expect(slot).toContain('minHeight: metrics.slotHeight');
  });

  it('starts on hold and scores on release from the existing buttons', () => {
    expect(button).toContain('inlineHold?: SpeakingInlineHoldControl');
    expect(button).toContain('inlineHold.onStart()');
    expect(button).toContain('inlineHold?.onEnd()');
    expect(button).toContain('onPress={inlineHold ? undefined : onPress}');
    expect(mistakePractice).toContain('onPressIn={() => setSpeechHeld(true)}');
    expect(mistakePractice).toContain('onPressOut={() => setSpeechHeld(false)}');
    expect(lesson).toContain('onPressIn={startSpeakingHold}');
    expect(lesson).toContain('onPressOut={endSpeakingHold}');
  });

  it('reuses the proven platform recognition route and persists replay audio', () => {
    expect(panel).toContain("if (presentation !== 'inline') return");
    expect(panel).toContain("if (Platform.OS === 'ios')");
    expect(panel).toContain('else if (pcmHoldMode)');
    expect(panel).toContain('startHold()');
    expect(panel).toContain('void endHold()');
    expect(panel).toContain('interimResults: true');
    expect(panel).toContain('holdToTalk: !pcmHoldModeRef.current');
    expect(panel).not.toContain("holdToTalk: presentation === 'inline' || !pcmHoldModeRef.current");
    expect(panel).toContain('persistRecording: true');
    expect(panel).toContain('onLevel: (rawVolume: number) => equalizerRef.current?.setSample(rawVolume)');
    expect(panel).toContain("useRef<'system' | 'pcm' | null>(null)");
    expect(panel).toContain('inlineHoldRouteRef.current = route');
    expect(panel).toContain('const route = inlineHoldRouteRef.current');
    expect(panel).not.toContain("!holdActive && wasHolding) {\n      if (Platform.OS === 'ios')");
    expect(panel).toMatch(/const timer = setTimeout\(\(\) => \{[\s\S]*?neutralEngine\.abort\(\);[\s\S]*?settle\(bestControl\);[\s\S]*?\}, 3500\);/);
  });

  it('lets long copy grow the reserved normal-flow slot without truncation or overlap', () => {
    expect(panel).not.toContain('numberOfLines={2}');
    expect(panel).not.toContain('ellipsizeMode="tail"');
    expect(panel).toContain('styles.inlineTokensText');
    expect(panel).toContain('inlineTokensText:');
    expect(panel).not.toContain('minHeight: inlineMetrics.slotHeight');
    expect(panel).not.toContain("height: '100%'");
  });

  it('renders the shared speaking container without an outline on every inline host', () => {
    const inlineCardStyle = panel.match(/inlineCard:\s*\{([\s\S]*?)\n  \},/)?.[1] ?? '';
    const inlineCardRender = panel.slice(
      panel.indexOf('styles.inlineCard,'),
      panel.indexOf('accessibilityLiveRegion="polite"'),
    );
    expect(inlineCardStyle).toContain('borderWidth: 0');
    expect(inlineCardRender).not.toContain('borderColor: theme.border');
  });

  it('removes the reference and recording result buttons from every speaking surface', () => {
    expect(panel).not.toContain('testID="speaking-inline-reference"');
    expect(panel).not.toContain('testID="speaking-inline-recording"');
    expect(panel).not.toContain("ru: 'Эталон'");
    expect(panel).not.toContain("ru: 'Моя запись'");
  });

  it('renders the three-star score below the host phrase divider instead of duplicating the phrase in the panel', () => {
    expect(hostResult).toContain('SpeakingScoreStars');
    expect(hostResult).toContain('inlineSpeakingResultColor');
    expect(panel).not.toContain('styles.inlineResultPhrase');
    expect(panel).not.toContain('styles.inlineStars');
    expect(lesson).toContain('<SpeakingInlineResultStars');
    expect(lesson.indexOf('testID="lesson1-answer-divider"')).toBeLessThan(
      lesson.indexOf('testID="lesson1-speaking-score-below-divider"'),
    );
    expect(lesson).toContain('onScore={handleSpeakingScore}');
    expect(mistakePractice).toContain('onScore={({ score }) => {');
    expect(mistakePractice).toContain('classifyMistakeVoiceVerdict');
  });

  it('shows result only through phrase color and stars, without humorous verdict copy', () => {
    expect(panel).not.toContain('pickSpeakingBandFeedback');
    expect(panel).not.toContain('bandFeedbackLabel');
    expect(panel).toContain('{!showResult && (');
    expect(panel).toContain('{showResult && band ? speakingBandLabel(band, lang) : statusLine}');
  });

  it('keeps the live equalizer but removes the redundant hold instruction while listening', () => {
    expect(panel).toMatch(/case 'listening':\s+return '';/);
    expect(panel).not.toContain('Говори… отпусти, когда закончишь');
  });

});
