import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');
const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2]/u;

describe('personal plan exercise audio and recorder UI contract', () => {
  it('focuses the standalone recall input so the keyboard opens on entry', () => {
    const recallStart = SOURCE.indexOf("isRecallMode && 'targetText' in item");
    const recallEnd = SOURCE.indexOf('isListenBuildMode', recallStart);
    const recallRenderer = SOURCE.slice(recallStart, recallEnd);

    expect(recallRenderer).toContain('<TextInput');
    expect(recallRenderer).toContain('autoFocus');
  });

  it('keeps listening audio control readable, accessible and stateful', () => {
    const listeningButtonSource = SOURCE.slice(
      SOURCE.indexOf('function PlanListenChooseAudioButton'),
      SOURCE.indexOf('type PronunciationBlock'),
    );

    expect(SOURCE).not.toMatch(MOJIBAKE_RE);
    expect(SOURCE).toContain("accessibilityRole=\"button\"");
    expect(SOURCE).toContain('accessibilityLabel={disabled');
    expect(SOURCE).toContain("ru: 'Аудио готовится'");
    expect(SOURCE).toContain("ru: 'Слушать фразу'");
    expect(SOURCE).toContain("shadowColor: disabled ? '#000000' : accent");
    expect(listeningButtonSource).toContain('const label = disabled');
    expect(listeningButtonSource).toContain(': isBuffering');
    expect(listeningButtonSource).toContain(': isPlaying');
    expect(listeningButtonSource.match(/triLang\(lang,/g)).toHaveLength(6);
    expect(listeningButtonSource).toContain('No TTS fallback here: this control must remain MP3-only.');
    expect(listeningButtonSource).not.toContain('speakFallback');
  });

  // The old record-and-playback self-check UI was replaced by a real on-device
  // recognition flow (listen to the phrase, speak it, score the transcript, pass at
  // PLAN_PRONUNCIATION_PASS_THRESHOLD). These assertions track the current honest flow.
  it('drives pronunciation through real on-device recognition, not a fake recording', () => {
    expect(SOURCE).toContain('recorderHintRow');
    expect(SOURCE).toContain('recorderStack: {');

    // Recording is confirmed to the learner: a canonical start cue + a live
    // equalizer that reacts to the voice (so it's never ambiguous whether the
    // mic is listening). Shared with the lesson "Устно" panel.
    expect(SOURCE).toContain('playRecordStart');
    expect(SOURCE).toContain('buildSpeakingStartOptions({');
    expect(SOURCE).toContain('volumeMeter: true');
    expect(SOURCE).toContain('<VoiceEqualizer');

    // Real on-device recognition + local scoring (no paid service, no server).
    expect(SOURCE).toContain('speechModule.start(');
    expect(SOURCE).toContain("speechModule.addListener('result', applyResult)");
    expect(SOURCE).toContain('scheduleFinishAttempt');
    expect(SOURCE).toContain('schedulePlanSpeechStopSettlement(');
    expect(SOURCE).toContain('finishAttemptRef.current');
    expect(SOURCE).toContain('Android segmented sessions can emit a final result for only part of the');
    expect(SOURCE).toContain('onFirstAudio');
    expect(SOURCE).toContain('const playCueOnce = () =>');
    expect(SOURCE).toContain('playRecordStart();');
    expect(SOURCE).toContain('scorePlanPronunciationTranscript({');
    expect(SOURCE).toContain('listenPronunciationTarget');
    expect(SOURCE).toContain('speakFallbackAudio(targetText, 0.86');
    expect(SOURCE).toContain("if (Platform.OS === 'android') playFallbackAudio();");
    expect(SOURCE).toContain('await setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE)');
    expect(SOURCE).toContain('targetPlaybackFallbackTimerRef.current = setTimeout');
    expect(SOURCE).toContain('const currentTime = Math.max');
    expect(SOURCE).toContain('currentTime > 0.05');
    expect(SOURCE).toContain('status?.didJustFinish === true');
    expect(SOURCE).toContain('Android can report the player as "playing"');
    expect(SOURCE).toContain('downloadFirst: false');
    expect(SOURCE).not.toContain('speakAudio(targetText, 0.86');

    // Completion is gated on a real passing score, not on "I recorded something".
    // Exception: when speech genuinely can't run here (no recognizer on the
    // device, or the user declined mic access) the learner may advance without a
    // score so a free in-plan exercise never traps them — gated on `blocked`.
    // Прослушивание фразы НЕ обязательно — юзер может произнести сразу (если сам хочет).
    // Во время hold кнопка остаётся активной на requesting/listening, иначе RN
    // может потерять onPressOut. Блокируем её только при настоящем scoring.
    expect(SOURCE).toContain('enabled={!energyBlocked && !pronunciationSpeakingTarget && !preparingModel && (!pronunciationScoring || pronunciationPreparing || pronunciationListening)}');
    expect(SOURCE).toContain('preparing={pronunciationPreparing}');
    expect(SOURCE).toContain('(pronunciationBlocked != null || pronunciationScore?.passed === true)');
    expect(SOURCE).toContain('disabled={saving || pronunciationScoring}');
    expect(SOURCE).toContain('PLAN_PRONUNCIATION_PASS_THRESHOLD');

    // The escape is only for genuine "speech unavailable / denied" states, not a
    // free skip: the two block kinds, and nothing wider.
    expect(SOURCE).toContain("type PronunciationBlock = 'denied' | 'unavailable' | null");
    // And the escape is recorded HONESTLY — never a fabricated pass.
    expect(SOURCE).toContain('passed: scored?.passed ?? false');

    // The fake "record 12 seconds + listen to yourself = pass" path must be gone.
    expect(SOURCE).not.toContain('Запись до 12 секунд');
    expect(SOURCE).not.toContain('userPlayedRecording: true,\n      });');
  });
});
