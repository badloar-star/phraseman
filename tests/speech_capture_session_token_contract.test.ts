import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('speech capture callbacks stay owned by the session that created them', () => {
  test('Kimi rejects a stale result before it can mutate bestRef', () => {
    const source = read('components/learning-v2-lab/kimi/use_voice_capture.ts');
    const resultListener = source.slice(source.indexOf("speech.addListener('result'"), source.indexOf("speech.addListener('end'"));
    expect(resultListener.indexOf('attempt !== attemptRef.current')).toBeGreaterThanOrEqual(0);
    expect(resultListener.indexOf('attempt !== attemptRef.current')).toBeLessThan(resultListener.indexOf('bestRef.current = best'));
  });

  test('SpeechBeat gates scoring and delayed audioend, and safely starts replay', () => {
    const source = read('components/onboarding_aha/SpeechBeat.tsx');
    expect(source).toMatch(/finishAttempt = useCallback\(\(generation: number\)[\s\S]*generation !== captureGenerationRef\.current/);
    expect(source).toMatch(/addListener\('audioend',[\s\S]{0,180}if \(!isCurrentSession\(\)\) return/);
    expect(source).toContain('safeCall(() => player.play())');
  });

  test('SpeakingPanel gates word settlement, onPass path, and auto-advance by session', () => {
    const source = read('components/SpeakingPanel.tsx');
    expect(source).toMatch(/const settle = \(\) => \{\s*if \(!isCurrentSession\(\)\) return/);
    expect(source).toMatch(/markCleanedWord = useCallback\([\s\S]*captureGeneration !== captureGenerationRef\.current/);
    expect(source).toMatch(/autoAdvanceRef\.current = setTimeout\([\s\S]{0,180}captureGeneration !== captureGenerationRef\.current/);
    expect(source).toMatch(/finishAttempt = useCallback\([\s\S]{0,300}captureGeneration !== captureGenerationRef\.current/);
    const audioModeContinuation = source.slice(
      source.indexOf('await setManagedAudioMode(SPEAKING_RECORDING_AUDIO_MODE)'),
      source.indexOf('// Watchdog:', source.indexOf('await setManagedAudioMode(SPEAKING_RECORDING_AUDIO_MODE)')),
    );
    expect(audioModeContinuation).toMatch(/if \(!mountedRef\.current \|\| !runtimeActiveRef\.current \|\| captureGeneration !== captureGenerationRef\.current\) return;/);
    expect(audioModeContinuation).toMatch(/if \(!systemHoldPressActiveRef\.current\) \{[\s\S]*cleanupListeners\(\)/);
  });

  test('AI dialogue separates permission/start generation from final-result session ownership', () => {
    const relativePath = 'app/ai_dialog_session.tsx';
    const sessionRef = 'voiceInputSessionRef';
    const source = read(relativePath);
    expect(source).toContain(`const ${sessionRef} = useRef(0)`);
    expect(source).toContain(`session === ${sessionRef}.current`);
    expect(source).toMatch(/PressOut[\s\S]{0,500}(?:voiceGenerationRef|voiceInputGenerationRef)\.current \+= 1/);
  });
});
