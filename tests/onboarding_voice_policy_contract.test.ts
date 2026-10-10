import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../components/onboarding_aha/aha_audio.ts'),
  'utf8',
);

const arbiter = fs.readFileSync(
  path.resolve(__dirname, '../modules/audio/audio_runtime_arbiter.ts'),
  'utf8',
);

describe('onboarding voice policy', () => {
  test('prepared onboarding speech obeys the global voice gate and spoken activity', () => {
    expect(source).toContain('voicePlaybackPolicy.captureStart()');
    expect(source).toContain('voicePlaybackPolicy.canStart(voicePolicyToken)');
    // зачем (11.10): аренду 'spoken' теперь берёт общий арбитр — claimSpokenAudio → acquireAudioActivity('spoken').
    expect(source).toContain('claimSpokenAudio(');
    expect(source).toContain('whenSpokenAudioReady(claim)');
    expect(arbiter).toMatch(/acquireAudioActivity\('spoken', owner\)/);
    expect(source).toContain('voicePlaybackPolicy.registerStop');
  });

  test('ambient audio obeys the effects switch', () => {
    expect(source).toContain('getSoundSettingsSnapshot().effectsEnabled');
    expect(source).toContain('subscribeSoundSettings');
  });
});
