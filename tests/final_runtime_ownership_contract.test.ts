import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('final runtime ownership guards', () => {
  test('Settings and save banner invalidate account work on sleep/unmount', () => {
    const settings = read('app/(tabs)/settings.tsx');
    const banner = read('components/SaveProgressBanner.tsx');
    expect(settings).toContain('linkedAuthGenerationRef.current += 1;');
    expect(settings).toContain('linkedAuthInFlightRef.current = null;');
    expect(settings).toContain('return () => invalidateLinkedAuthWork();');
    expect(banner).toContain('ownerActiveRef.current = false;');
    expect(banner).toContain('checkGenerationRef.current += 1;');
  });

  test('flashcard autoplay and waveform stop outside runtime ownership', () => {
    const audio = read('app/flashcards_audio.tsx');
    const waveform = read('components/flashcards/AudioWaveform.tsx');
    expect(audio).toContain('const runtimeActive = useRuntimeActive();');
    expect(audio).toContain("if (!runtimeActive || phase !== 'play'");
    expect(audio).toContain('active={runtimeActive}');
    expect(waveform).toContain('active?: boolean;');
    expect(waveform).toContain('const runtimeActive = useRuntimeActive(active);');
    expect(waveform).toContain('if (!playing || !runtimeActive || reduceMotion)');
  });

  test('Lesson 1 owns auto-advance, TTS and BackHandler only while active', () => {
    const source = read('app/lesson1.tsx');
    expect(source).toContain("if (!lessonRuntimeActive || status !== 'result'");
    expect(source).toContain('if (!lessonRuntimeActive || Platform.OS !==');
    expect(source).toContain('settings.autoAdvance && lessonRuntimeActive');
    expect(source).toContain("process.env.EXPO_PUBLIC_NATIVE_POP_TO_BACK !== '0'");
    expect(source).toContain("trackActivity('navigation:native_lesson_dismiss_skipped'");
  });
});
