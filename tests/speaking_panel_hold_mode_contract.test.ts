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
    expect(source).toContain('onPressIn: startHold');
    expect(source).toContain('onPressOut');
    expect(source).toContain('startHoldRecording(');
  });

  it('records to a WAV then recognizes the file with on-device whisper', () => {
    // endHold stops the recorder, gets a wav uri, and judges it with the locale.
    expect(source).toContain('rec.stop()');
    expect(source).toContain('judgeWithNeuralEngine({');
    expect(source).toContain('locale: recognitionLocale');
  });

  it('warms the whisper model for the target locale and can fall back on failure', () => {
    expect(source).toContain('ensureNeuralModel(recognitionLocale)');
    expect(source).toContain('holdModelFailed');
    // System path only auto-starts when hold is unavailable OR model prep failed.
    expect(source).toContain('if (holdSupported && !holdModelFailed) return;');
  });

  it('cleans up an in-flight hold recording when the panel unmounts', () => {
    expect(source).toContain('holdRecRef.current?.cancel()');
    expect(source).toContain('deleteHoldRecording(');
  });
});
