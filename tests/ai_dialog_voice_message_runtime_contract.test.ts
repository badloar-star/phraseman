import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.resolve(__dirname, '..', 'app', 'ai_dialog_session.tsx'),
  'utf8',
);

describe('AI dialogue voice-message runtime contract', () => {
  test('persists the captured recording and listens for its local audioend URI', () => {
    expect(source).toContain('persistRecording: true');
    expect(source).toContain("addListener('audiostart'");
    expect(source).toContain('voiceCaptureKnownUriRef');
    expect(source).toContain("addListener('audioend'");
    expect(source).toContain('voiceDraftRef.current');
  });

  test('attaches audio only through the transcript-match guard and renders no transcript inside the bubble', () => {
    expect(source).toContain('buildDialogueVoiceAttachment');
    expect(source).toMatch(/role: 'user', text: trimmed, voice: voiceAttachment \? \{ uri: voiceAttachment\.uri \}/u);
    expect(source).toContain('m.voice ? (');
    expect(source).toContain('describeDialogueVoiceMessage(lang)');
  });

  test('replays an attached message via the shared spoken-audio lease and cleans it up', () => {
    expect(source).toContain("claimSpokenAudio(");
    expect(source).toContain('createAudioPlayer(uri)');
    expect(source).toContain('stopVoiceMessagePlayback');
  });

  test('invalidates and deletes a late recording instead of attaching it to a later turn', () => {
    expect(source).toContain('voiceCaptureTokenRef');
    expect(source).toContain('deleteDialogueVoiceRecording(uri)');
    expect(source).toContain('voiceCaptureTokenRef.current += 1');
    expect(source).toContain('clearPendingDialogueVoiceRecordings();');
  });

  test('cleans pending local recordings on teardown and ignores stale playback completion', () => {
    expect(source).toContain('clearPendingDialogueVoiceRecordings');
    expect(source).toMatch(/voiceMessagePlayerRef\.current !== player[\s\S]{0,120}playbackGeneration !== voiceMessagePlaybackGenerationRef\.current/u);
  });

  test('uses a narrow audioend payload rather than any', () => {
    expect(source).toContain('(event: { uri?: unknown })');
  });
});
