import * as fs from 'fs';
import * as path from 'path';

// Regression: in a lesson, a correct answer with settings.autoAdvance armed a
// 4s timer that jumped to the next phrase. Opening the "Скажи вслух" speaking
// panel did NOT cancel that timer, so it fired while the panel played the
// reference clip and showed "Моя запись" / "Сказать ещё раз" — the user could
// neither re-listen nor re-record before the lesson advanced.
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

describe('lesson auto-advance is suspended while the speaking panel is open', () => {
  it('LessonScreen owns a suspend flag and clears the armed timer when suspended', () => {
    expect(src).toContain('const speakingSuspendRef = useRef(false)');
    expect(src).toContain('const setSpeakingAdvanceSuspended = useCallback');
    // Suspending must immediately cancel any already-armed auto-advance timer.
    expect(src).toMatch(/if \(suspended && autoTimer\.current\) \{\s*clearTimeout\(autoTimer\.current\);\s*autoTimer\.current = null;/);
  });

  it('does not arm auto-advance while suspended and re-checks the flag before jumping', () => {
    // The timer may only be armed while the lesson owns focused foreground
    // runtime AND the speaking panel is closed.
    expect(src).toContain('if (settings.autoAdvance && lessonRuntimeActive && isRight && !speakingSuspendRef.current)');
    // Belt-and-suspenders: the callback re-checks both lifecycle ownership and
    // the speaking flag before it is allowed to advance.
    expect(src).toMatch(/setTimeout\(\(\) => \{\s*autoTimer\.current = null;\s*if \(!lessonRuntimeActive \|\| speakingSuspendRef\.current\) return;\s*goNext\(np\);/);
  });

  it('opening the speaking panel suspends advance; closing it does NOT auto-resume', () => {
    // Child opens panel -> tells parent to suspend.
    expect(src).toContain('onSpeakingActiveChange?.(true)');
    expect(src).toContain('const closeSpeaking = useCallback');
    expect(src).toContain('onSpeakingActiveChange?.(false)');
    // The panel's onClose uses the coordinated closeSpeaking, not a bare setter.
    expect(src).toContain('onClose={closeSpeaking}');
    expect(src).not.toContain('onClose={() => setSpeakingOpen(false)}');
  });

  it('hides and resets the inline panel synchronously when the phrase identity changes', () => {
    expect(src).toContain('const speakingPhraseKey = `${displayCell}:${realPhraseIdx}:${phraseEnterKey}`');
    expect(src).toContain('const speakingOpenedForPhraseRef = useRef<string | null>(null)');
    expect(src).toContain('speakingOpenedForPhraseRef.current = speakingPhraseKey');
    expect(src).toContain('const speakingVisible = speakingOpen && speakingOpenedForPhraseRef.current === speakingPhraseKey');
    expect(src).toContain('{speakingVisible && (');
    expect(src).toMatch(/useEffect\(\(\) => \{[\s\S]*?setSpeakingOpen\(false\);[\s\S]*?onSpeakingActiveChange\?\.\(false\);[\s\S]*?\}, \[speakingPhraseKey, onSpeakingActiveChange\]\);/);
  });

  it('wires the suspend callback from LessonScreen down into LessonContent', () => {
    expect(src).toContain('onSpeakingActiveChange?: (active: boolean) => void;');
    expect(src).toContain('onSpeakingActiveChange={setSpeakingAdvanceSuspended}');
  });
});
