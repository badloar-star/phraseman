import { readFileSync } from 'fs';
import { join } from 'path';

// Source-level contract for the Android "press-and-hold → record → whisper" path
// in the personal-plan pronunciation recorder. Brings the plan to the SAME
// reliable standard as lessons (SpeakingPanel): app-owned capture + on-device
// whisper on Android, system recognizer on iOS/fallback.
const source = readFileSync(
  join(__dirname, '..', 'app', 'personal_plan_exercise.tsx'),
  'utf8',
);

describe('plan pronunciation hold-mode wiring', () => {
  it('gates the hold path to Android + native recorder + whisper support', () => {
    expect(source).toContain("Platform.OS === 'android' && isHoldRecordingSupported() && isNeuralJudgeSupported()");
  });

  it('uses push-to-talk on the speak button when in hold mode', () => {
    expect(source).toContain('onPressIn={startUnifiedHold}');
    expect(source).toContain('startHoldRecording(');
  });

  it('records to a WAV then recognizes it with on-device whisper against the target', () => {
    expect(source).toContain('rec.stop()');
    expect(source).toContain('judgeWithNeuralEngine({');
    expect(source).toContain('locale: PLAN_RECOGNITION_LOCALE');
  });

  it('scores the whisper transcript with the SAME scorer as the system path', () => {
    // Both paths must feed scorePlanPronunciationTranscript + onScored → one standard.
    expect(source).toContain('scorePlanPronunciationTranscript({');
    expect(source).toContain('onScored(result)');
  });

  it('keeps the system recognizer path for iOS / fallback', () => {
    // System fallback keeps the same hold gesture while whisper warms in background.
    expect(source).toContain('speechModule.start(');
    expect(source).toContain('const holdMode = Boolean(speechModule)');
    expect(source).not.toContain('holdModelFailed');
  });

  it('cleans up an in-flight hold recording on unmount', () => {
    expect(source).toContain('holdRecRef.current?.cancel()');
    expect(source).toContain('deleteHoldRecording(');
  });
});
