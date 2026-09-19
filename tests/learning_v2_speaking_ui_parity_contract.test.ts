import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const player = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
);
const repeatMode = readFileSync(
  "modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx",
  "utf8",
);
const holdButton = readFileSync("app/flashcards/SpeakHoldButton.tsx", "utf8");
const speakingPanel = readFileSync("components/SpeakingPanel.tsx", "utf8");

assert.match(
  player,
  /<SpeakHoldButton[\s\S]{0,800}testID="learning-v2-inline-hold-to-talk"/,
  "Learning V2 must reuse the proven on-screen Oral hold control",
);
assert.doesNotMatch(
  player,
  /testID="learning-v2-footer-hold-to-talk"/,
  "the voice task must not hide its primary action in the footer",
);
assert.doesNotMatch(
  player,
  /renderInlineSurface=\{false\}/,
  "the canonical Oral equalizer and live surface must remain visible",
);
assert.match(
  player,
  /<SpeakingInlineResultStars[\s\S]{0,500}voiceAttemptResult/,
  "the voice task must show the same three-star pronunciation result",
);
assert.match(
  player,
  /voiceAttemptResult\.transcript/,
  "the scored result must keep and show what the learner said",
);
assert.doesNotMatch(
  repeatMode,
  /WaveformBarsV1|copy\.recording|copy\.preparingMicrophone/,
  "Repeat & Compare must not draw a separate recording UI over the Oral engine",
);
assert.match(
  holdButton,
  /pressRetentionOffset=\{\{ top: 40, right: 40, bottom: 40, left: 40 \}\}/,
  "the shared hold target must tolerate normal finger drift",
);
assert.doesNotMatch(
  player,
  /const startVoiceHold[\s\S]{0,900}setVoicePanelEpoch/,
  "press-in must not remount the warmed SpeakingPanel before Android chooses PCM",
);
assert.match(
  player,
  /<SpeakingPanel[\s\S]{0,500}renderInlineSurface=\{!voiceAttemptResult\}/,
  "the warmed SpeakingPanel must stay mounted behind the scored result for retry",
);
assert.match(
  player,
  /forcePedagogicalWrong[\s\S]{0,300}"provisional_wrong"/,
  "a failed pronunciation score must enter the normal pedagogical-wrong path",
);
assert.match(
  player,
  /learningV2CourseSessionVoiceResponseV1\([\s\S]{0,160}passed \? voiceTargetText : heard[\s\S]{0,160}forcePedagogicalWrong:\s*!passed/,
  "a pronunciation pass must submit the canonical target while preserving failed speech",
);
assert.match(
  player,
  /voiceControlDisabled\s*=\s*voiceFooterDisabled\s*\|\|\s*modeVoiceStatus\s*===\s*"finishing"/,
  "the on-screen microphone must be disabled while the shared Oral engine scores",
);
assert.match(
  player,
  /<SpeakHoldButton[\s\S]{0,260}disabled=\{voiceControlDisabled\}/,
  "the visible hold target must receive the scoring busy guard",
);
assert.doesNotMatch(
  player,
  /onTranscriptChange=\{setTranscript\}/,
  "interim hypotheses must not rerender the entire session player",
);
assert.match(
  player,
  /accessibilityLabel=\{voiceResultAccessibilityLabel\}/,
  "the result must announce stars, verdict and heard transcript as one unit",
);
assert.doesNotMatch(
  holdButton,
  /Записать ответ|Record an answer/u,
  "the shared microphone must describe speaking/listening, not saved recording",
);
assert.match(
  holdButton,
  /accessibilityHint=\{onAccessibilityActivate \? microphoneAssistiveHint : microphoneHint\}/u,
  "assistive activation must announce its double-tap toggle instead of physical hold instructions",
);
assert.match(
  speakingPanel,
  /event:end[\s\S]{0,700}systemHoldPressActiveRef\.current[\s\S]{0,300}restartSystemRecognition/u,
  "a system recognizer end event must restart while the physical hold remains active",
);
assert.match(
  speakingPanel,
  /restartSystemRecognition\s*=\s*\(reason\)[\s\S]{0,1200}setStatus\('listening'\)/u,
  "release during the native restart window must settle the attempt instead of cancelling it as an initial start",
);
assert.match(
  speakingPanel,
  /segmentedSystemCapture[\s\S]{0,500}uri\s*&&\s*!segmentedSystemCapture[\s\S]{0,100}runControlPass/u,
  "a restarted multi-segment attempt must not be capped by a control pass over only the last audio fragment",
);
assert.match(
  speakingPanel,
  /speech\.start\([\s\S]{0,900}systemCaptureStartCountRef\.current \+= 1[\s\S]{0,400}segmentedSystemCaptureGenerationRef\.current = captureGeneration/u,
  "segmented capture must be marked only after the restarted native session actually starts",
);
assert.doesNotMatch(
  speakingPanel,
  /systemRestartCount \+= 1;\s*segmentedSystemCaptureGenerationRef\.current/u,
  "release before the scheduled restart must retain the single-file honesty control pass",
);
assert.match(
  speakingPanel,
  /expectedAudioEnds = systemCaptureStartCountRef\.current[\s\S]{0,600}systemAudioEndCountRef\.current < expectedAudioEnds/u,
  "segmented cleanup must wait for the final native audioend instead of trusting a stale first-segment URI",
);
assert.match(
  player,
  /onStatusChange=\{\(status\)\s*=>\s*\{[\s\S]{0,500}nextStatus\s*!==\s*"requesting"[\s\S]{0,700}setVoiceHoldActive\(false\)/u,
  "permission and terminal statuses must release the controlled hold latch for the next assistive activation",
);
assert.match(
  speakingPanel,
  /const previousUri = recordingUriRef\.current[\s\S]{0,700}deleteRecordingFile\(previousUri\)[\s\S]{0,300}recordingUriRef\.current = uri/u,
  "system recognition restarts must delete superseded voice-cache segments instead of orphaning recordings",
);
assert.match(
  speakingPanel,
  /if \(segmentedSystemCapture\) \{[\s\S]{0,500}deleteRecordingFile\(recordingUriRef\.current\)[\s\S]{0,200}setRecordingUri\(null\)/u,
  "the shared Oral result must not replay one native segment as the learner's complete restarted attempt",
);

console.log("LEARNING V2 SPEAKING UI PARITY CONTRACT: PASS");
