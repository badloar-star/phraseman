import * as fs from 'fs';
import * as path from 'path';
import { LOUD_PLAYBACK_AUDIO_MODE, SPEAKING_RECORDING_AUDIO_MODE } from '../app/audio_playback_mode';

const ROOT = path.join(__dirname, '..');

describe('loud playback audio mode', () => {
  it('fully resets recording and route flags before voice playback', () => {
    expect(LOUD_PLAYBACK_AUDIO_MODE).toEqual({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
      allowsBackgroundRecording: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'duckOthers',
    });
  });

  it('uses the same full playback mode at app startup and phrase playback sites', () => {
    const layoutSource = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const planExerciseSource = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');
    const phraseAudioSource = fs.readFileSync(path.join(ROOT, 'hooks', 'phrase_audio_player.ts'), 'utf8');

    expect(layoutSource).toContain('setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE)');
    expect(planExerciseSource).toContain('setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE)');
    expect(phraseAudioSource).toContain('setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE)');
  });

  it('restores loud playback after every speech-recognition surface settles', () => {
    const speakingPanel = fs.readFileSync(path.join(ROOT, 'components', 'SpeakingPanel.tsx'), 'utf8');
    const planExercise = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');
    const aiDialog = fs.readFileSync(path.join(ROOT, 'app', 'ai_dialog_session.tsx'), 'utf8');

    // Распознавание переводит аудио-сессию в запись (playAndRecord). Каждый
    // экран с микрофоном обязан вернуть «громкое воспроизведение», иначе весь
    // звук после — тихий/через разговорный динамик или не играет вовсе.
    for (const source of [speakingPanel, aiDialog]) {
      expect(source).toContain('restoreLoudPlaybackMode');
      expect(source).toContain('setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE)');
    }
    expect(planExercise).toContain('setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE)');
  });

  it('switches speaking surfaces into a record-capable session before start()', () => {
    const speakingPanel = fs.readFileSync(path.join(ROOT, 'components', 'SpeakingPanel.tsx'), 'utf8');
    const aiDialog = fs.readFileSync(path.join(ROOT, 'app', 'ai_dialog_session.tsx'), 'utf8');
    expect(speakingPanel).toContain('setManagedAudioMode(SPEAKING_RECORDING_AUDIO_MODE)');
    expect(aiDialog).toContain('setManagedAudioMode(SPEAKING_RECORDING_AUDIO_MODE)');
  });

  it('rolls capture mode back when native start throws', () => {
    const speakingPanel = fs.readFileSync(path.join(ROOT, 'components', 'SpeakingPanel.tsx'), 'utf8');
    const aiDialog = fs.readFileSync(path.join(ROOT, 'app', 'ai_dialog_session.tsx'), 'utf8');
    expect(speakingPanel).toContain('cleanupListeners();');
    expect(aiDialog).toContain('restoreLoudPlaybackMode();');
  });

  it('speaking panel plays replay and reference loud and stops them on done/retry', () => {
    const speakingPanel = fs.readFileSync(path.join(ROOT, 'components', 'SpeakingPanel.tsx'), 'utf8');

    // Громкий режим ставится ПЕРЕД воспроизведением «Моей записи» и эталона.
    const playMyRecording = speakingPanel.slice(speakingPanel.indexOf('const playMyRecording'));
    expect(playMyRecording.slice(0, playMyRecording.indexOf('player.play()'))).toContain('LOUD_PLAYBACK_AUDIO_MODE');
    const playReference = speakingPanel.slice(speakingPanel.indexOf('const playReference'));
    expect(playReference.slice(0, playReference.indexOf('Speech.speak('))).toContain('LOUD_PLAYBACK_AUDIO_MODE');

    // «Сказать ещё раз» (startListening) глушит эталон и «Мою запись», чтобы
    // микрофон не ловил их хвост; «Готово»/закрытие панели — тоже.
    const startListening = speakingPanel.slice(speakingPanel.indexOf('const startListening'));
    const beforeStart = startListening.slice(0, startListening.indexOf('speech.start('));
    expect(beforeStart).toContain('replayPlayerRef.current?.pause()');
    expect(beforeStart).toContain('Speech.stop()');
    const handleClose = speakingPanel.slice(speakingPanel.indexOf('const handleClose'));
    const closeBody = handleClose.slice(0, handleClose.indexOf('onClose()'));
    expect(closeBody).toContain('Speech.stop()');
    expect(closeBody).toContain('replayPlayerRef.current?.pause()');
  });

  it('keeps only the current attempt recording on disk (no voice-file hoarding)', () => {
    const speakingPanel = fs.readFileSync(path.join(ROOT, 'components', 'SpeakingPanel.tsx'), 'utf8');
    const planExercise = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');
    const aiDialog = fs.readFileSync(path.join(ROOT, 'app', 'ai_dialog_session.tsx'), 'utf8');

    // Файл записи живёт до следующей попытки/закрытия панели — потом удаляется.
    expect(speakingPanel).toContain('deleteRecordingFile');
    expect(speakingPanel).toContain('persistRecording: true');
    // Personal-plan Android must use the recognizer's AudioRecord path, but the
    // transient wav is deleted on audioend so attempts do not pile up on disk.
    expect(planExercise).toContain("persistRecording: Platform.OS === 'android'");
    expect(planExercise).toContain("speechModule.addListener('audioend'");
    expect(planExercise).toContain('deleteTransientSpeechRecordingFile(uri)');
    // AI dialog has no replay and can still opt out completely.
    expect(aiDialog).toContain('persistRecording: false');
  });
});

describe('shared speaking recording audio mode', () => {
  it('enables capture without routing speech through the earpiece', () => {
    expect(SPEAKING_RECORDING_AUDIO_MODE.allowsRecording).toBe(true);
    expect(SPEAKING_RECORDING_AUDIO_MODE.shouldRouteThroughEarpiece).toBe(false);
    expect(SPEAKING_RECORDING_AUDIO_MODE.interruptionMode).toBe('doNotMix');
  });

  it('keeps runtime audio-mode writes behind the coordinator', () => {
    const runtimeFiles = [
      path.join(ROOT, 'app', 'ai_dialog_session.tsx'),
      path.join(ROOT, 'app', 'personal_plan_exercise.tsx'),
      path.join(ROOT, 'components', 'SpeakingPanel.tsx'),
      path.join(ROOT, 'components', 'onboarding_aha', 'aha_audio.ts'),
      path.join(ROOT, 'components', 'onboarding_aha', 'SpeechBeat.tsx'),
      path.join(ROOT, 'hooks', 'use-audio.ts'),
      path.join(ROOT, 'hooks', 'phrase_audio_player.ts'),
    ];
    for (const file of runtimeFiles) {
      expect(fs.readFileSync(file, 'utf8')).not.toContain('setAudioModeAsync(');
    }
  });
});
