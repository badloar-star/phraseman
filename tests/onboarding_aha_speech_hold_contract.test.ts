import { readFileSync } from 'fs';
import { join } from 'path';

// Source-level contract for the onboarding "say it out loud" beat (АХ-сцена)
// press-and-hold path. The onboarding speech beat has its OWN recognizer wiring
// (SpeechBeat.tsx), separate from SpeakingPanel — the cheap Android fix here is
// holdToTalk over the system recognizer (finger holds the mic open) rather than
// the whisper record-then-recognize path used in lessons. Guard the wiring so a
// refactor can't silently drop it and send onboarding back to the OEM endpointer
// that "closes the mic by itself".
const source = readFileSync(
  join(__dirname, '..', 'components', 'onboarding_aha', 'SpeechBeat.tsx'),
  'utf8',
);
const strings = readFileSync(
  join(__dirname, '..', 'components', 'onboarding_aha', 'aha_scenes.ts'),
  'utf8',
);

describe('onboarding speech beat — press-and-hold', () => {
  it('opens the recognizer in holdToTalk mode (finger, not endpointer, ends speech)', () => {
    expect(source).toContain('holdToTalk: true');
  });

  it('starts on press-in and stops on press-out (push-to-talk)', () => {
    expect(source).toContain('onPressIn={() => void startListening()}');
    expect(source).toContain('onPressOut={stopListening}');
  });

  it('cancels requesting safely and flushes only a live session', () => {
    expect(source).toContain("if (statusRef.current === 'requesting')");
    expect(source).toContain("if (statusRef.current !== 'listening') return;");
    expect(source).toContain('speechRef.current?.stop()');
  });

  it('does not show listening/red before a native start or result event', () => {
    expect(source).toContain("setStatus('requesting')");
    expect(source).toContain("speech.addListener('start'");
    expect(source).toContain("active={status === 'listening'}");
  });

  it('keeps ONE hold button mounted across preprompt→listening so press-out is never lost', () => {
    // The unified render gate — if this splits back into two blocks, the finger
    // that began the hold on preprompt loses its release when the block unmounts.
    expect(source).toContain("status === 'preprompt' || isListeningPhase");
  });

  it('shows hold-specific copy for idle and while speaking', () => {
    expect(source).toContain('speakHoldIdle');
    expect(source).toContain('speakHoldListening');
    expect(strings).toContain('speakHoldIdle');
    expect(strings).toContain('speakHoldListening');
  });

  it('still falls back to shadow (listen-and-repeat) when speech is unavailable', () => {
    // The cheap fix does not remove the honest no-mic path.
    expect(source).toContain("goFallback('unavailable')");
    expect(source).toContain("setStatus('fallback')");
  });
});
