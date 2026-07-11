import { readFileSync } from 'fs';
import { join } from 'path';

// Source-level contract for the Android "press-and-hold → record → whisper" path
// in SpeakingPanel. Behaviour is exercised by the recorder / registry unit tests;
// here we guard the WIRING so a future refactor can't silently drop the
// hold-mode gating (which would send Android users back to the flaky system
// recognizer that "closes by itself").
const source = readFileSync(
  join(__dirname, '..', 'components', 'SpeakingPanel.tsx'),
  'utf8',
);

describe('SpeakingPanel hold-mode wiring', () => {
  it('gates the hold path to Android + native recorder + whisper support', () => {
    expect(source).toContain("Platform.OS === 'android'");
    expect(source).toContain('isHoldRecordingSupported()');
    expect(source).toContain('isNeuralJudgeSupported()');
  });

  it('uses push-to-talk (press in / press out) rather than a tap toggle in hold mode', () => {
    expect(source).toContain('onPressIn: () =>');
    expect(source).toContain('onPressOut');
    expect(source).toContain('startHoldRecording(');
  });

  it('records to a WAV then recognizes the file with on-device whisper', () => {
    // endHold stops the recorder, gets a wav uri, and judges it with the locale.
    expect(source).toContain('rec.stop()');
    expect(source).toContain('judgeWithNeuralEngine({');
    expect(source).toContain('locale: recognitionLocale');
  });

  it('warms whisper in the background while system hold remains immediately available', () => {
    expect(source).toContain('ensureNeuralModel(recognitionLocale)');
    expect(source).toContain('const holdMode = !isPreview && !!speech');
    expect(source).not.toContain('autoStartedRef');
    expect(source).not.toContain('holdModelFailed');
  });

  it('cleans up an in-flight hold recording when the panel unmounts', () => {
    expect(source).toContain('holdRecRef.current?.cancel()');
    expect(source).toContain('deleteHoldRecording(');
  });
});
