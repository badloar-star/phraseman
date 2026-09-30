import fs from 'fs';
import path from 'path';

describe('Dialogue V2 local voice-message runtime contract', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'hooks', 'use_dialogue_v2_voice_message.ts'),
    'utf8',
  );

  it('uses the trusted native recognizer and persists only a local replay file', () => {
    expect(source).toContain('loadSpeechRecognitionModule');
    expect(source).toContain('resolveDialogueAsrCapability');
    expect(source).toContain('requestSpeechPermissionForHold');
    expect(source).toContain('persistRecording: true');
    expect(source).toContain("speechModule.addListener('audioend'");
    expect(source).toContain('buildDialogueVoiceAttachment');
  });

  it('derives native recognition from the selected dialogue contour, never an English fallback', () => {
    expect(source).toContain('dialogueLanguageMeta(studyTarget).speechLocale');
    expect(source).not.toContain("'en-US'");
    expect(source.indexOf('resolveDialogueAsrCapability')).toBeLessThan(source.indexOf('speechModule.start('));
  });

  it('owns playback and erases ephemeral files without any network/provider client', () => {
    expect(source).toContain('createAudioPlayer');
    expect(source).toContain('claimSpokenAudio');
    expect(source).toContain('new File(uri)');
    expect(source).toContain('file.delete()');
    expect(source).toContain('useRuntimeActive');
    expect(source).not.toMatch(/fetch\(|axios|OPENAI|transcrib/i);
  });

  it('deletes every owned recording, including sent bubbles, after playback is stopped', () => {
    expect(source).toContain('ownedVoiceUrisRef');
    expect(source).toContain('cleanupAllLocalAudio');
    expect(source).toMatch(/cleanupAllLocalAudio[\s\S]*stopVoiceMessagePlayback\(\)[\s\S]*deleteLocalVoiceRecording/u);
    expect(source).toMatch(/if \(!runtimeActive\)[\s\S]*cleanupAllLocalAudio\(\)/u);
    expect(source).toMatch(/return \(\) => \{[\s\S]*cleanupAllLocalAudio\(\)/u);
  });

  it('atomically invalidates capture before a draft can become a sent attachment', () => {
    expect(source).toContain('takeVoiceAttachment');
    expect(source).toMatch(/takeVoiceAttachment[\s\S]*invalidateCapture\(\)[\s\S]*buildDialogueVoiceAttachment/u);
    expect(source).toMatch(/captureToken !== voiceCaptureTokenRef\.current[\s\S]*deleteIfUnowned/u);
  });
});
