import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('final runtime ownership guards', () => {
  test('Settings invalidates account work on sleep/unmount', () => {
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toContain('linkedAuthGenerationRef.current += 1;');
    expect(settings).toContain('linkedAuthInFlightRef.current = null;');
    expect(settings).toContain('return () => invalidateLinkedAuthWork();');
  });

  test('removed flashcard autoplay deep links redirect', () => {
    const audio = read('app/flashcards_audio.tsx');
    expect(audio).toContain('<Redirect href="/flashcards" />');
    expect(audio).not.toContain('useRuntimeActive');
    // зачем (01.10, координатор): AudioWaveform не импортировался нигде и удалён — проверять нечего.
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
