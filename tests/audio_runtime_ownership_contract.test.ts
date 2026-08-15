import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('process-wide audio ownership wiring', () => {
  it('routes every spoken player surface through the exclusive arbiter', () => {
    expect(read('hooks', 'phrase_audio_player.ts')).toContain('claimSpokenAudio(stopPhraseAudio)');
    expect(read('hooks', 'use-audio.ts')).toContain('claimSpokenAudio(stopSystemSpeechNow)');
    expect(read('components', 'tournament', 'TournamentAudioButton.tsx')).toContain('claimSpokenAudio(');
    expect(read('app', 'learning-v2', 'session', '[id].tsx')).toContain('claimSpokenAudio(stopAudioAttempt)');
    expect(read('components', 'onboarding_aha', 'aha_audio.ts')).toContain('claimSpokenAudio(');
    expect(read('components', 'onboarding_aha', 'aha_audio.ts')).toContain('claimAmbientAudio(');
    expect(read('components', 'SpeakingPanel.tsx')).toContain('claimSpokenAudio(');
    expect(read('components', 'onboarding_aha', 'SpeechBeat.tsx')).toContain('claimSpokenAudio(');
  });

  it('makes delayed play calls prove that their ownership claim is still current', () => {
    const arbiter = read('modules', 'audio', 'audio_runtime_arbiter.ts');
    expect(arbiter).toContain('previous = this.activeOwner');
    expect(arbiter).toContain('this.revoke(previous, true)');
    expect(arbiter).toContain('recordingActive()');
    expect(arbiter).toContain('subscribeManagedAudioMode');

    for (const file of [
      ['hooks', 'use_managed_spoken_audio_player.ts'],
      ['components', 'tournament', 'TournamentAudioButton.tsx'],
      ['app', 'learning-v2', 'session', '[id].tsx'],
      ['components', 'SpeakingPanel.tsx'],
      ['components', 'onboarding_aha', 'SpeechBeat.tsx'],
    ]) {
      expect(read(...file)).toContain('.isCurrent()');
    }
  });

  it('registers microphone-only paths with recording activity', () => {
    expect(read('app', 'speaking_hold_recorder.ts')).toContain('claimRecordingAudio?.(stop)');
    expect(read('components', 'onboarding_aha', 'SpeechBeat.tsx')).toContain('claimRecordingAudio(');
    expect(read('components', 'learning-v2-lab', 'kimi', 'use_voice_capture.ts')).toContain('claimRecordingAudio(');

    const speakingPanel = read('components', 'SpeakingPanel.tsx');
    expect(speakingPanel).toContain('useManagedRecordingAudio(');
    expect(speakingPanel).toContain('await recordingAudio.begin()');
    const aiDialog = read('app', 'ai_dialog_session.tsx');
    expect(aiDialog).toContain('useManagedRecordingAudio(');
    expect(aiDialog).toContain('await recordingAudio.begin()');
  });

  it('disposes raw replay players and listeners after natural completion', () => {
    for (const file of [
      ['components', 'SpeakingPanel.tsx'],
      ['components', 'onboarding_aha', 'SpeechBeat.tsx'],
    ]) {
      const source = read(...file);
      expect(source).toContain("addListener('playbackStatusUpdate'");
      expect(source).toContain('status.didJustFinish');
      expect(source).toContain('player?.remove()');
    }
  });
});
