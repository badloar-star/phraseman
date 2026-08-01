import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('inline speaking surface contract', () => {
  const panel = read('components/SpeakingPanel.tsx');
  const button = read('components/SpeakingButton.tsx');
  const slot = read('components/SpeakingInlineSlot.tsx');
  const trainer = read('app/trainer_phrases_session.tsx');
  const lesson = read('app/lesson1.tsx');

  it('uses one fixed normal-flow slot instead of guessed overlay offsets', () => {
    expect(slot).toContain('export const SPEAKING_INLINE_SLOT_HEIGHT');
    expect(slot).toContain('testID="speaking-inline-slot"');
    expect(slot).toContain('height: SPEAKING_INLINE_SLOT_HEIGHT');
    expect(panel).toContain("presentation?: 'modal' | 'inline'");
    expect(panel).toContain("if (presentation === 'inline')");
    expect(panel).not.toContain('inlineOverlay');
    expect(panel).not.toContain('overlayStyle');
    expect(trainer).not.toContain('overlayStyle={{ bottom:');
    expect(lesson).not.toContain('overlayStyle={{ bottom:');
  });

  it('mounts the panel inside the stable slot on both learner surfaces', () => {
    for (const source of [trainer, lesson]) {
      expect(source).toContain('<SpeakingInlineSlot');
      expect(source).toContain('presentation="inline"');
    }
    expect(trainer.indexOf('<SpeakingInlineSlot')).toBeLessThan(trainer.indexOf('presentation="inline"'));
    expect(lesson.indexOf('<SpeakingInlineSlot')).toBeLessThan(lesson.indexOf('presentation="inline"'));
  });

  it('starts on hold and scores on release from the existing buttons', () => {
    expect(button).toContain('inlineHold?: SpeakingInlineHoldControl');
    expect(button).toContain('inlineHold.onStart()');
    expect(button).toContain('inlineHold?.onEnd()');
    expect(button).toContain('onPress={inlineHold ? undefined : onPress}');
    expect(trainer).toContain('inlineHold={{');
    expect(lesson).toContain('onPressIn={startSpeakingHold}');
    expect(lesson).toContain('onPressOut={endSpeakingHold}');
  });

  it('uses interim system recognition for live word settlement and persists replay audio', () => {
    expect(panel).toContain("if (presentation !== 'inline') return");
    expect(panel).toContain('systemHoldPressActiveRef.current = true');
    expect(panel).toContain('void startListening()');
    expect(panel).toContain('stopListening()');
    expect(panel).toContain('interimResults: true');
    expect(panel).toContain("holdToTalk: presentation === 'inline' || !pcmHoldModeRef.current");
    expect(panel).toContain('persistRecording: true');
    expect(panel).toContain('setTranscript(next)');
  });

  it('renders semantic result color, five stars, and actions in the approved order', () => {
    expect(panel).toContain('inlineSpeakingResultColor');
    expect(panel).toContain('INLINE_STAR_COUNT');
    expect(panel).toContain('inlineStarsForScore');
    expect(panel.indexOf('testID="speaking-inline-reference"')).toBeLessThan(
      panel.indexOf('testID="speaking-inline-recording"'),
    );
    expect(panel).toContain('accessibilityLabel={referenceLabel}');
    expect(panel).toContain('accessibilityLabel={recordingLabel}');
    expect(panel).toContain('minHeight: 44');
  });

  it('keeps the personal plan out of this change', () => {
    expect(read('app/personal_plan_exercise.tsx')).not.toContain('SpeakingInlineSlot');
  });
});
