import * as fs from 'fs';
import * as path from 'path';
import {
  LOUD_PLAYBACK_AUDIO_MODE,
  SPEAKING_RECORDING_AUDIO_MODE,
  SPOKEN_AUDIO_MODE,
  UI_SFX_AUDIO_MODE,
} from '../app/audio_playback_mode';

const ROOT = path.join(__dirname, '..');

describe('purpose-specific playback audio modes', () => {
  it('lets short UI effects mix with other apps and respect silent mode', () => {
    expect(UI_SFX_AUDIO_MODE).toEqual({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      allowsRecording: false,
      allowsBackgroundRecording: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'mixWithOthers',
    });
  });

  it('ducks other audio only for educational speech', () => {
    expect(SPOKEN_AUDIO_MODE).toEqual({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
      allowsBackgroundRecording: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'duckOthers',
    });
    expect(LOUD_PLAYBACK_AUDIO_MODE).toBe(SPOKEN_AUDIO_MODE);
  });

  it('starts in the quiet UI mode while phrase playback requests spoken mode', () => {
    const layoutSource = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const phraseAudioSource = fs.readFileSync(path.join(ROOT, 'hooks', 'phrase_audio_player.ts'), 'utf8');

    expect(layoutSource).toContain('setManagedAudioMode(UI_SFX_AUDIO_MODE)');
    expect(layoutSource).not.toContain('setAudioModeAsync(');
    expect(phraseAudioSource).toContain('claimSpokenAudio(stopPhraseAudio)');
  });

  it('restores loud playback after every speech-recognition surface settles', () => {
    const speakingPanel = fs.readFileSync(path.join(ROOT, 'components', 'SpeakingPanel.tsx'), 'utf8');
    const aiDialog = fs.readFileSync(path.join(ROOT, 'app', 'ai_dialog_session.tsx'), 'utf8');

    // Распознавание переводит аудио-сессию в запись (playAndRecord). Каждый
    // экран с микрофоном обязан вернуть «громкое воспроизведение», иначе весь
    // звук после — тихий/через разговорный динамик или не играет вовсе.
    expect(speakingPanel).toContain('useManagedRecordingAudio(');
    expect(speakingPanel).toContain('const restoreLoudPlaybackMode = recordingAudio.release');
    expect(aiDialog).toContain('useManagedRecordingAudio(');
    expect(aiDialog).toContain('const restoreLoudPlaybackMode = recordingAudio.release');
  });

  it('switches speaking surfaces into a record-capable session before start()', () => {
    const speakingPanel = fs.readFileSync(path.join(ROOT, 'components', 'SpeakingPanel.tsx'), 'utf8');
    const aiDialog = fs.readFileSync(path.join(ROOT, 'app', 'ai_dialog_session.tsx'), 'utf8');
    expect(speakingPanel).toContain('await recordingAudio.begin()');
    expect(aiDialog).toContain('await recordingAudio.begin()');
  });

  it('rolls capture mode back when native start throws', () => {
    const speakingPanel = fs.readFileSync(path.join(ROOT, 'components', 'SpeakingPanel.tsx'), 'utf8');
    const aiDialog = fs.readFileSync(path.join(ROOT, 'app', 'ai_dialog_session.tsx'), 'utf8');
    expect(speakingPanel).toContain('cleanupListeners();');
    expect(aiDialog).toContain('restoreLoudPlaybackMode();');
  });

  it('speaking panel plays replay and reference loud and stops them on done/retry', () => {
    const speakingPanel = fs.readFileSync(path.join(ROOT, 'components', 'SpeakingPanel.tsx'), 'utf8');

    // Эксклюзивный spoken-claim ставится ПЕРЕД «Моей записью», а эталон идёт
    // через useAudio, который использует тот же процесс-wide арбитр.
    const playMyRecording = speakingPanel.slice(speakingPanel.indexOf('const playMyRecording'));
    expect(playMyRecording.slice(0, playMyRecording.indexOf('player.play()'))).toContain('claimSpokenAudio(');
    const playReference = speakingPanel.slice(speakingPanel.indexOf('const speakWord'));
    expect(playReference.slice(0, playReference.indexOf('const applyWordResult'))).toContain('speakReferenceAudio(');

    // «Сказать ещё раз» (startListening) глушит эталон и «Мою запись», чтобы
    // микрофон не ловил их хвост; «Готово»/закрытие панели — тоже.
    const startListening = speakingPanel.slice(speakingPanel.indexOf('const startListening'));
    const beforeStart = startListening.slice(0, startListening.indexOf('speech.start('));
    expect(beforeStart).toContain('stopReplayPlayback()');
    expect(beforeStart).toContain('Speech.stop()');
    const handleClose = speakingPanel.slice(speakingPanel.indexOf('const handleClose'));
    const closeBody = handleClose.slice(0, handleClose.indexOf('onClose()'));
    expect(closeBody).toContain('Speech.stop()');
    expect(closeBody).toContain('stopReplayPlayback()');
  });

  it('keeps only the current attempt recording on disk (no voice-file hoarding)', () => {
    const speakingPanel = fs.readFileSync(path.join(ROOT, 'components', 'SpeakingPanel.tsx'), 'utf8');
    const aiDialog = fs.readFileSync(path.join(ROOT, 'app', 'ai_dialog_session.tsx'), 'utf8');

    // Файл записи живёт до следующей попытки/закрытия панели — потом удаляется.
    expect(speakingPanel).toContain('deleteRecordingFile');
    expect(speakingPanel).toContain('persistRecording: true');
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
