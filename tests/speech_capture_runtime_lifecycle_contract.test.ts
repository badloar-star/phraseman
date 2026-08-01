import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function source(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const CAPTURE_OWNERS = [
  'app/personal_plan_exercise.tsx',
  'components/onboarding_aha/SpeechBeat.tsx',
  'components/learning-v2-lab/kimi/use_voice_capture.ts',
  'components/SpeakingPanel.tsx',
  'app/ai_dialog_session.tsx',
] as const;

describe('speech capture runtime lifecycle contract', () => {
  test.each(CAPTURE_OWNERS)('%s owns capture through navigation focus and AppState', (relativePath) => {
    const text = source(relativePath);

    expect(text).toContain('useRuntimeActive');
    expect(text).toMatch(/const\s+\w*runtimeActive\s*=\s*useRuntimeActive\(/);
    expect(text).toContain('if (runtimeActive) return;');
  });

  test.each(CAPTURE_OWNERS)('%s invalidates pending capture starts when runtime becomes inactive', (relativePath) => {
    const text = source(relativePath);
    const lifecycleStart = text.indexOf('// Speech capture lifecycle invariant:');

    expect(lifecycleStart).toBeGreaterThanOrEqual(0);
    const lifecycle = text.slice(lifecycleStart, lifecycleStart + 2600);
    expect(lifecycle).toMatch(/(?:generation|attempt).*Ref\.current\s*\+=\s*1/i);
    expect(lifecycle).toMatch(/(?:press|hold).*Ref\.current\s*=\s*false/i);
  });

  test.each(CAPTURE_OWNERS)('%s tears native capture down without auto-resume', (relativePath) => {
    const text = source(relativePath);
    const lifecycleStart = text.indexOf('// Speech capture lifecycle invariant:');
    const lifecycle = text.slice(lifecycleStart, lifecycleStart + 2600);

    expect(lifecycle).toMatch(/(?:cleanup|remove).*Listener/i);
    expect(lifecycle).toMatch(/(?:abort|cancel)\(/);
    if (/setTimeout\(/.test(text)) {
      expect(lifecycle).toMatch(/clear[A-Za-z]*(?:Watchdog|Timer|Advance)/);
    }
    expect(lifecycle).toMatch(/restoreLoudPlayback/);
    expect(lifecycle).not.toMatch(/if\s*\(runtimeActive\)[\s\S]{0,300}(?:\.start\(|startListening\(|startHold\()/);
  });

  test('capture owners no longer use the AppState-only hook', () => {
    expect(source('components/SpeakingPanel.tsx')).not.toContain('useAppRuntimeActive');
    expect(source('app/ai_dialog_session.tsx')).not.toContain('useAppRuntimeActive');
  });

  test.each([
    'components/SpeakingPanel.tsx',
    'components/onboarding_aha/SpeechBeat.tsx',
  ])('%s invalidates delayed raw-player creation during teardown', (relativePath) => {
    const text = source(relativePath);
    const lifecycleStart = text.indexOf('// Speech capture lifecycle invariant:');
    const lifecycle = text.slice(lifecycleStart, lifecycleStart + 2600);
    const replayStart = text.indexOf('const playMyRecording');
    const replay = text.slice(replayStart, replayStart + 1800);

    expect(lifecycle).toMatch(/playback(?:Token|Generation)Ref\.current\s*\+=\s*1/);
    expect(replay).toMatch(/if \([^)]*(?:mountedRef|runtimeActiveRef|playback(?:Token|Generation)Ref)[\s\S]{0,300}createAudioPlayer/);
    expect(replay).toMatch(/createAudioPlayer[\s\S]{0,300}(?:\.remove\(\)|safeCall)/);
  });
});
